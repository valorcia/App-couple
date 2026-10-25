import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@couple/database';
import { AppError, ErrorCode, invitationCode, normalizeInvitationCode, sha256 } from '@couple/shared';
import type { CoupleDto, InvitationDto, PartnerDto } from '@couple/types';
import type { UpdateCoupleInput } from '@couple/validation';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { SettingsService } from '@/common/settings/settings.service';
import { MailService } from '@/common/mail/mail.service';
import { toProfileDto } from '../users/profile.mapper';

const coupleInclude = {
  memberships: { where: { leftAt: null }, include: { user: { include: { profile: true } } } },
  invitations: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.CoupleInclude;

type CoupleRow = Prisma.CoupleGetPayload<{ include: typeof coupleInclude }>;

@Injectable()
export class CouplesService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  /** Couple actif (PENDING ou ACTIVE) de l'utilisateur, vu depuis cet utilisateur. */
  async getForUser(userId: string): Promise<CoupleDto | null> {
    const membership = await this.prisma.coupleMembership.findFirst({
      where: { userId, leftAt: null },
      include: { couple: { include: coupleInclude } },
    });
    if (!membership) return null;
    return this.toDto(membership.couple, userId);
  }

  /**
   * Crée un couple en attente et génère la première invitation.
   * Un utilisateur sans couple actif seulement.
   */
  async createWithInvitation(userId: string, targetEmail: string | undefined, meta: { ip?: string | null }): Promise<CoupleDto> {
    await this.assertNotLinked(userId);
    const ttlHours = await this.settings.get('invitation.ttlHours');
    const { code, codeHash } = this.newCode();

    const couple = await this.prisma.$transaction(async (tx) => {
      const created = await tx.couple.create({
        data: {
          status: 'PENDING',
          memberships: { create: { userId } },
          invitations: {
            create: { inviterUserId: userId, codeHash, targetEmail: targetEmail ?? null, expiresAt: new Date(Date.now() + ttlHours * 3600_000) },
          },
          calendars: { create: { kind: 'COUPLE', name: 'Notre agenda', color: '#E0705A' } },
        },
        include: coupleInclude,
      });
      await this.audit.log({ actorUserId: userId, action: 'couple.created', targetType: 'Couple', targetId: created.id, ip: meta.ip }, tx);
      return created;
    });

    await this.notifyInvitee(userId, targetEmail, code);
    const dto = this.toDto(couple, userId);
    if (dto.pendingInvitation) dto.pendingInvitation.code = code;
    return dto;
  }

  /** Régénère une invitation (révoque les précédentes). Limité par jour. */
  async renewInvitation(userId: string, coupleId: string, targetEmail: string | undefined): Promise<InvitationDto> {
    const [ttlHours, maxPerDay] = await Promise.all([this.settings.get('invitation.ttlHours'), this.settings.get('invitation.maxPerDay')]);
    const since = new Date(Date.now() - 86400_000);
    const count = await this.prisma.invitation.count({ where: { inviterUserId: userId, createdAt: { gt: since } } });
    if (count >= maxPerDay) throw new AppError(ErrorCode.INVITATION_LIMIT, "Limite d'invitations atteinte pour aujourd'hui.", 429);

    const couple = await this.prisma.couple.findUnique({ where: { id: coupleId }, include: coupleInclude });
    if (!couple || couple.status !== 'PENDING') throw AppError.conflict(ErrorCode.COUPLE_FULL, 'Ce couple est déjà complet.');

    const { code, codeHash } = this.newCode();
    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({ where: { coupleId, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: new Date() } });
      return tx.invitation.create({
        data: { coupleId, inviterUserId: userId, codeHash, targetEmail: targetEmail ?? null, expiresAt: new Date(Date.now() + ttlHours * 3600_000) },
      });
    });
    await this.notifyInvitee(userId, targetEmail, code);
    return { ...toInvitationDto(invitation), code };
  }

  /** Accepte une invitation par code : associe les deux comptes et active le couple. */
  async acceptInvitation(userId: string, rawCode: string, meta: { ip?: string | null }): Promise<CoupleDto> {
    await this.assertNotLinked(userId);
    const codeHash = sha256(normalizeInvitationCode(rawCode));

    const couple = await this.prisma.$transaction(
      async (tx) => {
        const invitation = await tx.invitation.findUnique({ where: { codeHash }, include: { couple: { include: { memberships: { where: { leftAt: null } } } } } });
        if (!invitation || invitation.status !== 'PENDING') throw new AppError(ErrorCode.INVITATION_INVALID, "Code d'invitation invalide.", 400);
        if (invitation.expiresAt < new Date()) {
          await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
          throw new AppError(ErrorCode.INVITATION_EXPIRED, "Ce code d'invitation a expiré.", 400);
        }
        if (invitation.inviterUserId === userId) throw new AppError(ErrorCode.INVITATION_SELF, 'Vous ne pouvez pas accepter votre propre invitation.', 400);
        if (invitation.couple.status !== 'PENDING' || invitation.couple.memberships.length !== 1) {
          throw AppError.conflict(ErrorCode.COUPLE_FULL, 'Ce couple est déjà complet.');
        }

        await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedByUserId: userId } });
        await tx.coupleMembership.create({ data: { coupleId: invitation.coupleId, userId } });
        const updated = await tx.couple.update({
          where: { id: invitation.coupleId },
          data: { status: 'ACTIVE', activatedAt: new Date() },
          include: coupleInclude,
        });
        await this.audit.log({ actorUserId: userId, action: 'couple.joined', targetType: 'Couple', targetId: updated.id, ip: meta.ip }, tx);
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toDto(couple, userId);
  }

  async update(coupleId: string, input: UpdateCoupleInput, userId: string): Promise<CoupleDto> {
    const couple = await this.prisma.couple.update({
      where: { id: coupleId },
      data: {
        name: input.name,
        metAt: input.metAt === undefined ? undefined : input.metAt ? new Date(input.metAt) : null,
        anniversaryAt: input.anniversaryAt === undefined ? undefined : input.anniversaryAt ? new Date(input.anniversaryAt) : null,
      },
      include: coupleInclude,
    });
    return this.toDto(couple, userId);
  }

  /**
   * Quitter le couple : immédiat et unilatéral. Le couple passe en DISSOLVED ; les données
   * communes restent lisibles pendant la période de grâce (voir politique de conservation).
   * Un couple PENDING (sans partenaire) est simplement supprimé.
   */
  async leave(userId: string, coupleId: string, meta: { ip?: string | null }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const couple = await tx.couple.findUniqueOrThrow({ where: { id: coupleId }, include: { memberships: { where: { leftAt: null } } } });
      if (!couple.memberships.some((m) => m.userId === userId)) throw AppError.forbidden();
      if (couple.status === 'PENDING') {
        await tx.couple.delete({ where: { id: coupleId } });
        await this.audit.log({ actorUserId: userId, action: 'couple.deleted_pending', targetType: 'Couple', targetId: coupleId, ip: meta.ip }, tx);
        return;
      }
      await tx.coupleMembership.updateMany({ where: { coupleId, userId, leftAt: null }, data: { leftAt: new Date() } });
      await tx.couple.update({ where: { id: coupleId }, data: { status: 'DISSOLVED', dissolvedAt: new Date() } });
      // Le partenaire restant est également détaché pour pouvoir recommencer ; le couple reste consultable en archive.
      await tx.coupleMembership.updateMany({ where: { coupleId, leftAt: null }, data: { leftAt: new Date() } });
      await tx.entitlement.deleteMany({ where: { coupleId } });
      await this.audit.log({ actorUserId: userId, action: 'couple.left', targetType: 'Couple', targetId: coupleId, ip: meta.ip }, tx);
    });
  }

  // ------------------------------------------------------------------ internes
  private async assertNotLinked(userId: string) {
    const existing = await this.prisma.coupleMembership.findFirst({ where: { userId, leftAt: null }, select: { id: true } });
    if (existing) throw AppError.conflict(ErrorCode.COUPLE_ALREADY_LINKED, 'Vous êtes déjà associé à un partenaire.');
  }

  private newCode() {
    const code = invitationCode();
    return { code, codeHash: sha256(code) };
  }

  private async notifyInvitee(inviterUserId: string, targetEmail: string | undefined, code: string) {
    if (!targetEmail) return;
    const inviter = await this.prisma.profile.findUnique({ where: { userId: inviterUserId } });
    await this.mail.send(this.mail.invitationEmail(targetEmail, inviter?.displayName ?? 'Votre partenaire', code, `${this.env.WEB_PUBLIC_URL}/rejoindre?code=${code}`));
  }

  private toDto(couple: CoupleRow, viewerUserId: string): CoupleDto {
    const partnerMembership = couple.memberships.find((m) => m.userId !== viewerUserId);
    const partner: PartnerDto | null = partnerMembership
      ? { id: partnerMembership.userId, profile: toProfileDto(partnerMembership.user.profile), joinedAt: partnerMembership.joinedAt.toISOString() }
      : null;
    const pending = couple.invitations[0];
    return {
      id: couple.id,
      status: couple.status,
      name: couple.name,
      metAt: couple.metAt?.toISOString().slice(0, 10) ?? null,
      anniversaryAt: couple.anniversaryAt?.toISOString().slice(0, 10) ?? null,
      partner,
      activatedAt: couple.activatedAt?.toISOString() ?? null,
      createdAt: couple.createdAt.toISOString(),
      pendingInvitation: pending && pending.expiresAt > new Date() ? toInvitationDto(pending) : null,
    };
  }
}

function toInvitationDto(inv: { id: string; status: InvitationDto['status']; expiresAt: Date; createdAt: Date }): InvitationDto {
  return { id: inv.id, status: inv.status, expiresAt: inv.expiresAt.toISOString(), createdAt: inv.createdAt.toISOString() };
}

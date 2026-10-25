import { Injectable } from '@nestjs/common';
import { Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import type { ChallengeDto, ChallengeFeaturedDto, ChallengeProgressDto } from '@couple/types';
import type { z } from 'zod';
import type { listChallengesSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SettingsService } from '@/common/settings/settings.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';
import { IntimacyService } from '@/modules/intimacy/intimacy.service';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

const include = { category: { select: { code: true, name: true } } } satisfies Prisma.ChallengeInclude;
type ChallengeRow = Prisma.ChallengeGetPayload<{ include: typeof include }>;
type ProgressRow = Prisma.ChallengeProgressGetPayload<Record<string, never>>;

/**
 * Défis à deux. Aucune pénalité : passer un défi est un choix légitime. La complétion est
 * validée volontairement par chacun ; le défi est « réussi » quand les deux l'ont validé.
 */
@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly intimacy: IntimacyService,
  ) {}

  async list(viewer: Viewer, locale: string, filter: z.infer<typeof listChallengesSchema>): Promise<ChallengeDto[]> {
    const [premium, freeCount, intimacyOk] = await Promise.all([
      this.entitlements.isPremium(viewer.couple.coupleId),
      this.settings.get('quota.free.challengesCatalog'),
      this.intimacy.bothEnabled(viewer.couple),
    ]);
    const rows = await this.prisma.challenge.findMany({
      where: {
        status: 'PUBLISHED',
        locale,
        ...(intimacyOk ? {} : { intimate: false }),
        ...(filter.category ? { category: { code: filter.category } } : {}),
        ...(filter.difficulty ? { difficulty: filter.difficulty } : {}),
        ...(filter.budget ? { budget: filter.budget } : {}),
        ...(filter.maxMinutes ? { OR: [{ durationMinutes: null }, { durationMinutes: { lte: filter.maxMinutes } }] } : {}),
      },
      include,
      orderBy: [{ tier: 'asc' }, { createdAt: 'asc' }],
    });
    const progress = await this.prisma.challengeProgress.findMany({ where: { coupleId: viewer.couple.coupleId, challengeId: { in: rows.map((r) => r.id) } } });
    const byChallenge = new Map(progress.map((p) => [p.challengeId, p]));
    // Gratuit : les N premiers défis FREE sont accessibles ; le reste est verrouillé.
    let freeLeft = freeCount;
    return rows.map((r) => {
      let locked = false;
      if (!premium) {
        if (r.tier !== 'FREE') locked = true;
        else if (freeLeft > 0) freeLeft -= 1;
        else locked = true;
      }
      return this.toDto(r, viewer, byChallenge.get(r.id) ?? null, locked);
    });
  }

  async progressList(viewer: Viewer): Promise<ChallengeDto[]> {
    const progress = await this.prisma.challengeProgress.findMany({ where: { coupleId: viewer.couple.coupleId }, orderBy: { updatedAt: 'desc' }, include: { challenge: { include } } });
    return progress.map((p) => this.toDto(p.challenge, viewer, p, false));
  }

  async featured(viewer: Viewer, locale: string): Promise<ChallengeFeaturedDto> {
    const active = await this.prisma.challengeProgress.findFirst({ where: { coupleId: viewer.couple.coupleId, status: { in: ['PROPOSED', 'ACCEPTED'] } }, orderBy: { updatedAt: 'desc' }, include: { challenge: { include } } });
    if (active) return { challenge: this.toDto(active.challenge, viewer, active, false), kind: 'active' };
    const all = await this.list(viewer, locale, {});
    const candidates = all.filter((c) => !c.locked && !c.progress);
    if (candidates.length === 0) return { challenge: null, kind: null };
    // Suggestion stable pour la journée (même défi pour les deux partenaires).
    const day = Math.floor(Date.now() / 86_400_000);
    return { challenge: candidates[day % candidates.length]!, kind: 'suggestion' };
  }

  async propose(viewer: Viewer, challengeId: string, locale: string): Promise<ChallengeDto> {
    const challenge = await this.requireAccessible(viewer, challengeId, locale);
    const existing = await this.prisma.challengeProgress.findFirst({ where: { coupleId: viewer.couple.coupleId, challengeId, status: { in: ['PROPOSED', 'ACCEPTED'] } } });
    if (existing) return this.toDto(challenge, viewer, existing, false);
    const row = await this.prisma.challengeProgress.create({ data: { coupleId: viewer.couple.coupleId, challengeId, status: 'PROPOSED', proposedByUserId: viewer.userId } });
    if (viewer.couple.partnerUserId) {
      await this.notifications.notify({ userId: viewer.couple.partnerUserId, category: 'CHALLENGE', type: 'challenge.proposed', title: 'Un défi vous attend', body: 'Votre partenaire vous propose un défi à deux.', data: { challengeId } });
    }
    this.realtime.emitToCouple(viewer.couple.coupleId, 'challenge.changed', { challengeId });
    return this.toDto(challenge, viewer, row, false);
  }

  async accept(viewer: Viewer, challengeId: string): Promise<ChallengeDto> {
    const { challenge, progress } = await this.requireProgress(viewer, challengeId);
    if (progress.status !== 'PROPOSED') return this.toDto(challenge, viewer, progress, false);
    const row = await this.prisma.challengeProgress.update({ where: { id: progress.id }, data: { status: 'ACCEPTED' } });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'challenge.changed', { challengeId });
    if (progress.proposedByUserId && progress.proposedByUserId !== viewer.userId) {
      await this.notifications.notify({ userId: progress.proposedByUserId, category: 'CHALLENGE', type: 'challenge.accepted', title: 'Défi accepté', body: 'Votre partenaire relève le défi.', data: { challengeId } });
    }
    return this.toDto(challenge, viewer, row, false);
  }

  async skip(viewer: Viewer, challengeId: string): Promise<ChallengeDto> {
    const { challenge, progress } = await this.requireProgress(viewer, challengeId);
    if (progress.status === 'COMPLETED') return this.toDto(challenge, viewer, progress, false);
    const row = await this.prisma.challengeProgress.update({ where: { id: progress.id }, data: { status: 'SKIPPED' } });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'challenge.changed', { challengeId });
    return this.toDto(challenge, viewer, row, false);
  }

  async complete(viewer: Viewer, challengeId: string, note?: string): Promise<ChallengeDto> {
    const { challenge, progress } = await this.requireProgress(viewer, challengeId);
    if (progress.status === 'SKIPPED') throw new AppError(ErrorCode.CONFLICT, 'Ce défi a été passé.', 409);
    const completedBy = Array.from(new Set([...progress.completedByUserIds, viewer.userId]));
    const both = !!viewer.couple.partnerUserId && completedBy.includes(viewer.couple.partnerUserId) && completedBy.includes(viewer.userId);
    const row = await this.prisma.challengeProgress.update({
      where: { id: progress.id },
      data: { completedByUserIds: completedBy, note: note ?? progress.note, status: both ? 'COMPLETED' : 'ACCEPTED', completedAt: both ? new Date() : null },
    });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'challenge.changed', { challengeId });
    if (!both && viewer.couple.partnerUserId) {
      await this.notifications.notify({ userId: viewer.couple.partnerUserId, category: 'CHALLENGE', type: 'challenge.partner_done', title: 'Défi', body: 'Votre partenaire a validé sa part du défi.', data: { challengeId } });
    }
    return this.toDto(challenge, viewer, row, false);
  }

  // ------------------------------------------------------------------ internes
  private async requireAccessible(viewer: Viewer, challengeId: string, locale: string): Promise<ChallengeRow> {
    const all = await this.list(viewer, locale, {});
    const dto = all.find((c) => c.id === challengeId);
    if (!dto) throw AppError.notFound('Défi introuvable.');
    if (dto.locked) throw new AppError(ErrorCode.ENTITLEMENT_REQUIRED, 'Ce défi est réservé à Premium.', 402, { required: 'premium' });
    return this.prisma.challenge.findUniqueOrThrow({ where: { id: challengeId }, include });
  }

  private async requireProgress(viewer: Viewer, challengeId: string): Promise<{ challenge: ChallengeRow; progress: ProgressRow }> {
    const progress = await this.prisma.challengeProgress.findFirst({ where: { coupleId: viewer.couple.coupleId, challengeId }, orderBy: { createdAt: 'desc' }, include: { challenge: { include } } });
    if (!progress) throw AppError.notFound('Défi non proposé.');
    const { challenge, ...rest } = progress;
    return { challenge, progress: rest };
  }

  private toDto(r: ChallengeRow, viewer: Viewer, p: ProgressRow | null, locked: boolean): ChallengeDto {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      instructions: locked ? [] : r.instructions,
      durationMinutes: r.durationMinutes,
      difficulty: r.difficulty,
      budget: r.budget,
      materials: r.materials,
      intimate: r.intimate,
      category: r.category,
      tags: r.tags,
      locked,
      progress: p ? this.toProgressDto(p, viewer) : null,
    };
  }

  private toProgressDto(p: ProgressRow, viewer: Viewer): ChallengeProgressDto {
    return {
      id: p.id,
      challengeId: p.challengeId,
      status: p.status,
      proposedByUserId: p.proposedByUserId,
      completedByUserIds: p.completedByUserIds,
      completedByMe: p.completedByUserIds.includes(viewer.userId),
      completedByPartner: !!viewer.couple.partnerUserId && p.completedByUserIds.includes(viewer.couple.partnerUserId),
      note: p.note,
      completedAt: p.completedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}

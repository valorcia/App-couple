import { Injectable } from '@nestjs/common';
import { AppError, ErrorCode } from '@couple/shared';
import type { DesireItemDto, DesireMatchesDto, IntimacyCategory, IntimacySettingsDto } from '@couple/types';
import type { z } from 'zod';
import type { updateIntimacySettingsSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SettingsService } from '@/common/settings/settings.service';
import { AuditService } from '@/common/audit/audit.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

/**
 * Espace Intimité & Double Secret.
 * Règles absolues (voir PRODUCT_SPEC P5 / SECURITY) :
 * - désactivé par défaut ; activation individuelle, datée, consentement enregistré ; majorité confirmée ;
 * - les réponses individuelles ne sont jamais renvoyées au partenaire ;
 * - seules les envies « Oui » des deux côtés sont comptées ; leur contenu n'est révélé qu'après
 *   demande explicite des deux ; une envie retirée disparaît des révélations ;
 * - aucun indice : pas de compteur par catégorie, pas de différence de réponse selon le choix du partenaire.
 */
@Injectable()
export class IntimacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async moduleAvailable(): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: 'intimacy.module' } });
    return flag?.enabled ?? false;
  }

  async bothEnabled(couple: CoupleContext): Promise<boolean> {
    if (!couple.partnerUserId) return false;
    const rows = await this.prisma.intimacySetting.findMany({ where: { coupleId: couple.coupleId, enabledAt: { not: null }, disabledAt: null } });
    return rows.length === 2;
  }

  async getSettings(viewer: Viewer): Promise<IntimacySettingsDto> {
    const [user, mine, partner, premium, available] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: viewer.userId }, select: { adultConfirmedAt: true } }),
      this.prisma.intimacySetting.findUnique({ where: { coupleId_userId: { coupleId: viewer.couple.coupleId, userId: viewer.userId } } }),
      viewer.couple.partnerUserId ? this.prisma.intimacySetting.findUnique({ where: { coupleId_userId: { coupleId: viewer.couple.coupleId, userId: viewer.couple.partnerUserId } } }) : null,
      this.entitlements.isPremium(viewer.couple.coupleId),
      this.moduleAvailable(),
    ]);
    const enabled = !!mine?.enabledAt && !mine.disabledAt;
    const partnerEnabled = !!partner?.enabledAt && !partner.disabledAt;
    return {
      adultConfirmed: !!user.adultConfirmedAt,
      moduleAvailable: available,
      enabled,
      enabledCategories: (mine?.enabledCategories ?? []) as IntimacyCategory[],
      maxIntensity: mine?.maxIntensity ?? 2,
      partnerEnabled,
      bothEnabled: enabled && partnerEnabled,
      premium,
    };
  }

  async updateSettings(viewer: Viewer, input: z.infer<typeof updateIntimacySettingsSchema>, meta: { ip?: string | null; userAgent?: string | null }): Promise<IntimacySettingsDto> {
    if (!(await this.moduleAvailable())) throw new AppError(ErrorCode.NOT_FOUND, "Cet espace n'est pas disponible.", 404);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: viewer.userId }, select: { adultConfirmedAt: true } });
    if (input.enabled && !user.adultConfirmedAt) throw new AppError(ErrorCode.ADULT_CONFIRMATION_REQUIRED, 'Confirmez votre majorité pour accéder à cet espace.', 403);
    const current = await this.prisma.intimacySetting.findUnique({ where: { coupleId_userId: { coupleId: viewer.couple.coupleId, userId: viewer.userId } } });
    const wasEnabled = !!current?.enabledAt && !current.disabledAt;

    await this.prisma.$transaction(async (tx) => {
      await tx.intimacySetting.upsert({
        where: { coupleId_userId: { coupleId: viewer.couple.coupleId, userId: viewer.userId } },
        create: { coupleId: viewer.couple.coupleId, userId: viewer.userId, enabledAt: input.enabled ? new Date() : null, disabledAt: null, enabledCategories: input.enabledCategories, maxIntensity: input.maxIntensity },
        update: {
          enabledCategories: input.enabledCategories,
          maxIntensity: input.maxIntensity,
          ...(input.enabled && !wasEnabled ? { enabledAt: new Date(), disabledAt: null } : {}),
          ...(!input.enabled && wasEnabled ? { disabledAt: new Date() } : {}),
        },
      });
      if (input.enabled !== wasEnabled) {
        if (input.enabled) {
          await tx.consentRecord.create({ data: { userId: viewer.userId, scope: 'INTIMACY', version: input.consentVersion, ip: meta.ip, userAgent: meta.userAgent } });
        } else {
          await tx.consentRecord.updateMany({ where: { userId: viewer.userId, scope: 'INTIMACY', revokedAt: null }, data: { revokedAt: new Date() } });
          // Retrait du consentement : les demandes de révélation en cours de cet utilisateur sont annulées.
          const reveals = await tx.desireReveal.findMany({ where: { coupleId: viewer.couple.coupleId, revealedAt: null } });
          for (const r of reveals) {
            if (r.requestedByUserIds.includes(viewer.userId)) {
              await tx.desireReveal.update({ where: { id: r.id }, data: { requestedByUserIds: r.requestedByUserIds.filter((id) => id !== viewer.userId) } });
            }
          }
        }
        await this.audit.log({ actorUserId: viewer.userId, action: input.enabled ? 'intimacy.enabled' : 'intimacy.disabled', targetType: 'Couple', targetId: viewer.couple.coupleId, ip: meta.ip, userAgent: meta.userAgent }, tx);
      }
    });

    if (input.enabled && !wasEnabled && viewer.couple.partnerUserId) {
      await this.notifications.notify({ userId: viewer.couple.partnerUserId, category: 'SYSTEM', type: 'intimacy.partner_enabled', title: 'Un nouvel espace', body: 'Votre partenaire a activé un espace facultatif. À découvrir dans l’app.', data: {} });
    }
    this.realtime.emitToCouple(viewer.couple.coupleId, 'intimacy.changed', {});
    return this.getSettings(viewer);
  }

  async listItems(viewer: Viewer, locale: string, category?: IntimacyCategory): Promise<DesireItemDto[]> {
    const settings = await this.requireBothEnabled(viewer);
    const freeCategories = new Set(await this.settings.get('intimacy.freeCategories'));
    const partnerSetting = await this.prisma.intimacySetting.findUniqueOrThrow({ where: { coupleId_userId: { coupleId: viewer.couple.coupleId, userId: viewer.couple.partnerUserId! } } });
    // Catalogue commun : intersection des catégories activées et des intensités acceptées par chacun.
    const categories = settings.enabledCategories.filter((c) => partnerSetting.enabledCategories.includes(c));
    const maxIntensity = Math.min(settings.maxIntensity, partnerSetting.maxIntensity);
    const rows = await this.prisma.desireItem.findMany({
      where: { status: 'PUBLISHED', locale, category: { in: category ? categories.filter((c) => c === category) : categories }, intensity: { lte: maxIntensity } },
      orderBy: [{ category: 'asc' }, { intensity: 'asc' }, { createdAt: 'asc' }],
    });
    const mine = await this.prisma.desireResponse.findMany({ where: { coupleId: viewer.couple.coupleId, userId: viewer.userId } });
    const myChoice = new Map(mine.map((r) => [r.itemId, r.choice]));
    return rows.map((r) => ({
      id: r.id,
      category: r.category as IntimacyCategory,
      intensity: r.intensity,
      text: r.text,
      locked: !settings.premium && (r.tier !== 'FREE' || !freeCategories.has(r.category)),
      myChoice: myChoice.get(r.id) ?? null,
    }));
  }

  async respond(viewer: Viewer, itemId: string, choice: 'YES' | 'NO' | 'MAYBE'): Promise<DesireItemDto> {
    const settings = await this.requireBothEnabled(viewer);
    const item = await this.prisma.desireItem.findFirst({ where: { id: itemId, status: 'PUBLISHED' } });
    if (!item) throw AppError.notFound('Envie introuvable.');
    const freeCategories = new Set(await this.settings.get('intimacy.freeCategories'));
    if (!settings.premium && (item.tier !== 'FREE' || !freeCategories.has(item.category))) {
      throw new AppError(ErrorCode.ENTITLEMENT_REQUIRED, 'Cette catégorie est réservée à Premium.', 402, { required: 'premium' });
    }
    await this.prisma.desireResponse.upsert({
      where: { coupleId_userId_itemId: { coupleId: viewer.couple.coupleId, userId: viewer.userId, itemId } },
      create: { coupleId: viewer.couple.coupleId, userId: viewer.userId, itemId, choice },
      update: { choice },
    });
    // Signal volontairement muet : le partenaire n'apprend rien de la réponse, seulement qu'il peut rafraîchir le compteur.
    this.realtime.emitToCouple(viewer.couple.coupleId, 'intimacy.changed', {});
    return { id: item.id, category: item.category as IntimacyCategory, intensity: item.intensity, text: item.text, locked: false, myChoice: choice };
  }

  async deleteMyResponses(viewer: Viewer, meta: { ip?: string | null }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.desireResponse.deleteMany({ where: { coupleId: viewer.couple.coupleId, userId: viewer.userId } });
      await this.audit.log({ actorUserId: viewer.userId, action: 'intimacy.responses_deleted', targetType: 'Couple', targetId: viewer.couple.coupleId, ip: meta.ip }, tx);
    });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'intimacy.changed', {});
  }

  /** Intersection calculée en SQL : envies « Oui » des deux partenaires du couple. */
  private async mutualItemIds(couple: CoupleContext): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ itemId: string }[]>`
      SELECT "itemId" FROM "DesireResponse"
      WHERE "coupleId" = ${couple.coupleId}::uuid AND "choice" = 'YES'
      GROUP BY "itemId" HAVING count(DISTINCT "userId") = 2`;
    return rows.map((r) => r.itemId);
  }

  async matches(viewer: Viewer): Promise<DesireMatchesDto> {
    await this.requireBothEnabled(viewer);
    const mutual = await this.mutualItemIds(viewer.couple);
    const reveals = await this.prisma.desireReveal.findMany({ where: { coupleId: viewer.couple.coupleId, itemId: { in: mutual } }, include: { item: true } });
    const revealed = reveals
      .filter((r) => r.revealedAt)
      .map((r) => ({ id: r.item.id, category: r.item.category as IntimacyCategory, intensity: r.item.intensity, text: r.item.text, revealedAt: r.revealedAt!.toISOString() }));
    const pending = reveals.filter((r) => !r.revealedAt);
    const unrevealedCount = mutual.filter((id) => !reveals.some((r) => r.itemId === id && r.revealedAt)).length;
    const partnerId = viewer.couple.partnerUserId!;
    const myAnswersCount = await this.prisma.desireResponse.count({ where: { coupleId: viewer.couple.coupleId, userId: viewer.userId } });
    return {
      mutualCount: mutual.length,
      revealed,
      pendingCount: unrevealedCount,
      iRequested: pending.some((r) => r.requestedByUserIds.includes(viewer.userId)),
      partnerRequested: pending.some((r) => r.requestedByUserIds.includes(partnerId)),
      myAnswersCount,
    };
  }

  /**
   * Demande de révélation des envies communes actuelles. Quand les deux ont demandé pour une envie,
   * elle est révélée. Une nouvelle envie commune apparue ensuite nécessite une nouvelle demande mutuelle.
   */
  async requestReveal(viewer: Viewer, meta: { ip?: string | null }): Promise<DesireMatchesDto> {
    await this.requireBothEnabled(viewer);
    const mutual = await this.mutualItemIds(viewer.couple);
    const partnerId = viewer.couple.partnerUserId!;
    let revealedNow = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const itemId of mutual) {
        const existing = await tx.desireReveal.findUnique({ where: { coupleId_itemId: { coupleId: viewer.couple.coupleId, itemId } } });
        if (existing?.revealedAt) continue;
        const requested = Array.from(new Set([...(existing?.requestedByUserIds ?? []), viewer.userId]));
        const both = requested.includes(partnerId) && requested.includes(viewer.userId);
        if (both) revealedNow += 1;
        await tx.desireReveal.upsert({
          where: { coupleId_itemId: { coupleId: viewer.couple.coupleId, itemId } },
          create: { coupleId: viewer.couple.coupleId, itemId, requestedByUserIds: requested, revealedAt: both ? new Date() : null },
          update: { requestedByUserIds: requested, revealedAt: both ? new Date() : null },
        });
      }
      await this.audit.log({ actorUserId: viewer.userId, action: revealedNow ? 'intimacy.revealed' : 'intimacy.reveal_requested', targetType: 'Couple', targetId: viewer.couple.coupleId, metadata: { count: revealedNow }, ip: meta.ip }, tx);
    });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'intimacy.changed', {});
    if (!revealedNow && mutual.length > 0) {
      await this.notifications.notify({ userId: partnerId, category: 'SYSTEM', type: 'intimacy.reveal_requested', title: 'Une proposition vous attend', body: 'Votre partenaire souhaite découvrir vos points communs.', data: {} });
    }
    return this.matches(viewer);
  }

  private async requireBothEnabled(viewer: Viewer): Promise<IntimacySettingsDto> {
    const settings = await this.getSettings(viewer);
    if (!settings.moduleAvailable) throw new AppError(ErrorCode.NOT_FOUND, "Cet espace n'est pas disponible.", 404);
    if (!settings.enabled || !settings.partnerEnabled) throw new AppError(ErrorCode.INTIMACY_NOT_ENABLED, "Cet espace n'est pas activé par les deux partenaires.", 403);
    return settings;
  }
}

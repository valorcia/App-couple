import { Injectable } from '@nestjs/common';
import type { Prisma } from '@couple/database';
import type { AdminStatsDto, AdminSubscriptionDto, AdminUserDto, FeatureFlagDto, Page, ProductDto } from '@couple/types';
import type { z } from 'zod';
import type { adminUserSearchSchema, upsertFeatureFlagSchema, upsertProductSchema } from '@couple/validation';
import { AppError } from '@couple/shared';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';

interface Actor {
  id: string;
  role: string;
  ip?: string | null;
}

/**
 * Administration : les administrateurs n'ont jamais accès aux réponses, envies,
 * conversations IA ni souvenirs. Seuls les méta-données et agrégats sont exposés.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async stats(): Promise<AdminStatsDto> {
    const now = Date.now();
    const d30 = new Date(now - 30 * 86400_000);
    const d7 = new Date(now - 7 * 86400_000);
    const [users, activeUsers30d, couplesActive, premiumCouples, signups7d] = await Promise.all([
      this.prisma.user.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gt: d30 } } }),
      this.prisma.couple.count({ where: { status: 'ACTIVE' } }),
      this.prisma.entitlement.count({ where: { key: 'premium', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
      this.prisma.user.count({ where: { createdAt: { gt: d7 } } }),
    ]);
    const active = await this.prisma.subscription.findMany({ where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } }, include: { product: true } });
    const mrrCents = active.reduce((sum, s) => sum + (s.product ? (s.product.interval === 'YEAR' ? Math.round(s.product.priceCents / 12) : s.product.priceCents) : 0), 0);
    return { users, activeUsers30d, couplesActive, premiumCouples, signups7d, mrrCents, activeSubscriptions: active.length };
  }

  async listSubscriptions(limit = 50, cursor?: string): Promise<Page<AdminSubscriptionDto>> {
    const rows = await this.prisma.subscription.findMany({ orderBy: { id: 'desc' }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { product: { select: { code: true } } } });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((s) => ({ id: s.id, coupleId: s.coupleId, provider: s.provider, status: s.status, productCode: s.product?.code ?? null, currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: s.cancelAtPeriodEnd, createdAt: s.createdAt.toISOString() }));
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async searchUsers(input: z.infer<typeof adminUserSearchSchema>): Promise<Page<AdminUserDto>> {
    const where: Prisma.UserWhereInput = {};
    if (input.status) where.status = input.status;
    if (input.q) where.OR = [{ email: { contains: input.q, mode: 'insensitive' } }, { profile: { displayName: { contains: input.q, mode: 'insensitive' } } }];
    const rows = await this.prisma.user.findMany({
      where,
      orderBy: { id: 'desc' },
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: { profile: true, memberships: { where: { leftAt: null }, select: { coupleId: true } } },
    });
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit).map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      displayName: u.profile?.displayName ?? null,
      emailVerified: !!u.emailVerifiedAt,
      coupleId: u.memberships[0]?.coupleId ?? null,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    }));
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async suspendUser(actor: Actor, userId: string, reason: string) {
    if (actor.id === userId) throw AppError.forbidden('Impossible de suspendre son propre compte.');
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (target.role === 'ADMIN') throw AppError.forbidden('Un administrateur ne peut pas être suspendu ici.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: 'SUSPENDED', suspendedReason: reason, sessionVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.user.suspend', targetType: 'User', targetId: userId, metadata: { reason }, ip: actor.ip }, tx);
    });
  }

  async unsuspendUser(actor: Actor, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: 'ACTIVE', suspendedReason: null } });
      await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.user.unsuspend', targetType: 'User', targetId: userId, ip: actor.ip }, tx);
    });
  }

  async listAudit(limit = 50, cursor?: string) {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  // ------------------------------------------------------------------ flags
  async listFlags(): Promise<FeatureFlagDto[]> {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({ key: r.key, description: r.description, enabled: r.enabled, rules: r.rules as Record<string, unknown> }));
  }

  async upsertFlag(actor: Actor, input: z.infer<typeof upsertFeatureFlagSchema>): Promise<FeatureFlagDto> {
    const row = await this.prisma.featureFlag.upsert({
      where: { key: input.key },
      create: { key: input.key, description: input.description, enabled: input.enabled, rules: input.rules as Prisma.InputJsonValue },
      update: { description: input.description, enabled: input.enabled, rules: input.rules as Prisma.InputJsonValue },
    });
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.flag.upsert', targetType: 'FeatureFlag', targetId: row.key, metadata: { enabled: row.enabled }, ip: actor.ip });
    return { key: row.key, description: row.description, enabled: row.enabled, rules: row.rules as Record<string, unknown> };
  }

  // ------------------------------------------------------------------ produits
  async listProducts(): Promise<ProductDto[]> {
    const rows = await this.prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
    return rows.map(toProductDto);
  }

  async upsertProduct(actor: Actor, input: z.infer<typeof upsertProductSchema>): Promise<ProductDto> {
    const data = {
      type: input.type,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      currency: input.currency.toUpperCase(),
      interval: input.interval ?? null,
      entitlementKey: input.entitlementKey,
      stripePriceId: input.stripePriceId ?? null,
      appleProductId: input.appleProductId ?? null,
      googleProductId: input.googleProductId ?? null,
      active: input.active,
      sortOrder: input.sortOrder,
    };
    const row = await this.prisma.product.upsert({ where: { code: input.code }, create: { code: input.code, ...data }, update: data });
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.product.upsert', targetType: 'Product', targetId: row.id, metadata: { code: row.code, priceCents: row.priceCents }, ip: actor.ip });
    return toProductDto(row);
  }
}

function toProductDto(p: {
  id: string; code: string; type: 'SUBSCRIPTION' | 'PACK'; name: string; description: string | null; priceCents: number; currency: string;
  interval: 'MONTH' | 'YEAR' | null; entitlementKey: string; active: boolean;
}): ProductDto {
  return { id: p.id, code: p.code, type: p.type, name: p.name, description: p.description, priceCents: p.priceCents, currency: p.currency, interval: p.interval, entitlementKey: p.entitlementKey, active: p.active };
}

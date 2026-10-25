import { Inject, Injectable } from '@nestjs/common';
import type { ZodType } from 'zod';
import { type AiProvider, createAiProvider, estimateCostMicros, generateStructured } from '@couple/ai';
import { createHash } from 'node:crypto';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SettingsService } from '@/common/settings/settings.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

export type AiUnavailableReason = 'disabled' | 'quota' | 'error';

export interface AiCallContext {
  coupleId: string;
  userId: string;
  feature: string;
  /** Clé de cache optionnelle (réponses non personnelles). */
  cacheKey?: string;
  cacheTtlSeconds?: number;
}

/**
 * Point d'entrée IA côté API : fournisseur configuré, quotas mensuels par couple (Redis),
 * cache optionnel, journalisation d'usage (tokens, coût) sans aucun contenu.
 */
@Injectable()
export class AiService {
  private readonly provider: AiProvider | null;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
    private readonly entitlements: EntitlementsService,
  ) {
    this.provider = createAiProvider({ provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY, model: env.AI_MODEL, baseUrl: env.AI_BASE_URL });
  }

  get enabled(): boolean {
    return this.provider !== null;
  }

  async remainingThisMonth(coupleId: string): Promise<number | null> {
    if (!this.provider) return null;
    const premium = await this.entitlements.isPremium(coupleId);
    const quota = await this.settings.get(premium ? 'quota.premium.aiRequestsPerMonth' : 'quota.free.aiRequestsPerMonth');
    const used = Number((await this.redis.client.get(this.quotaKey(coupleId))) ?? 0);
    return Math.max(0, quota - used);
  }

  /**
   * Génère une sortie structurée. Retourne { ok:false, reason } plutôt que de lever quand l'IA est
   * indisponible : l'appelant doit toujours avoir un repli honnête (catalogue), jamais un faux résultat.
   */
  async generate<T>(ctx: AiCallContext, opts: { system: string; task: string; data?: unknown; schema: ZodType<T>; maxTokens?: number }): Promise<{ ok: true; data: T; cached: boolean } | { ok: false; reason: AiUnavailableReason }> {
    if (!this.provider) return { ok: false, reason: 'disabled' };
    const cacheKey = ctx.cacheKey ? `ai:cache:${ctx.feature}:${createHash('sha256').update(ctx.cacheKey).digest('hex')}` : null;
    if (cacheKey) {
      const hit = await this.redis.client.get(cacheKey).catch(() => null);
      if (hit) {
        const parsed = opts.schema.safeParse(JSON.parse(hit));
        if (parsed.success) {
          await this.logUsage(ctx, { inputTokens: 0, outputTokens: 0 }, this.provider.model, true);
          return { ok: true, data: parsed.data, cached: true };
        }
      }
    }
    const remaining = await this.remainingThisMonth(ctx.coupleId);
    if (remaining !== null && remaining <= 0) return { ok: false, reason: 'quota' };
    try {
      const result = await generateStructured(this.provider, opts);
      await this.redis.client.multi().incr(this.quotaKey(ctx.coupleId)).expire(this.quotaKey(ctx.coupleId), 35 * 86_400, 'NX').exec();
      await this.logUsage(ctx, result.usage, result.model, false);
      if (cacheKey) await this.redis.client.set(cacheKey, JSON.stringify(result.data), 'EX', ctx.cacheTtlSeconds ?? 3600).catch(() => undefined);
      return { ok: true, data: result.data, cached: false };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  private quotaKey(coupleId: string) {
    const d = new Date();
    return `ai:quota:${coupleId}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async logUsage(ctx: AiCallContext, usage: { inputTokens: number; outputTokens: number }, model: string, cached: boolean) {
    await this.prisma.aIUsage.create({
      data: { userId: ctx.userId, coupleId: ctx.coupleId, feature: ctx.feature, provider: this.provider?.name ?? 'none', model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicros: cached ? 0 : estimateCostMicros(model, usage), cached },
    }).catch(() => undefined);
  }
}

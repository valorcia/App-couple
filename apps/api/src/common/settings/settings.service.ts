import { Injectable } from '@nestjs/common';
import { APP_SETTINGS, type AppSettingKey } from '@couple/shared';
import type { Prisma } from '@couple/database';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Paramètres applicatifs (quotas, limites) stockés en base et modifiables depuis l'admin,
 * avec valeurs par défaut en code et cache mémoire court (30 s).
 */
@Injectable()
export class SettingsService {
  private cache = new Map<string, { value: unknown; at: number }>();
  private readonly ttlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async get<K extends AppSettingKey>(key: K): Promise<(typeof APP_SETTINGS)[K]> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < this.ttlMs) return cached.value as (typeof APP_SETTINGS)[K];
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    const value = (row?.value as (typeof APP_SETTINGS)[K] | undefined) ?? APP_SETTINGS[key];
    this.cache.set(key, { value, at: Date.now() });
    return value;
  }

  async set(key: string, value: unknown, description?: string) {
    const row = await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, description },
      update: { value: value as Prisma.InputJsonValue, ...(description !== undefined ? { description } : {}) },
    });
    this.cache.delete(key);
    return row;
  }

  async list() {
    const rows = await this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
    const known = new Map(rows.map((r) => [r.key, r]));
    return Object.entries(APP_SETTINGS).map(([key, def]) => ({
      key,
      value: known.get(key)?.value ?? def,
      description: known.get(key)?.description ?? null,
      isDefault: !known.has(key),
    }));
  }

  clearCache() {
    this.cache.clear();
  }
}

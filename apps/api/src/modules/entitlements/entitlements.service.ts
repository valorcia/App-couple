import { Injectable } from '@nestjs/common';
import type { EntitlementSource } from '@couple/database';
import { ENTITLEMENT } from '@couple/shared';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Source unique de vérité des droits d'un couple. Alimentée par les webhooks de paiement,
 * les codes promo et l'administration. Consultée par le code métier et l'EntitlementGuard.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listKeys(coupleId: string): Promise<string[]> {
    const rows = await this.prisma.entitlement.findMany({
      where: { coupleId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { key: true },
    });
    return rows.map((r) => r.key);
  }

  async has(coupleId: string, key: string): Promise<boolean> {
    const row = await this.prisma.entitlement.findFirst({
      where: { coupleId, key, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true },
    });
    return !!row;
  }

  isPremium(coupleId: string) {
    return this.has(coupleId, ENTITLEMENT.PREMIUM);
  }

  async grant(coupleId: string, key: string, source: EntitlementSource, sourceRef?: string, expiresAt?: Date | null) {
    return this.prisma.entitlement.upsert({
      where: { coupleId_key: { coupleId, key } },
      create: { coupleId, key, source, sourceRef, expiresAt: expiresAt ?? null },
      update: { source, sourceRef, expiresAt: expiresAt ?? null },
    });
  }

  async revoke(coupleId: string, key: string) {
    await this.prisma.entitlement.deleteMany({ where: { coupleId, key } });
  }
}

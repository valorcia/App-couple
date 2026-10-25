import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@couple/database';
import type { MeDto } from '@couple/types';
import type { UpdateProfileInput } from '@couple/validation';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { CouplesService } from '../couples/couples.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { toProfileDto } from './profile.mapper';

export const userWithProfile = { include: { profile: true } } satisfies Prisma.UserDefaultArgs;

@Injectable()
export class UsersService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly couples: CouplesService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
  ) {}

  async getMe(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, ...userWithProfile });
    const couple = await this.couples.getForUser(userId);
    const entitlements = couple ? await this.entitlements.listKeys(couple.id) : [];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      adultConfirmed: !!user.adultConfirmedAt,
      locale: user.locale,
      timezone: user.timezone,
      profile: toProfileDto(user.profile),
      couple,
      entitlements,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<MeDto> {
    await this.prisma.$transaction(async (tx) => {
      if (input.locale || input.timezone) {
        await tx.user.update({ where: { id: userId }, data: { locale: input.locale, timezone: input.timezone } });
      }
      await tx.profile.update({
        where: { userId },
        data: {
          displayName: input.displayName,
          bio: input.bio,
          interests: input.interests,
          birthDate: input.birthDate === undefined ? undefined : input.birthDate ? new Date(input.birthDate) : null,
        },
      });
    });
    return this.getMe(userId);
  }

  async confirmAdult(userId: string, meta: { ip?: string | null; userAgent?: string | null }): Promise<MeDto> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { adultConfirmedAt: new Date() } });
      await this.audit.log({ actorUserId: userId, action: 'user.adult_confirmed', targetType: 'User', targetId: userId, ip: meta.ip, userAgent: meta.userAgent }, tx);
    });
    return this.getMe(userId);
  }

  async listSessions(userId: string) {
    const rows = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, platform: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt.toISOString() }));
  }

  /** Décode (sans vérifier l'expiration) l'identifiant d'un access token — usage interne (logout). */
  decodeUserId(token: string): string | undefined {
    const payload = this.jwt.verify<{ sub: string }>(token, { secret: this.env.JWT_SECRET, ignoreExpiration: true });
    return payload.sub;
  }
}

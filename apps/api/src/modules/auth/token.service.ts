import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import { ENV, type Env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sv: number;
  typ: 'access';
}

@Injectable()
export class TokenService {
  readonly accessTtlSeconds: number;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
  ) {
    this.accessTtlSeconds = parseTtl(env.JWT_ACCESS_TTL);
  }

  signAccessToken(user: { id: string; role: UserRole; sessionVersion: number }): string {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role, sv: user.sessionVersion, typ: 'access' };
    return this.jwt.sign(payload, { secret: this.env.JWT_SECRET, expiresIn: this.accessTtlSeconds, algorithm: 'HS256' });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, { secret: this.env.JWT_SECRET, algorithms: ['HS256'] });
      if (payload.typ !== 'access' || typeof payload.sub !== 'string') throw new Error('bad typ');
      return payload;
    } catch (e) {
      const expired = (e as { name?: string }).name === 'TokenExpiredError';
      throw new AppError(expired ? ErrorCode.AUTH_TOKEN_EXPIRED : ErrorCode.AUTH_TOKEN_INVALID, 'Session invalide.', 401);
    }
  }
}

export function parseTtl(value: string): number {
  const m = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!m) throw new Error(`TTL invalide: ${value}`);
  const n = Number(m[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2] ?? 's'] ?? 1;
  return n * mult;
}

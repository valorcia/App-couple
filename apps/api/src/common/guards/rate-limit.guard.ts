import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ErrorCode } from '@couple/shared';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator';
import type { AuthenticatedRequest } from '../decorators/auth.decorators';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ip = req.ip ?? 'unknown';
    let subject = ip;
    if (options.by === 'user') subject = req.user?.id ?? ip;
    else if (options.by?.startsWith('ip+body:')) {
      const field = options.by.slice('ip+body:'.length);
      const body = (req.body ?? {}) as Record<string, unknown>;
      subject = `${ip}:${String(body[field] ?? '').toLowerCase()}`;
    }
    const key = `rl:${options.name}:${subject}`;
    let count: number;
    try {
      count = await this.redis.incrWindow(key, options.windowSec);
    } catch {
      // Redis indisponible : on laisse passer plutôt que de bloquer le service (fail-open, journalisé ailleurs).
      return true;
    }
    if (count > options.limit) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Trop de tentatives. Réessayez dans un instant.', 429, {
        retryAfterSec: options.windowSec,
      });
    }
    return true;
  }
}

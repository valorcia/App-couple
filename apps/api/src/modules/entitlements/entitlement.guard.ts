import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ErrorCode } from '@couple/shared';
import type { AuthenticatedRequest } from '@/common/decorators/auth.decorators';
import { EntitlementsService } from './entitlements.service';

export const ENTITLEMENT_KEY = 'entitlement';
/** Exige un droit du couple (ex. 'premium'). À combiner avec CoupleGuard. */
export const RequireEntitlement = (key: string) => SetMetadata(ENTITLEMENT_KEY, key);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(ENTITLEMENT_KEY, [context.getHandler(), context.getClass()]);
    if (!key) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.couple) throw new AppError(ErrorCode.COUPLE_REQUIRED, "Associez d'abord votre partenaire.", 403);
    if (!(await this.entitlements.has(req.couple.coupleId, key))) {
      throw new AppError(ErrorCode.ENTITLEMENT_REQUIRED, 'Cette fonctionnalité est réservée à Premium.', 402, { required: key });
    }
    return true;
  }
}

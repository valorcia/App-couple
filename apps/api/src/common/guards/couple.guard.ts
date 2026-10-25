import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ErrorCode } from '@couple/shared';
import { PrismaService } from '../prisma/prisma.service';
import { type AuthenticatedRequest, IS_PUBLIC_KEY, REQUIRE_COUPLE_KEY } from '../decorators/auth.decorators';

/**
 * Charge le couple courant de l'utilisateur dans req.couple (null si aucun).
 * Avec @RequireCouple(), exige un couple ACTIF (deux membres).
 */
@Injectable()
export class CoupleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) return true; // JwtAuthGuard a déjà échoué ou route publique
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_COUPLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const membership = await this.prisma.coupleMembership.findFirst({
      where: { userId: req.user.id, leftAt: null },
      select: {
        coupleId: true,
        couple: {
          select: {
            status: true,
            memberships: { where: { leftAt: null, NOT: { userId: req.user.id } }, select: { userId: true } },
          },
        },
      },
    });

    if (!membership) {
      req.couple = null;
      if (required) throw new AppError(ErrorCode.COUPLE_REQUIRED, "Associez d'abord votre partenaire.", 403);
      return true;
    }
    req.couple = {
      coupleId: membership.coupleId,
      partnerUserId: membership.couple.memberships[0]?.userId ?? null,
      status: membership.couple.status,
    };
    if (required && membership.couple.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.COUPLE_NOT_ACTIVE, "Ce couple n'est pas encore actif.", 403);
    }
    return true;
  }
}

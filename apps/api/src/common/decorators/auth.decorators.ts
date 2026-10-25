import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';

export const IS_PUBLIC_KEY = 'isPublic';
/** Route accessible sans authentification. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const ALLOW_UNVERIFIED_KEY = 'allowUnverified';
/** Autorise un utilisateur dont l'e-mail n'est pas encore vérifié. */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);

export const REQUIRE_COUPLE_KEY = 'requireCouple';
/**
 * Exige un couple ACTIF (deux partenaires). Le contexte couple est toujours chargé par
 * CoupleGuard ; sans ce décorateur, les routes doivent gérer l'absence de couple.
 */
export const RequireCouple = () => SetMetadata(REQUIRE_COUPLE_KEY, true);

export interface AuthUser {
  id: string;
  role: UserRole;
  emailVerified: boolean;
  sessionVersion: number;
}

export interface CoupleContext {
  coupleId: string;
  partnerUserId: string | null;
  status: 'PENDING' | 'ACTIVE' | 'DISSOLVED';
}

export type AuthenticatedRequest = Request & { user?: AuthUser; couple?: CoupleContext | null };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.user) throw new Error('CurrentUser utilisé sans JwtAuthGuard');
  return req.user;
});

export const CurrentCouple = createParamDecorator((_data: unknown, ctx: ExecutionContext): CoupleContext => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  // Filet de sécurité : jamais d'accès à une ressource commune sans couple actif, même sans @RequireCouple().
  if (!req.couple || req.couple.status !== 'ACTIVE') {
    throw new AppError(ErrorCode.COUPLE_REQUIRED, "Associez d'abord votre partenaire.", 403);
  }
  return req.couple;
});

export const CurrentCoupleOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CoupleContext | null =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().couple ?? null,
);

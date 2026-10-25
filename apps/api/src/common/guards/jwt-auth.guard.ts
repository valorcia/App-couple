import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, ErrorCode } from '@couple/shared';
import { TokenService } from '@/modules/auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { ALLOW_UNVERIFIED_KEY, type AuthenticatedRequest, IS_PUBLIC_KEY } from '../decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
    const payload = this.tokens.verifyAccessToken(header.slice(7));

    // Vérification légère en base : statut et version de session (révocation globale).
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, sessionVersion: true, emailVerifiedAt: true },
    });
    if (!user || user.status === 'DELETED') throw AppError.unauthorized();
    if (user.status === 'SUSPENDED') throw new AppError(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Ce compte est suspendu.', 403);
    if (user.sessionVersion !== payload.sv) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Session expirée.', 401);

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!user.emailVerifiedAt && !allowUnverified) {
      throw new AppError(ErrorCode.AUTH_EMAIL_NOT_VERIFIED, 'Confirmez votre adresse e-mail pour continuer.', 403);
    }

    req.user = { id: user.id, role: user.role, emailVerified: !!user.emailVerifiedAt, sessionVersion: user.sessionVersion };
    return true;
  }
}

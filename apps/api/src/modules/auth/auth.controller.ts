import { Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@couple/validation';
import type { AuthResponseDto, AuthTokensDto } from '@couple/types';
import { AppError, ErrorCode } from '@couple/shared';
import { ENV, type Env } from '@/config/env';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { AllowUnverified, type AuthenticatedRequest, CurrentUser, Public, type AuthUser } from '@/common/decorators/auth.decorators';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { AuthService, type ClientMeta, type IssuedTokens } from './auth.service';
import { UsersService } from '../users/users.service';

const REFRESH_COOKIE = 'en_refresh';

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  @RateLimit({ name: 'auth.register', limit: 5, windowSec: 3600 })
  @ApiOperation({ summary: 'Créer un compte (envoie un e-mail de vérification)' })
  async register(@ZodBody(registerSchema) body: typeof registerSchema._output, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.register(body, meta(req));
    return this.respond(req, res, user.id, tokens);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit({ name: 'auth.login', limit: 5, windowSec: 60, by: 'ip+body:email' })
  async login(@ZodBody(loginSchema) body: typeof loginSchema._output, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.login(body, meta(req));
    return this.respond(req, res, user.id, tokens);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @RateLimit({ name: 'auth.refresh', limit: 30, windowSec: 60 })
  @ApiOperation({ summary: 'Renouvelle les jetons (rotation du refresh token)' })
  async refresh(@ZodBody(refreshSchema) body: typeof refreshSchema._output, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const token = body.refreshToken ?? cookieToken;
    if (!token) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Jeton manquant.', 401);
    const viaCookie = !body.refreshToken && !!cookieToken;
    if (viaCookie) this.assertCsrf(req);
    const { user, tokens } = await this.auth.refresh(token, meta(req));
    return this.respond(req, res, user.id, tokens, viaCookie);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@ZodBody(logoutSchema) body: typeof logoutSchema._output, @Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    // Optionnellement authentifié : on tente de lire l'utilisateur pour "everywhere".
    let userId: string | undefined;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ') && body.everywhere) {
      try {
        userId = this.users.decodeUserId(header.slice(7));
      } catch {
        userId = undefined;
      }
    }
    await this.auth.logout(body.refreshToken ?? cookieToken, userId, body.everywhere);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(0));
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @RateLimit({ name: 'auth.verify', limit: 10, windowSec: 600 })
  async verifyEmail(@ZodBody(verifyEmailSchema) body: typeof verifyEmailSchema._output): Promise<{ verified: true }> {
    await this.auth.verifyEmail(body.token);
    return { verified: true };
  }

  @AllowUnverified()
  @Post('resend-verification')
  @HttpCode(202)
  @RateLimit({ name: 'auth.resend', limit: 3, windowSec: 600, by: 'user' })
  @ApiBearerAuth()
  async resend(@CurrentUser() user: AuthUser): Promise<{ sent: true }> {
    await this.auth.resendVerification(user.id);
    return { sent: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @RateLimit({ name: 'auth.forgot', limit: 3, windowSec: 600, by: 'ip+body:email' })
  async forgot(@ZodBody(forgotPasswordSchema) body: typeof forgotPasswordSchema._output): Promise<{ sent: true }> {
    await this.auth.forgotPassword(body.email);
    return { sent: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @RateLimit({ name: 'auth.reset', limit: 5, windowSec: 600 })
  async reset(@ZodBody(resetPasswordSchema) body: typeof resetPasswordSchema._output, @Req() req: Request): Promise<{ reset: true }> {
    await this.auth.resetPassword(body.token, body.password, meta(req));
    return { reset: true };
  }

  @AllowUnverified()
  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: AuthUser, @ZodBody(changePasswordSchema) body: typeof changePasswordSchema._output, @Req() req: Request): Promise<{ changed: true }> {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword, meta(req));
    return { changed: true };
  }

  @AllowUnverified()
  @Get('sessions')
  @ApiBearerAuth()
  async sessions(@CurrentUser() user: AuthUser) {
    return this.users.listSessions(user.id);
  }

  // ------------------------------------------------------------------ helpers
  private async respond(req: Request, res: Response, userId: string, tokens: IssuedTokens, viaCookie = false): Promise<AuthResponseDto> {
    const isWeb = viaCookie || (req.headers['x-client-platform'] as string | undefined) === 'web';
    const dto: AuthTokensDto = { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
    if (isWeb) {
      res.cookie(REFRESH_COOKIE, tokens.refreshToken, this.cookieOptions(tokens.refreshExpiresAt.getTime() - Date.now()));
    } else {
      dto.refreshToken = tokens.refreshToken;
    }
    const user = await this.users.getMe(userId);
    return { tokens: dto, user };
  }

  private cookieOptions(maxAgeMs: number) {
    return {
      httpOnly: true,
      secure: this.env.COOKIE_SECURE,
      sameSite: 'lax' as const,
      path: '/auth',
      maxAge: maxAgeMs,
    };
  }

  /** Anti-CSRF pour le refresh par cookie : en-tête personnalisé + Origin dans la liste autorisée. */
  private assertCsrf(req: Request) {
    const origins = this.env.CORS_ORIGINS.split(',').map((o) => o.trim());
    const origin = req.headers.origin;
    if (req.headers['x-requested-with'] !== 'EntreNous' || (origin && !origins.includes(origin))) {
      throw new AppError(ErrorCode.AUTH_CSRF, 'Requête refusée.', 403);
    }
  }
}

function meta(req: Request): ClientMeta {
  const platform = (req.headers['x-client-platform'] as string | undefined) ?? 'unknown';
  return {
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    platform: platform === 'web' || platform === 'ios' || platform === 'android' ? platform : 'unknown',
  };
}

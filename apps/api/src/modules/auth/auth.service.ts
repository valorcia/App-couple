import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, User } from '@couple/database';
import { AppError, ErrorCode, newId, randomToken, sha256 } from '@couple/shared';
import type { LoginInput, RegisterInput } from '@couple/validation';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from '@/common/mail/mail.service';
import { AuditService } from '@/common/audit/audit.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export interface ClientMeta {
  ip?: string | null;
  userAgent?: string | null;
  platform?: 'web' | 'ios' | 'android' | 'unknown';
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: Date;
}

const VERIFY_TTL_MS = 24 * 3600 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------ inscription
  async register(input: RegisterInput, meta: ClientMeta): Promise<{ user: User; tokens: IssuedTokens }> {
    this.passwords.assertStrong(input.password, [input.email.split('@')[0] ?? '', input.displayName]);
    const existing = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw AppError.conflict(ErrorCode.AUTH_EMAIL_TAKEN, 'Un compte existe déjà avec cet e-mail.');

    const passwordHash = await this.passwords.hash(input.password);
    const verifyToken = randomToken();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          locale: input.locale,
          timezone: input.timezone,
          profile: { create: { displayName: input.displayName } },
          consents: {
            create: [
              { scope: 'TERMS', version: input.termsVersion, ip: meta.ip, userAgent: meta.userAgent },
              { scope: 'PRIVACY', version: input.termsVersion, ip: meta.ip, userAgent: meta.userAgent },
              ...(input.marketingOptIn
                ? [{ scope: 'MARKETING' as const, version: input.termsVersion, ip: meta.ip, userAgent: meta.userAgent }]
                : []),
            ],
          },
          emailVerificationTokens: { create: { tokenHash: sha256(verifyToken), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) } },
          notificationPreferences: {
            create: (['CALENDAR', 'INVITATION', 'GAME', 'CHALLENGE', 'SURPRISE', 'ANNIVERSARY', 'SUGGESTION', 'DAILY_QUESTION', 'SYSTEM'] as const).map(
              (category) => ({ category }),
            ),
          },
        },
      });
      await this.audit.log({ actorUserId: created.id, action: 'auth.register', targetType: 'User', targetId: created.id, ip: meta.ip, userAgent: meta.userAgent }, tx);
      return created;
    });

    await this.mail.send(this.mail.verificationEmail(user.email, input.displayName, this.verifyLink(verifyToken)));
    const tokens = await this.issueTokens(user, meta);
    return { user, tokens };
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user || user.emailVerifiedAt) return;
    const token = randomToken();
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    });
    await this.mail.send(this.mail.verificationEmail(user.email, user.profile?.displayName ?? '', this.verifyLink(token)));
  }

  async verifyEmail(token: string): Promise<User> {
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.usedAt) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, "Ce lien n'est plus valide.", 400);
    if (row.expiresAt < new Date()) throw new AppError(ErrorCode.AUTH_TOKEN_EXPIRED, 'Ce lien a expiré.', 400);
    return this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      const data: Prisma.UserUpdateInput = { emailVerifiedAt: new Date() };
      if (row.newEmail) data.email = row.newEmail;
      const user = await tx.user.update({ where: { id: row.userId }, data });
      await this.audit.log({ actorUserId: user.id, action: 'auth.email_verified', targetType: 'User', targetId: user.id }, tx);
      return user;
    });
  }

  // ------------------------------------------------------------------ connexion
  async login(input: LoginInput, meta: ClientMeta): Promise<{ user: User; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const ok = await this.passwords.verify(user?.passwordHash, input.password);
    if (!user || !ok || user.status === 'DELETED') {
      throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'E-mail ou mot de passe incorrect.', 401);
    }
    if (user.status === 'SUSPENDED') throw new AppError(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Ce compte est suspendu.', 403);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueTokens(user, meta);
    return { user, tokens };
  }

  // ------------------------------------------------------------------ refresh (rotation + détection de réutilisation)
  async refresh(refreshToken: string, meta: ClientMeta): Promise<{ user: User; tokens: IssuedTokens }> {
    const tokenHash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!session) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Session invalide.', 401);

    if (session.revokedAt) {
      // Réutilisation d'un jeton déjà tourné : compromission probable → révoque toute la famille.
      await this.prisma.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorUserId: session.userId, action: 'auth.refresh_reuse_detected', targetType: 'Session', targetId: session.id, ip: meta.ip });
      throw new AppError(ErrorCode.AUTH_TOKEN_REUSED, 'Votre session a été invalidée par sécurité.', 401);
    }
    if (session.expiresAt < new Date()) throw new AppError(ErrorCode.AUTH_TOKEN_EXPIRED, 'Session expirée.', 401);
    if (session.user.status !== 'ACTIVE' && session.user.status !== 'PENDING_DELETION') throw AppError.unauthorized();

    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date(), lastUsedAt: new Date() } });
      return this.createSession(tx, session.user, meta, session.familyId);
    });
    return { user: session.user, tokens };
  }

  async logout(refreshToken: string | undefined, userId: string | undefined, everywhere: boolean): Promise<void> {
    if (everywhere && userId) {
      await this.prisma.$transaction([
        this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        this.prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
      ]);
      return;
    }
    if (refreshToken) {
      await this.prisma.session.updateMany({ where: { tokenHash: sha256(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
    }
  }

  // ------------------------------------------------------------------ mot de passe
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Réponse identique que le compte existe ou non (pas d'énumération).
    if (!user || user.status === 'DELETED') return;
    const token = randomToken();
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    await this.mail.send(this.mail.passwordResetEmail(user.email, `${this.env.WEB_PUBLIC_URL}/reinitialiser?token=${token}`));
  }

  async resetPassword(token: string, password: string, meta: ClientMeta): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!row || row.usedAt) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, "Ce lien n'est plus valide.", 400);
    if (row.expiresAt < new Date()) throw new AppError(ErrorCode.AUTH_TOKEN_EXPIRED, 'Ce lien a expiré.', 400);
    this.passwords.assertStrong(password, [row.user.email.split('@')[0] ?? '']);
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorUserId: row.userId, action: 'auth.password_reset', targetType: 'User', targetId: row.userId, ip: meta.ip }, tx);
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, meta: ClientMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(user.passwordHash, currentPassword))) {
      throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Mot de passe actuel incorrect.', 400);
    }
    this.passwords.assertStrong(newPassword, [user.email.split('@')[0] ?? '']);
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorUserId: userId, action: 'auth.password_changed', targetType: 'User', targetId: userId, ip: meta.ip }, tx);
    });
  }

  // ------------------------------------------------------------------ internes
  async issueTokens(user: User, meta: ClientMeta): Promise<IssuedTokens> {
    return this.prisma.$transaction((tx) => this.createSession(tx, user, meta, newId()));
  }

  private async createSession(tx: Prisma.TransactionClient, user: User, meta: ClientMeta, familyId: string): Promise<IssuedTokens> {
    const refreshToken = randomToken();
    const refreshExpiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        ip: meta.ip ?? null,
        platform: meta.platform ?? 'unknown',
        expiresAt: refreshExpiresAt,
      },
    });
    // Relit la version de session (peut avoir changé dans la même transaction).
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { sessionVersion: true, role: true } });
    const accessToken = this.tokens.signAccessToken({ id: user.id, role: fresh.role, sessionVersion: fresh.sessionVersion });
    return { accessToken, refreshToken, expiresIn: this.tokens.accessTtlSeconds, refreshExpiresAt };
  }

  private verifyLink(token: string) {
    return `${this.env.WEB_PUBLIC_URL}/verifier-email?token=${token}`;
  }
}

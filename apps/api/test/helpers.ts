import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '@/app.factory';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from '@/common/mail/mail.service';
import { RedisService } from '@/common/redis/redis.service';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  mail: MailService;
  http: () => request.Agent;
  close: () => Promise<void>;
}

export async function bootTestApp(): Promise<TestContext> {
  const app = await createApp();
  await app.init();
  const prisma = app.get(PrismaService);
  const mail = app.get(MailService);
  const redis = app.get(RedisService);
  await redis.client.flushdb();
  return {
    app,
    prisma,
    mail,
    http: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
    },
  };
}

/** Vide les tables métier (ordre géré par les cascades). */
export async function resetDb(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.webhookEvent.deleteMany(),
    prisma.couple.deleteMany(),
    prisma.user.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.appSetting.deleteMany(),
    prisma.product.deleteMany(),
  ]);
}

let counter = 0;
export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}${Date.now()}${counter}@test.local`;
}

export async function registerUser(ctx: TestContext, overrides: Partial<{ email: string; displayName: string; password: string }> = {}) {
  const email = overrides.email ?? uniqueEmail();
  // IP unique par inscription : le rate limiting (5/h/IP) reste actif et testé séparément.
  counter += 1;
  const res = await ctx
    .http()
    .post('/auth/register')
    .set('X-Forwarded-For', `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`)
    .send({ email, password: overrides.password ?? 'UnMotDePasse!Solide', displayName: overrides.displayName ?? 'Camille', acceptTerms: true });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const { accessToken, refreshToken } = res.body.tokens as { accessToken: string; refreshToken: string };
  return { email, userId: res.body.user.id as string, accessToken, refreshToken };
}

export function extractToken(text: string | undefined, param = 'token'): string {
  const m = new RegExp(`${param}=([A-Za-z0-9_-]+)`).exec(text ?? '');
  if (!m) throw new Error('token introuvable dans le mail');
  return m[1]!;
}

export async function registerVerifiedUser(ctx: TestContext, overrides: Partial<{ email: string; displayName: string; password: string }> = {}) {
  const user = await registerUser(ctx, overrides);
  const token = extractToken(ctx.mail.lastMessage?.text);
  counter += 1;
  const res = await ctx.http().post('/auth/verify-email').set('X-Forwarded-For', `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`).send({ token });
  if (res.status !== 200) throw new Error(`verify failed ${res.status}`);
  return user;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createCouple(ctx: TestContext) {
  const a = await registerVerifiedUser(ctx, { displayName: 'Alex' });
  const b = await registerVerifiedUser(ctx, { displayName: 'Camille' });
  const created = await ctx.http().post('/couples').set(auth(a.accessToken)).send({});
  if (created.status !== 201) throw new Error(`couple create failed ${created.status} ${JSON.stringify(created.body)}`);
  const code = created.body.pendingInvitation.code as string;
  const joined = await ctx.http().post('/couples/join').set(auth(b.accessToken)).send({ code });
  if (joined.status !== 200) throw new Error(`join failed ${joined.status} ${JSON.stringify(joined.body)}`);
  return { a, b, coupleId: created.body.id as string };
}

export async function promoteToAdmin(ctx: TestContext, userId: string) {
  await ctx.prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
}

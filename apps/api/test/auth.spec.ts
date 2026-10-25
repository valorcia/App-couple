import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, extractToken, registerUser, registerVerifiedUser, resetDb, type TestContext, uniqueEmail } from './helpers';

describe('Auth', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
  });
  afterAll(async () => ctx.close());

  it('inscrit un utilisateur, envoie un e-mail de vérification et refuse les doublons', async () => {
    const email = uniqueEmail('inscription');
    const res = await ctx.http().post('/auth/register').send({ email, password: 'UnMotDePasse!Solide', displayName: 'Nadia', acceptTerms: true });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.tokens.accessToken).toBeTypeOf('string');
    expect(res.body.tokens.refreshToken).toBeTypeOf('string');
    expect(ctx.mail.lastMessage?.to).toBe(email);
    expect(ctx.mail.lastMessage?.text).toContain('verifier-email?token=');

    const dup = await ctx.http().post('/auth/register').send({ email: email.toUpperCase(), password: 'UnMotDePasse!Solide', displayName: 'X', acceptTerms: true });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('AUTH_EMAIL_TAKEN');
  });

  it('refuse les mots de passe faibles et les CGU non acceptées', async () => {
    const weak = await ctx.http().post('/auth/register').send({ email: uniqueEmail(), password: 'motdepasse123', displayName: 'X', acceptTerms: true });
    expect(weak.status).toBe(400);
    expect(weak.body.code).toBe('AUTH_PASSWORD_WEAK');
    const noTerms = await ctx.http().post('/auth/register').send({ email: uniqueEmail(), password: 'UnMotDePasse!Solide', displayName: 'X', acceptTerms: false });
    expect(noTerms.status).toBe(400);
    expect(noTerms.body.code).toBe('VALIDATION_FAILED');
  });

  it('bloque les routes sensibles tant que l\'e-mail n\'est pas vérifié, puis les ouvre', async () => {
    const u = await registerUser(ctx);
    const me = await ctx.http().get('/me').set(auth(u.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.emailVerified).toBe(false);

    const couple = await ctx.http().post('/couples').set(auth(u.accessToken)).send({});
    expect(couple.status).toBe(403);
    expect(couple.body.code).toBe('AUTH_EMAIL_NOT_VERIFIED');

    const token = extractToken(ctx.mail.lastMessage?.text);
    const verify = await ctx.http().post('/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);
    const again = await ctx.http().post('/auth/verify-email').send({ token });
    expect(again.status).toBe(400);

    const me2 = await ctx.http().get('/me').set(auth(u.accessToken));
    expect(me2.body.emailVerified).toBe(true);
  });

  it('connecte avec les bons identifiants et refuse les mauvais sans distinguer les cas', async () => {
    const u = await registerVerifiedUser(ctx);
    const ok = await ctx.http().post('/auth/login').send({ email: u.email, password: 'UnMotDePasse!Solide' });
    expect(ok.status).toBe(200);
    const bad = await ctx.http().post('/auth/login').send({ email: u.email, password: 'mauvais-mot-de-passe' });
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    const unknown = await ctx.http().post('/auth/login').send({ email: uniqueEmail('inconnu'), password: 'mauvais-mot-de-passe' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('tourne le refresh token et détecte sa réutilisation', async () => {
    const u = await registerVerifiedUser(ctx);
    const r1 = await ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken });
    expect(r1.status).toBe(200);
    const newRefresh = r1.body.tokens.refreshToken as string;
    expect(newRefresh).not.toBe(u.refreshToken);

    // Réutilisation de l'ancien jeton hors fenêtre de grâce → famille révoquée.
    await ctx.prisma.session.updateMany({ where: { userId: u.userId, rotatedAt: { not: null } }, data: { rotatedAt: new Date(Date.now() - 120_000) } });
    const reuse = await ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('AUTH_TOKEN_REUSED');
    const afterReuse = await ctx.http().post('/auth/refresh').send({ refreshToken: newRefresh });
    expect(afterReuse.status).toBe(401);
  });

  it('tolère deux refresh concurrents dans la fenêtre de grâce, mais pas au-delà', async () => {
    const u = await registerVerifiedUser(ctx);
    const [r1, r2] = await Promise.all([
      ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken }),
      ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken }),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    // Hors fenêtre de grâce : réutilisation = compromission.
    await ctx.prisma.session.updateMany({ where: { userId: u.userId, rotatedAt: { not: null } }, data: { rotatedAt: new Date(Date.now() - 120_000) } });
    const late = await ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken });
    expect(late.status).toBe(401);
    expect(late.body.code).toBe('AUTH_TOKEN_REUSED');
    expect((await ctx.http().post('/auth/refresh').send({ refreshToken: r1.body.tokens.refreshToken })).status).toBe(401);
  });

  it('pose un cookie httpOnly pour le web et exige l\'en-tête anti-CSRF au refresh', async () => {
    const email = uniqueEmail('web');
    const res = await ctx.http().post('/auth/register').set('X-Client-Platform', 'web').send({ email, password: 'UnMotDePasse!Solide', displayName: 'Web', acceptTerms: true });
    expect(res.status).toBe(201);
    expect(res.body.tokens.refreshToken).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('en_refresh='));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');

    const noHeader = await ctx.http().post('/auth/refresh').set('Cookie', cookie!).send({});
    expect(noHeader.status).toBe(403);
    expect(noHeader.body.code).toBe('AUTH_CSRF');

    const withHeader = await ctx.http().post('/auth/refresh').set('Cookie', cookie!).set('X-Requested-With', 'EntreNous').set('Origin', 'http://localhost:3000').send({});
    expect(withHeader.status).toBe(200);
    expect(withHeader.body.tokens.refreshToken).toBeUndefined();
  });

  it('réinitialise le mot de passe et invalide les sessions existantes', async () => {
    const u = await registerVerifiedUser(ctx);
    const forgot = await ctx.http().post('/auth/forgot-password').send({ email: u.email });
    expect(forgot.status).toBe(202);
    const token = extractToken(ctx.mail.lastMessage?.text);
    const reset = await ctx.http().post('/auth/reset-password').send({ token, password: 'NouveauMotDePasse!2026' });
    expect(reset.status).toBe(200);

    // Ancien access token invalidé (sessionVersion), ancien refresh révoqué.
    const me = await ctx.http().get('/me').set(auth(u.accessToken));
    expect(me.status).toBe(401);
    const refresh = await ctx.http().post('/auth/refresh').send({ refreshToken: u.refreshToken });
    expect(refresh.status).toBe(401);

    const login = await ctx.http().post('/auth/login').send({ email: u.email, password: 'NouveauMotDePasse!2026' });
    expect(login.status).toBe(200);
    // Pas d'énumération : e-mail inconnu → même réponse.
    const unknown = await ctx.http().post('/auth/forgot-password').send({ email: uniqueEmail('nobody') });
    expect(unknown.status).toBe(202);
  });

  it('déconnecte partout et incrémente la version de session', async () => {
    const u = await registerVerifiedUser(ctx);
    const out = await ctx.http().post('/auth/logout').set(auth(u.accessToken)).send({ everywhere: true });
    expect(out.status).toBe(204);
    const me = await ctx.http().get('/me').set(auth(u.accessToken));
    expect(me.status).toBe(401);
  });

  it('applique le rate limiting sur la connexion', async () => {
    const email = uniqueEmail('ratelimit');
    let last = 0;
    for (let i = 0; i < 7; i++) {
      const r = await ctx.http().post('/auth/login').send({ email, password: 'mauvais-mot-de-passe' });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});

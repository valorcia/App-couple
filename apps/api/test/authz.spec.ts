import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, promoteToAdmin, registerVerifiedUser, resetDb, type TestContext } from './helpers';

describe('Autorisations', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
  });
  afterAll(async () => ctx.close());

  it('refuse les requêtes sans jeton ou avec un jeton altéré', async () => {
    expect((await ctx.http().get('/me')).status).toBe(401);
    expect((await ctx.http().get('/me').set(auth('abc.def.ghi'))).status).toBe(401);
    const u = await registerVerifiedUser(ctx);
    const tampered = u.accessToken.slice(0, -2) + 'xx';
    expect((await ctx.http().get('/me').set(auth(tampered))).status).toBe(401);
  });

  it('exige un couple actif pour les ressources communes', async () => {
    const u = await registerVerifiedUser(ctx);
    const res = await ctx.http().patch('/couples/me').set(auth(u.accessToken)).send({ name: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COUPLE_REQUIRED');
  });

  it('réserve l\'administration aux rôles ADMIN/SUPPORT et journalise les actions', async () => {
    const { a, b } = await createCouple(ctx);
    expect((await ctx.http().get('/admin/users').set(auth(a.accessToken))).status).toBe(403);

    await promoteToAdmin(ctx, a.userId);
    // Nouveau jeton nécessaire ? Non : le rôle est relu en base par le guard.
    const users = await ctx.http().get('/admin/users').set(auth(a.accessToken)).query({ q: b.email });
    expect(users.status).toBe(200);
    expect(users.body.items[0].email).toBe(b.email);
    // L'admin ne voit que des métadonnées.
    expect(Object.keys(users.body.items[0]).sort()).toEqual(
      ['coupleId', 'createdAt', 'displayName', 'email', 'emailVerified', 'id', 'lastLoginAt', 'role', 'status'].sort(),
    );

    const stats = await ctx.http().get('/admin/stats').set(auth(a.accessToken));
    expect(stats.status).toBe(200);
    expect(stats.body.couplesActive).toBeGreaterThanOrEqual(1);

    // Suspension : l'utilisateur perd immédiatement l'accès.
    const susp = await ctx.http().post(`/admin/users/${b.userId}/suspend`).set(auth(a.accessToken)).send({ reason: 'Comportement abusif signalé' });
    expect(susp.status).toBe(204);
    const me = await ctx.http().get('/me').set(auth(b.accessToken));
    expect(me.status).toBe(403);
    expect(me.body.code).toBe('AUTH_ACCOUNT_SUSPENDED');
    const login = await ctx.http().post('/auth/login').send({ email: b.email, password: 'UnMotDePasse!Solide' });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('AUTH_ACCOUNT_SUSPENDED');

    const audit = await ctx.http().get('/admin/audit').set(auth(a.accessToken));
    expect(audit.body.items.some((e: { action: string }) => e.action === 'admin.user.suspend')).toBe(true);

    await ctx.http().post(`/admin/users/${b.userId}/unsuspend`).set(auth(a.accessToken));
    expect((await ctx.http().post('/auth/login').send({ email: b.email, password: 'UnMotDePasse!Solide' })).status).toBe(200);
  });

  it('gère flags, paramètres et produits depuis l\'admin', async () => {
    const admin = await registerVerifiedUser(ctx);
    await promoteToAdmin(ctx, admin.userId);
    const flag = await ctx.http().put('/admin/flags').set(auth(admin.accessToken)).send({ key: 'intimacy.module', enabled: true });
    expect(flag.status).toBe(200);
    expect(flag.body.enabled).toBe(true);

    const setting = await ctx.http().put('/admin/settings').set(auth(admin.accessToken)).send({ key: 'invitation.maxPerDay', value: 2 });
    expect(setting.status).toBe(200);
    const list = await ctx.http().get('/admin/settings').set(auth(admin.accessToken));
    expect(list.body.find((s: { key: string }) => s.key === 'invitation.maxPerDay').value).toBe(2);

    const product = await ctx.http().put('/admin/products').set(auth(admin.accessToken)).send({
      code: 'premium_monthly', type: 'SUBSCRIPTION', name: 'Premium Couple mensuel', priceCents: 499, interval: 'MONTH', entitlementKey: 'premium',
    });
    expect(product.status).toBe(200);
    expect(product.body.priceCents).toBe(499);
    const products = await ctx.http().get('/admin/products').set(auth(admin.accessToken));
    expect(products.body).toHaveLength(1);

    // Le paramètre modifié est appliqué : 2 invitations/jour max.
    const u = await registerVerifiedUser(ctx);
    await ctx.http().post('/couples').set(auth(u.accessToken)).send({});
    await ctx.http().post('/couples/invitations').set(auth(u.accessToken)).send({});
    const third = await ctx.http().post('/couples/invitations').set(auth(u.accessToken)).send({});
    expect(third.status).toBe(429);
    expect(third.body.code).toBe('INVITATION_LIMIT');
    await ctx.http().put('/admin/settings').set(auth(admin.accessToken)).send({ key: 'invitation.maxPerDay', value: 5 });
  });

  it('un rôle SUPPORT lit mais ne suspend pas', async () => {
    const support = await registerVerifiedUser(ctx);
    await ctx.prisma.user.update({ where: { id: support.userId }, data: { role: 'SUPPORT' } });
    const target = await registerVerifiedUser(ctx);
    expect((await ctx.http().get('/admin/users').set(auth(support.accessToken))).status).toBe(200);
    expect((await ctx.http().post(`/admin/users/${target.userId}/suspend`).set(auth(support.accessToken)).send({ reason: 'Test de permissions' })).status).toBe(403);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, registerVerifiedUser, resetDb, type TestContext } from './helpers';

describe('Couples', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
  });
  afterAll(async () => ctx.close());

  it('crée un espace couple avec un code, puis associe le partenaire', async () => {
    const a = await registerVerifiedUser(ctx, { displayName: 'Alex' });
    const b = await registerVerifiedUser(ctx, { displayName: 'Camille' });

    const none = await ctx.http().get('/couples/me').set(auth(a.accessToken));
    expect(none.status).toBe(200);
    expect(none.body.couple).toBeNull();

    const created = await ctx.http().post('/couples').set(auth(a.accessToken)).send({ targetEmail: b.email });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');
    expect(created.body.partner).toBeNull();
    const code = created.body.pendingInvitation.code as string;
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    expect(ctx.mail.lastMessage?.to).toBe(b.email);
    expect(ctx.mail.lastMessage?.text).toContain(code);

    // Le code n'est jamais relu depuis la base.
    const reread = await ctx.http().get('/couples/me').set(auth(a.accessToken));
    expect(reread.body.couple.pendingInvitation.code).toBeUndefined();

    // Routes "couple requis" bloquées tant que le couple n'est pas actif.
    const patch = await ctx.http().patch('/couples/me').set(auth(a.accessToken)).send({ name: 'Nous' });
    expect(patch.status).toBe(403);
    expect(patch.body.code).toBe('COUPLE_NOT_ACTIVE');

    // Acceptation (code saisi en minuscules avec séparateurs → normalisé).
    const joined = await ctx.http().post('/couples/join').set(auth(b.accessToken)).send({ code: code.toLowerCase().slice(0, 4) + '-' + code.slice(4) });
    expect(joined.status).toBe(200);
    expect(joined.body.status).toBe('ACTIVE');
    expect(joined.body.partner.profile.displayName).toBe('Alex');
    expect(joined.body.pendingInvitation).toBeNull();

    const fromA = (await ctx.http().get('/couples/me').set(auth(a.accessToken))).body.couple;
    expect(fromA.partner.profile.displayName).toBe('Camille');
    // Le partenaire ne voit pas l'e-mail ni les champs internes de l'autre.
    expect(fromA.partner.email).toBeUndefined();

    const me = await ctx.http().get('/me').set(auth(a.accessToken));
    expect(me.body.couple.id).toBe(created.body.id);
    expect(me.body.entitlements).toEqual([]);

    const updated = await ctx.http().patch('/couples/me').set(auth(b.accessToken)).send({ name: 'Nous deux', metAt: '2019-06-21' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Nous deux');
    expect(updated.body.metAt).toBe('2019-06-21');
  });

  it('refuse les codes invalides, l\'auto-invitation et la double association', async () => {
    const { a, b } = await createCouple(ctx);
    const c = await registerVerifiedUser(ctx, { displayName: 'Hugo' });

    const bad = await ctx.http().post('/couples/join').set(auth(c.accessToken)).send({ code: 'ZZZZZZZZ' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVITATION_INVALID');

    // a et b sont déjà liés : impossible de créer un autre couple.
    const again = await ctx.http().post('/couples').set(auth(a.accessToken)).send({});
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('COUPLE_ALREADY_LINKED');

    // c crée un couple ; c (déjà membre) ne peut pas accepter son propre code ; b (lié ailleurs) non plus.
    const cCouple = await ctx.http().post('/couples').set(auth(c.accessToken)).send({});
    const code = cCouple.body.pendingInvitation.code as string;
    const self = await ctx.http().post('/couples/join').set(auth(c.accessToken)).send({ code });
    expect(self.status).toBe(409);
    expect(self.body.code).toBe('COUPLE_ALREADY_LINKED');
    const linked = await ctx.http().post('/couples/join').set(auth(b.accessToken)).send({ code });
    expect(linked.status).toBe(409);
    expect(linked.body.code).toBe('COUPLE_ALREADY_LINKED');

    // Code expiré.
    await ctx.prisma.invitation.updateMany({ where: { coupleId: cCouple.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const d = await registerVerifiedUser(ctx, { displayName: 'Dana' });
    const expired = await ctx.http().post('/couples/join').set(auth(d.accessToken)).send({ code });
    expect(expired.body.code).toBe('INVITATION_EXPIRED');

    // Régénération : nouveau code, l'ancien est révoqué.
    const renewed = await ctx.http().post('/couples/invitations').set(auth(c.accessToken)).send({});
    expect(renewed.status).toBe(201);
    expect(renewed.body.code).not.toBe(code);
    const joinNew = await ctx.http().post('/couples/join').set(auth(d.accessToken)).send({ code: renewed.body.code });
    expect(joinNew.status).toBe(200);
  });

  it('un code accepté ne peut pas servir une seconde fois (couple complet)', async () => {
    const a = await registerVerifiedUser(ctx);
    const b = await registerVerifiedUser(ctx);
    const c = await registerVerifiedUser(ctx);
    const created = await ctx.http().post('/couples').set(auth(a.accessToken)).send({});
    const code = created.body.pendingInvitation.code as string;
    expect((await ctx.http().post('/couples/join').set(auth(b.accessToken)).send({ code })).status).toBe(200);
    const third = await ctx.http().post('/couples/join').set(auth(c.accessToken)).send({ code });
    expect(third.status).toBe(400);
    expect(third.body.code).toBe('INVITATION_INVALID');
  });

  it('permet de quitter le couple unilatéralement ; les deux redeviennent libres', async () => {
    const { a, b, coupleId } = await createCouple(ctx);
    const left = await ctx.http().delete('/couples/me').set(auth(a.accessToken)).send({ confirm: true });
    expect(left.status).toBe(204);

    const meA = await ctx.http().get('/couples/me').set(auth(a.accessToken));
    expect(meA.body.couple).toBeNull();
    const meB = await ctx.http().get('/couples/me').set(auth(b.accessToken));
    expect(meB.body.couple).toBeNull();

    const couple = await ctx.prisma.couple.findUnique({ where: { id: coupleId } });
    expect(couple?.status).toBe('DISSOLVED');

    // Chacun peut recommencer.
    const fresh = await ctx.http().post('/couples').set(auth(b.accessToken)).send({});
    expect(fresh.status).toBe(201);
    // Un couple PENDING quitté est supprimé.
    expect((await ctx.http().delete('/couples/me').set(auth(b.accessToken)).send({ confirm: true })).status).toBe(204);
    expect(await ctx.prisma.couple.findUnique({ where: { id: fresh.body.id } })).toBeNull();
  });

  it('absorbe des associations concurrentes de couples différents', async () => {
    const pairs = await Promise.all(Array.from({ length: 4 }, async () => ({ a: await registerVerifiedUser(ctx), b: await registerVerifiedUser(ctx) })));
    const codes = await Promise.all(pairs.map(async (p) => (await ctx.http().post('/couples').set(auth(p.a.accessToken)).send({})).body.pendingInvitation.code as string));
    const results = await Promise.all(pairs.map((p, i) => ctx.http().post('/couples/join').set(auth(p.b.accessToken)).send({ code: codes[i] })));
    expect(results.map((r) => [r.status, r.body.code, r.body.message])).toEqual([[200, undefined, undefined], [200, undefined, undefined], [200, undefined, undefined], [200, undefined, undefined]]);
  });

  it('la base refuse un troisième membre actif même en contournant l\'API', async () => {
    const { coupleId } = await createCouple(ctx);
    const c = await registerVerifiedUser(ctx);
    await expect(ctx.prisma.coupleMembership.create({ data: { coupleId, userId: c.userId } })).rejects.toThrow(/COUPLE_FULL/);
  });
});

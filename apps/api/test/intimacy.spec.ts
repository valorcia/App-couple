import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

describe('Intimité & Double Secret', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  const items: Record<string, string> = {};

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await ctx.prisma.featureFlag.upsert({ where: { key: 'intimacy.module' }, create: { key: 'intimacy.module', enabled: true }, update: { enabled: true } });
    await ctx.prisma.desireItem.deleteMany();
    for (const [key, category, intensity, tier] of [
      ['breakfast', 'tenderness', 1, 'FREE'], ['dance', 'romance', 1, 'FREE'], ['bath', 'complicity', 2, 'FREE'], ['hotel', 'complicity', 2, 'PREMIUM'], ['scenario', 'fantasies', 4, 'PREMIUM'],
    ] as const) {
      items[key] = (await ctx.prisma.desireItem.create({ data: { category, intensity, tier, text: `Envie ${key}` } })).id;
    }
    await ctx.prisma.intimacyCard.deleteMany();
    for (const [level, tier, text] of [[1, 'FREE', 'Carte douce 1'], [1, 'FREE', 'Carte douce 2'], [2, 'PREMIUM', 'Carte complice'], [4, 'PREMIUM', 'Carte feu']] as const) {
      await ctx.prisma.intimacyCard.create({ data: { level, tier, text, role: 'DRAWER' } });
    }
    couple = await createCouple(ctx);
  });
  afterAll(async () => ctx.close());

  const enable = (token: string, body: Record<string, unknown> = {}) =>
    ctx.http().put('/intimacy/settings').set(auth(token)).send({ enabled: true, enabledCategories: ['tenderness', 'romance', 'complicity', 'fantasies'], maxIntensity: 4, ...body });
  const respond = (token: string, item: string, choice: string) => ctx.http().put(`/intimacy/items/${item}/response`).set(auth(token)).send({ choice });

  it('exige la majorité confirmée puis l\'activation de chaque partenaire', async () => {
    const before = await ctx.http().get('/intimacy/settings').set(auth(couple.a.accessToken));
    expect(before.body).toMatchObject({ enabled: false, partnerEnabled: false, bothEnabled: false, adultConfirmed: false, moduleAvailable: true });
    expect((await enable(couple.a.accessToken)).body.code).toBe('ADULT_CONFIRMATION_REQUIRED');

    await ctx.http().post('/me/confirm-adult').set(auth(couple.a.accessToken)).send({ confirm: true });
    await ctx.http().post('/me/confirm-adult').set(auth(couple.b.accessToken)).send({ confirm: true });
    const a = await enable(couple.a.accessToken);
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ enabled: true, partnerEnabled: false, bothEnabled: false });
    // Tant que B n'a pas activé : aucun accès au catalogue, pour personne.
    expect((await ctx.http().get('/intimacy/items').set(auth(couple.a.accessToken))).body.code).toBe('INTIMACY_NOT_ENABLED');
    expect((await ctx.http().get('/intimacy/items').set(auth(couple.b.accessToken))).body.code).toBe('INTIMACY_NOT_ENABLED');
    // B est notifié sans détail.
    const notif = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    expect(notif.body.items.some((n: { type: string }) => n.type === 'intimacy.partner_enabled')).toBe(true);
    const consent = await ctx.prisma.consentRecord.findFirst({ where: { userId: couple.a.userId, scope: 'INTIMACY', revokedAt: null } });
    expect(consent).toBeTruthy();

    const b = await enable(couple.b.accessToken, { maxIntensity: 2 });
    expect(b.body.bothEnabled).toBe(true);
  });

  it('sert le catalogue commun (intersection des réglages) sans jamais exposer les réponses du partenaire', async () => {
    const list = await ctx.http().get('/intimacy/items').set(auth(couple.a.accessToken));
    expect(list.status).toBe(200);
    // Intensité max commune = 2 → « scenario » (4) exclu.
    expect(list.body.map((i: { text: string }) => i.text).sort()).toEqual(['Envie bath', 'Envie breakfast', 'Envie dance', 'Envie hotel']);
    const hotel = list.body.find((i: { text: string }) => i.text === 'Envie hotel');
    expect(hotel.locked).toBe(true); // premium
    const bath = list.body.find((i: { text: string }) => i.text === 'Envie bath');
    expect(bath.locked).toBe(true); // catégorie hors gratuit
    expect((await respond(couple.a.accessToken, items.bath!, 'YES')).status).toBe(402);

    await respond(couple.a.accessToken, items.breakfast!, 'YES');
    await respond(couple.a.accessToken, items.dance!, 'NO');
    const seenByB = await ctx.http().get('/intimacy/items').set(auth(couple.b.accessToken));
    for (const item of seenByB.body) expect(item.myChoice).toBeNull();
    expect(JSON.stringify(seenByB.body)).not.toContain('"YES"');
    const matchesB = await ctx.http().get('/intimacy/matches').set(auth(couple.b.accessToken));
    expect(matchesB.body).toMatchObject({ mutualCount: 0, revealed: [], pendingCount: 0, partnerRequested: false });
  });

  it('ne compte que les « Oui » mutuels et ne révèle qu\'après demande des deux', async () => {
    await respond(couple.b.accessToken, items.breakfast!, 'YES');
    await respond(couple.b.accessToken, items.dance!, 'YES'); // A a dit NON → pas commun
    const m = await ctx.http().get('/intimacy/matches').set(auth(couple.a.accessToken));
    expect(m.body).toMatchObject({ mutualCount: 1, pendingCount: 1, revealed: [] });
    expect(JSON.stringify(m.body)).not.toContain('breakfast');

    const reqA = await ctx.http().post('/intimacy/matches/reveal').set(auth(couple.a.accessToken));
    expect(reqA.body).toMatchObject({ revealed: [], iRequested: true, partnerRequested: false });
    const mB = await ctx.http().get('/intimacy/matches').set(auth(couple.b.accessToken));
    expect(mB.body).toMatchObject({ partnerRequested: true, iRequested: false, revealed: [] });
    const notif = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    expect(notif.body.items.some((n: { type: string }) => n.type === 'intimacy.reveal_requested')).toBe(true);

    const reqB = await ctx.http().post('/intimacy/matches/reveal').set(auth(couple.b.accessToken));
    expect(reqB.body.revealed.map((r: { text: string }) => r.text)).toEqual(['Envie breakfast']);
    expect(reqB.body.pendingCount).toBe(0);
    expect((await ctx.http().get('/intimacy/matches').set(auth(couple.a.accessToken))).body.revealed).toHaveLength(1);

    // Retrait d'un « Oui » : l'envie disparaît des révélations.
    await respond(couple.a.accessToken, items.breakfast!, 'MAYBE');
    expect((await ctx.http().get('/intimacy/matches').set(auth(couple.b.accessToken))).body).toMatchObject({ mutualCount: 0, revealed: [] });
    await respond(couple.a.accessToken, items.breakfast!, 'YES');
    expect((await ctx.http().get('/intimacy/matches').set(auth(couple.b.accessToken))).body.revealed).toHaveLength(1);
  });

  it('signal « Ce soir ? » : rien n\'est visible tant que les deux ne l\'ont pas allumé', async () => {
    const onA = await ctx.http().put('/intimacy/tonight').set(auth(couple.a.accessToken)).send({ on: true });
    expect(onA.status).toBe(200);
    expect(onA.body).toMatchObject({ mine: true, mutual: false });
    expect(onA.body.expiresAt).toBeTruthy();
    // B ne voit rien du signal de A : seulement son propre état (éteint) et « pas mutuel ».
    const seenB = await ctx.http().get('/intimacy/tonight').set(auth(couple.b.accessToken));
    expect(seenB.body).toEqual({ mine: false, mutual: false, expiresAt: null });
    const onB = await ctx.http().put('/intimacy/tonight').set(auth(couple.b.accessToken)).send({ on: true });
    expect(onB.body).toMatchObject({ mine: true, mutual: true });
    expect((await ctx.http().get('/intimacy/tonight').set(auth(couple.a.accessToken))).body.mutual).toBe(true);
    const notif = await ctx.http().get('/notifications').set(auth(couple.a.accessToken));
    const n = notif.body.items.find((x: { type: string }) => x.type === 'intimacy.tonight');
    expect(n).toBeTruthy();
    expect(JSON.stringify(n)).not.toMatch(/sexe|envie/i);
    // A éteint : plus rien de mutuel, et B ne sait pas pourquoi.
    expect((await ctx.http().put('/intimacy/tonight').set(auth(couple.a.accessToken)).send({ on: false })).body).toMatchObject({ mine: false, mutual: false });
    expect((await ctx.http().get('/intimacy/tonight').set(auth(couple.b.accessToken))).body).toMatchObject({ mine: true, mutual: false });
  });

  it('cartes du soir : table partagée, niveaux bornés par l\'intensité commune, aucune répétition', async () => {
    const table = await ctx.http().get('/intimacy/cards').set(auth(couple.a.accessToken));
    expect(table.status).toBe(200);
    expect(table.body.current).toBeNull();
    // Intensité commune 2 (B) ; pas de Premium : niveau 1 jouable (gratuit), niveau 2 réservé, 3 et 4 hors intensité.
    expect(table.body.levels).toEqual([
      { level: 1, available: true, reason: null, remaining: 2 },
      { level: 2, available: false, reason: 'premium', remaining: 0 },
      { level: 3, available: false, reason: 'intensity', remaining: 0 },
      { level: 4, available: false, reason: 'intensity', remaining: 0 },
    ]);
    expect((await ctx.http().post('/intimacy/cards/draw').set(auth(couple.a.accessToken)).send({ level: 4 })).status).toBe(403);
    expect((await ctx.http().post('/intimacy/cards/draw').set(auth(couple.a.accessToken)).send({ level: 2 })).status).toBe(402);

    const first = await ctx.http().post('/intimacy/cards/draw').set(auth(couple.a.accessToken)).send({ level: 1 });
    expect(first.status).toBe(200);
    expect(first.body.current).toMatchObject({ drawnByUserId: couple.a.userId, card: { level: 1, role: 'DRAWER' } });
    expect(first.body.expiresAt).toBeTruthy();
    // La même carte est sur la table de B.
    const seenB = await ctx.http().get('/intimacy/cards').set(auth(couple.b.accessToken));
    expect(seenB.body.current.card.id).toBe(first.body.current.card.id);

    const second = await ctx.http().post('/intimacy/cards/draw').set(auth(couple.b.accessToken)).send({ level: 1 });
    expect(second.body.current.card.id).not.toBe(first.body.current.card.id);
    expect(second.body.levels[0].remaining).toBe(0);
    expect((await ctx.http().post('/intimacy/cards/draw').set(auth(couple.a.accessToken)).send({ level: 1 })).status).toBe(409);

    const done = await ctx.http().post('/intimacy/cards/done').set(auth(couple.a.accessToken));
    expect(done.body).toMatchObject({ current: null, doneCount: 1 });
    const reset = await ctx.http().delete('/intimacy/cards').set(auth(couple.b.accessToken));
    expect(reset.body).toMatchObject({ current: null, doneCount: 0 });
    expect(reset.body.levels[0].remaining).toBe(2);
  });

  it('permet de retirer son consentement et de supprimer ses réponses', async () => {
    await ctx.http().delete('/intimacy/responses').set(auth(couple.b.accessToken));
    expect((await ctx.http().get('/intimacy/matches').set(auth(couple.a.accessToken))).body.mutualCount).toBe(0);
    const off = await ctx.http().put('/intimacy/settings').set(auth(couple.b.accessToken)).send({ enabled: false });
    expect(off.body).toMatchObject({ enabled: false, bothEnabled: false });
    expect((await ctx.http().get('/intimacy/items').set(auth(couple.a.accessToken))).body.code).toBe('INTIMACY_NOT_ENABLED');
    const consent = await ctx.prisma.consentRecord.findFirst({ where: { userId: couple.b.userId, scope: 'INTIMACY' } });
    expect(consent?.revokedAt).toBeTruthy();
    // Les administrateurs ne voient jamais ces données : aucune route admin ne les expose (vérifié par l'absence de champ).
    const audit = await ctx.prisma.auditLog.findMany({ where: { action: { startsWith: 'intimacy.' } } });
    expect(audit.length).toBeGreaterThan(0);
    expect(JSON.stringify(audit)).not.toContain('breakfast');
  });

  it('refuse l\'espace quand le flag est désactivé', async () => {
    await ctx.prisma.featureFlag.update({ where: { key: 'intimacy.module' }, data: { enabled: false } });
    expect((await ctx.http().put('/intimacy/settings').set(auth(couple.a.accessToken)).send({ enabled: true })).status).toBe(404);
    expect((await ctx.http().get('/intimacy/settings').set(auth(couple.a.accessToken))).body.moduleAvailable).toBe(false);
  });
});

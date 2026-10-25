import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

async function seedCatalog(ctx: TestContext) {
  const cat = async (code: string, name: string, gameTypes: ('SECRET_ANSWERS' | 'WHO_KNOWS_BEST' | 'DILEMMA' | 'WHICH_OF_US' | 'CONFESSIONS')[]) =>
    ctx.prisma.contentCategory.upsert({ where: { code }, create: { code, name, gameTypes }, update: { gameTypes } });
  const love = await cat('love', 'Amour', ['SECRET_ANSWERS', 'CONFESSIONS']);
  const humor = await cat('humor', 'Humour', ['DILEMMA', 'WHICH_OF_US']);
  const personality = await cat('personality', 'Personnalité', ['WHO_KNOWS_BEST']);
  await ctx.prisma.question.deleteMany();
  await ctx.prisma.question.createMany({
    data: [
      { gameType: 'SECRET_ANSWERS', categoryId: love.id, text: 'Q amour 1' },
      { gameType: 'SECRET_ANSWERS', categoryId: love.id, text: 'Q amour 2' },
      { gameType: 'SECRET_ANSWERS', categoryId: love.id, text: 'Q amour 3' },
      { gameType: 'SECRET_ANSWERS', categoryId: love.id, text: 'Q amour premium', tier: 'PREMIUM' },
      { gameType: 'DILEMMA', categoryId: humor.id, text: 'Fromage ou chocolat ?', payload: { options: ['Fromage', 'Chocolat'] } },
      { gameType: 'DILEMMA', categoryId: humor.id, text: 'Chanter ou danser ?', payload: { options: ['Chanter', 'Danser'] } },
      { gameType: 'WHICH_OF_US', categoryId: humor.id, text: 'Lequel chante faux ?' },
      { gameType: 'WHICH_OF_US', categoryId: humor.id, text: 'Lequel perd ses clés ?' },
      { gameType: 'WHO_KNOWS_BEST', categoryId: personality.id, text: 'Mon plat réconfort ?' },
      { gameType: 'WHO_KNOWS_BEST', categoryId: personality.id, text: 'Mon super-pouvoir ?' },
      { gameType: 'CONFESSIONS', categoryId: love.id, text: 'Confession légère', level: 1 },
      { gameType: 'CONFESSIONS', categoryId: love.id, text: 'Confession profonde', level: 3 },
    ],
  });
}

describe('Jeux', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  let other: Awaited<ReturnType<typeof createCouple>>;

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await seedCatalog(ctx);
    couple = await createCouple(ctx);
    other = await createCouple(ctx);
  });
  afterAll(async () => ctx.close());

  const create = (token: string, body: Record<string, unknown>) => ctx.http().post('/games/sessions').set(auth(token)).send(body);
  const answer = (token: string, id: string, index: number, payload: Record<string, unknown>) =>
    ctx.http().post(`/games/sessions/${id}/rounds/${index}/answer`).set(auth(token)).send({ answer: payload });
  const get = (token: string, id: string) => ctx.http().get(`/games/sessions/${id}`).set(auth(token));

  it('expose le catalogue avec les catégories verrouillées pour les comptes gratuits', async () => {
    const res = await ctx.http().get('/games/catalog').set(auth(couple.a.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.premium).toBe(false);
    expect(res.body.sessionsLeftToday).toBe(3);
    const wkb = res.body.games.find((g: { gameType: string }) => g.gameType === 'WHO_KNOWS_BEST');
    expect(wkb.categories[0]).toMatchObject({ code: 'personality', locked: true, questionCount: 2 });
    const secret = res.body.games.find((g: { gameType: string }) => g.gameType === 'SECRET_ANSWERS');
    expect(secret.categories[0]).toMatchObject({ code: 'love', locked: false, questionCount: 3 }); // la question premium n'est pas comptée
  });

  it('joue un dilemme : réponses cachées jusqu\'à la révélation simultanée, puis résumé', async () => {
    const created = await create(couple.a.accessToken, { gameType: 'DILEMMA', categoryCodes: ['humor'], length: 'short' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    expect(created.body.rounds).toHaveLength(2);
    expect(created.body.rounds[0].prompt.options).toHaveLength(2);
    expect(created.body.currentRoundIndex).toBe(0);

    // Le partenaire est notifié et voit la partie, sans réponse.
    const notif = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    expect(notif.body.items.some((n: { type: string }) => n.type === 'game.invited')).toBe(true);
    expect((await get(couple.b.accessToken, id)).status).toBe(200);
    expect((await get(other.a.accessToken, id)).status).toBe(404);

    // A répond ; B ne voit que « le partenaire a répondu », jamais la réponse.
    const a1 = await answer(couple.a.accessToken, id, 0, { kind: 'choice', index: 1 });
    expect(a1.status).toBe(200);
    expect(a1.body.rounds[0].myAnswer).toEqual({ kind: 'choice', index: 1 });
    const seenByB = (await get(couple.b.accessToken, id)).body.rounds[0];
    expect(seenByB).toMatchObject({ partnerAnswered: true, partnerAnswer: null, myAnswer: null, revealedAt: null });
    expect(JSON.stringify(seenByB)).not.toContain('"index":1');

    // Réponse invalide (texte pour un dilemme) refusée.
    expect((await answer(couple.b.accessToken, id, 0, { kind: 'text', text: 'x' })).status).toBe(400);
    expect((await answer(couple.b.accessToken, id, 0, { kind: 'choice', index: 5 })).status).toBe(400);

    // B répond → révélation pour les deux.
    const b1 = await answer(couple.b.accessToken, id, 0, { kind: 'choice', index: 1 });
    expect(b1.body.rounds[0].revealedAt).toBeTruthy();
    expect(b1.body.rounds[0].partnerAnswer).toEqual({ kind: 'choice', index: 1 });
    expect(b1.body.rounds[0].funLine).toContain('Même choix');
    expect(b1.body.currentRoundIndex).toBe(1);
    const aView = (await get(couple.a.accessToken, id)).body;
    expect(aView.rounds[0].partnerAnswer).toEqual({ kind: 'choice', index: 1 });

    // Rejouer une manche close est refusé.
    expect((await answer(couple.a.accessToken, id, 0, { kind: 'choice', index: 0 })).status).toBe(409);

    // A répond à la manche 2, B la passe : réponse de A jamais révélée, partie terminée.
    await answer(couple.a.accessToken, id, 1, { kind: 'choice', index: 0 });
    const skipped = await ctx.http().post(`/games/sessions/${id}/rounds/1/skip`).set(auth(couple.b.accessToken));
    expect(skipped.status).toBe(200);
    expect(skipped.body.rounds[1]).toMatchObject({ skipped: true, partnerAnswer: null, revealedAt: null });
    expect(skipped.body.status).toBe('COMPLETED');
    expect(skipped.body.summary).toMatchObject({ total: 2, revealed: 1, skipped: 1, same: 1 });
    // La réponse de A sur la manche passée a été effacée.
    expect((await get(couple.a.accessToken, id)).body.rounds[1].myAnswer).toBeNull();
  });

  it('joue « Lequel de nous deux ? » et « Réponses secrètes »', async () => {
    const votes = await create(couple.a.accessToken, { gameType: 'WHICH_OF_US', categoryCodes: ['humor'] });
    const id = votes.body.id as string;
    expect((await answer(couple.a.accessToken, id, 0, { kind: 'vote', userId: other.a.userId })).status).toBe(400);
    await answer(couple.a.accessToken, id, 0, { kind: 'vote', userId: couple.b.userId });
    const r = await answer(couple.b.accessToken, id, 0, { kind: 'vote', userId: couple.b.userId });
    expect(r.body.rounds[0].funLine).toContain('Unanimité');

    const secret = await create(couple.b.accessToken, { gameType: 'SECRET_ANSWERS', categoryCodes: ['love'] });
    expect(secret.status).toBe(201);
    expect(secret.body.rounds).toHaveLength(3); // la question premium est exclue
    const sid = secret.body.id as string;
    await answer(couple.b.accessToken, sid, 0, { kind: 'text', text: 'Notre premier voyage' });
    const aView = (await get(couple.a.accessToken, sid)).body.rounds[0];
    expect(aView.partnerAnswered).toBe(true);
    expect(JSON.stringify(aView)).not.toContain('premier voyage');
    const revealed = await answer(couple.a.accessToken, sid, 0, { kind: 'text', text: 'La cuisine du dimanche' });
    expect(revealed.body.rounds[0].partnerAnswer).toEqual({ kind: 'text', text: 'Notre premier voyage' });
  });

  it('applique le quota gratuit et les catégories Premium, puis lève les limites avec un droit premium', async () => {
    // 3 sessions déjà créées aujourd'hui pour ce couple → la 4e est refusée.
    const fourth = await create(couple.a.accessToken, { gameType: 'DILEMMA' });
    expect(fourth.status).toBe(402);
    expect(fourth.body.code).toBe('QUOTA_EXCEEDED');

    const fresh = await createCouple(ctx);
    const locked = await create(fresh.a.accessToken, { gameType: 'WHO_KNOWS_BEST', categoryCodes: ['personality'] });
    expect(locked.status).toBe(402);
    expect(locked.body.code).toBe('ENTITLEMENT_REQUIRED');

    await ctx.prisma.entitlement.create({ data: { coupleId: fresh.coupleId, key: 'premium', source: 'ADMIN' } });
    const catalog = await ctx.http().get('/games/catalog').set(auth(fresh.a.accessToken));
    expect(catalog.body.premium).toBe(true);
    expect(catalog.body.sessionsLeftToday).toBeNull();

    // Qui connaît le mieux : sujet / devineur, verdict réservé au sujet.
    const wkb = await create(fresh.a.accessToken, { gameType: 'WHO_KNOWS_BEST', categoryCodes: ['personality'] });
    expect(wkb.status).toBe(201);
    const id = wkb.body.id as string;
    const round0 = wkb.body.rounds[0];
    const subject = round0.prompt.subjectUserId === fresh.a.userId ? fresh.a : fresh.b;
    const guesser = subject === fresh.a ? fresh.b : fresh.a;
    await answer(subject.accessToken, id, 0, { kind: 'text', text: 'Les lasagnes' });
    const afterGuess = await answer(guesser.accessToken, id, 0, { kind: 'text', text: 'Les pâtes' });
    expect(afterGuess.body.rounds[0].revealedAt).toBeTruthy();
    expect(afterGuess.body.rounds[0].awaitingVerdictFrom).toBe(subject.userId);
    expect((await ctx.http().post(`/games/sessions/${id}/rounds/0/verdict`).set(auth(guesser.accessToken)).send({ verdict: 'EXACT' })).status).toBe(403);
    const verdict = await ctx.http().post(`/games/sessions/${id}/rounds/0/verdict`).set(auth(subject.accessToken)).send({ verdict: 'CLOSE' });
    expect(verdict.status).toBe(200);
    expect(verdict.body.rounds[0].verdict).toBe('CLOSE');
    expect(verdict.body.rounds[0].funLine).toContain('Pas loin');

    // Manche 2 : sujet inversé.
    const round1 = verdict.body.rounds[1];
    expect(round1.prompt.subjectUserId).not.toBe(round0.prompt.subjectUserId);
    const subject2 = round1.prompt.subjectUserId === fresh.a.userId ? fresh.a : fresh.b;
    const guesser2 = subject2 === fresh.a ? fresh.b : fresh.a;
    await answer(subject2.accessToken, id, 1, { kind: 'text', text: 'Voler' });
    await answer(guesser2.accessToken, id, 1, { kind: 'text', text: 'Voler' });
    const done = await ctx.http().post(`/games/sessions/${id}/rounds/1/verdict`).set(auth(subject2.accessToken)).send({ verdict: 'EXACT' });
    expect(done.body.status).toBe('COMPLETED');
    expect(done.body.summary.scores[guesser.userId].points).toBe(1);
    expect(done.body.summary.scores[guesser2.userId].points).toBe(2);

    // Confessions : niveau maximal respecté.
    const conf = await create(fresh.a.accessToken, { gameType: 'CONFESSIONS', maxLevel: 1 });
    expect(conf.body.rounds.map((r: { prompt: { text: string } }) => r.prompt.text)).toEqual(['Confession légère']);

    // Liste et abandon.
    const list = await ctx.http().get('/games/sessions').set(auth(fresh.b.accessToken)).query({ status: 'OPEN' });
    expect(list.body.items.length).toBe(1);
    expect(list.body.items[0].myTurn).toBe(true);
    expect((await ctx.http().delete(`/games/sessions/${conf.body.id}`).set(auth(fresh.b.accessToken))).status).toBe(204);
    expect((await get(fresh.a.accessToken, conf.body.id)).body.status).toBe('ABANDONED');
  });

  it('propose une question du jour commune, révélée quand les deux ont répondu', async () => {
    const fresh = await createCouple(ctx);
    const d1 = await ctx.http().get('/games/daily').set(auth(fresh.a.accessToken));
    expect(d1.status).toBe(200);
    expect(d1.body.text).toMatch(/^Q amour/);
    const d2 = await ctx.http().get('/games/daily').set(auth(fresh.b.accessToken));
    expect(d2.body.id).toBe(d1.body.id);

    const a = await ctx.http().post('/games/daily/answer').set(auth(fresh.a.accessToken)).send({ text: 'Ma réponse secrète' });
    expect(a.status).toBe(200);
    expect(a.body.myAnswer).toBe('Ma réponse secrète');
    expect(a.body.revealedAt).toBeNull();
    const bView = (await ctx.http().get('/games/daily').set(auth(fresh.b.accessToken))).body;
    expect(bView).toMatchObject({ partnerAnswered: true, partnerAnswer: null, myAnswer: null });
    expect(JSON.stringify(bView)).not.toContain('secrète');

    const b = await ctx.http().post('/games/daily/answer').set(auth(fresh.b.accessToken)).send({ text: 'La mienne' });
    expect(b.body.revealedAt).toBeTruthy();
    expect(b.body.partnerAnswer).toBe('Ma réponse secrète');
    expect((await ctx.http().get('/games/daily').set(auth(fresh.a.accessToken))).body.partnerAnswer).toBe('La mienne');
    expect((await ctx.http().post('/games/daily/answer').set(auth(fresh.a.accessToken)).send({ text: 'encore' })).status).toBe(409);
  });
});

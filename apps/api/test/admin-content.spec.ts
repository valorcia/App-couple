import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, promoteToAdmin, registerVerifiedUser, resetDb, type TestContext } from './helpers';

describe('CMS des contenus', () => {
  let ctx: TestContext;
  let admin: Awaited<ReturnType<typeof registerVerifiedUser>>;
  let support: Awaited<ReturnType<typeof registerVerifiedUser>>;

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await ctx.prisma.question.deleteMany();
    await ctx.prisma.contentCategory.deleteMany();
    admin = await registerVerifiedUser(ctx);
    await promoteToAdmin(ctx, admin.userId);
    support = await registerVerifiedUser(ctx);
    await ctx.prisma.user.update({ where: { id: support.userId }, data: { role: 'SUPPORT' } });
  });
  afterAll(async () => ctx.close());

  it('crée une catégorie puis une question en brouillon, invisible côté joueur jusqu\'à publication', async () => {
    const cat = await ctx.http().post('/admin/content/categories').set(auth(admin.accessToken)).send({ code: 'voyage', name: 'Voyage', gameTypes: ['SECRET_ANSWERS'] });
    expect(cat.status).toBe(201);
    const q = await ctx.http().post('/admin/content/questions').set(auth(admin.accessToken)).send({ gameType: 'SECRET_ANSWERS', categoryCode: 'voyage', text: 'Quelle ville rêves-tu de visiter ?' });
    expect(q.status).toBe(201);
    expect(q.body.status).toBe('DRAFT');
    expect(q.body.category.code).toBe('voyage');

    const couple = await createCouple(ctx);
    const catalog = await ctx.http().get('/games/catalog').set(auth(couple.a.accessToken));
    const secret = catalog.body.games.find((g: { gameType: string }) => g.gameType === 'SECRET_ANSWERS');
    expect(secret.totalQuestions).toBe(0);

    const published = await ctx.http().post(`/admin/content/questions/${q.body.id}/status`).set(auth(admin.accessToken)).send({ status: 'PUBLISHED' });
    expect(published.body.status).toBe('PUBLISHED');
    const catalog2 = await ctx.http().get('/games/catalog').set(auth(couple.a.accessToken));
    expect(catalog2.body.games.find((g: { gameType: string }) => g.gameType === 'SECRET_ANSWERS').totalQuestions).toBe(1);

    // Un dilemme exige deux options ; une catégorie inconnue est refusée.
    expect((await ctx.http().post('/admin/content/questions').set(auth(admin.accessToken)).send({ gameType: 'DILEMMA', text: 'A ou B ?', options: ['A'] })).status).toBe(400);
    expect((await ctx.http().post('/admin/content/questions').set(auth(admin.accessToken)).send({ gameType: 'SECRET_ANSWERS', categoryCode: 'nope', text: 'Texte valide ?' })).status).toBe(400);

    // Suppression d'un contenu publié → archivage ; d'un brouillon → suppression.
    const archived = await ctx.http().delete(`/admin/content/questions/${q.body.id}`).set(auth(admin.accessToken));
    expect(archived.body.status).toBe('ARCHIVED');
    const draft = await ctx.http().post('/admin/content/questions').set(auth(admin.accessToken)).send({ gameType: 'SECRET_ANSWERS', text: 'Brouillon à jeter ?' });
    expect((await ctx.http().delete(`/admin/content/questions/${draft.body.id}`).set(auth(admin.accessToken))).body).toEqual({});
    expect(await ctx.prisma.question.findUnique({ where: { id: draft.body.id } })).toBeNull();
  });

  it('liste, filtre, compte et importe en masse avec rapport d\'erreurs', async () => {
    const imp = await ctx.http().post('/admin/content/import').set(auth(admin.accessToken)).send({
      type: 'questions',
      items: [
        { gameType: 'DILEMMA', text: 'Mer ou montagne ?', options: ['Mer', 'Montagne'], status: 'PUBLISHED', categoryCode: 'voyage' },
        { gameType: 'WHICH_OF_US', text: 'Lequel ronfle ?', status: 'PUBLISHED' },
        { gameType: 'DILEMMA', text: 'Invalide', options: [] },
      ],
    });
    expect(imp.status).toBe(200);
    expect(imp.body).toMatchObject({ imported: 2, failed: 1 });
    expect(imp.body.results[2].error).toContain('deux options');

    const list = await ctx.http().get('/admin/content/questions').set(auth(support.accessToken)).query({ gameType: 'DILEMMA', status: 'PUBLISHED' });
    expect(list.status).toBe(200);
    expect(list.body.items.map((q: { text: string }) => q.text)).toEqual(['Mer ou montagne ?']);
    const search = await ctx.http().get('/admin/content/questions').set(auth(support.accessToken)).query({ q: 'ronfle' });
    expect(search.body.items).toHaveLength(1);
    const counts = await ctx.http().get('/admin/content/counts').set(auth(support.accessToken));
    expect(counts.body.questions.PUBLISHED).toBe(2);
    expect(counts.body.categories).toBe(1);

    const challenge = await ctx.http().post('/admin/content/challenges').set(auth(admin.accessToken)).send({ title: 'Marche nocturne', description: 'Une promenade après le dîner, sans téléphone.', instructions: ['Sortir', 'Marcher'], durationMinutes: 45, budget: 'FREE', status: 'PUBLISHED' });
    expect(challenge.status).toBe(201);
    const activity = await ctx.http().post('/admin/content/activities').set(auth(admin.accessToken)).send({ title: 'Marché du dimanche', description: 'Flâner au marché puis cuisiner ensemble.', moods: ['FOOD'], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'LOW' });
    expect(activity.status).toBe(201);
    const desire = await ctx.http().post('/admin/content/desires').set(auth(admin.accessToken)).send({ category: 'romance', text: 'Une lettre manuscrite', intensity: 1 });
    expect(desire.status).toBe(201);
    const pack = await ctx.http().post('/admin/content/packs').set(auth(admin.accessToken)).send({ code: 'soirees', name: 'Pack soirées' });
    expect(pack.status).toBe(201);
    const inPack = await ctx.http().put(`/admin/content/desires/${desire.body.id}`).set(auth(admin.accessToken)).send({ category: 'romance', text: 'Une lettre manuscrite', intensity: 1, packCode: 'soirees', tier: 'PACK' });
    expect(inPack.body.pack.code).toBe('soirees');
  });

  it('réserve l\'écriture aux administrateurs et journalise', async () => {
    expect((await ctx.http().post('/admin/content/questions').set(auth(support.accessToken)).send({ gameType: 'SECRET_ANSWERS', text: 'Interdit ?' })).status).toBe(403);
    const user = await registerVerifiedUser(ctx);
    expect((await ctx.http().get('/admin/content/questions').set(auth(user.accessToken))).status).toBe(403);
    const audit = await ctx.prisma.auditLog.count({ where: { action: { startsWith: 'admin.content.' } } });
    expect(audit).toBeGreaterThan(5);
  });
});

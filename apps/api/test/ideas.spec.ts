import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

describe('« On fait quoi ? »', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await ctx.prisma.activityIdea.deleteMany();
    const mk = async (key: string, data: Record<string, unknown>) => {
      ids[key] = (await ctx.prisma.activityIdea.create({ data: { title: key, description: `Description ${key}`, ...data } as never })).id;
    };
    await mk('picnic', { moods: ['RELAX', 'ROMANTIC'], moments: ['NOW', 'WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'FREE' });
    await mk('cinema', { moods: ['RELAX'], moments: ['TONIGHT'], company: ['COUPLE', 'FAMILY'], budget: 'LOW' });
    await mk('restaurant', { moods: ['FOOD', 'ROMANTIC'], moments: ['TONIGHT', 'DATE'], company: ['COUPLE'], budget: 'MEDIUM' });
    await mk('spa', { moods: ['ROMANTIC', 'SPICY'], moments: ['TONIGHT'], company: ['COUPLE'], budget: 'LOW', intimate: true });
    await mk('premium-trip', { moods: ['ADVENTURE'], moments: ['WEEKEND'], company: ['COUPLE'], budget: 'HIGH', tier: 'PREMIUM' });
    couple = await createCouple(ctx);
  });
  afterAll(async () => ctx.close());

  const suggest = (token: string, body: Record<string, unknown>) =>
    ctx.http().post('/ideas/suggest').set(auth(token)).send({ moment: 'TONIGHT', company: 'COUPLE', budget: 'MEDIUM', mood: 'ROMANTIC', ...body });

  it('propose des idées du catalogue filtrées par moment, compagnie, budget et ambiance', async () => {
    const res = await suggest(couple.a.accessToken, {});
    expect(res.status).toBe(200);
    const titles = res.body.ideas.map((i: { title: string }) => i.title);
    // Ce soir, à deux, budget moyen max, romantique : restaurant (exact) et cinéma ; le spa (intime) est exclu tant que l'espace Intimité n'est pas actif ; le voyage premium est exclu.
    expect(titles[0]).toBe('restaurant');
    expect(titles).toContain('cinema');
    expect(titles).not.toContain('spa');
    expect(titles).not.toContain('premium-trip');
    expect(titles).not.toContain('picnic'); // pas « ce soir »
    expect(res.body.ai).toMatchObject({ used: false, reason: 'disabled', remainingThisMonth: null });
    expect(new Date(res.body.suggestedEndAt).getTime() - new Date(res.body.suggestedStartAt).getTime()).toBe(2 * 3_600_000);

    const family = await suggest(couple.a.accessToken, { company: 'FAMILY', budget: 'FREE', moment: 'WEEKEND', mood: 'RELAX' });
    expect(family.body.ideas.map((i: { title: string }) => i.title)).toEqual(['picnic']);

    const dated = await suggest(couple.a.accessToken, { moment: 'DATE' });
    expect(dated.status).toBe(400);
    const dated2 = await suggest(couple.a.accessToken, { moment: 'DATE', date: '2026-12-24' });
    expect(dated2.status).toBe(200);
    expect(dated2.body.suggestedStartAt.startsWith('2026-12-24')).toBe(true);
  });

  it('ajoute une idée à l\'agenda partagé après confirmation et la marque comme réalisée', async () => {
    const start = new Date(Date.now() + 86_400_000).toISOString();
    const end = new Date(Date.now() + 86_400_000 + 7_200_000).toISOString();
    const scheduled = await ctx.http().post('/ideas/schedule').set(auth(couple.a.accessToken)).send({ ideaId: ids.restaurant, title: 'Dîner surprise', description: 'Le petit italien', startAt: start, endAt: end });
    expect(scheduled.status).toBe(201);
    const event = await ctx.http().get(`/calendar/events/${scheduled.body.eventId}`).set(auth(couple.b.accessToken));
    expect(event.status).toBe(200);
    expect(event.body).toMatchObject({ title: 'Dîner surprise', visibility: 'SHARED', type: 'DATE', category: 'on-fait-quoi' });
    expect(event.body.attendees[0]).toMatchObject({ userId: couple.b.userId, status: 'PENDING' });

    const again = await suggest(couple.a.accessToken, {});
    const restaurant = again.body.ideas.find((i: { title: string }) => i.title === 'restaurant');
    expect(restaurant.doneBefore).toBe(true);
    expect(again.body.ideas.find((i: { title: string }) => i.title === 'cinema').doneBefore).toBe(false);

    expect((await ctx.http().post('/ideas/schedule').set(auth(couple.a.accessToken)).send({ ideaId: '00000000-0000-7000-8000-000000000000', title: 'x', startAt: start, endAt: end })).status).toBe(404);
    expect((await ctx.http().post('/ideas/schedule').set(auth(couple.a.accessToken)).send({ ideaId: ids.cinema, title: 'x', startAt: end, endAt: start })).status).toBe(400);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

describe('Défis à deux', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  let other: Awaited<ReturnType<typeof createCouple>>;
  const ids: string[] = [];

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await ctx.prisma.challenge.deleteMany();
    for (let i = 0; i < 7; i++) {
      const row = await ctx.prisma.challenge.create({ data: { title: `Défi ${i}`, description: 'd', instructions: ['a', 'b'], tier: i === 6 ? 'PREMIUM' : 'FREE', intimate: i === 5 } });
      ids.push(row.id);
    }
    couple = await createCouple(ctx);
    other = await createCouple(ctx);
  });
  afterAll(async () => ctx.close());

  it('liste le catalogue avec verrouillage gratuit (5 défis) et sans défis intimes', async () => {
    const res = await ctx.http().get('/challenges').set(auth(couple.a.accessToken));
    expect(res.status).toBe(200);
    // 6 non intimes (0..4 gratuits, 6 premium) ; le défi intime (5) est absent.
    expect(res.body).toHaveLength(6);
    expect(res.body.filter((c: { locked: boolean }) => !c.locked)).toHaveLength(5);
    const locked = res.body.find((c: { title: string }) => c.title === 'Défi 6');
    expect(locked.locked).toBe(true);
    expect(locked.instructions).toEqual([]); // le contenu d'un défi verrouillé n'est pas servi
    expect((await ctx.http().post(`/challenges/${ids[6]}/propose`).set(auth(couple.a.accessToken))).status).toBe(402);
  });

  it('propose, accepte, valide à deux ; aucune pénalité en passant', async () => {
    const proposed = await ctx.http().post(`/challenges/${ids[0]}/propose`).set(auth(couple.a.accessToken));
    expect(proposed.status).toBe(200);
    expect(proposed.body.progress).toMatchObject({ status: 'PROPOSED', proposedByUserId: couple.a.userId });
    const notif = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    expect(notif.body.items.some((n: { type: string }) => n.type === 'challenge.proposed')).toBe(true);

    const featuredB = await ctx.http().get('/challenges/featured').set(auth(couple.b.accessToken));
    expect(featuredB.body.kind).toBe('active');
    expect(featuredB.body.challenge.id).toBe(ids[0]);

    const accepted = await ctx.http().post(`/challenges/${ids[0]}/accept`).set(auth(couple.b.accessToken));
    expect(accepted.body.progress.status).toBe('ACCEPTED');

    const doneA = await ctx.http().post(`/challenges/${ids[0]}/complete`).set(auth(couple.a.accessToken)).send({ note: 'Super moment' });
    expect(doneA.body.progress).toMatchObject({ status: 'ACCEPTED', completedByMe: true, completedByPartner: false });
    const doneB = await ctx.http().post(`/challenges/${ids[0]}/complete`).set(auth(couple.b.accessToken)).send({});
    expect(doneB.body.progress).toMatchObject({ status: 'COMPLETED', completedByMe: true, completedByPartner: true, note: 'Super moment' });
    expect(doneB.body.progress.completedAt).toBeTruthy();

    // Passer un défi.
    await ctx.http().post(`/challenges/${ids[1]}/propose`).set(auth(couple.b.accessToken));
    const skipped = await ctx.http().post(`/challenges/${ids[1]}/skip`).set(auth(couple.a.accessToken));
    expect(skipped.body.progress.status).toBe('SKIPPED');
    expect((await ctx.http().post(`/challenges/${ids[1]}/complete`).set(auth(couple.a.accessToken)).send({})).status).toBe(409);

    // Historique et suggestion du jour (un défi non encore proposé).
    const progress = await ctx.http().get('/challenges/progress').set(auth(couple.a.accessToken));
    expect(progress.body.map((c: { progress: { status: string } }) => c.progress.status).sort()).toEqual(['COMPLETED', 'SKIPPED']);
    const featured = await ctx.http().get('/challenges/featured').set(auth(couple.a.accessToken));
    expect(featured.body.kind).toBe('suggestion');
    expect([ids[0], ids[1]]).not.toContain(featured.body.challenge.id);
  });

  it('isole les couples', async () => {
    expect((await ctx.http().get('/challenges/progress').set(auth(other.a.accessToken))).body).toEqual([]);
    expect((await ctx.http().post(`/challenges/${ids[0]}/accept`).set(auth(other.a.accessToken))).status).toBe(404);
  });
});

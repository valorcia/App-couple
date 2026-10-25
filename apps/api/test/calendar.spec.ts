import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { auth, bootTestApp, createCouple, registerVerifiedUser, resetDb, type TestContext } from './helpers';

const WINDOW = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-30T00:00:00.000Z' };

describe('Agenda partagé', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  let other: Awaited<ReturnType<typeof createCouple>>;

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    couple = await createCouple(ctx);
    other = await createCouple(ctx);
  });
  afterAll(async () => ctx.close());

  const create = (token: string, body: Record<string, unknown>) =>
    ctx.http().post('/calendar/events').set(auth(token)).send({
      title: 'Dîner', startAt: '2026-11-07T19:00:00.000Z', endAt: '2026-11-07T21:00:00.000Z', timezone: 'Europe/Paris', ...body,
    });
  const list = (token: string) => ctx.http().get('/calendar/events').set(auth(token)).query(WINDOW);

  it('exige un couple actif', async () => {
    const solo = await registerVerifiedUser(ctx);
    const res = await ctx.http().get('/calendar/events').set(auth(solo.accessToken)).query(WINDOW);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COUPLE_REQUIRED');
  });

  it('partage un événement SHARED en entier, éditable par les deux', async () => {
    const created = await create(couple.a.accessToken, { visibility: 'SHARED', description: 'Chez Nadia', location: 'Lyon', color: '#E0705A', reminders: [{ minutesBefore: 60 }] });
    expect(created.status).toBe(201);
    expect(created.body.isMine).toBe(true);
    expect(created.body.reminders).toHaveLength(1);

    const seenByB = (await list(couple.b.accessToken)).body.find((e: { id: string }) => e.id === created.body.id);
    expect(seenByB).toMatchObject({ title: 'Dîner', description: 'Chez Nadia', location: 'Lyon', busy: false, isMine: false, canEdit: true });
    expect(seenByB.reminders).toEqual([]); // les rappels sont personnels

    const edited = await ctx.http().patch(`/calendar/events/${created.body.id}`).set(auth(couple.b.accessToken)).send({ title: 'Dîner chez Nadia' });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Dîner chez Nadia');

    // Un autre couple ne voit rien et ne peut rien modifier.
    expect((await list(other.a.accessToken)).body.find((e: { id: string }) => e.id === created.body.id)).toBeUndefined();
    expect((await ctx.http().get(`/calendar/events/${created.body.id}`).set(auth(other.a.accessToken))).status).toBe(404);
    expect((await ctx.http().patch(`/calendar/events/${created.body.id}`).set(auth(other.a.accessToken)).send({ title: 'x' })).status).toBe(404);
    expect((await ctx.http().delete(`/calendar/events/${created.body.id}`).set(auth(other.a.accessToken))).status).toBe(404);
  });

  it('projette un événement BUSY en bloc « Occupé » sans aucun détail, non éditable', async () => {
    const created = await create(couple.a.accessToken, { title: 'Rendez-vous médical', visibility: 'BUSY', description: 'Dr Martin', location: 'Cabinet', category: 'santé', startAt: '2026-11-08T09:00:00.000Z', endAt: '2026-11-08T10:00:00.000Z' });
    expect(created.status).toBe(201);
    const seenByB = (await list(couple.b.accessToken)).body.find((e: { id: string }) => e.id === created.body.id);
    expect(seenByB).toBeDefined();
    expect(seenByB).toMatchObject({ busy: true, title: '', description: null, location: null, category: null, color: null, canEdit: false, startAt: '2026-11-08T09:00:00.000Z', endAt: '2026-11-08T10:00:00.000Z' });
    expect(JSON.stringify(seenByB)).not.toContain('Martin');
    const byId = await ctx.http().get(`/calendar/events/${created.body.id}`).set(auth(couple.b.accessToken));
    expect(byId.body.title).toBe('');
    expect((await ctx.http().patch(`/calendar/events/${created.body.id}`).set(auth(couple.b.accessToken)).send({ title: 'x' })).status).toBe(404);
    expect((await ctx.http().delete(`/calendar/events/${created.body.id}`).set(auth(couple.b.accessToken))).status).toBe(404);
  });

  it('cache totalement un événement PRIVATE au partenaire', async () => {
    const created = await create(couple.a.accessToken, { title: 'Cadeau surprise à acheter', visibility: 'PRIVATE', startAt: '2026-11-09T12:00:00.000Z', endAt: '2026-11-09T13:00:00.000Z' });
    const all = (await list(couple.b.accessToken)).body;
    expect(all.find((e: { id: string }) => e.id === created.body.id)).toBeUndefined();
    expect(JSON.stringify(all)).not.toContain('Cadeau');
    expect((await ctx.http().get(`/calendar/events/${created.body.id}`).set(auth(couple.b.accessToken))).status).toBe(404);
    // Le propriétaire le voit.
    expect((await list(couple.a.accessToken)).body.some((e: { id: string }) => e.id === created.body.id)).toBe(true);
  });

  it('développe les récurrences et permet d\'exclure une occurrence', async () => {
    const created = await create(couple.a.accessToken, { title: 'Yoga', visibility: 'SHARED', startAt: '2026-11-03T18:00:00.000Z', endAt: '2026-11-03T19:00:00.000Z', rrule: 'FREQ=WEEKLY;BYDAY=TU' });
    expect(created.status).toBe(201);
    const occ = (await list(couple.b.accessToken)).body.filter((e: { id: string }) => e.id === created.body.id);
    expect(occ.map((o: { startAt: string }) => o.startAt)).toEqual(['2026-11-03T18:00:00.000Z', '2026-11-10T18:00:00.000Z', '2026-11-17T18:00:00.000Z', '2026-11-24T18:00:00.000Z']);
    expect(occ[0].instanceId).toBe(`${created.body.id}@2026-11-03T18:00:00.000Z`);

    const excluded = await ctx.http().post(`/calendar/events/${created.body.id}/exclude`).set(auth(couple.a.accessToken)).send({ occurrenceStart: '2026-11-10T18:00:00.000Z' });
    expect(excluded.status).toBe(200);
    const after = (await list(couple.a.accessToken)).body.filter((e: { id: string }) => e.id === created.body.id);
    expect(after).toHaveLength(3);

    const bad = await create(couple.a.accessToken, { rrule: 'FREQ=SOMETIMES' });
    expect(bad.status).toBe(400);
    const badWindow = await ctx.http().get('/calendar/events').set(auth(couple.a.accessToken)).query({ from: '2026-01-01T00:00:00Z', to: '2026-12-31T00:00:00Z' });
    expect(badWindow.status).toBe(400);
  });

  it('gère l\'invitation du partenaire et la réponse, avec notifications', async () => {
    const created = await create(couple.a.accessToken, { title: 'Week-end', visibility: 'SHARED', invitePartner: true, startAt: '2026-11-14T08:00:00.000Z', endAt: '2026-11-15T18:00:00.000Z', allDay: true });
    expect(created.body.attendees).toEqual([{ userId: couple.b.userId, status: 'PENDING', respondedAt: null }]);

    const notifsB = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    expect(notifsB.body.items.some((n: { type: string }) => n.type === 'calendar.invitation')).toBe(true);
    expect(JSON.stringify(notifsB.body)).not.toContain('Week-end'); // pas de détail dans la notification

    const answered = await ctx.http().post(`/calendar/events/${created.body.id}/respond`).set(auth(couple.b.accessToken)).send({ status: 'ACCEPTED' });
    expect(answered.status).toBe(200);
    expect(answered.body.attendees[0].status).toBe('ACCEPTED');
    const notifsA = await ctx.http().get('/notifications').set(auth(couple.a.accessToken));
    expect(notifsA.body.items.some((n: { type: string }) => n.type === 'calendar.accepted')).toBe(true);

    // Un tiers ne peut pas répondre.
    expect((await ctx.http().post(`/calendar/events/${created.body.id}/respond`).set(auth(other.b.accessToken)).send({ status: 'ACCEPTED' })).status).toBe(404);

    const unread = await ctx.http().get('/notifications/unread-count').set(auth(couple.a.accessToken));
    expect(unread.body.count).toBeGreaterThan(0);
    expect((await ctx.http().post('/notifications/read-all').set(auth(couple.a.accessToken))).status).toBe(204);
    expect((await ctx.http().get('/notifications/unread-count').set(auth(couple.a.accessToken))).body.count).toBe(0);
  });

  it('calcule des créneaux libres sans trahir les événements privés du partenaire', async () => {
    const fresh = await createCouple(ctx);
    const day = { from: '2026-11-20T00:00:00.000Z', to: '2026-11-21T00:00:00.000Z' };
    // A : occupé 12:00-14:00 (BUSY) ; B : privé 16:00-18:00 (ne doit pas apparaître).
    await ctx.http().post('/calendar/events').set(auth(fresh.a.accessToken)).send({ title: 'Déjeuner pro', visibility: 'BUSY', startAt: '2026-11-20T12:00:00.000Z', endAt: '2026-11-20T14:00:00.000Z', timezone: 'UTC' });
    await ctx.http().post('/calendar/events').set(auth(fresh.b.accessToken)).send({ title: 'Secret', visibility: 'PRIVATE', startAt: '2026-11-20T16:00:00.000Z', endAt: '2026-11-20T18:00:00.000Z', timezone: 'UTC' });
    await ctx.prisma.user.updateMany({ where: { id: { in: [fresh.a.userId, fresh.b.userId] } }, data: { timezone: 'UTC' } });

    const forA = await ctx.http().get('/calendar/free-slots').set(auth(fresh.a.accessToken)).query({ ...day, minMinutes: 60, dayStartHour: 9, dayEndHour: 22 });
    expect(forA.status).toBe(200);
    // Vu par A : 09-12 libre, 12-14 occupé, 14-22 libre (le privé de B est invisible).
    expect(forA.body.map((s: { startAt: string; endAt: string }) => [s.startAt, s.endAt])).toEqual([
      ['2026-11-20T09:00:00.000Z', '2026-11-20T12:00:00.000Z'],
      ['2026-11-20T14:00:00.000Z', '2026-11-20T22:00:00.000Z'],
    ]);
    // Vu par B : son propre événement privé compte pour lui.
    const forB = await ctx.http().get('/calendar/free-slots').set(auth(fresh.b.accessToken)).query({ ...day, minMinutes: 60, dayStartHour: 9, dayEndHour: 22 });
    expect(forB.body.map((s: { startAt: string; endAt: string }) => [s.startAt, s.endAt])).toEqual([
      ['2026-11-20T09:00:00.000Z', '2026-11-20T12:00:00.000Z'],
      ['2026-11-20T14:00:00.000Z', '2026-11-20T16:00:00.000Z'],
      ['2026-11-20T18:00:00.000Z', '2026-11-20T22:00:00.000Z'],
    ]);
  });

  it('diffuse un signal temps réel au couple (sans signal pour un événement privé)', async () => {
    await ctx.app.listen(0);
    const address = ctx.app.getHttpServer().address() as { port: number };
    const connect = (token: string) =>
      new Promise<Socket>((resolve, reject) => {
        const s = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ['websocket'] });
        s.on('ready', () => resolve(s));
        s.on('error', reject);
        s.on('connect_error', reject);
      });
    const socketB = await connect(couple.b.accessToken);
    const received: string[] = [];
    socketB.on('calendar.changed', (p: { action: string }) => received.push(p.action));

    await create(couple.a.accessToken, { title: 'Ciné', visibility: 'SHARED', startAt: '2026-11-21T19:00:00.000Z', endAt: '2026-11-21T21:00:00.000Z' });
    await create(couple.a.accessToken, { title: 'Secret', visibility: 'PRIVATE', startAt: '2026-11-22T19:00:00.000Z', endAt: '2026-11-22T21:00:00.000Z' });
    await new Promise((r) => setTimeout(r, 300));
    expect(received).toEqual(['created']);

    // Jeton invalide → déconnexion.
    const refused = await new Promise<string>((resolve) => {
      const s = io(`http://127.0.0.1:${address.port}`, { auth: { token: 'bad' }, transports: ['websocket'] });
      s.on('error', (e: { code: string }) => resolve(e.code));
      s.on('ready', () => resolve('ready'));
    });
    expect(refused).toBe('UNAUTHORIZED');
    socketB.close();
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PushService } from '@/modules/push/push.service';
import { SchedulerService } from '@/modules/scheduler/scheduler.service';
import { QUEUES, QueueService } from '@/common/queue/queue.service';

describe('Notifications, push et planification', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  let notifications: NotificationsService;
  let push: PushService;
  let scheduler: SchedulerService;
  let queue: QueueService;
  const sentBatches: { to: string }[][] = [];

  beforeAll(async () => {
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    couple = await createCouple(ctx);
    notifications = ctx.app.get(NotificationsService);
    push = ctx.app.get(PushService);
    scheduler = ctx.app.get(SchedulerService);
    queue = ctx.app.get(QueueService);
    await queue.queue(QUEUES.push).drain(true);
    // Faux Expo : accepte tout sauf le jeton « dead » (DeviceNotRegistered).
    push.fetchImpl = (async (_url: unknown, init?: { body?: string }) => {
      const messages = JSON.parse(init?.body ?? '[]') as { to: string }[];
      sentBatches.push(messages);
      return new Response(JSON.stringify({ data: messages.map((m) => (m.to.includes('dead') ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok', id: 'x' })) }), { status: 200 });
    }) as typeof fetch;
  });
  afterAll(async () => ctx.close());

  it('enregistre un appareil et envoie un push ; les jetons invalides sont retirés', async () => {
    const reg = await ctx.http().post('/push/devices').set(auth(couple.a.accessToken)).send({ token: 'ExponentPushToken[alive-aaaa]', platform: 'ios', deviceName: 'iPhone' });
    expect(reg.status).toBe(200);
    expect((await ctx.http().post('/push/devices').set(auth(couple.a.accessToken)).send({ token: 'ExponentPushToken[dead-bbbb]', platform: 'android' })).status).toBe(200);
    expect((await ctx.http().post('/push/devices').set(auth(couple.a.accessToken)).send({ token: 'not-a-token', platform: 'ios' })).status).toBe(400);

    const n = await ctx.prisma.notification.create({ data: { userId: couple.a.userId, category: 'SYSTEM', type: 'test', title: 'T', body: 'B' } });
    const accepted = await push.sendNotification(n.id);
    expect(accepted).toBe(1);
    const devices = await ctx.prisma.pushDevice.findMany({ where: { userId: couple.a.userId } });
    expect(devices.map((d) => d.token)).toEqual(['ExponentPushToken[alive-aaaa]']);
    expect((await ctx.prisma.notification.findUnique({ where: { id: n.id } }))?.pushedAt).toBeTruthy();
    // Idempotent : pas de second envoi.
    expect(await push.sendNotification(n.id)).toBe(0);
  });

  it('respecte les préférences : in-app désactivé, push désactivé, plafond quotidien, heures silencieuses', async () => {
    const prefs = await ctx.http().get('/notifications/preferences').set(auth(couple.a.accessToken));
    expect(prefs.status).toBe(200);
    expect(prefs.body.preferences).toHaveLength(10);
    expect(prefs.body.devices).toHaveLength(1);

    // GAME : ni in-app ni push → rien n'est créé.
    await ctx.http().put('/notifications/preferences').set(auth(couple.a.accessToken)).send({ preferences: [{ category: 'GAME', push: false, inApp: false }] });
    const before = await ctx.prisma.notification.count({ where: { userId: couple.a.userId, category: 'GAME' } });
    await notifications.notify({ userId: couple.a.userId, category: 'GAME', type: 'x', title: 't', body: 'b' });
    expect(await ctx.prisma.notification.count({ where: { userId: couple.a.userId, category: 'GAME' } })).toBe(before);

    // CHALLENGE : in-app oui, push non → ligne créée, aucun job push.
    await ctx.http().put('/notifications/preferences').set(auth(couple.a.accessToken)).send({ preferences: [{ category: 'CHALLENGE', push: false, inApp: true }] });
    await queue.queue(QUEUES.push).drain(true);
    await notifications.notify({ userId: couple.a.userId, category: 'CHALLENGE', type: 'x', title: 't', body: 'b' });
    expect(await ctx.prisma.notification.count({ where: { userId: couple.a.userId, category: 'CHALLENGE' } })).toBe(1);
    expect(await queue.queue(QUEUES.push).getJobCountByTypes('waiting', 'delayed', 'active', 'completed')).toBe(0);

    // Heures silencieuses couvrant toute la journée sauf une minute → le push est différé (job delayed), pas supprimé.
    const now = new Date();
    const tz = 'UTC';
    await ctx.prisma.user.update({ where: { id: couple.a.userId }, data: { timezone: tz } });
    const end = `${String((now.getUTCHours() + 2) % 24).padStart(2, '0')}:00`;
    const start = `${String((now.getUTCHours() + 3) % 24).padStart(2, '0')}:00`;
    await ctx.http().put('/notifications/preferences').set(auth(couple.a.accessToken)).send({ preferences: [{ category: 'CALENDAR', push: true, inApp: true }], quietStart: start, quietEnd: end });
    await notifications.notify({ userId: couple.a.userId, category: 'CALENDAR', type: 'x', title: 't', body: 'b' });
    const delayed = await queue.queue(QUEUES.push).getDelayed();
    expect(delayed.length).toBe(1);
    expect(delayed[0]!.opts.delay).toBeGreaterThan(30 * 60_000);
    await queue.queue(QUEUES.push).drain(true);

    // Plafond : 1 push par jour pour SUGGESTION.
    await ctx.http().put('/notifications/preferences').set(auth(couple.a.accessToken)).send({ preferences: [{ category: 'SUGGESTION', push: true, inApp: true, maxPerDay: 1 }], quietStart: null, quietEnd: null });
    await ctx.prisma.notification.create({ data: { userId: couple.a.userId, category: 'SUGGESTION', type: 'x', title: 't', body: 'b', pushedAt: new Date() } });
    await notifications.notify({ userId: couple.a.userId, category: 'SUGGESTION', type: 'x', title: 't', body: 'b' });
    expect(await queue.queue(QUEUES.push).getJobCountByTypes('waiting', 'delayed', 'active')).toBe(0);
    expect(await ctx.prisma.notification.count({ where: { userId: couple.a.userId, category: 'SUGGESTION' } })).toBe(2); // in-app toujours créée
  });

  it('envoie les rappels d\'événements une seule fois', async () => {
    const start = new Date(Date.now() + 20 * 60_000);
    const created = await ctx.http().post('/calendar/events').set(auth(couple.b.accessToken)).send({ title: 'Rendez-vous', startAt: start.toISOString(), endAt: new Date(start.getTime() + 3_600_000).toISOString(), reminders: [{ minutesBefore: 30 }, { minutesBefore: 5 }] });
    expect(created.status).toBe(201);
    const sent = await scheduler.processReminders();
    expect(sent).toBe(1); // le rappel à 30 min est échu, pas celui à 5 min
    expect(await scheduler.processReminders()).toBe(0);
    const notifs = await ctx.http().get('/notifications').set(auth(couple.b.accessToken));
    const reminder = notifs.body.items.find((n: { type: string }) => n.type === 'calendar.reminder');
    expect(reminder.body).toContain('Rendez-vous');
    expect(await scheduler.processReminders(new Date(Date.now() + 16 * 60_000))).toBe(1);
  });

  it('propose la question du jour à 9 h locale, une fois par jour', async () => {
    const nineUtc = new Date();
    nineUtc.setUTCHours(9, 15, 0, 0);
    await ctx.prisma.user.updateMany({ where: { id: { in: [couple.a.userId, couple.b.userId] } }, data: { timezone: 'UTC' } });
    expect(await scheduler.processDailyQuestionPrompts(nineUtc)).toBe(2);
    expect(await scheduler.processDailyQuestionPrompts(nineUtc)).toBe(0);
    const tenUtc = new Date(nineUtc.getTime() + 3_600_000);
    expect(await scheduler.processDailyQuestionPrompts(tenUtc)).toBe(0);
  });
});

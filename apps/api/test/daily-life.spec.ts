import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

describe('Quotidien : listes, tâches, projets', () => {
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

  it('gère une liste de courses partagée en temps réel', async () => {
    const list = await ctx.http().post('/shopping-lists').set(auth(couple.a.accessToken)).send({ name: 'Courses de la semaine' });
    expect(list.status).toBe(201);
    const id = list.body.id as string;
    await ctx.http().post(`/shopping-lists/${id}/items`).set(auth(couple.a.accessToken)).send({ name: 'Tomates', quantity: '1 kg', category: 'Fruits et légumes' });
    const added = await ctx.http().post(`/shopping-lists/${id}/items`).set(auth(couple.b.accessToken)).send({ name: 'Pain' });
    expect(added.body.items.map((i: { name: string }) => i.name)).toEqual(['Tomates', 'Pain']);
    const tomato = added.body.items[0].id as string;
    const checked = await ctx.http().patch(`/shopping-lists/${id}/items/${tomato}`).set(auth(couple.b.accessToken)).send({ checked: true });
    expect(checked.body.items.find((i: { id: string }) => i.id === tomato)).toMatchObject({ checkedByUserId: couple.b.userId });
    expect(checked.body.checkedCount).toBe(1);
    expect(checked.body.items[0].name).toBe('Pain'); // les cochés passent en bas
    const cleared = await ctx.http().post(`/shopping-lists/${id}/clear-checked`).set(auth(couple.a.accessToken));
    expect(cleared.body.items).toHaveLength(1);
    expect((await ctx.http().get('/shopping-lists').set(auth(other.a.accessToken))).body).toEqual([]);
    expect((await ctx.http().post(`/shopping-lists/${id}/items`).set(auth(other.a.accessToken)).send({ name: 'x' })).status).toBe(404);
    expect((await ctx.http().patch(`/shopping-lists/${id}`).set(auth(couple.a.accessToken)).send({ archived: true })).body.archivedAt).toBeTruthy();
    expect((await ctx.http().get('/shopping-lists').set(auth(couple.a.accessToken))).body).toEqual([]);
    expect((await ctx.http().get('/shopping-lists').set(auth(couple.a.accessToken)).query({ archived: 'true' })).body).toHaveLength(1);
  });

  it('gère les tâches (attribution volontaire, récurrence, commentaires) sans classement', async () => {
    const task = await ctx.http().post('/tasks').set(auth(couple.a.accessToken)).send({ title: 'Appeler le plombier', assigneeUserId: couple.b.userId, priority: 'HIGH', dueAt: '2026-11-03T09:00:00.000Z', rrule: 'FREQ=WEEKLY' });
    expect(task.status).toBe(201);
    expect((await ctx.http().get('/notifications').set(auth(couple.b.accessToken))).body.items.some((n: { type: string }) => n.type === 'task.assigned')).toBe(true);
    expect((await ctx.http().post('/tasks').set(auth(couple.a.accessToken)).send({ title: 'x', assigneeUserId: other.a.userId })).status).toBe(400);
    expect((await ctx.http().post('/tasks').set(auth(couple.a.accessToken)).send({ title: 'x', rrule: 'FREQ=NOPE' })).status).toBe(400);

    const commented = await ctx.http().post(`/tasks/${task.body.id}/comments`).set(auth(couple.b.accessToken)).send({ body: 'Je m’en occupe lundi.' });
    expect(commented.body.comments).toHaveLength(1);
    const done = await ctx.http().patch(`/tasks/${task.body.id}`).set(auth(couple.b.accessToken)).send({ status: 'DONE' });
    expect(done.body.status).toBe('DONE');
    // Récurrence : une nouvelle occurrence est créée pour la semaine suivante.
    const open = await ctx.http().get('/tasks').set(auth(couple.a.accessToken)).query({ status: 'OPEN' });
    expect(open.body).toHaveLength(1);
    expect(open.body[0].dueAt).toBe('2026-11-10T09:00:00.000Z');
    expect((await ctx.http().get('/tasks').set(auth(other.a.accessToken))).body).toEqual([]);
    expect((await ctx.http().patch(`/tasks/${task.body.id}`).set(auth(other.a.accessToken)).send({ status: 'DONE' })).status).toBe(404);
  });

  it('crée un projet à partir d\'un gabarit, suit la progression, notes et tâches liées', async () => {
    const templates = await ctx.http().get('/projects/templates').set(auth(couple.a.accessToken));
    expect(templates.body.find((t: { code: string }) => t.code === 'trip').steps.length).toBeGreaterThan(3);
    const project = await ctx.http().post('/projects').set(auth(couple.a.accessToken)).send({ templateCode: 'trip', title: 'Lisbonne au printemps', budgetCents: 150000, targetAt: '2027-04-10' });
    expect(project.status).toBe(201);
    expect(project.body.steps.length).toBe(7);
    expect(project.body.progress).toBe(0);
    const id = project.body.id as string;
    const step = project.body.steps[0].id as string;
    const updated = await ctx.http().patch(`/projects/${id}/steps/${step}`).set(auth(couple.b.accessToken)).send({ completed: true });
    expect(updated.body.progress).toBe(14);
    const noted = await ctx.http().post(`/projects/${id}/notes`).set(auth(couple.b.accessToken)).send({ body: 'Vols repérés à 90 €.' });
    expect(noted.body.notes).toHaveLength(1);
    await ctx.http().post('/tasks').set(auth(couple.a.accessToken)).send({ title: 'Réserver les vols', projectId: id });
    expect((await ctx.http().get(`/projects/${id}`).set(auth(couple.a.accessToken))).body.openTasks).toBe(1);
    expect((await ctx.http().get('/tasks').set(auth(couple.a.accessToken)).query({ projectId: id })).body).toHaveLength(1);
    expect((await ctx.http().get(`/projects/${id}`).set(auth(other.a.accessToken))).status).toBe(404);
    expect((await ctx.http().post('/tasks').set(auth(other.a.accessToken)).send({ title: 'x', projectId: id })).status).toBe(404);
    const archived = await ctx.http().patch(`/projects/${id}`).set(auth(couple.a.accessToken)).send({ status: 'ARCHIVED' });
    expect(archived.body.status).toBe('ARCHIVED');
    expect((await ctx.http().get('/projects').set(auth(couple.a.accessToken))).body).toEqual([]);
  });
});

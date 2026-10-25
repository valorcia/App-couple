import { Injectable } from '@nestjs/common';
import type { Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import type { ShoppingListDto, TaskDto } from '@couple/types';
import type { z } from 'zod';
import type { createShoppingItemSchema, createShoppingListSchema, createTaskSchema, updateShoppingItemSchema, updateShoppingListSchema, updateTaskSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { isValidRRule } from '@/modules/calendar/recurrence';
import { RRule } from 'rrule';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

const listInclude = { items: { orderBy: [{ checkedAt: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }, { createdAt: 'asc' }] } } satisfies Prisma.ShoppingListInclude;
type ListRow = Prisma.ShoppingListGetPayload<{ include: typeof listInclude }>;
const taskInclude = { comments: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.TaskInclude;
type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

/**
 * Quotidien : listes de courses et tâches du couple. Droits identiques pour les deux partenaires ;
 * aucune statistique de « performance domestique ». Temps réel : shopping.changed / task.changed.
 */
@Injectable()
export class DailyLifeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ listes
  async lists(viewer: Viewer, includeArchived = false): Promise<ShoppingListDto[]> {
    const rows = await this.prisma.shoppingList.findMany({ where: { coupleId: viewer.couple.coupleId, ...(includeArchived ? {} : { archivedAt: null }) }, include: listInclude, orderBy: { updatedAt: 'desc' } });
    return rows.map(toListDto);
  }

  async createList(viewer: Viewer, input: z.infer<typeof createShoppingListSchema>): Promise<ShoppingListDto> {
    const row = await this.prisma.shoppingList.create({ data: { coupleId: viewer.couple.coupleId, name: input.name }, include: listInclude });
    this.emit(viewer, 'shopping.changed', { listId: row.id });
    return toListDto(row);
  }

  async updateList(viewer: Viewer, listId: string, input: z.infer<typeof updateShoppingListSchema>): Promise<ShoppingListDto> {
    await this.requireList(viewer, listId);
    const row = await this.prisma.shoppingList.update({ where: { id: listId }, data: { name: input.name, archivedAt: input.archived === undefined ? undefined : input.archived ? new Date() : null }, include: listInclude });
    this.emit(viewer, 'shopping.changed', { listId });
    return toListDto(row);
  }

  async deleteList(viewer: Viewer, listId: string): Promise<void> {
    await this.requireList(viewer, listId);
    await this.prisma.shoppingList.delete({ where: { id: listId } });
    this.emit(viewer, 'shopping.changed', { listId, deleted: true });
  }

  async addItem(viewer: Viewer, listId: string, input: z.infer<typeof createShoppingItemSchema>): Promise<ShoppingListDto> {
    await this.requireList(viewer, listId);
    const max = await this.prisma.shoppingItem.aggregate({ where: { listId }, _max: { position: true } });
    await this.prisma.shoppingItem.create({ data: { listId, name: input.name, quantity: input.quantity ?? null, category: input.category ?? null, position: (max._max.position ?? 0) + 1 } });
    await this.prisma.shoppingList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
    this.emit(viewer, 'shopping.changed', { listId });
    return toListDto(await this.prisma.shoppingList.findUniqueOrThrow({ where: { id: listId }, include: listInclude }));
  }

  async updateItem(viewer: Viewer, listId: string, itemId: string, input: z.infer<typeof updateShoppingItemSchema>): Promise<ShoppingListDto> {
    await this.requireList(viewer, listId);
    const item = await this.prisma.shoppingItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw AppError.notFound('Article introuvable.');
    await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        name: input.name, quantity: input.quantity, category: input.category, position: input.position,
        ...(input.checked === undefined ? {} : { checkedAt: input.checked ? new Date() : null, checkedByUserId: input.checked ? viewer.userId : null }),
      },
    });
    await this.prisma.shoppingList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
    this.emit(viewer, 'shopping.changed', { listId });
    return toListDto(await this.prisma.shoppingList.findUniqueOrThrow({ where: { id: listId }, include: listInclude }));
  }

  async deleteItem(viewer: Viewer, listId: string, itemId: string): Promise<ShoppingListDto> {
    await this.requireList(viewer, listId);
    await this.prisma.shoppingItem.deleteMany({ where: { id: itemId, listId } });
    this.emit(viewer, 'shopping.changed', { listId });
    return toListDto(await this.prisma.shoppingList.findUniqueOrThrow({ where: { id: listId }, include: listInclude }));
  }

  /** Retire les articles cochés (historique conservé dans l'audit applicatif, pas de score). */
  async clearChecked(viewer: Viewer, listId: string): Promise<ShoppingListDto> {
    await this.requireList(viewer, listId);
    await this.prisma.shoppingItem.deleteMany({ where: { listId, checkedAt: { not: null } } });
    this.emit(viewer, 'shopping.changed', { listId });
    return toListDto(await this.prisma.shoppingList.findUniqueOrThrow({ where: { id: listId }, include: listInclude }));
  }

  // ------------------------------------------------------------------ tâches
  async tasks(viewer: Viewer, filter: { status?: 'OPEN' | 'DONE' | 'CANCELED'; projectId?: string }): Promise<TaskDto[]> {
    const rows = await this.prisma.task.findMany({
      where: { coupleId: viewer.couple.coupleId, status: filter.status, projectId: filter.projectId },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { dueAt: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return rows.map(toTaskDto);
  }

  async createTask(viewer: Viewer, input: z.infer<typeof createTaskSchema>): Promise<TaskDto> {
    this.assertAssignee(viewer, input.assigneeUserId);
    if (input.rrule && !isValidRRule(input.rrule)) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Règle de récurrence invalide.', 400);
    if (input.projectId) await this.requireProject(viewer, input.projectId);
    const row = await this.prisma.task.create({
      data: { coupleId: viewer.couple.coupleId, creatorUserId: viewer.userId, assigneeUserId: input.assigneeUserId ?? null, projectId: input.projectId ?? null, title: input.title, description: input.description ?? null, priority: input.priority, dueAt: input.dueAt ? new Date(input.dueAt) : null, rrule: input.rrule ?? null },
      include: taskInclude,
    });
    this.emit(viewer, 'task.changed', { taskId: row.id });
    if (input.assigneeUserId && input.assigneeUserId !== viewer.userId) {
      await this.notifications.notify({ userId: input.assigneeUserId, category: 'SUGGESTION', type: 'task.assigned', title: 'Nouvelle tâche', body: 'Votre partenaire vous propose une tâche.', data: { taskId: row.id } });
    }
    return toTaskDto(row);
  }

  async updateTask(viewer: Viewer, taskId: string, input: z.infer<typeof updateTaskSchema>): Promise<TaskDto> {
    const task = await this.requireTask(viewer, taskId);
    this.assertAssignee(viewer, input.assigneeUserId);
    if (input.rrule && !isValidRRule(input.rrule)) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Règle de récurrence invalide.', 400);
    if (input.projectId) await this.requireProject(viewer, input.projectId);
    const becomingDone = input.status === 'DONE' && task.status !== 'DONE';
    const row = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: input.title, description: input.description, assigneeUserId: input.assigneeUserId, projectId: input.projectId, priority: input.priority, rrule: input.rrule,
        dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null,
        status: input.status,
        completedAt: input.status === undefined ? undefined : input.status === 'DONE' ? new Date() : null,
      },
      include: taskInclude,
    });
    // Tâche récurrente terminée : on recrée la prochaine occurrence (échéance suivante selon la règle).
    if (becomingDone && row.rrule && row.dueAt) {
      const next = nextOccurrence(row.rrule, row.dueAt);
      if (next) {
        await this.prisma.task.create({ data: { coupleId: row.coupleId, creatorUserId: row.creatorUserId, assigneeUserId: row.assigneeUserId, projectId: row.projectId, title: row.title, description: row.description, priority: row.priority, dueAt: next, rrule: row.rrule } });
      }
    }
    this.emit(viewer, 'task.changed', { taskId });
    return toTaskDto(row);
  }

  async deleteTask(viewer: Viewer, taskId: string): Promise<void> {
    await this.requireTask(viewer, taskId);
    await this.prisma.task.delete({ where: { id: taskId } });
    this.emit(viewer, 'task.changed', { taskId, deleted: true });
  }

  async comment(viewer: Viewer, taskId: string, body: string): Promise<TaskDto> {
    const task = await this.requireTask(viewer, taskId);
    await this.prisma.taskComment.create({ data: { taskId, userId: viewer.userId, body } });
    this.emit(viewer, 'task.changed', { taskId });
    const other = [task.creatorUserId, task.assigneeUserId].find((id) => id && id !== viewer.userId);
    if (other) await this.notifications.notify({ userId: other, category: 'SUGGESTION', type: 'task.comment', title: 'Nouveau commentaire', body: 'Votre partenaire a commenté une tâche.', data: { taskId } });
    return toTaskDto(await this.prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude }));
  }

  // ------------------------------------------------------------------ internes
  private emit(viewer: Viewer, event: string, payload: Record<string, unknown>) {
    this.realtime.emitToCouple(viewer.couple.coupleId, event, payload);
  }
  private assertAssignee(viewer: Viewer, assigneeUserId: string | null | undefined) {
    if (assigneeUserId && assigneeUserId !== viewer.userId && assigneeUserId !== viewer.couple.partnerUserId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Attribution possible uniquement à vous ou à votre partenaire.', 400);
    }
  }
  private async requireList(viewer: Viewer, listId: string): Promise<ListRow> {
    const row = await this.prisma.shoppingList.findFirst({ where: { id: listId, coupleId: viewer.couple.coupleId }, include: listInclude });
    if (!row) throw AppError.notFound('Liste introuvable.');
    return row;
  }
  private async requireTask(viewer: Viewer, taskId: string): Promise<TaskRow> {
    const row = await this.prisma.task.findFirst({ where: { id: taskId, coupleId: viewer.couple.coupleId }, include: taskInclude });
    if (!row) throw AppError.notFound('Tâche introuvable.');
    return row;
  }
  private async requireProject(viewer: Viewer, projectId: string) {
    const p = await this.prisma.project.findFirst({ where: { id: projectId, coupleId: viewer.couple.coupleId }, select: { id: true } });
    if (!p) throw AppError.notFound('Projet introuvable.');
  }
}

function toListDto(row: ListRow): ShoppingListDto {
  return {
    id: row.id, name: row.name, archivedAt: row.archivedAt?.toISOString() ?? null, itemCount: row.items.length, checkedCount: row.items.filter((i) => i.checkedAt).length,
    items: row.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, category: i.category, position: i.position, checkedAt: i.checkedAt?.toISOString() ?? null, checkedByUserId: i.checkedByUserId })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id, title: row.title, description: row.description, creatorUserId: row.creatorUserId, assigneeUserId: row.assigneeUserId, projectId: row.projectId, priority: row.priority, status: row.status,
    dueAt: row.dueAt?.toISOString() ?? null, rrule: row.rrule, completedAt: row.completedAt?.toISOString() ?? null,
    comments: row.comments.map((c) => ({ id: c.id, userId: c.userId, body: c.body, createdAt: c.createdAt.toISOString() })),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function nextOccurrence(rrule: string, after: Date): Date | null {
  try {
    const rule = new RRule({ ...RRule.parseString(rrule.replace(/^RRULE:/i, '')), dtstart: after });
    return rule.after(after, false);
  } catch {
    return null;
  }
}

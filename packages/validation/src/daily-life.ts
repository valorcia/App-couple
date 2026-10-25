import { z } from 'zod';
import { uuidSchema } from './common';

// ---------------------------------------------------------------- listes de courses
export const createShoppingListSchema = z.object({ name: z.string().trim().min(1).max(60) });
export const updateShoppingListSchema = z.object({ name: z.string().trim().min(1).max(60).optional(), archived: z.boolean().optional() });
export const createShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.string().trim().max(20).nullable().optional(),
  category: z.string().trim().max(30).nullable().optional(),
});
export const updateShoppingItemSchema = createShoppingItemSchema.partial().extend({
  checked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------- tâches
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  /** Attribution volontaire : soi-même ou le partenaire, jamais imposée par défaut. */
  assigneeUserId: uuidSchema.nullable().optional(),
  priority: taskPrioritySchema.default('MEDIUM'),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  rrule: z.string().trim().max(300).nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
});
export const updateTaskSchema = createTaskSchema.partial().extend({ status: z.enum(['OPEN', 'DONE', 'CANCELED']).optional() });
export const listTasksSchema = z.object({ status: z.enum(['OPEN', 'DONE', 'CANCELED']).optional(), projectId: uuidSchema.optional() });
export const taskCommentSchema = z.object({ body: z.string().trim().min(1).max(1000) });

// ---------------------------------------------------------------- projets
export const PROJECT_TEMPLATES = ['house', 'trip', 'wedding', 'renovation', 'baby', 'move', 'custom'] as const;
export const createProjectSchema = z.object({
  templateCode: z.enum(PROJECT_TEMPLATES).default('custom'),
  title: z.string().trim().min(1).max(100),
  goal: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  startAt: z.iso.date().nullable().optional(),
  targetAt: z.iso.date().nullable().optional(),
  budgetCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  currency: z.string().length(3).default('EUR'),
});
export const updateProjectSchema = createProjectSchema.partial().extend({ status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional() });
export const createProjectStepSchema = z.object({ title: z.string().trim().min(1).max(120), dueAt: z.iso.date().nullable().optional() });
export const updateProjectStepSchema = createProjectStepSchema.partial().extend({ completed: z.boolean().optional(), position: z.number().int().min(0).optional() });
export const projectNoteSchema = z.object({ body: z.string().trim().min(1).max(4000) });

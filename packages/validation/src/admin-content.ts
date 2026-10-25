import { z } from 'zod';
import { paginationSchema } from './common';

export const contentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const contentTierSchema = z.enum(['FREE', 'PREMIUM', 'PACK']);
export const contentTypeSchema = z.enum(['questions', 'challenges', 'desires', 'activities', 'categories', 'packs']);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const adminContentListSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: contentStatusSchema.optional(),
  tier: contentTierSchema.optional(),
  locale: z.string().max(5).optional(),
  gameType: z.enum(['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CHALLENGE', 'CONFESSIONS', 'MEMORY_QUIZ']).optional(),
  categoryCode: z.string().max(40).optional(),
});

export const adminQuestionSchema = z.object({
  gameType: z.enum(['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CONFESSIONS', 'MEMORY_QUIZ']),
  categoryCode: z.string().max(40).nullable().optional(),
  packCode: z.string().max(40).nullable().optional(),
  locale: z.string().min(2).max(5).default('fr'),
  level: z.number().int().min(1).max(4).default(1),
  tier: contentTierSchema.default('FREE'),
  status: contentStatusSchema.default('DRAFT'),
  text: z.string().trim().min(3).max(500),
  options: z.array(z.string().trim().min(1).max(120)).max(4).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
}).refine((q) => q.gameType !== 'DILEMMA' || (q.options && q.options.length === 2), { message: 'Un dilemme a exactement deux options.', path: ['options'] });

export const adminChallengeSchema = z.object({
  categoryCode: z.string().max(40).nullable().optional(),
  packCode: z.string().max(40).nullable().optional(),
  locale: z.string().min(2).max(5).default('fr'),
  tier: contentTierSchema.default('FREE'),
  status: contentStatusSchema.default('DRAFT'),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  instructions: z.array(z.string().trim().min(1).max(300)).max(10).default([]),
  durationMinutes: z.number().int().min(5).max(24 * 60).nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  budget: z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']).default('FREE'),
  materials: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  intimate: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export const adminDesireSchema = z.object({
  packCode: z.string().max(40).nullable().optional(),
  locale: z.string().min(2).max(5).default('fr'),
  category: z.enum(['tenderness', 'romance', 'seduction', 'complicity', 'desires', 'fantasies', 'experiences']),
  intensity: z.number().int().min(1).max(4).default(1),
  tier: contentTierSchema.default('FREE'),
  status: contentStatusSchema.default('DRAFT'),
  text: z.string().trim().min(3).max(300),
});

export const adminActivitySchema = z.object({
  locale: z.string().min(2).max(5).default('fr'),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(600),
  moods: z.array(z.enum(['ROMANTIC', 'FUNNY', 'RELAX', 'ADVENTURE', 'CULTURE', 'FOOD', 'SPICY'])).min(1).max(7),
  moments: z.array(z.enum(['NOW', 'TONIGHT', 'WEEKEND', 'DATE'])).min(1).max(4),
  company: z.array(z.enum(['COUPLE', 'FAMILY'])).min(1).max(2),
  budget: z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']).default('FREE'),
  durationMinutes: z.number().int().min(15).max(7 * 24 * 60).nullable().optional(),
  indoor: z.boolean().default(true),
  intimate: z.boolean().default(false),
  tier: contentTierSchema.default('FREE'),
  status: contentStatusSchema.default('DRAFT'),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export const adminCategorySchema = z.object({
  code: z.string().regex(/^[a-z0-9_-]+$/).max(40),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  gameTypes: z.array(z.enum(['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CHALLENGE', 'CONFESSIONS', 'MEMORY_QUIZ'])).default([]),
  sortOrder: z.number().int().default(0),
  status: contentStatusSchema.default('PUBLISHED'),
});

export const adminPackSchema = z.object({
  code: z.string().regex(/^[a-z0-9_-]+$/).max(40),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  productCode: z.string().max(40).nullable().optional(),
  status: contentStatusSchema.default('DRAFT'),
});

export const adminContentStatusSchema = z.object({ status: contentStatusSchema });

export const adminImportSchema = z.object({
  type: contentTypeSchema,
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
});

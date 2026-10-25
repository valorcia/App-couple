import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common';

export const gameTypeSchema = z.enum(['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CHALLENGE', 'CONFESSIONS', 'MEMORY_QUIZ']);

export const createGameSessionSchema = z.object({
  gameType: z.enum(['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CONFESSIONS']),
  categoryCodes: z.array(z.string().regex(/^[a-z0-9_-]+$/)).max(10).default([]),
  length: z.enum(['short', 'long']).default('short'),
  /** Confessions : niveau maximal accepté (1 léger → 4 très intime). */
  maxLevel: z.number().int().min(1).max(4).default(2),
});
export type CreateGameSessionInput = z.infer<typeof createGameSessionSchema>;

export const answerPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string().trim().min(1).max(1000) }),
  z.object({ kind: z.literal('choice'), index: z.number().int().min(0).max(9) }),
  z.object({ kind: z.literal('vote'), userId: uuidSchema }),
]);
export const submitAnswerSchema = z.object({ answer: answerPayloadSchema });

export const verdictSchema = z.object({ verdict: z.enum(['EXACT', 'CLOSE', 'MISS']) });

export const listGameSessionsSchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'COMPLETED', 'ABANDONED']).optional(),
  gameType: gameTypeSchema.optional(),
});

export const dailyAnswerSchema = z.object({ text: z.string().trim().min(1).max(1000) });

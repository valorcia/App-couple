import { z } from 'zod';

export const listChallengesSchema = z.object({
  category: z.string().regex(/^[a-z0-9_-]+$/).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  budget: z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  maxMinutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
});

export const completeChallengeSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

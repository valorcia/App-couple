import { z } from 'zod';
import { uuidSchema } from './common';

export const momentSchema = z.enum(['NOW', 'TONIGHT', 'WEEKEND', 'DATE']);
export const companySchema = z.enum(['COUPLE', 'FAMILY']);
export const budgetSchema = z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']);
export const moodSchema = z.enum(['ROMANTIC', 'FUNNY', 'RELAX', 'ADVENTURE', 'CULTURE', 'FOOD', 'SPICY']);

export const suggestIdeasSchema = z.object({
  moment: momentSchema,
  /** Requis quand moment = DATE. */
  date: z.iso.date().optional(),
  company: companySchema,
  budget: budgetSchema,
  mood: moodSchema,
  /** Demande l'enrichissement IA si disponible (quota). */
  useAi: z.boolean().default(true),
  city: z.string().trim().max(80).optional(),
}).refine((v) => v.moment !== 'DATE' || !!v.date, { message: 'Date requise', path: ['date'] });
export type SuggestIdeasInput = z.infer<typeof suggestIdeasSchema>;

export const scheduleIdeaSchema = z.object({
  /** Idée du catalogue (uuid) ou idée IA (clé opaque renvoyée par /suggest). */
  ideaId: z.string().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  invitePartner: z.boolean().default(true),
});

export const ideaIdParam = uuidSchema;

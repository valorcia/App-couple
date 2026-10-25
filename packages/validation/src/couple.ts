import { z } from 'zod';
import { emailSchema } from './common';

export const createInvitationSchema = z.object({
  targetEmail: emailSchema.optional(),
});

export const acceptInvitationSchema = z.object({
  code: z.string().trim().min(6).max(16),
});

export const updateCoupleSchema = z.object({
  name: z.string().trim().max(60).nullable().optional(),
  metAt: z.iso.date().nullable().optional(),
  anniversaryAt: z.iso.date().nullable().optional(),
});
export type UpdateCoupleInput = z.infer<typeof updateCoupleSchema>;

export const leaveCoupleSchema = z.object({
  confirm: z.literal(true),
});

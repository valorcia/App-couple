import { z } from 'zod';
import { localeSchema, timezoneSchema } from './common';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  birthDate: z.iso.date().nullable().optional(),
  locale: localeSchema.optional(),
  timezone: timezoneSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

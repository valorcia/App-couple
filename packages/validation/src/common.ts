import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const localeSchema = z.enum(['fr', 'en', 'es', 'de', 'it']);
export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Fuseau horaire invalide');

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** Mot de passe : 10+ caractères, 128 max. La robustesse réelle est vérifiée côté serveur (zxcvbn-like). */
export const passwordSchema = z.string().min(10).max(128);

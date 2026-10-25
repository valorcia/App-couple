import { z } from 'zod';

export const notificationCategorySchema = z.enum(['CALENDAR', 'INVITATION', 'GAME', 'CHALLENGE', 'SURPRISE', 'ANNIVERSARY', 'SUGGESTION', 'DAILY_QUESTION', 'SYSTEM', 'MARKETING']);

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM attendu');

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(z.object({
    category: notificationCategorySchema,
    push: z.boolean(),
    inApp: z.boolean(),
    email: z.boolean().default(false),
    maxPerDay: z.number().int().min(1).max(50).nullable().optional(),
  })).min(1).max(10),
  /** Heures silencieuses appliquées à toutes les catégories (heure locale de l'utilisateur). */
  quietStart: hhmm.nullable().optional(),
  quietEnd: hhmm.nullable().optional(),
});

export const registerPushDeviceSchema = z.object({
  token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/, 'Jeton Expo invalide'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().trim().max(80).optional(),
});

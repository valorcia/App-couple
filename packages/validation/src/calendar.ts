import { z } from 'zod';
import { timezoneSchema, uuidSchema } from './common';

export const eventVisibilitySchema = z.enum(['PRIVATE', 'SHARED', 'BUSY']);
export const eventTypeSchema = z.enum(['PERSONAL', 'SHARED', 'FAMILY', 'WORK', 'SURPRISE', 'VACATION', 'DATE', 'BIRTHDAY', 'OTHER']);
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue');

/** RRULE (RFC 5545) sans préfixe DTSTART ; validée côté serveur avec la librairie rrule. */
export const rruleSchema = z.string().trim().max(300).regex(/^(RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;[A-Z]+=[A-Za-z0-9,+-]+)*$/i, 'Règle de récurrence invalide');

export const reminderSchema = z.object({
  minutesBefore: z.number().int().min(0).max(60 * 24 * 30),
  channel: z.enum(['push', 'email']).default('push'),
});

const eventBase = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  allDay: z.boolean().default(false),
  timezone: timezoneSchema.default('Europe/Paris'),
  visibility: eventVisibilitySchema.default('SHARED'),
  type: eventTypeSchema.default('SHARED'),
  color: colorSchema.nullable().optional(),
  category: z.string().trim().max(40).nullable().optional(),
  rrule: rruleSchema.nullable().optional(),
  reminders: z.array(reminderSchema).max(5).default([]),
  /** Invite le partenaire (crée une participation PENDING). Sans effet si PRIVATE/BUSY. */
  invitePartner: z.boolean().default(false),
});

export const createEventSchema = eventBase.refine((e) => new Date(e.endAt) >= new Date(e.startAt), {
  message: 'La fin doit être postérieure au début.',
  path: ['endAt'],
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = eventBase
  .partial()
  .extend({
    /** Dates à exclure d'une récurrence (ISO). Remplace la liste. */
    exdates: z.array(z.iso.datetime({ offset: true })).max(200).optional(),
  })
  .refine((e) => !e.startAt || !e.endAt || new Date(e.endAt) >= new Date(e.startAt), {
    message: 'La fin doit être postérieure au début.',
    path: ['endAt'],
  });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const listEventsQuerySchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .refine((q) => new Date(q.to) > new Date(q.from), { message: 'Fenêtre invalide', path: ['to'] })
  .refine((q) => new Date(q.to).getTime() - new Date(q.from).getTime() <= 93 * 86400_000, { message: 'Fenêtre limitée à 93 jours', path: ['to'] });
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const respondAttendeeSchema = z.object({ status: z.enum(['ACCEPTED', 'DECLINED']) });

export const eventIdParam = uuidSchema;

export const excludeOccurrenceSchema = z.object({ occurrenceStart: z.iso.datetime({ offset: true }) });

export const freeSlotsQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
  minMinutes: z.coerce.number().int().min(30).max(24 * 60).default(120),
  dayStartHour: z.coerce.number().int().min(0).max(23).default(9),
  dayEndHour: z.coerce.number().int().min(1).max(24).default(23),
});

import { z } from 'zod';

export const INTIMACY_CATEGORIES = ['tenderness', 'romance', 'seduction', 'complicity', 'desires', 'fantasies', 'experiences'] as const;

export const updateIntimacySettingsSchema = z.object({
  enabled: z.boolean(),
  enabledCategories: z.array(z.enum(INTIMACY_CATEGORIES)).max(INTIMACY_CATEGORIES.length).default([...INTIMACY_CATEGORIES]),
  maxIntensity: z.number().int().min(1).max(4).default(2),
  /** Version des conditions spécifiques à l'espace Intimité acceptées. */
  consentVersion: z.string().default('2026-01'),
});

export const desireResponseSchema = z.object({ choice: z.enum(['YES', 'NO', 'MAYBE']) });

export const listDesireItemsSchema = z.object({
  category: z.enum(INTIMACY_CATEGORIES).optional(),
});

/** Signal « Ce soir ? » : on/off pour soi. L'état du partenaire n'est jamais exposé seul. */
export const tonightSchema = z.object({ on: z.boolean() });

/** Tirage d'une carte du soir au niveau demandé (1 douceur → 4 feu). */
export const drawCardSchema = z.object({ level: z.number().int().min(1).max(4) });

/** Clés d'entitlement consultées par le code métier. */
export const ENTITLEMENT = {
  PREMIUM: 'premium',
  pack: (code: string) => `pack:${code}` as const,
} as const;

/** Clés de paramètres (table AppSetting) avec valeurs par défaut. */
export const APP_SETTINGS = {
  'quota.free.dailyQuestionsPerDay': 1,
  'quota.free.aiRequestsPerMonth': 10,
  'quota.premium.aiRequestsPerMonth': 300,
  'quota.free.storageBytes': 500 * 1024 * 1024,
  'quota.premium.storageBytes': 20 * 1024 * 1024 * 1024,
  'quota.free.challengesCatalog': 5,
  'quota.free.gameSessionsPerDay': 3,
  'games.freeCategories': ['love', 'humor', 'daily'] as string[],
  'invitation.ttlHours': 72,
  'invitation.maxPerDay': 5,
  'couple.dissolutionGraceDays': 30,
  'account.deletionGraceDays': 30,
} as const;

export type AppSettingKey = keyof typeof APP_SETTINGS;

export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de', 'it'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export const INVITATION_CODE_LENGTH = 8;
export const INVITATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

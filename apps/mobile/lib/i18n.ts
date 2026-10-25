import fr from '@couple/shared/i18n/fr';

const messages: Record<string, Record<string, string>> = { ...(fr as Record<string, Record<string, string>>) };

/** Traduction minimale (fr). Un système complet (i18n-js + locales) arrive avec l'internationalisation. */
export function tError(code: string): string {
  return messages.errors?.[code] ?? messages.errors?.INTERNAL ?? 'Une erreur est survenue.';
}

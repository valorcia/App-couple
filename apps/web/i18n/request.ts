import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@couple/shared/constants';

export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get('en_locale')?.value;
  const locale = SUPPORTED_LOCALES.includes(requested as (typeof SUPPORTED_LOCALES)[number]) ? (requested as string) : DEFAULT_LOCALE;
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../messages/fr.json`)).default;
  }
  return { locale, messages, timeZone: 'Europe/Paris' };
});

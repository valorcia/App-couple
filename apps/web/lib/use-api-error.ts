'use client';
import { useTranslations } from 'next-intl';
import { errorCode } from './api';

/** Traduit une erreur API en message utilisateur. */
export function useApiErrorMessage() {
  const t = useTranslations('errors');
  return (err: unknown): string => {
    const code = errorCode(err);
    return t.has(code) ? t(code) : t('INTERNAL');
  };
}

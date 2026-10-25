'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { registerSchema } from '@couple/validation';
import type { AuthResponseDto } from '@couple/types';
import { Alert, Button, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';
import { AuthCard } from './auth-card';

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { setSession } = useAuth();
  const toMessage = useApiErrorMessage();
  const form = useZodForm(registerSchema, { email: '', password: '', displayName: '', acceptTerms: undefined, marketingOptIn: false, locale: 'fr', timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Paris' });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<AuthResponseDto>('/auth/register', data, { auth: false });
      setSession(res);
      router.replace('/verifier-email');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title={t('register.title')}
      description={t('register.subtitle')}
      footer={<>{t('register.hasAccount')} <Link href="/connexion" className="font-medium text-primary hover:underline">{t('login.submit')}</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label={t('fields.displayName')} htmlFor="displayName" hint={t('fields.displayNameHint')} error={form.errors.displayName}>
          <Input id="displayName" autoComplete="given-name" required maxLength={40} value={form.values.displayName ?? ''} onChange={(e) => form.set('displayName', e.target.value)} invalid={!!form.errors.displayName} />
        </Field>
        <Field label={t('fields.email')} htmlFor="email" error={form.errors.email}>
          <Input id="email" type="email" autoComplete="email" required value={form.values.email ?? ''} onChange={(e) => form.set('email', e.target.value)} invalid={!!form.errors.email} />
        </Field>
        <Field label={t('fields.password')} htmlFor="password" hint={t('fields.passwordHint')} error={form.errors.password}>
          <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={form.values.password ?? ''} onChange={(e) => form.set('password', e.target.value)} invalid={!!form.errors.password} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={form.values.acceptTerms === true} onChange={(e) => form.set('acceptTerms', (e.target.checked ? true : undefined) as true)} />
          <span className={form.errors.acceptTerms ? 'text-danger' : 'text-fg-muted'}>
            {t.rich('register.terms', {
              terms: (c) => <Link href="/conditions" className="underline" target="_blank">{c}</Link>,
              privacy: (c) => <Link href="/confidentialite" className="underline" target="_blank">{c}</Link>,
            })}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-fg-muted">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={!!form.values.marketingOptIn} onChange={(e) => form.set('marketingOptIn', e.target.checked)} />
          <span>{t('register.marketing')}</span>
        </label>
        <Button type="submit" className="w-full" size="lg" loading={pending}>{t('register.submit')}</Button>
      </form>
    </AuthCard>
  );
}

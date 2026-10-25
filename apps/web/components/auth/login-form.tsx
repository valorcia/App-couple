'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { loginSchema } from '@couple/validation';
import type { AuthResponseDto } from '@couple/types';
import { Alert, Button, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';
import { AuthCard } from './auth-card';
import { DemoEntry } from './demo-entry';

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const nextParam = useSearchParams().get('next');
  const nextPath = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/accueil';
  const { setSession } = useAuth();
  const toMessage = useApiErrorMessage();
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<AuthResponseDto>('/auth/login', data, { auth: false });
      setSession(res);
      router.replace(res.user.emailVerified ? nextPath : '/verifier-email');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard
      title={t('login.title')}
      description={t('login.subtitle')}
      footer={<>{t('login.noAccount')} <Link href="/inscription" className="font-medium text-primary hover:underline">{t('register.submit')}</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label={t('fields.email')} htmlFor="email" error={form.errors.email}>
          <Input id="email" type="email" autoComplete="email" required value={form.values.email ?? ''} onChange={(e) => form.set('email', e.target.value)} invalid={!!form.errors.email} />
        </Field>
        <Field label={t('fields.password')} htmlFor="password" error={form.errors.password}>
          <Input id="password" type="password" autoComplete="current-password" required value={form.values.password ?? ''} onChange={(e) => form.set('password', e.target.value)} invalid={!!form.errors.password} />
        </Field>
        <div className="flex items-center justify-between">
          <Link href="/mot-de-passe-oublie" className="text-sm text-fg-muted hover:text-fg">{t('login.forgot')}</Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={pending}>{t('login.submit')}</Button>
      </form>
      <DemoEntry />
    </AuthCard>
  );
}

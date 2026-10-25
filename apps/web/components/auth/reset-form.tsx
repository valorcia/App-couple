'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { passwordSchema } from '@couple/validation';
import { Alert, Button, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';
import { AuthCard } from './auth-card';

const schema = z.object({ password: passwordSchema });

export function ResetForm() {
  const t = useTranslations('auth');
  const token = useSearchParams().get('token') ?? '';
  const toMessage = useApiErrorMessage();
  const form = useZodForm(schema, { password: '' });
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password }, { auth: false });
      setDone(true);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthCard title={t('reset.title')}>
      {done ? (
        <>
          <Alert tone="success">{t('reset.success')}</Alert>
          <Button asChild className="w-full"><Link href="/connexion">{t('login.submit')}</Link></Button>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label={t('fields.newPassword')} htmlFor="password" hint={t('fields.passwordHint')} error={form.errors.password}>
            <Input id="password" type="password" autoComplete="new-password" value={form.values.password ?? ''} onChange={(e) => form.set('password', e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={pending} disabled={!token}>{t('reset.submit')}</Button>
        </form>
      )}
    </AuthCard>
  );
}

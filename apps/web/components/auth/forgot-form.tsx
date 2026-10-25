'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { forgotPasswordSchema } from '@couple/validation';
import { Alert, Button, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';
import { AuthCard } from './auth-card';

export function ForgotForm() {
  const t = useTranslations('auth');
  const toMessage = useApiErrorMessage();
  const form = useZodForm(forgotPasswordSchema, { email: '' });
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    try {
      await api.post('/auth/forgot-password', data, { auth: false });
      setSent(true);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthCard title={t('forgot.title')} description={t('forgot.subtitle')}>
      {sent ? (
        <Alert tone="success">{t('forgot.sent')}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label={t('fields.email')} htmlFor="email" error={form.errors.email}>
            <Input id="email" type="email" autoComplete="email" value={form.values.email ?? ''} onChange={(e) => form.set('email', e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={pending}>{t('forgot.submit')}</Button>
        </form>
      )}
    </AuthCard>
  );
}

'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { acceptInvitationSchema } from '@couple/validation';
import type { CoupleDto } from '@couple/types';
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';

export function JoinCouple({ standalone = false, onBack }: { standalone?: boolean; onBack?: () => void }) {
  const t = useTranslations('couple.join');
  const tc = useTranslations('common');
  const params = useSearchParams();
  const router = useRouter();
  const { refetch } = useAuth();
  const toMessage = useApiErrorMessage();
  const form = useZodForm(acceptInvitationSchema, { code: params.get('code') ?? '' });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    setError(null);
    try {
      await api.post<CoupleDto>('/couples/join', data);
      await refetch();
      router.replace('/accueil');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };

  const content = (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label={t('code')} htmlFor="code" hint={t('codeHint')} error={form.errors.code}>
        <Input id="code" autoCapitalize="characters" autoComplete="one-time-code" className="text-center font-display text-2xl tracking-[0.3em] uppercase" maxLength={12} value={form.values.code ?? ''} onChange={(e) => form.set('code', e.target.value)} invalid={!!form.errors.code} />
      </Field>
      <div className="flex gap-2">
        {onBack ? <Button type="button" variant="ghost" onClick={onBack}>{tc('back')}</Button> : null}
        <Button type="submit" className="flex-1" size="lg" loading={pending}>{t('submit')}</Button>
      </div>
    </form>
  );

  if (!standalone) return content;
  return (
    <div className="container-page max-w-md py-10">
      <Card>
        <CardHeader><CardTitle className="text-3xl text-secondary">{t('title')}</CardTitle><CardDescription>{t('codeHint')}</CardDescription></CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );
}

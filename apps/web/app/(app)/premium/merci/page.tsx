'use client';
import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { BillingStatusDto } from '@couple/types';
import { Alert, Button, Card } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';

export default function ThanksPage() {
  const t = useTranslations('billing.thanks');
  const { refetch } = useAuth();
  const status = useQuery({ queryKey: ['billing', 'status'], queryFn: () => api.get<BillingStatusDto>('/billing/status'), refetchInterval: (q) => (q.state.data?.premium ? false : 3000) });
  React.useEffect(() => { if (status.data?.premium) void refetch(); }, [status.data?.premium, refetch]);
  return (
    <div className="container-page max-w-lg py-16">
      <Card tone="champagne" className="space-y-4 p-8 text-center">
        <h1 className="text-3xl">{t('title')}</h1>
        {status.data?.premium ? <Alert tone="success">{t('active')}</Alert> : <p className="opacity-80">{t('body')}</p>}
        <Button asChild variant="secondary"><Link href="/accueil">{t('back')}</Link></Button>
      </Card>
    </div>
  );
}

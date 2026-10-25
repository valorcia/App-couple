'use client';
import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, Sparkles } from 'lucide-react';
import type { BillingProductDto, BillingStatusDto, CheckoutSessionDto } from '@couple/types';
import { Alert, Badge, Button, Card, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';

export function PremiumPage() {
  const t = useTranslations('billing');
  const toMessage = useApiErrorMessage();
  const products = useQuery({ queryKey: ['billing', 'products'], queryFn: () => api.get<BillingProductDto[]>('/billing/products', { auth: false }) });
  const status = useQuery({ queryKey: ['billing', 'status'], queryFn: () => api.get<BillingStatusDto>('/billing/status') });
  useRealtimeInvalidation('entitlements.changed', [['billing'], ['me'], ['games']]);
  const [error, setError] = React.useState<string | null>(null);
  const checkout = useMutation({
    mutationFn: (productCode: string) => api.post<CheckoutSessionDto>('/billing/checkout', { productCode }),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e) => setError(toMessage(e)),
  });
  const subs = (products.data ?? []).filter((p) => p.type === 'SUBSCRIPTION');
  const monthly = subs.find((p) => p.interval === 'MONTH');
  const fmt = (cents: number, currency: string) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency });

  return (
    <div className="container-page max-w-3xl space-y-8 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <SubscriptionStatusCard status={status.data} />
      {status.data?.premium ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.isPending ? [0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-lg" />) : subs.map((p) => {
            const yearlyMonthly = p.interval === 'YEAR' && monthly ? fmt(Math.round(p.priceCents / 12), p.currency) : null;
            return (
              <Card key={p.id} tone={p.interval === 'YEAR' ? 'champagne' : 'default'} className="flex flex-col gap-4 p-6">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-70">{p.name}</p>
                  <p className="mt-2 font-display text-4xl">{fmt(p.priceCents, p.currency)}<span className="text-base opacity-70"> {p.interval === 'YEAR' ? t('perYear') : t('perMonth')}</span></p>
                  {yearlyMonthly ? <p className="text-sm opacity-80">{t('yearlyNote', { monthly: yearlyMonthly })}</p> : null}
                </div>
                {p.description ? <p className="text-sm opacity-80">{p.description}</p> : null}
                <div className="mt-auto">
                  {p.checkoutAvailable ? (
                    <Button className="w-full" variant={p.interval === 'YEAR' ? 'secondary' : 'primary'} onClick={() => checkout.mutate(p.code)} loading={checkout.isPending}><Sparkles className="h-4 w-4" aria-hidden />{t('choose')}</Button>
                  ) : (
                    <Alert tone="info">{t('unavailable')}</Alert>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Card className="p-6">
        <h2 className="text-xl">{t('includes.title')}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {t.raw('includes.items').map((item: string) => <li key={item} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{item}</li>)}
        </ul>
        <p className="mt-4 text-xs text-fg-subtle">{t('mobileHint')}</p>
      </Card>
    </div>
  );
}

export function SubscriptionStatusCard({ status }: { status: BillingStatusDto | undefined }) {
  const t = useTranslations('billing');
  const toMessage = useApiErrorMessage();
  const [error, setError] = React.useState<string | null>(null);
  const portal = useMutation({ mutationFn: () => api.post<CheckoutSessionDto>('/billing/portal', { returnPath: '/premium' }), onSuccess: ({ url }) => { window.location.href = url; }, onError: (e) => setError(toMessage(e)) });
  if (!status) return <Skeleton className="h-24 rounded-lg" />;
  const sub = status.subscription;
  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-fg-muted">{t('current')}</p>
        {status.premium ? <p className="font-medium">{t('premiumActive')}</p> : <p className="font-medium">{t('none')}</p>}
        {sub ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Badge tone={sub.status === 'ACTIVE' || sub.status === 'TRIALING' ? 'success' : sub.status === 'PAST_DUE' ? 'warning' : 'neutral'}>{t(`status.${sub.status}`)}</Badge>
            {sub.currentPeriodEnd ? <span>{sub.cancelAtPeriodEnd ? t('endsOn', { date: new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR') }) : t('renews', { date: new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR') })}</span> : null}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
      </div>
      {sub ? (
        sub.manageVia === 'stripe' ? <Button variant="outline" size="sm" onClick={() => portal.mutate()} loading={portal.isPending}>{t('manage')}</Button>
        : <p className="text-sm text-fg-muted">{sub.manageVia === 'apple' ? t('manageApple') : sub.manageVia === 'google' ? t('manageGoogle') : t('manageManual')}</p>
      ) : null}
    </Card>
  );
}

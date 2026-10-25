'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Button, Card } from '@couple/ui';
import { errorCode } from '@/lib/api';

/** Encart affiché sous une erreur 402 (droit Premium requis ou quota gratuit atteint). */
export function PaywallHint({ error }: { error: unknown }) {
  const t = useTranslations('billing.paywall');
  const code = errorCode(error);
  if (code !== 'ENTITLEMENT_REQUIRED' && code !== 'QUOTA_EXCEEDED') return null;
  return (
    <Card tone="champagne" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{t('title')}</p>
        <p className="text-sm opacity-80">{code === 'QUOTA_EXCEEDED' ? t('quota') : t('body')}</p>
      </div>
      <Button asChild variant="secondary" size="sm"><Link href="/premium"><Sparkles className="h-4 w-4" aria-hidden />{t('cta')}</Link></Button>
    </Card>
  );
}

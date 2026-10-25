'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FlaskConical } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { DEMO_STATE_KEY, isDemo } from '@/lib/demo/mode';

/** Bandeau permanent du mode démo : rappelle que tout est fictif et local. */
export function DemoBanner() {
  const t = useTranslations('demo');
  const router = useRouter();
  const qc = useQueryClient();
  const { logout } = useAuth();
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => setDemo(isDemo()), []);
  if (!demo) return null;
  const reset = () => {
    try {
      window.localStorage.removeItem(DEMO_STATE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };
  const leave = async () => {
    await logout();
    qc.clear();
    router.replace('/connexion');
  };
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-secondary px-4 py-2 text-center text-xs text-secondary-fg">
      <span className="inline-flex items-center gap-2"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{t('banner')}</span>
      <span className="flex gap-3">
        <button type="button" className="underline underline-offset-2" onClick={reset}>{t('reset')}</button>
        <button type="button" className="underline underline-offset-2" onClick={leave}>{t('leave')}</button>
      </span>
    </div>
  );
}

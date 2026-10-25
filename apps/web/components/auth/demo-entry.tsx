'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import type { MeDto } from '@couple/types';
import { Button } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { demoAvailable, enterDemo } from '@/lib/demo/mode';

/** Entrée dans le mode démo (hors production publique : NEXT_PUBLIC_DEMO_MODE=off le masque). */
export function DemoEntry() {
  const t = useTranslations('demo');
  const router = useRouter();
  const { setSession } = useAuth();
  const [pending, setPending] = React.useState(false);
  if (!demoAvailable()) return null;
  const start = async () => {
    setPending(true);
    enterDemo();
    const user = await api.get<MeDto>('/me');
    setSession({ tokens: { accessToken: 'demo', expiresIn: 900 }, user });
    router.replace('/accueil');
  };
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border bg-bg-muted/60 p-4 text-center">
      <p className="text-sm text-fg-muted">{t('entry')}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={start} loading={pending}><Sparkles className="h-4 w-4" aria-hidden />{t('enter')}</Button>
    </div>
  );
}

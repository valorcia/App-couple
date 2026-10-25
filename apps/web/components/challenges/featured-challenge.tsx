'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Flag } from 'lucide-react';
import type { ChallengeFeaturedDto } from '@couple/types';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { ChallengeCard, ChallengeDialog } from './challenges-page';

export function FeaturedChallenge() {
  const t = useTranslations('challenges');
  const { user } = useAuth();
  const featured = useQuery({ queryKey: ['challenges', 'featured'], queryFn: () => api.get<ChallengeFeaturedDto>('/challenges/featured'), enabled: user?.couple?.status === 'ACTIVE' });
  useRealtimeInvalidation('challenge.changed', [['challenges']]);
  const [open, setOpen] = React.useState(false);
  const c = featured.data?.challenge ?? null;
  return (
    <Card tone="warm" className="h-full">
      <CardHeader><CardTitle className="label-sc flex items-center gap-2"><Flag className="h-4 w-4" aria-hidden />{featured.data?.kind === 'active' ? t('featured') : t('suggestion')}</CardTitle></CardHeader>
      <CardContent>
        {featured.isPending ? <Skeleton className="h-24" /> : c ? <ChallengeCard c={c} onOpen={() => setOpen(true)} compact /> : <p className="text-sm text-fg-muted">{t('none')}</p>}
      </CardContent>
      <ChallengeDialog c={open ? c : null} onClose={() => setOpen(false)} />
    </Card>
  );
}

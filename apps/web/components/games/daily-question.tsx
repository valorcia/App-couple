'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { DailyQuestionDto } from '@couple/types';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Textarea } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';

export function DailyQuestionCard() {
  const t = useTranslations('games.daily');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const daily = useQuery({ queryKey: ['games', 'daily'], queryFn: () => api.get<DailyQuestionDto | { daily: null }>('/games/daily'), enabled: user?.couple?.status === 'ACTIVE' });
  useRealtimeInvalidation('daily.changed', [['games', 'daily']]);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const send = useMutation({ mutationFn: () => api.post<DailyQuestionDto>('/games/daily/answer', { text: text.trim() }), onSuccess: (d) => { qc.setQueryData(['games', 'daily'], d); setText(''); }, onError: (e) => setError(toMessage(e)) });

  const data = daily.data && 'text' in daily.data ? daily.data : null;
  return (
    <Card tone="honey" className="postcard h-full">
      <CardHeader><CardTitle className="label-sc">{t('title')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {daily.isPending ? <Skeleton className="h-16" /> : !data ? <p className="text-sm text-secondary/80">{t('none')}</p> : (
          <>
            <p className="pr-10 font-display text-2xl leading-tight">{data.text}</p>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {data.revealedAt ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-bg-elevated p-3"><p className="text-xs uppercase tracking-wider text-fg-subtle">{user?.profile.displayName}</p><p className="mt-1">{data.myAnswer}</p></div>
                <div className="rounded-md bg-bg-elevated p-3"><p className="text-xs uppercase tracking-wider text-fg-subtle">{partner}</p><p className="mt-1">{data.partnerAnswer}</p></div>
              </div>
            ) : data.myAnswer ? (
              <p className="flex items-center gap-2 text-sm text-secondary/80"><Check className="h-4 w-4" aria-hidden />{t('waiting', { partner })}</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }} className="space-y-2">
                {data.partnerAnswered ? <Badge tone="coral">{t('partnerFirst', { partner })}</Badge> : null}
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} aria-label={t('title')} className="bg-bg-elevated" />
                <div className="flex justify-end"><Button size="sm" variant="secondary" type="submit" loading={send.isPending} disabled={!text.trim()}>{t('answer')}</Button></div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

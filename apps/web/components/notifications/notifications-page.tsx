'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Settings } from 'lucide-react';
import type { NotificationDto, Page } from '@couple/types';
import { Badge, Button, EmptyState, Skeleton, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';

const LINKS: Record<string, (data: Record<string, unknown>) => string> = {
  'calendar.invitation': () => '/agenda', 'calendar.updated': () => '/agenda', 'calendar.accepted': () => '/agenda', 'calendar.declined': () => '/agenda', 'calendar.reminder': () => '/agenda',
  'game.invited': (d) => `/jouer/${d.sessionId}`, 'game.your_turn': (d) => `/jouer/${d.sessionId}`,
  'daily.partner_answered': () => '/accueil', 'daily.prompt': () => '/accueil',
  'challenge.proposed': () => '/defis', 'challenge.accepted': () => '/defis', 'challenge.partner_done': () => '/defis',
  'intimacy.partner_enabled': () => '/intimite', 'intimacy.reveal_requested': () => '/intimite',
  'billing.payment_failed': () => '/premium',
};

export function NotificationsPage() {
  const t = useTranslations('notifications');
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => api.get<Page<NotificationDto>>('/notifications') });
  useRealtimeInvalidation('notification.new', [['notifications']]);
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const readOne = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} actions={<><Button variant="ghost" size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending}>{t('markAll')}</Button><Button asChild variant="outline" size="sm"><Link href="/profil/notifications"><Settings className="h-4 w-4" aria-hidden />{t('settings.title')}</Link></Button></>} />
      {list.isPending ? <Skeleton className="h-40 rounded-lg" /> : list.data?.items.length === 0 ? <EmptyState title={t('empty')} /> : (
        <ul className="space-y-2">
          {list.data?.items.map((n) => {
            const href = LINKS[n.type]?.(n.data) ?? '/accueil';
            return (
              <li key={n.id}>
                <Link href={href} onClick={() => !n.readAt && readOne.mutate(n.id)} className={cn('flex items-start gap-3 rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-muted', !n.readAt && 'border-primary/40 bg-primary/5')}>
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span><Badge tone="neutral">{t(`categories.${n.category}`)}</Badge></span>
                    <span className="block text-sm text-fg-muted">{n.body}</span>
                    <span className="block text-xs text-fg-subtle">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

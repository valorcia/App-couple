'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useRealtimeInvalidation } from '@/lib/realtime';

export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations('notifications');
  const { user } = useAuth();
  const unread = useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => api.get<{ count: number }>('/notifications/unread-count'), enabled: !!user?.emailVerified, refetchInterval: 60_000 });
  useRealtimeInvalidation('notification.new', [['notifications']]);
  const count = unread.data?.count ?? 0;
  return (
    <Link href="/notifications" aria-label={count ? `${t('bell')} (${count})` : t('bell')} className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-fg-muted hover:bg-bg-muted ${className ?? ''}`}>
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 ? <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-semibold text-primary-fg">{count > 9 ? '9+' : count}</span> : null}
    </Link>
  );
}

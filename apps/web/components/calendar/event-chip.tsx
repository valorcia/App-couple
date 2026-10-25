'use client';
import { useTranslations } from 'next-intl';
import { Lock, Repeat } from 'lucide-react';
import type { CalendarEventDto } from '@couple/types';
import { cn } from '@couple/ui';
import { eventColor } from '@/lib/calendar-utils';

export function EventChip({ event, onClick, className, time }: { event: CalendarEventDto; onClick: () => void; className?: string; time?: string }) {
  const t = useTranslations('calendar');
  const color = eventColor(event);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 truncate rounded-sm px-2 py-1 text-left text-xs font-medium transition-colors hover:brightness-95',
        event.busy ? 'bg-[repeating-linear-gradient(135deg,var(--bg-muted),var(--bg-muted)_4px,var(--border)_4px,var(--border)_8px)] text-fg-muted' : 'text-white',
        className,
      )}
      style={event.busy ? undefined : { backgroundColor: color }}
      aria-label={`${event.busy ? t('busy') : event.title}${time ? `, ${time}` : ''}`}
    >
      {event.busy ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
      {event.isRecurring && !event.busy ? <Repeat className="h-3 w-3 shrink-0 opacity-80" aria-hidden /> : null}
      {time ? <span className="shrink-0 opacity-80">{time}</span> : null}
      <span className="truncate">{event.busy ? t('busy') : event.title}</span>
    </button>
  );
}

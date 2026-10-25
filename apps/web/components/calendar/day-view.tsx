'use client';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Lock, Repeat } from 'lucide-react';
import type { CalendarEventDto } from '@couple/types';
import { Button, EmptyState } from '@couple/ui';
import { eventColor, eventsOnDay } from '@/lib/calendar-utils';

export function DayView({ day, events, onSelectEvent, onCreate }: { day: Date; events: CalendarEventDto[]; onSelectEvent: (e: CalendarEventDto) => void; onCreate: (start: Date) => void }) {
  const t = useTranslations('calendar');
  const list = eventsOnDay(events, day);
  if (list.length === 0) {
    return <EmptyState title={t('empty')} description={t('emptyHint')} action={<Button onClick={() => onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 0))}>{t('new')}</Button>} />;
  }
  return (
    <ul className="space-y-2">
      {list.map((e) => (
        <li key={e.instanceId}>
          <button type="button" onClick={() => onSelectEvent(e)} className="flex w-full items-stretch gap-4 rounded-lg border border-border bg-bg-elevated p-4 text-left transition-colors hover:bg-bg-muted">
            <span className="w-1.5 shrink-0 rounded-pill" style={{ backgroundColor: eventColor(e) }} aria-hidden />
            <div className="w-24 shrink-0 text-sm text-fg-muted">
              {e.allDay ? t('allDay') : <>{format(new Date(e.startAt), 'HH:mm')}<br />{format(new Date(e.endAt), 'HH:mm')}</>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {e.busy ? <Lock className="h-4 w-4 text-fg-muted" aria-hidden /> : null}
                {e.busy ? t('busy') : e.title}
                {e.isRecurring ? <Repeat className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> : null}
              </p>
              {e.location ? <p className="truncate text-sm text-fg-muted">{e.location}</p> : null}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

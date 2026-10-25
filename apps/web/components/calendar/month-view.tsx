'use client';
import { addDays, format, isSameDay, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEventDto } from '@couple/types';
import { cn } from '@couple/ui';
import { eventsOnDay } from '@/lib/calendar-utils';
import { EventChip } from './event-chip';

export function MonthView({ cursor, from, events, onSelectEvent, onSelectDay, onCreate }: { cursor: Date; from: Date; events: CalendarEventDto[]; onSelectEvent: (e: CalendarEventDto) => void; onSelectDay: (d: Date) => void; onCreate: (start: Date) => void }) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const today = new Date();
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <div className="grid grid-cols-7 border-b border-border bg-bg-muted/60 text-center text-xs font-medium uppercase tracking-wider text-fg-muted">
        {Array.from({ length: 7 }, (_, i) => <div key={i} className="py-2">{format(addDays(from, i), 'EEE', { locale: fr })}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsOnDay(events, day);
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn('min-h-[104px] border-b border-r border-border p-1.5 align-top', !inMonth && 'bg-bg-muted/30 text-fg-subtle')}
              onDoubleClick={() => onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 19, 0))}
            >
              <button type="button" onClick={() => onSelectDay(day)} className={cn('mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm', isToday && 'bg-primary font-semibold text-primary-fg')} aria-label={format(day, 'd MMMM', { locale: fr })}>
                {format(day, 'd')}
              </button>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => <EventChip key={e.instanceId} event={e} onClick={() => onSelectEvent(e)} />)}
                {dayEvents.length > 3 ? <button type="button" onClick={() => onSelectDay(day)} className="px-2 text-xs text-fg-muted hover:text-fg">+{dayEvents.length - 3}</button> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

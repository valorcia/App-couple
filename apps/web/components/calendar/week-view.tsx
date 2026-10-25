'use client';
import { addDays, differenceInMinutes, format, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEventDto } from '@couple/types';
import { cn } from '@couple/ui';
import { eventsOnDay } from '@/lib/calendar-utils';
import { EventChip } from './event-chip';

const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_PX = 48;

export function WeekView({ from, events, onSelectEvent, onCreate }: { from: Date; events: CalendarEventDto[]; onSelectEvent: (e: CalendarEventDto) => void; onCreate: (start: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const today = new Date();
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-l border-border px-2 py-2 text-center">
              <p className="text-xs uppercase tracking-wider text-fg-muted">{format(d, 'EEE', { locale: fr })}</p>
              <p className={cn('mx-auto mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm', isSameDay(d, today) && 'bg-primary font-semibold text-primary-fg')}>{format(d, 'd')}</p>
            </div>
          ))}
        </div>
        {/* Toute la journée */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div className="py-1 pr-2 text-right text-[10px] text-fg-subtle">journée</div>
          {days.map((d) => (
            <div key={d.toISOString()} className="space-y-1 border-l border-border p-1">
              {eventsOnDay(events, d).filter((e) => e.allDay || differenceInMinutes(new Date(e.endAt), new Date(e.startAt)) >= 24 * 60).map((e) => (
                <EventChip key={e.instanceId} event={e} onClick={() => onSelectEvent(e)} />
              ))}
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: hours.length * HOUR_PX }}>
          <div>
            {hours.map((h) => <div key={h} className="pr-2 text-right text-[11px] text-fg-subtle" style={{ height: HOUR_PX, transform: 'translateY(-6px)' }}>{String(h).padStart(2, '0')}:00</div>)}
          </div>
          {days.map((d) => {
            const dayStart = startOfDay(d);
            const timed = eventsOnDay(events, d).filter((e) => !e.allDay && differenceInMinutes(new Date(e.endAt), new Date(e.startAt)) < 24 * 60);
            return (
              <div key={d.toISOString()} className="relative border-l border-border" onDoubleClick={(ev) => {
                const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
                const minutes = Math.floor(((ev.clientY - rect.top) / HOUR_PX) * 60 / 30) * 30 + START_HOUR * 60;
                onCreate(new Date(dayStart.getTime() + minutes * 60_000));
              }}>
                {hours.map((h) => <div key={h} className="border-b border-border/60" style={{ height: HOUR_PX }} />)}
                {timed.map((e) => {
                  const s = Math.max(0, differenceInMinutes(new Date(e.startAt), dayStart) - START_HOUR * 60);
                  const en = Math.min((END_HOUR - START_HOUR) * 60, differenceInMinutes(new Date(e.endAt), dayStart) - START_HOUR * 60);
                  const top = (s / 60) * HOUR_PX;
                  const height = Math.max(22, ((en - s) / 60) * HOUR_PX - 2);
                  return (
                    <div key={e.instanceId} className="absolute left-1 right-1" style={{ top, height }}>
                      <EventChip event={e} onClick={() => onSelectEvent(e)} className="h-full items-start py-1" time={format(new Date(e.startAt), 'HH:mm')} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

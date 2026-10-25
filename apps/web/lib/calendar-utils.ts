import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { CalendarEventDto, EventType } from '@couple/types';

export type CalendarView = 'day' | 'week' | 'month';

export function visibleRange(view: CalendarView, cursor: Date): { from: Date; to: Date } {
  if (view === 'day') {
    const from = startOfDay(cursor);
    return { from, to: addDays(from, 1) };
  }
  if (view === 'week') {
    const from = startOfWeek(cursor, { weekStartsOn: 1 });
    return { from, to: addDays(from, 7) };
  }
  const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const to = addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }), 1);
  return { from, to };
}

export function shift(view: CalendarView, cursor: Date, direction: 1 | -1): Date {
  if (view === 'day') return addDays(cursor, direction);
  if (view === 'week') return addWeeks(cursor, direction);
  return addMonths(cursor, direction);
}

export const TYPE_COLORS: Record<EventType, string> = {
  PERSONAL: '#978F9B',
  SHARED: '#E0705A',
  FAMILY: '#4F6FA8',
  WORK: '#6B6670',
  SURPRISE: '#4A2A4F',
  VACATION: '#3F8F6B',
  DATE: '#C95B46',
  BIRTHDAY: '#C98A2E',
  OTHER: '#978F9B',
};

export function eventColor(e: CalendarEventDto): string {
  if (e.busy) return '#B3ABB0';
  return e.color ?? TYPE_COLORS[e.type];
}

/** Événements qui touchent un jour donné (local). */
export function eventsOnDay(events: CalendarEventDto[], day: Date): CalendarEventDto[] {
  const start = startOfDay(day).getTime();
  const end = start + 86_400_000;
  return events.filter((e) => new Date(e.startAt).getTime() < end && new Date(e.endAt).getTime() > start);
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export const RECURRENCE_PRESETS = {
  none: null,
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  biweekly: 'FREQ=WEEKLY;INTERVAL=2',
  monthly: 'FREQ=MONTHLY',
  yearly: 'FREQ=YEARLY',
} as const;
export type RecurrencePreset = keyof typeof RECURRENCE_PRESETS | 'custom';

export function presetFromRRule(rrule: string | null): RecurrencePreset {
  if (!rrule) return 'none';
  const entry = (Object.entries(RECURRENCE_PRESETS) as [RecurrencePreset, string | null][]).find(([, v]) => v === rrule);
  return entry ? entry[0] : 'custom';
}

export const REMINDER_PRESETS = [0, 10, 30, 60, 1440] as const;

import type { TaskDto } from '@couple/types';

export const RECURRENCE_PRESETS = { none: null, daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY' } as const;
export type RecurrencePreset = keyof typeof RECURRENCE_PRESETS;

export function formatDay(iso: string, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso));
}
export function formatDateTime(iso: string, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function isOverdue(task: TaskDto) {
  return task.status === 'OPEN' && !!task.dueAt && new Date(task.dueAt).getTime() < Date.now();
}
export function toDateTimeLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function formatMoney(cents: number, currency = 'EUR', locale = 'fr-FR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

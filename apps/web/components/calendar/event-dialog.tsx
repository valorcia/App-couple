'use client';
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { CalendarEventDto, EventType, EventVisibility } from '@couple/types';
import { createEventSchema } from '@couple/validation';
import { Alert, Button, Dialog, DialogContent, Field, Input, Switch, Textarea, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { RECURRENCE_PRESETS, REMINDER_PRESETS, type RecurrencePreset, TYPE_COLORS, fromLocalInputValue, presetFromRRule, toLocalInputValue } from '@/lib/calendar-utils';

const TYPES: EventType[] = ['SHARED', 'DATE', 'FAMILY', 'PERSONAL', 'WORK', 'VACATION', 'BIRTHDAY', 'OTHER'];
const VISIBILITIES: EventVisibility[] = ['SHARED', 'BUSY', 'PRIVATE'];

interface FormState {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  visibility: EventVisibility;
  type: EventType;
  color: string | null;
  category: string;
  recurrence: RecurrencePreset;
  customRRule: string;
  reminders: number[];
  invitePartner: boolean;
}

function initialState(event?: CalendarEventDto, defaultStart?: Date): FormState {
  if (event) {
    return {
      title: event.title, description: event.description ?? '', location: event.location ?? '',
      start: toLocalInputValue(event.startAt), end: toLocalInputValue(event.endAt), allDay: event.allDay,
      visibility: event.visibility, type: event.type, color: event.color, category: event.category ?? '',
      recurrence: presetFromRRule(event.rrule), customRRule: event.rrule ?? '',
      reminders: event.reminders.map((r) => r.minutesBefore), invitePartner: event.attendees.length > 0,
    };
  }
  const start = defaultStart ?? roundToNextHour(new Date());
  return {
    title: '', description: '', location: '', start: toLocalInputValue(start.toISOString()), end: toLocalInputValue(new Date(start.getTime() + 3_600_000).toISOString()),
    allDay: false, visibility: 'SHARED', type: 'SHARED', color: null, category: '', recurrence: 'none', customRRule: '', reminders: [30], invitePartner: false,
  };
}

function roundToNextHour(d: Date) {
  const r = new Date(d);
  r.setMinutes(0, 0, 0);
  r.setHours(r.getHours() + 1);
  return r;
}

export function EventDialog({ open, event, defaultStart, onClose }: { open: boolean; event?: CalendarEventDto; defaultStart?: Date; onClose: () => void }) {
  const t = useTranslations('calendar');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [form, setForm] = React.useState<FormState>(() => initialState(event, defaultStart));
  const [error, setError] = React.useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    if (open) {
      setForm(initialState(event, defaultStart));
      setError(null);
    }
  }, [open, event, defaultStart]);

  const partnerName = user?.couple?.partner?.profile.displayName ?? '';

  const mutation = useMutation({
    mutationFn: async () => {
      const startIso = form.allDay ? new Date(form.start.slice(0, 10) + 'T00:00:00').toISOString() : fromLocalInputValue(form.start);
      const endIso = form.allDay ? new Date(form.end.slice(0, 10) + 'T23:59:00').toISOString() : fromLocalInputValue(form.end);
      const rrule = form.recurrence === 'custom' ? form.customRRule.trim() || null : RECURRENCE_PRESETS[form.recurrence];
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        startAt: startIso,
        endAt: endIso,
        allDay: form.allDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        visibility: form.visibility,
        type: form.type,
        color: form.color,
        category: form.category.trim() || null,
        rrule,
        reminders: form.reminders.map((m) => ({ minutesBefore: m, channel: 'push' as const })),
        invitePartner: form.visibility === 'SHARED' && form.invitePartner,
      };
      const parsed = createEventSchema.safeParse(payload);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.path.includes('endAt') ? t('errors.endBeforeStart') : (parsed.error.issues[0]?.message ?? tc('error')));
      if (event) return api.patch<CalendarEventDto>(`/calendar/events/${event.id}`, parsed.data);
      return api.post<CalendarEventDto>('/calendar/events', parsed.data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error && !('status' in err) ? err.message : toMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={event ? t('edit') : t('new')} className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
          noValidate
        >
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label={t('fields.title')} htmlFor="ev-title">
            <Input id="ev-title" required maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </Field>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm font-medium">{t('fields.allDay')}</span>
            <Switch checked={form.allDay} onCheckedChange={(v) => set('allDay', v)} aria-label={t('fields.allDay')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.start')} htmlFor="ev-start">
              <Input id="ev-start" type={form.allDay ? 'date' : 'datetime-local'} value={form.allDay ? form.start.slice(0, 10) : form.start} onChange={(e) => set('start', form.allDay ? `${e.target.value}T09:00` : e.target.value)} required />
            </Field>
            <Field label={t('fields.end')} htmlFor="ev-end">
              <Input id="ev-end" type={form.allDay ? 'date' : 'datetime-local'} value={form.allDay ? form.end.slice(0, 10) : form.end} onChange={(e) => set('end', form.allDay ? `${e.target.value}T18:00` : e.target.value)} required />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('fields.visibility')}</legend>
            {VISIBILITIES.map((v) => (
              <label key={v} className={cn('flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm', form.visibility === v ? 'border-primary bg-primary/5' : 'border-border')}>
                <input type="radio" name="visibility" className="mt-1 accent-[var(--primary)]" checked={form.visibility === v} onChange={() => set('visibility', v)} />
                <span>
                  <span className="font-medium">{t(`visibility.${v}`)}</span>
                  <span className="block text-fg-muted">{t(`visibility.${v}_hint`)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {form.visibility === 'SHARED' && partnerName ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">{t('fields.invitePartner', { partner: partnerName })}</span>
                <span className="block text-fg-muted">{t('fields.invitePartnerHint')}</span>
              </span>
              <Switch checked={form.invitePartner} onCheckedChange={(v) => set('invitePartner', v)} aria-label={t('fields.invitePartner', { partner: partnerName })} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.type')} htmlFor="ev-type">
              <select id="ev-type" className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={form.type} onChange={(e) => set('type', e.target.value as EventType)}>
                {TYPES.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
              </select>
            </Field>
            <Field label={t('fields.color')} htmlFor="ev-color">
              <div className="flex h-12 items-center gap-2">
                {[null, '#E0705A', '#4A2A4F', '#3F8F6B', '#4F6FA8', '#C98A2E'].map((c) => (
                  <button key={c ?? 'auto'} type="button" aria-label={c ?? 'Automatique'} onClick={() => set('color', c)} className={cn('h-8 w-8 rounded-full border-2', form.color === c ? 'border-fg' : 'border-transparent')} style={{ backgroundColor: c ?? TYPE_COLORS[form.type] }} />
                ))}
              </div>
            </Field>
          </div>

          <Field label={t('fields.location')} htmlFor="ev-location"><Input id="ev-location" maxLength={200} value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
          <Field label={t('fields.description')} htmlFor="ev-desc"><Textarea id="ev-desc" maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.recurrence')} htmlFor="ev-rec">
              <select id="ev-rec" className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={form.recurrence} onChange={(e) => set('recurrence', e.target.value as RecurrencePreset)}>
                {(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom'] as RecurrencePreset[]).map((r) => <option key={r} value={r}>{t(`recurrence.${r}`)}</option>)}
              </select>
            </Field>
            {form.recurrence === 'custom' ? (
              <Field label="RRULE" htmlFor="ev-rrule" hint="ex. FREQ=WEEKLY;BYDAY=MO,TH">
                <Input id="ev-rrule" value={form.customRRule} onChange={(e) => set('customRRule', e.target.value.toUpperCase())} />
              </Field>
            ) : (
              <Field label={t('fields.category')} htmlFor="ev-cat"><Input id="ev-cat" maxLength={40} value={form.category} onChange={(e) => set('category', e.target.value)} /></Field>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('fields.reminders')}</legend>
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((m) => {
                const active = form.reminders.includes(m);
                return (
                  <button key={m} type="button" aria-pressed={active} onClick={() => set('reminders', active ? form.reminders.filter((x) => x !== m) : [...form.reminders, m].slice(0, 5))} className={cn('rounded-pill border px-3 py-1.5 text-sm', active ? 'border-secondary bg-secondary text-secondary-fg' : 'border-border')}>
                    {t(`reminders.m${m}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{tc('cancel')}</Button>
            <Button type="submit" loading={mutation.isPending}>{tc('save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

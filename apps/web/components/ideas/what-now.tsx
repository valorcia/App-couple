'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CalendarPlus, Clock, Home, Sparkles, Sun, Trees } from 'lucide-react';
import type { IdeaBudget, IdeaCompany, IdeaDto, IdeaMoment, IdeaMood, IdeaSuggestionsDto, ScheduledIdeaDto } from '@couple/types';
import { Alert, Badge, Button, Card, Chip, Dialog, DialogContent, Field, Input, Segmented, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { fromLocalInputValue, toLocalInputValue } from '@/lib/calendar-utils';

const MOMENTS: IdeaMoment[] = ['NOW', 'TONIGHT', 'WEEKEND', 'DATE'];
const BUDGETS: IdeaBudget[] = ['FREE', 'LOW', 'MEDIUM', 'HIGH'];
const MOODS: IdeaMood[] = ['ROMANTIC', 'FUNNY', 'RELAX', 'ADVENTURE', 'CULTURE', 'FOOD', 'SPICY'];

export function WhatNow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('ideas');
  const { user } = useAuth();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const [moment, setMoment] = React.useState<IdeaMoment | null>(null);
  const [date, setDate] = React.useState('');
  const [company, setCompany] = React.useState<IdeaCompany | null>(null);
  const [budget, setBudget] = React.useState<IdeaBudget | null>(null);
  const [mood, setMood] = React.useState<IdeaMood | null>(null);
  const [result, setResult] = React.useState<IdeaSuggestionsDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scheduling, setScheduling] = React.useState<IdeaDto | null>(null);
  const [scheduled, setScheduled] = React.useState<ScheduledIdeaDto | null>(null);

  const reset = () => { setMoment(null); setDate(''); setCompany(null); setBudget(null); setMood(null); setResult(null); setError(null); setScheduling(null); setScheduled(null); };
  React.useEffect(() => { if (!open) reset(); }, [open]);

  const suggest = useMutation({
    mutationFn: () => api.post<IdeaSuggestionsDto>('/ideas/suggest', { moment, date: moment === 'DATE' ? date : undefined, company, budget, mood, useAi: true }),
    onSuccess: setResult,
    onError: (e) => setError(toMessage(e)),
  });
  const ready = moment && (moment !== 'DATE' || date) && company && budget && mood;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t('title')} description={result ? undefined : t('subtitle')} className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {scheduled ? (
          <div className="space-y-4 text-center">
            <Alert tone="success">{t('schedule.done')}</Alert>
            <div className="flex justify-center gap-2"><Button asChild><Link href="/agenda" onClick={onClose}>{t('schedule.seeCalendar')}</Link></Button><Button variant="ghost" onClick={onClose}>OK</Button></div>
          </div>
        ) : !result ? (
          <div className="space-y-5">
            <Step label={t('steps.when')}>
              <Segmented<IdeaMoment> ariaLabel={t('steps.when')} value={moment} onChange={setMoment} options={MOMENTS.map((m) => ({ value: m, label: t(`moment.${m}`) }))} />
              {moment === 'DATE' ? <Field label={t('date')} htmlFor="idea-date" className="mt-3"><Input id="idea-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field> : null}
            </Step>
            <Step label={t('steps.who')}>
              <Segmented<IdeaCompany> ariaLabel={t('steps.who')} value={company} onChange={setCompany} options={[{ value: 'COUPLE', label: t('company.COUPLE') }, { value: 'FAMILY', label: t('company.FAMILY') }]} className="grid-cols-2" />
            </Step>
            <Step label={t('steps.budget')}>
              <Segmented<IdeaBudget> ariaLabel={t('steps.budget')} value={budget} onChange={setBudget} options={BUDGETS.map((b) => ({ value: b, label: t(`budget.${b}`) }))} />
            </Step>
            <Step label={t('steps.mood')}>
              <div className="flex flex-wrap gap-2">{MOODS.map((m) => <Chip key={m} active={mood === m} onClick={() => setMood(m)}>{t(`mood.${m}`)}</Chip>)}</div>
            </Step>
            <Button size="lg" className="w-full" disabled={!ready} loading={suggest.isPending} onClick={() => suggest.mutate()}><Sparkles className="h-5 w-5" aria-hidden />{t('go')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge tone="neutral">{t(`moment.${moment!}`)}{moment === 'DATE' ? ` · ${date}` : ''}</Badge><Badge tone="neutral">{t(`company.${company!}`)}</Badge><Badge tone="neutral">{t(`budget.${budget!}`)}</Badge><Badge tone="blush">{t(`mood.${mood!}`)}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setResult(null)}><ArrowLeft className="h-4 w-4" aria-hidden />{t('back')}</Button>
            </div>
            <p className="text-xs text-fg-muted">
              {result.ai.used ? t('ai.used') : t(`ai.${result.ai.reason ?? 'off'}`)}
              {result.ai.remainingThisMonth !== null ? ` · ${t('ai.remaining', { count: result.ai.remainingThisMonth })}` : ''}
            </p>
            {suggest.isPending ? <Skeleton className="h-40" /> : result.ideas.length === 0 ? <Alert tone="info">{t('empty')}</Alert> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {result.ideas.map((idea) => (
                  <li key={idea.id}>
                    <Card className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg leading-snug">{idea.title}</h3>
                        {idea.source === 'AI' ? <Badge tone="champagne"><Sparkles className="h-3 w-3" />{t('aiBadge')}</Badge> : null}
                      </div>
                      <p className="flex-1 text-sm text-fg-muted">{idea.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                        <span>{t(`budget.${idea.budget}`)}</span>
                        {idea.durationMinutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{t('minutes', { count: idea.durationMinutes })}</span> : null}
                        {idea.indoor === true ? <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" aria-hidden />{t('indoor')}</span> : idea.indoor === false ? <span className="inline-flex items-center gap-1"><Trees className="h-3.5 w-3.5" aria-hidden />{t('outdoor')}</span> : null}
                        {idea.doneBefore ? <Badge tone="neutral"><Sun className="h-3 w-3" />{t('doneBefore')}</Badge> : null}
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setScheduling(idea)}><CalendarPlus className="h-4 w-4" aria-hidden />{t('schedule.cta')}</Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="w-full" onClick={() => suggest.mutate()} loading={suggest.isPending}>{t('again')}</Button>
          </div>
        )}
        {scheduling && result ? <ScheduleForm idea={scheduling} partner={partner} defaults={result} onCancel={() => setScheduling(null)} onDone={(s) => { setScheduling(null); setScheduled(s); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Step({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-sm font-medium">{label}</p>{children}</div>;
}

function ScheduleForm({ idea, partner, defaults, onCancel, onDone }: { idea: IdeaDto; partner: string; defaults: IdeaSuggestionsDto; onCancel: () => void; onDone: (s: ScheduledIdeaDto) => void }) {
  const t = useTranslations('ideas.schedule');
  const tc = useTranslations('common');
  const toMessage = useApiErrorMessage();
  const [start, setStart] = React.useState(toLocalInputValue(defaults.suggestedStartAt));
  const [end, setEnd] = React.useState(toLocalInputValue(defaults.suggestedEndAt));
  const [error, setError] = React.useState<string | null>(null);
  const schedule = useMutation({
    mutationFn: () => api.post<ScheduledIdeaDto>('/ideas/schedule', { ideaId: idea.id, title: idea.title, description: idea.description, startAt: fromLocalInputValue(start), endAt: fromLocalInputValue(end), invitePartner: true }),
    onSuccess: onDone,
    onError: (e) => setError(toMessage(e)),
  });
  return (
    <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4" role="dialog" aria-label={t('title')}>
      <p className="font-medium">{t('title')} · {idea.title}</p>
      <p className="text-sm text-fg-muted">{t('body', { partner })}</p>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('start')} htmlFor="sch-start"><Input id="sch-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label={t('end')} htmlFor="sch-end"><Input id="sch-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>{tc('cancel')}</Button><Button onClick={() => schedule.mutate()} loading={schedule.isPending}>{t('confirm')}</Button></div>
    </div>
  );
}

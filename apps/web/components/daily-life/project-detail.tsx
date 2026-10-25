'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Plus, Target, Trash2, Wallet } from 'lucide-react';
import type { ProjectDto } from '@couple/types';
import { Alert, Badge, Button, Checkbox, EmptyState, Input, Progress, Skeleton, Textarea, cn } from '@couple/ui';
import { api, errorCode } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';
import { Tasks } from './tasks';
import { PROJECTS_KEY } from './projects';
import { formatDateTime, formatDay, formatMoney } from './utils';

export function ProjectDetail({ id }: { id: string }) {
  const t = useTranslations('daily.projects');
  const qc = useQueryClient();
  const router = useRouter();
  const errorMessage = useApiErrorMessage();
  const q = useQuery({ queryKey: [...PROJECTS_KEY, id], queryFn: () => api.get<ProjectDto>(`/projects/${id}`), retry: false });
  useRealtimeInvalidation('project.changed', [PROJECTS_KEY]);
  const refresh = () => qc.invalidateQueries({ queryKey: PROJECTS_KEY });
  const base = `/projects/${id}`;
  const [step, setStep] = React.useState('');
  const [note, setNote] = React.useState('');
  const addStep = useMutation({ mutationFn: () => api.post<ProjectDto>(`${base}/steps`, { title: step.trim() }), onSuccess: () => { setStep(''); void refresh(); } });
  const toggleStep = useMutation({ mutationFn: ({ stepId, completed }: { stepId: string; completed: boolean }) => api.patch<ProjectDto>(`${base}/steps/${stepId}`, { completed }), onSuccess: refresh });
  const removeStep = useMutation({ mutationFn: (stepId: string) => api.delete<ProjectDto>(`${base}/steps/${stepId}`), onSuccess: refresh });
  const addNote = useMutation({ mutationFn: () => api.post<ProjectDto>(`${base}/notes`, { body: note.trim() }), onSuccess: () => { setNote(''); void refresh(); } });
  const removeNote = useMutation({ mutationFn: (noteId: string) => api.delete<ProjectDto>(`${base}/notes/${noteId}`), onSuccess: refresh });
  const setStatus = useMutation({ mutationFn: (status: ProjectDto['status']) => api.patch<ProjectDto>(base, { status }), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => api.delete<void>(base), onSuccess: () => { void refresh(); router.replace('/quotidien?tab=projects'); } });

  if (q.isPending) return <div className="container-page space-y-6 py-8"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 rounded-lg" /></div>;
  if (q.isError) {
    return <div className="container-page py-8"><EmptyState title={errorCode(q.error) === 'NOT_FOUND' ? t('notFound') : errorMessage(q.error)} action={<Button asChild variant="outline"><Link href="/quotidien?tab=projects">{t('backToList')}</Link></Button>} /></div>;
  }
  const p = q.data;
  const done = p.steps.filter((s) => s.completedAt).length;

  return (
    <div className="container-page space-y-8 py-8">
      <Link href="/quotidien?tab=projects" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" aria-hidden />{t('backToList')}</Link>
      <PageHeader
        title={p.title}
        subtitle={p.goal ?? undefined}
        actions={
          <>
            {p.status === 'ACTIVE' ? <Button variant="secondary" onClick={() => setStatus.mutate('COMPLETED')} loading={setStatus.isPending}>{t('markCompleted')}</Button> : <Button variant="outline" onClick={() => setStatus.mutate('ACTIVE')} loading={setStatus.isPending}>{t('reopen')}</Button>}
            {p.status !== 'ARCHIVED' ? <Button variant="ghost" onClick={() => setStatus.mutate('ARCHIVED')} loading={setStatus.isPending}>{t('archive')}</Button> : null}
            <Button variant="ghost" className="text-danger" onClick={() => { if (window.confirm(t('deleteConfirm'))) del.mutate(); }} loading={del.isPending}><Trash2 className="h-4 w-4" aria-hidden />{t('delete')}</Button>
          </>
        }
      />

      <section className="rounded-lg border border-border bg-bg-elevated p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={p.status === 'COMPLETED' ? 'success' : p.status === 'ARCHIVED' ? 'neutral' : 'coral'}>{t(`status.${p.status}`)}</Badge>
          <span className="text-sm text-fg-muted">{t('steps', { done, total: p.steps.length })}</span>
          {p.targetAt ? <span className="inline-flex items-center gap-1 text-sm text-fg-muted"><Target className="h-4 w-4" aria-hidden />{t('targetLabel')} : {formatDay(p.targetAt)}</span> : null}
          {p.budgetCents !== null ? <span className="inline-flex items-center gap-1 text-sm text-fg-muted"><Wallet className="h-4 w-4" aria-hidden />{t('budgetLabel')} : {formatMoney(p.budgetCents, p.currency)}</span> : null}
        </div>
        <Progress className="mt-4" value={p.progress} label={t('progress', { percent: p.progress })} tone={p.status === 'COMPLETED' ? 'success' : 'primary'} />
        <p className="mt-1 text-right text-sm text-fg-muted">{t('progress', { percent: p.progress })}</p>
        {p.description ? <p className="mt-4 whitespace-pre-wrap text-sm">{p.description}</p> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-4" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-xl">{t('stepsTitle')}</h2>
          {p.steps.length === 0 ? <p className="text-sm text-fg-muted">{t('noSteps')}</p> : (
            <ol className="divide-y divide-border rounded-lg border border-border bg-bg-elevated">
              {p.steps.map((s) => (
                <li key={s.id} className={cn('flex items-center gap-3 px-4 py-3', s.completedAt && 'text-fg-subtle')}>
                  <Checkbox checked={!!s.completedAt} onCheckedChange={(completed) => toggleStep.mutate({ stepId: s.id, completed })} label={t('toggleStep', { title: s.title })} />
                  <div className="min-w-0 flex-1"><p className={cn(s.completedAt && 'line-through')}>{s.title}</p>{s.dueAt ? <p className="text-xs text-fg-subtle">{formatDay(s.dueAt)}</p> : null}</div>
                  <button type="button" className="rounded-full p-2 text-fg-subtle hover:bg-bg-muted hover:text-danger" aria-label={`${t('removeStep')} ${s.title}`} onClick={() => removeStep.mutate(s.id)}><Trash2 className="h-4 w-4" aria-hidden /></button>
                </li>
              ))}
            </ol>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (step.trim()) addStep.mutate(); }}>
            <Input aria-label={t('addStep')} placeholder={t('stepPlaceholder')} value={step} onChange={(e) => setStep(e.target.value)} maxLength={120} />
            <Button type="submit" variant="secondary" loading={addStep.isPending} disabled={!step.trim()}><Plus className="h-4 w-4" aria-hidden />{t('addStep')}</Button>
          </form>
          {addStep.isError ? <Alert tone="danger">{errorMessage(addStep.error)}</Alert> : null}

          <h2 className="pt-4 text-xl">{t('tasksTitle')}</h2>
          <Tasks projectId={p.id} compact />
        </section>

        <aside className="space-y-3" aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-xl">{t('notesTitle')}</h2>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) addNote.mutate(); }}>
            <Textarea aria-label={t('notesTitle')} rows={3} placeholder={t('notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
            <Button type="submit" size="sm" variant="secondary" loading={addNote.isPending} disabled={!note.trim()}>{t('addNote')}</Button>
          </form>
          {p.notes.length === 0 ? <p className="text-sm text-fg-muted">{t('noNotes')}</p> : (
            <ul className="space-y-2">
              {p.notes.map((n) => (
                <li key={n.id} className="group rounded-lg border border-border bg-bg-elevated p-4">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle"><span>{formatDateTime(n.createdAt)}</span><button type="button" className="rounded p-1 hover:text-danger" aria-label={t('removeNote')} onClick={() => removeNote.mutate(n.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button></div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

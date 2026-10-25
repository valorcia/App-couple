'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Target } from 'lucide-react';
import type { ProjectDto } from '@couple/types';
import { Alert, Badge, Button, Dialog, DialogClose, DialogContent, EmptyState, Field, Input, Progress, Select, Skeleton, Textarea } from '@couple/ui';
import { PROJECT_TEMPLATES } from '@couple/validation';
import { api } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { formatDay, formatMoney } from './utils';

export const PROJECTS_KEY = ['projects'] as const;

export function Projects() {
  const t = useTranslations('daily.projects');
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = React.useState(false);
  const projects = useQuery({ queryKey: [...PROJECTS_KEY, 'list', showArchived], queryFn: () => api.get<ProjectDto[]>('/projects', { query: { archived: showArchived ? 'true' : undefined } }) });
  useRealtimeInvalidation('project.changed', [PROJECTS_KEY]);
  const [creating, setCreating] = React.useState(false);
  const data = projects.data ?? [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden />{t('newProject')}</Button>
        <button type="button" className="text-sm text-fg-muted underline-offset-4 hover:underline" onClick={() => setShowArchived((v) => !v)}>{showArchived ? t('hideArchived') : t('showArchived')}</button>
      </div>
      {projects.isPending ? <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div> : data.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} action={<Button variant="outline" onClick={() => setCreating(true)}>{t('newProject')}</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title={t('newProject')}><ProjectForm onDone={() => { setCreating(false); void qc.invalidateQueries({ queryKey: PROJECTS_KEY }); }} /></DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectDto }) {
  const t = useTranslations('daily.projects');
  const done = p.steps.filter((s) => s.completedAt).length;
  return (
    <Link href={`/projets/${p.id}`} className="flex h-full flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-5 transition-colors hover:bg-bg-muted">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-xs uppercase tracking-wide text-fg-subtle">{t(`templates.${(p.templateCode ?? 'custom') as (typeof PROJECT_TEMPLATES)[number]}`)}</p><h3 className="text-lg leading-snug">{p.title}</h3></div>
        <Badge tone={p.status === 'COMPLETED' ? 'success' : p.status === 'ARCHIVED' ? 'neutral' : 'coral'}>{t(`status.${p.status}`)}</Badge>
      </div>
      {p.goal ? <p className="line-clamp-2 text-sm text-fg-muted">{p.goal}</p> : null}
      <div className="mt-auto space-y-2">
        <Progress value={p.progress} label={t('progress', { percent: p.progress })} tone={p.status === 'COMPLETED' ? 'success' : 'primary'} />
        <p className="flex flex-wrap justify-between gap-2 text-xs text-fg-muted"><span>{t('steps', { done, total: p.steps.length })}</span><span>{t('openTasks', { count: p.openTasks })}</span></p>
        {p.targetAt || p.budgetCents !== null ? <p className="flex flex-wrap gap-3 text-xs text-fg-muted">{p.targetAt ? <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5" aria-hidden />{formatDay(p.targetAt)}</span> : null}{p.budgetCents !== null ? <span>{formatMoney(p.budgetCents, p.currency)}</span> : null}</p> : null}
      </div>
    </Link>
  );
}

export function ProjectForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('daily.projects');
  const tc = useTranslations('common');
  const errorMessage = useApiErrorMessage();
  const [templateCode, setTemplate] = React.useState<(typeof PROJECT_TEMPLATES)[number]>('custom');
  const [title, setTitle] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [targetAt, setTargetAt] = React.useState('');
  const [budget, setBudget] = React.useState('');
  const create = useMutation({
    mutationFn: () => api.post<ProjectDto>('/projects', { templateCode, title: title.trim(), goal: goal.trim() || null, targetAt: targetAt || null, budgetCents: budget ? Math.round(Number(budget) * 100) : null }),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate(); }}>
      <Field label={t('template')} htmlFor="pj-template" hint={t('templateHint')}><Select id="pj-template" value={templateCode} onChange={(e) => setTemplate(e.target.value as typeof templateCode)}>{PROJECT_TEMPLATES.map((c) => <option key={c} value={c}>{t(`templates.${c}`)}</option>)}</Select></Field>
      <Field label={t('titleLabel')} htmlFor="pj-title"><Input id="pj-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} maxLength={100} /></Field>
      <Field label={t('goal')} htmlFor="pj-goal"><Textarea id="pj-goal" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t('goalPlaceholder')} maxLength={300} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('targetAt')} htmlFor="pj-target"><Input id="pj-target" type="date" value={targetAt} onChange={(e) => setTargetAt(e.target.value)} /></Field>
        <Field label={t('budget')} htmlFor="pj-budget"><Input id="pj-budget" type="number" min={0} step={1} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
      </div>
      {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
      <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="ghost">{tc('cancel')}</Button></DialogClose><Button type="submit" loading={create.isPending} disabled={!title.trim()}>{t('create')}</Button></div>
    </form>
  );
}

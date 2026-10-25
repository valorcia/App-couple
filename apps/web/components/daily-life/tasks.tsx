'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CalendarClock, MessageSquare, Plus, Repeat, Trash2 } from 'lucide-react';
import type { ProjectDto, TaskDto, TaskPriority } from '@couple/types';
import { Alert, Avatar, Badge, Button, Checkbox, Chip, Dialog, DialogClose, DialogContent, EmptyState, Field, Input, Select, Skeleton, Textarea, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { RECURRENCE_PRESETS, type RecurrencePreset, formatDateTime, formatDay, isOverdue } from './utils';

const KEY = ['tasks'] as const;
type Filter = 'OPEN' | 'DONE';

export function Tasks({ projectId, compact = false }: { projectId?: string; compact?: boolean }) {
  const t = useTranslations('daily.tasks');
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<Filter>('OPEN');
  const tasks = useQuery({ queryKey: [...KEY, filter, projectId ?? null], queryFn: () => api.get<TaskDto[]>('/tasks', { query: { status: filter, projectId } }) });
  useRealtimeInvalidation('task.changed', [KEY, ['projects']]);
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: KEY }), qc.invalidateQueries({ queryKey: ['projects'] })]);
  const toggle = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<TaskDto>(`/tasks/${id}`, { status: done ? 'DONE' : 'OPEN' }), onSuccess: invalidate });
  const data = tasks.data ?? [];
  const open = data.find((x) => x.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">{(['OPEN', 'DONE'] as Filter[]).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(`filters.${f}`)}</Chip>)}</div>
        <Button onClick={() => setCreating(true)} size={compact ? 'sm' : 'md'}><Plus className="h-4 w-4" aria-hidden />{t('newTask')}</Button>
      </div>
      {!compact ? <p className="text-sm text-fg-muted">{t('noPressure')}</p> : null}

      {tasks.isPending ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div> : data.length === 0 ? (
        filter === 'OPEN' ? <EmptyState title={t('empty')} description={compact ? undefined : t('emptyHint')} action={<Button variant="outline" onClick={() => setCreating(true)}>{t('newTask')}</Button>} /> : <p className="text-sm text-fg-muted">{t('noDone')}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-bg-elevated">
          {data.map((task) => <TaskRow key={task.id} task={task} onToggle={(done) => toggle.mutate({ id: task.id, done })} onOpen={() => setOpenId(task.id)} />)}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title={t('newTask')}>
          <TaskForm projectId={projectId} onDone={() => { setCreating(false); void invalidate(); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        {open ? <DialogContent title={open.title}><TaskDetail task={open} onChanged={invalidate} onDeleted={() => { setOpenId(null); void invalidate(); }} /></DialogContent> : null}
      </Dialog>
    </div>
  );
}

function useNames() {
  const { user } = useAuth();
  const partner = user?.couple?.partner ?? null;
  return { me: user, partner, nameOf: (id: string | null) => (id === user?.id ? user?.profile.displayName : id === partner?.id ? partner.profile.displayName : null) ?? null };
}

function TaskRow({ task, onToggle, onOpen }: { task: TaskDto; onToggle: (done: boolean) => void; onOpen: () => void }) {
  const t = useTranslations('daily.tasks');
  const { nameOf } = useNames();
  const done = task.status === 'DONE';
  const assignee = nameOf(task.assigneeUserId);
  const overdue = isOverdue(task);
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', done && 'text-fg-subtle')}>
      <Checkbox checked={done} onCheckedChange={onToggle} label={done ? t('markOpen', { title: task.title }) : t('markDone', { title: task.title })} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={cn('truncate font-medium', done && 'line-through')}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          {task.dueAt ? <span className={cn('inline-flex items-center gap-1', overdue && 'text-danger')}><CalendarClock className="h-3.5 w-3.5" aria-hidden />{done && task.completedAt ? t('completedAt', { date: formatDay(task.completedAt) }) : t('due', { date: formatDateTime(task.dueAt) })}{overdue ? ` · ${t('overdue')}` : ''}</span> : null}
          {task.rrule ? <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" aria-hidden />{t('recurring')}</span> : null}
          {task.comments.length ? <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" aria-hidden />{task.comments.length}</span> : null}
          {task.priority === 'HIGH' ? <Badge tone="coral">{t('priorities.HIGH')}</Badge> : null}
        </p>
      </button>
      {assignee ? <Avatar name={assignee} size={28} /> : <span className="text-xs text-fg-subtle">{t('unassigned')}</span>}
    </li>
  );
}

export function TaskForm({ projectId, onDone }: { projectId?: string; onDone: () => void }) {
  const t = useTranslations('daily.tasks');
  const tc = useTranslations('common');
  const { me, partner } = useNames();
  const errorMessage = useApiErrorMessage();
  const projects = useQuery({ queryKey: ['projects', 'all'], queryFn: () => api.get<ProjectDto[]>('/projects'), enabled: !projectId });
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [assignee, setAssignee] = React.useState<'none' | 'me' | 'partner'>('none');
  const [priority, setPriority] = React.useState<TaskPriority>('MEDIUM');
  const [dueAt, setDueAt] = React.useState('');
  const [recurrence, setRecurrence] = React.useState<RecurrencePreset>('none');
  const [project, setProject] = React.useState(projectId ?? '');
  const create = useMutation({
    mutationFn: () => api.post<TaskDto>('/tasks', {
      title: title.trim(), description: description.trim() || null,
      assigneeUserId: assignee === 'me' ? me?.id : assignee === 'partner' ? partner?.id : null,
      priority, dueAt: dueAt ? new Date(dueAt).toISOString() : null, rrule: dueAt ? RECURRENCE_PRESETS[recurrence] : null, projectId: project || null,
    }),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate(); }}>
      <Field label={t('titleLabel')} htmlFor="task-title"><Input id="task-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titlePlaceholder')} maxLength={120} /></Field>
      <Field label={t('description')} htmlFor="task-desc"><Textarea id="task-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
      <Field label={t('assignee')} htmlFor="task-assignee">
        <div className="flex flex-wrap gap-2" id="task-assignee" role="radiogroup" aria-label={t('assignee')}>
          <Chip active={assignee === 'none'} onClick={() => setAssignee('none')}>{t('assigneeNone')}</Chip>
          <Chip active={assignee === 'me'} onClick={() => setAssignee('me')}>{t('assigneeMe')}</Chip>
          {partner ? <Chip active={assignee === 'partner'} onClick={() => setAssignee('partner')}>{t('assigneePartner', { partner: partner.profile.displayName })}</Chip> : null}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('priority')} htmlFor="task-priority"><Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{(['LOW', 'MEDIUM', 'HIGH'] as TaskPriority[]).map((p) => <option key={p} value={p}>{t(`priorities.${p}`)}</option>)}</Select></Field>
        <Field label={t('dueAt')} htmlFor="task-due"><Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></Field>
        {dueAt ? <Field label={t('recurrence')} htmlFor="task-rec"><Select id="task-rec" value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrencePreset)}>{(Object.keys(RECURRENCE_PRESETS) as RecurrencePreset[]).map((r) => <option key={r} value={r}>{t(`recurrences.${r}`)}</option>)}</Select></Field> : null}
        {!projectId ? <Field label={t('project')} htmlFor="task-project"><Select id="task-project" value={project} onChange={(e) => setProject(e.target.value)}><option value="">{t('noProject')}</option>{(projects.data ?? []).filter((p) => p.status === 'ACTIVE').map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field> : null}
      </div>
      {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
      <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="ghost">{tc('cancel')}</Button></DialogClose><Button type="submit" loading={create.isPending} disabled={!title.trim()}>{t('create')}</Button></div>
    </form>
  );
}

function TaskDetail({ task, onChanged, onDeleted }: { task: TaskDto; onChanged: () => Promise<unknown>; onDeleted: () => void }) {
  const t = useTranslations('daily.tasks');
  const { nameOf } = useNames();
  const errorMessage = useApiErrorMessage();
  const [body, setBody] = React.useState('');
  const comment = useMutation({ mutationFn: () => api.post<TaskDto>(`/tasks/${task.id}/comments`, { body: body.trim() }), onSuccess: () => { setBody(''); void onChanged(); } });
  const toggle = useMutation({ mutationFn: (done: boolean) => api.patch<TaskDto>(`/tasks/${task.id}`, { status: done ? 'DONE' : 'OPEN' }), onSuccess: onChanged });
  const del = useMutation({ mutationFn: () => api.delete<void>(`/tasks/${task.id}`), onSuccess: onDeleted });
  const done = task.status === 'DONE';
  return (
    <div className="space-y-5">
      {task.description ? <p className="whitespace-pre-wrap text-sm">{task.description}</p> : null}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-fg-muted">{t('assignee')}</dt><dd>{nameOf(task.assigneeUserId) ?? t('unassigned')}</dd></div>
        <div><dt className="text-fg-muted">{t('priority')}</dt><dd>{t(`priorities.${task.priority}`)}</dd></div>
        {task.dueAt ? <div><dt className="text-fg-muted">{t('dueAt')}</dt><dd className={cn(isOverdue(task) && 'text-danger')}>{formatDateTime(task.dueAt)}</dd></div> : null}
        {task.rrule ? <div><dt className="text-fg-muted">{t('recurrence')}</dt><dd>{t('recurring')}</dd></div> : null}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant={done ? 'outline' : 'primary'} onClick={() => toggle.mutate(!done)} loading={toggle.isPending}>{done ? t('filters.OPEN') : t('filters.DONE')}</Button>
        <Button variant="ghost" className="text-danger" onClick={() => { if (window.confirm(t('deleteConfirm'))) del.mutate(); }} loading={del.isPending}><Trash2 className="h-4 w-4" aria-hidden />{t('delete')}</Button>
      </div>
      <section className="space-y-3">
        <h3 className="text-base font-medium">{t('comments')}</h3>
        {task.comments.length ? (
          <ul className="space-y-2">{task.comments.map((c) => <li key={c.id} className="rounded-md bg-bg-muted p-3 text-sm"><p className="mb-1 text-xs text-fg-muted">{nameOf(c.userId) ?? '—'} · {formatDateTime(c.createdAt)}</p><p className="whitespace-pre-wrap">{c.body}</p></li>)}</ul>
        ) : null}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) comment.mutate(); }}>
          <Input aria-label={t('comments')} placeholder={t('commentPlaceholder')} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
          <Button type="submit" variant="secondary" loading={comment.isPending} disabled={!body.trim()}>{t('send')}</Button>
        </form>
        {comment.isError ? <Alert tone="danger">{errorMessage(comment.error)}</Alert> : null}
      </section>
    </div>
  );
}

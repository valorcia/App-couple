'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, Clock, Lock, Wallet } from 'lucide-react';
import type { ChallengeDto } from '@couple/types';
import { Alert, Badge, Button, Chip, Dialog, DialogContent, Skeleton, Textarea, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';
import Link from 'next/link';

type Budget = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export function ChallengesPage() {
  const t = useTranslations('challenges');
  const [budget, setBudget] = React.useState<Budget | null>(null);
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(null);
  const catalog = useQuery({ queryKey: ['challenges', 'list', budget, difficulty], queryFn: () => api.get<ChallengeDto[]>('/challenges', { query: { budget: budget ?? undefined, difficulty: difficulty ?? undefined } }) });
  const progress = useQuery({ queryKey: ['challenges', 'progress'], queryFn: () => api.get<ChallengeDto[]>('/challenges/progress') });
  useRealtimeInvalidation('challenge.changed', [['challenges']]);
  const [selected, setSelected] = React.useState<ChallengeDto | null>(null);

  const active = (progress.data ?? []).filter((c) => c.progress && ['PROPOSED', 'ACCEPTED'].includes(c.progress.status));
  const history = (progress.data ?? []).filter((c) => c.progress && ['COMPLETED', 'SKIPPED'].includes(c.progress.status));
  const activeIds = new Set(active.map((c) => c.id));

  return (
    <div className="container-page space-y-8 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <section className="space-y-3">
        <h2 className="text-xl">{t('active')}</h2>
        {active.length === 0 ? <p className="text-sm text-fg-muted">{t('none')}</p> : (
          <div className="grid gap-4 sm:grid-cols-2">{active.map((c) => <ChallengeCard key={c.id} c={c} onOpen={() => setSelected(c)} />)}</div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">{t('catalog')}</h2>
        <div className="flex flex-wrap gap-2">
          <Chip active={budget === null} onClick={() => setBudget(null)}>{t('filters.all')}</Chip>
          {(['FREE', 'LOW', 'MEDIUM', 'HIGH'] as Budget[]).map((b) => <Chip key={b} active={budget === b} onClick={() => setBudget(b)}><Wallet className="h-3.5 w-3.5" aria-hidden />{t(`budget.${b}`)}</Chip>)}
          <span className="mx-1 hidden w-px bg-border sm:block" />
          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>{t(`difficulty.${d}`)}</Chip>)}
        </div>
        {catalog.isPending ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(catalog.data ?? []).filter((c) => !activeIds.has(c.id)).map((c) => <ChallengeCard key={c.id} c={c} onOpen={() => setSelected(c)} />)}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl">{t('history')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{history.map((c) => <ChallengeCard key={c.progress!.id} c={c} onOpen={() => setSelected(c)} />)}</div>
        </section>
      ) : null}

      <ChallengeDialog c={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function ChallengeCard({ c, onOpen, compact = false }: { c: ChallengeDto; onOpen: () => void; compact?: boolean }) {
  const t = useTranslations('challenges');
  return (
    <button type="button" onClick={onOpen} className={cn('flex h-full flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-5 text-left transition-colors hover:bg-bg-muted', c.locked && 'opacity-75')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg leading-snug">{c.title}</h3>
        {c.progress ? <Badge tone={c.progress.status === 'COMPLETED' ? 'success' : c.progress.status === 'SKIPPED' ? 'neutral' : 'coral'}>{t(`status.${c.progress.status}`)}</Badge> : c.locked ? <Badge tone="champagne"><Lock className="h-3 w-3" />{t('actions.locked')}</Badge> : null}
      </div>
      {!compact ? <p className="line-clamp-2 text-sm text-fg-muted">{c.description}</p> : null}
      <div className="mt-auto flex flex-wrap gap-2 text-xs text-fg-muted">
        {c.durationMinutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{t('minutes', { count: c.durationMinutes })}</span> : null}
        <span>{t(`difficulty.${c.difficulty}`)}</span>
        <span>{t(`budget.${c.budget}`)}</span>
        {c.category ? <span>· {c.category.name}</span> : null}
      </div>
    </button>
  );
}

export function ChallengeDialog({ c: initial, onClose }: { c: ChallengeDto | null; onClose: () => void }) {
  // Copie locale : mise à jour avec la réponse de l'API après chaque action (sans attendre le rechargement des listes).
  const [c, setC] = React.useState<ChallengeDto | null>(initial);
  React.useEffect(() => setC(initial), [initial]);
  const t = useTranslations('challenges');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['challenges'] });
  const act = useMutation({
    mutationFn: ({ action, body }: { action: 'propose' | 'accept' | 'skip' | 'complete'; body?: unknown }) => api.post<ChallengeDto>(`/challenges/${c!.id}/${action}`, body),
    onSuccess: async (updated, vars) => {
      setC(updated);
      await invalidate();
      if (vars.action === 'propose' || vars.action === 'skip') onClose();
    },
    onError: (e) => setError(toMessage(e)),
  });
  React.useEffect(() => { setNote(''); setError(null); }, [initial?.id]);
  if (!c) return null;
  const p = c.progress;
  const activeStatus = p && ['PROPOSED', 'ACCEPTED'].includes(p.status);
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={c.title} description={c.description} className="max-h-[92dvh] overflow-y-auto">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="flex flex-wrap gap-2">
          {c.durationMinutes ? <Badge tone="neutral"><Clock className="h-3 w-3" />{t('minutes', { count: c.durationMinutes })}</Badge> : null}
          <Badge tone="neutral">{t(`difficulty.${c.difficulty}`)}</Badge>
          <Badge tone="neutral">{t(`budget.${c.budget}`)}</Badge>
          {c.intimate ? <Badge tone="blush">{t('intimate')}</Badge> : null}
          {p ? <Badge tone={p.status === 'COMPLETED' ? 'success' : 'coral'}>{t(`status.${p.status}`)}</Badge> : null}
        </div>
        {c.locked ? <Alert tone="info">{t('actions.locked')} · <Link href="/premium" className="underline">Premium</Link></Alert> : (
          <>
            {c.instructions.length ? (
              <div><p className="mb-1 text-sm font-medium">{t('instructions')}</p><ol className="list-decimal space-y-1 pl-5 text-sm">{c.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
            ) : null}
            {c.materials.length ? <p className="text-sm text-fg-muted"><span className="font-medium text-fg">{t('materials')} :</span> {c.materials.join(', ')}</p> : null}
          </>
        )}

        {!c.locked ? (
          <div className="space-y-3 border-t border-border pt-4">
            {!p || ['SKIPPED', 'COMPLETED'].includes(p.status) ? (
              <Button className="w-full" onClick={() => act.mutate({ action: 'propose' })} loading={act.isPending}>{t('actions.propose', { partner })}</Button>
            ) : null}
            {activeStatus ? (
              <>
                {p.status === 'PROPOSED' && p.proposedByUserId !== user?.id ? (
                  <Button className="w-full" onClick={() => act.mutate({ action: 'accept' })} loading={act.isPending}>{t('actions.accept')}</Button>
                ) : null}
                {p.completedByMe ? (
                  <Alert tone="success">{p.completedByPartner ? t('actions.both') : t('actions.waitingPartner', { partner })}</Alert>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); act.mutate({ action: 'complete', body: { note: note || undefined } }); }} className="space-y-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('actions.note')} rows={2} maxLength={500} aria-label={t('actions.note')} />
                    <Button type="submit" variant="secondary" className="w-full" loading={act.isPending}><Check className="h-4 w-4" aria-hidden />{t('actions.complete')}</Button>
                  </form>
                )}
                <div className="flex items-center justify-between text-sm text-fg-muted">
                  <span>{t('actions.skipHint')}</span>
                  <Button variant="ghost" size="sm" onClick={() => act.mutate({ action: 'skip' })} loading={act.isPending}>{t('actions.skip')}</Button>
                </div>
              </>
            ) : null}
            {p?.status === 'COMPLETED' ? <Alert tone="success">{t('actions.both')}{p.note ? <span className="block italic">« {p.note} »</span> : null}</Alert> : null}
          </div>
        ) : null}
        <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>{tc('close')}</Button></div>
      </DialogContent>
    </Dialog>
  );
}

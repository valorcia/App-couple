'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, SkipForward } from 'lucide-react';
import type { AnswerPayloadDto, GameRoundDto, GameSessionDto } from '@couple/types';
import { Alert, Avatar, Badge, Button, Card, Glow, Skeleton, Textarea, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';

export function SessionPlay({ id }: { id: string }) {
  const t = useTranslations('games');
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const session = useQuery({ queryKey: ['games', 'session', id], queryFn: () => api.get<GameSessionDto>(`/games/sessions/${id}`) });
  useRealtimeInvalidation('game.changed', [['games']]);
  const [error, setError] = React.useState<string | null>(null);
  // La manche affichée est pilotée par l'utilisateur : on n'avance jamais automatiquement, pour laisser le temps de voir la révélation.
  const [view, setView] = React.useState<number | 'summary' | null>(null);
  React.useEffect(() => {
    if (view === null && session.data) setView(session.data.currentRoundIndex ?? 'summary');
  }, [view, session.data]);

  const refresh = (s: GameSessionDto) => qc.setQueryData(['games', 'session', id], s);
  const answer = useMutation({ mutationFn: ({ index, payload }: { index: number; payload: AnswerPayloadDto }) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/answer`, { answer: payload }), onSuccess: refresh, onError: (e) => setError(toMessage(e)) });
  const skip = useMutation({ mutationFn: (index: number) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/skip`), onSuccess: refresh, onError: (e) => setError(toMessage(e)) });
  const verdict = useMutation({ mutationFn: ({ index, v }: { index: number; v: 'EXACT' | 'CLOSE' | 'MISS' }) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/verdict`, { verdict: v }), onSuccess: refresh, onError: (e) => setError(toMessage(e)) });
  const abandon = useMutation({ mutationFn: () => api.delete(`/games/sessions/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); router.push('/jouer'); } });

  if (session.isPending || !user || view === null) return <div className="container-page py-8"><Skeleton className="h-64 rounded-lg" /></div>;
  if (session.isError || !session.data) return <div className="container-page py-8"><Alert tone="danger">{toMessage(session.error)}</Alert></div>;
  const s = session.data;
  const total = s.rounds.length;
  const activeIndex = view === 'summary' ? total - 1 : Math.min(view, total - 1);
  const round = s.rounds[activeIndex]!;
  const names = { me: user.profile.displayName, partner };
  const roundClosed = !!round.revealedAt || round.skipped;
  const nextOpen = s.rounds.find((r) => r.index > activeIndex && !r.revealedAt && !r.skipped)?.index ?? s.currentRoundIndex;
  const continueTarget: number | 'summary' | null = roundClosed ? (nextOpen !== null && nextOpen !== undefined && nextOpen !== activeIndex ? nextOpen : s.status !== 'OPEN' ? 'summary' : null) : null;

  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/jouer"><ArrowLeft className="h-4 w-4" aria-hidden />{t('title')}</Link></Button>
      <PageHeader title={t(`types.${s.gameType}.name`)} subtitle={view === 'summary' ? t('summary.title') : t('round', { index: activeIndex + 1, total })} />
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {/* Frise des manches */}
      <ol className="flex gap-1.5" aria-label="Manches">
        {s.rounds.map((r) => {
          const closed = r.revealedAt || r.skipped;
          return (
            <li key={r.index} className="flex-1">
              <button type="button" onClick={() => (closed || r.index === s.currentRoundIndex) && setView(r.index)} aria-current={view !== 'summary' && r.index === activeIndex} className={cn('h-2 w-full border border-ink/50 transition-colors', view !== 'summary' && r.index === activeIndex ? 'bg-primary' : closed ? 'bg-ink' : 'bg-transparent')} aria-label={t('round', { index: r.index + 1, total })} />
            </li>
          );
        })}
      </ol>

      {view === 'summary' ? (
        <Summary s={s} userId={user.id} names={names} />
      ) : (
        <RoundView
          s={s}
          round={round}
          userId={user.id}
          names={names}
          onAnswer={(payload) => answer.mutate({ index: round.index, payload })}
          onSkip={() => skip.mutate(round.index)}
          onVerdict={(v) => verdict.mutate({ index: round.index, v })}
          pending={answer.isPending || skip.isPending || verdict.isPending}
        />
      )}
      {view !== 'summary' && continueTarget !== null ? (
        <div className="flex justify-center">
          <Button size="lg" onClick={() => setView(continueTarget)}>{continueTarget === 'summary' ? t('seeSummary') : t('next')}</Button>
        </div>
      ) : null}

      {s.status === 'OPEN' ? (
        <div className="flex justify-end">
          <Button variant="link" className="text-fg-muted" onClick={() => abandon.mutate()} title={t('abandonHint')}>{t('abandon')}</Button>
        </div>
      ) : null}
    </div>
  );
}

function RoundView({ s, round, userId, names, onAnswer, onSkip, onVerdict, pending }: { s: GameSessionDto; round: GameRoundDto; userId: string; names: { me: string; partner: string }; onAnswer: (p: AnswerPayloadDto) => void; onSkip: () => void; onVerdict: (v: 'EXACT' | 'CLOSE' | 'MISS') => void; pending: boolean }) {
  const t = useTranslations('games');
  const [text, setText] = React.useState('');
  React.useEffect(() => setText(''), [round.index]);
  const partnerId = s.participantIds.find((p) => p !== userId) ?? '';
  const revealed = !!round.revealedAt;
  const isSubject = round.prompt.subjectUserId === userId;

  return (
    <div className="space-y-5">
      <Card tone="night" className="relative overflow-hidden p-8 sm:p-10">
        <Glow tone="primary" size={320} className="-right-24 -top-28" />
        <div className="relative">
        {round.prompt.categoryCode ? <p className="label-sc text-paper/70">{round.prompt.categoryCode}</p> : null}
        <p className="mt-3 font-display text-3xl leading-[1.05] sm:text-[2.6rem]">{round.prompt.text}</p>
        {s.gameType === 'WHO_KNOWS_BEST' ? <p className="mt-3 text-sm opacity-80">{isSubject ? t('wkb.subjectHint', { partner: names.partner }) : t('wkb.guessHint', { partner: names.partner })}</p> : null}
        </div>
      </Card>

      {round.skipped ? (
        <Alert tone="info">{t('skipped')}</Alert>
      ) : revealed ? (
        <Reveal s={s} round={round} userId={userId} partnerId={partnerId} names={names} onVerdict={onVerdict} pending={pending} />
      ) : round.myAnswer ? (
        <Card className="p-6 text-center">
          <Check className="mx-auto h-8 w-8 text-success" aria-hidden />
          <p className="mt-2 font-medium">{t('answered', { partner: names.partner })}</p>
          <p className="mt-4 text-sm text-fg-muted">{renderAnswer(round.myAnswer, names, userId, partnerId, round.prompt.options)}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {round.partnerAnswered ? <Badge tone="coral">{t('partnerAnswered', { partner: names.partner })}</Badge> : null}
          {s.gameType === 'DILEMMA' && round.prompt.options ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {round.prompt.options.map((o, i) => (
                <button key={i} type="button" disabled={pending} onClick={() => onAnswer({ kind: 'choice', index: i })} className="hover-lift min-h-28 rounded-md border-2 border-ink bg-bg-elevated p-5 text-left font-display text-xl">
                  {o}
                </button>
              ))}
            </div>
          ) : s.gameType === 'WHICH_OF_US' ? (
            <div className="grid grid-cols-2 gap-3">
              {[{ id: userId, name: names.me }, { id: partnerId, name: names.partner }].map((p) => (
                <button key={p.id} type="button" disabled={pending} onClick={() => onAnswer({ kind: 'vote', userId: p.id })} className="hover-lift flex flex-col items-center gap-3 rounded-md border-2 border-ink bg-bg-elevated p-6">
                  <Avatar name={p.name} size={56} />
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) onAnswer({ kind: 'text', text: text.trim() }); }} className="space-y-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('answerPlaceholder')} maxLength={1000} rows={4} aria-label={t('answerPlaceholder')} />
              <div className="flex justify-end"><Button type="submit" loading={pending} disabled={!text.trim()}>{t('send')}</Button></div>
            </form>
          )}
          <div className="flex items-center justify-between text-sm text-fg-muted">
            <span>{t('skipHint')}</span>
            <Button variant="ghost" size="sm" onClick={onSkip} disabled={pending}><SkipForward className="h-4 w-4" aria-hidden />{t('skip')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reveal({ s, round, userId, partnerId, names, onVerdict, pending }: { s: GameSessionDto; round: GameRoundDto; userId: string; partnerId: string; names: { me: string; partner: string }; onVerdict: (v: 'EXACT' | 'CLOSE' | 'MISS') => void; pending: boolean }) {
  const t = useTranslations('games');
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <RevealCard label={names.me} delay={0}>{round.myAnswer ? renderAnswer(round.myAnswer, names, userId, partnerId, round.prompt.options) : '—'}</RevealCard>
        <RevealCard label={names.partner} delay={150}>{round.partnerAnswer ? renderAnswer(round.partnerAnswer, names, userId, partnerId, round.prompt.options) : '—'}</RevealCard>
      </div>
      {round.funLine ? <p className="text-center text-sm text-fg-muted">{round.funLine}</p> : null}
      {s.gameType === 'WHO_KNOWS_BEST' && round.awaitingVerdictFrom ? (
        round.awaitingVerdictFrom === userId ? (
          <Card className="space-y-3 p-5 text-center">
            <p className="font-medium">{t('wkb.verdictTitle', { partner: names.partner })}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => onVerdict('EXACT')} loading={pending}>{t('wkb.EXACT')}</Button>
              <Button size="sm" variant="secondary" onClick={() => onVerdict('CLOSE')} loading={pending}>{t('wkb.CLOSE')}</Button>
              <Button size="sm" variant="outline" onClick={() => onVerdict('MISS')} loading={pending}>{t('wkb.MISS')}</Button>
            </div>
          </Card>
        ) : (
          <p className="text-center text-sm text-fg-muted">{t('wkb.awaiting', { partner: names.partner })}</p>
        )
      ) : null}
    </div>
  );
}

function RevealCard({ label, children, delay }: { label: string; children: React.ReactNode; delay: number }) {
  return (
    <div className="animate-curtain rounded-md border-2 border-ink bg-bg-elevated p-5 shadow-card" style={{ animationDelay: `${delay}ms` }}>
      <p className="label-sc">{label}</p>
      <p className="mt-2 font-display-italic text-2xl leading-snug">{children}</p>
    </div>
  );
}

function renderAnswer(a: AnswerPayloadDto, names: { me: string; partner: string }, userId: string, partnerId: string, options?: string[]): string {
  if (a.kind === 'text') return a.text;
  if (a.kind === 'vote') return a.userId === userId ? names.me : a.userId === partnerId ? names.partner : '?';
  return options?.[a.index] ?? `Option ${a.index + 1}`;
}

function Summary({ s, userId, names }: { s: GameSessionDto; userId: string; names: { me: string; partner: string } }) {
  const t = useTranslations('games');
  const sum = (s.summary ?? {}) as { revealed?: number; skipped?: number; same?: number; unanimous?: number; votesFor?: Record<string, number>; scores?: Record<string, { points: number }> };
  const partnerId = s.participantIds.find((p) => p !== userId) ?? '';
  return (
    <Card tone="champagne" className="space-y-4 p-8 text-center">
      <h2 className="text-3xl">{t('summary.title')}</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <Badge tone="neutral">{t('summary.revealed', { count: sum.revealed ?? 0 })}</Badge>
        {sum.skipped ? <Badge tone="neutral">{t('summary.skipped', { count: sum.skipped })}</Badge> : null}
        {sum.same !== undefined ? <Badge tone="blush">{t('summary.same', { count: sum.same })}</Badge> : null}
        {sum.unanimous !== undefined ? <Badge tone="blush">{t('summary.unanimous', { count: sum.unanimous })}</Badge> : null}
      </div>
      {sum.scores ? (
        <div className="grid grid-cols-2 gap-3">
          {[{ id: userId, name: names.me }, { id: partnerId, name: names.partner }].map((p) => (
            <div key={p.id} className="rounded-lg bg-white/50 p-4"><p className="font-medium">{p.name}</p><p className="font-display text-3xl">{t('summary.points', { points: sum.scores?.[p.id]?.points ?? 0 })}</p></div>
          ))}
        </div>
      ) : null}
      {sum.votesFor ? (
        <div className="grid grid-cols-2 gap-3">
          {[{ id: userId, name: names.me }, { id: partnerId, name: names.partner }].map((p) => (
            <div key={p.id} className="rounded-lg bg-white/50 p-4"><p className="font-medium">{p.name}</p><p className="font-display text-3xl">{sum.votesFor?.[p.id] ?? 0}</p></div>
          ))}
        </div>
      ) : null}
      <div className="flex justify-center gap-2"><Button asChild variant="secondary"><Link href="/jouer">{t('summary.back')}</Link></Button></div>
    </Card>
  );
}

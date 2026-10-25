'use client';
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Flame, Lock, RotateCcw, Shuffle, TimerReset } from 'lucide-react';
import type { CardTableDto, IntimacySettingsDto } from '@couple/types';
import { Alert, Button, Logo, Skeleton, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';

/**
 * « Les cartes du soir » : une table partagée par le couple. La carte tirée est la même sur les deux
 * écrans ; le minuteur et le retournement sont locaux. Niveaux bornés par les réglages des deux.
 */
export function CardsTable() {
  const t = useTranslations('intimacy.cards');
  const tl = useTranslations('intimacy.cards.levels');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner;
  const settings = useQuery({ queryKey: ['intimacy', 'settings'], queryFn: () => api.get<IntimacySettingsDto>('/intimacy/settings') });
  const table = useQuery({ queryKey: ['intimacy', 'cards'], queryFn: () => api.get<CardTableDto>('/intimacy/cards'), enabled: settings.data?.bothEnabled === true });
  useRealtimeInvalidation('intimacy.changed', [['intimacy']]);
  const [level, setLevel] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [flipped, setFlipped] = React.useState(false);
  const set = (d: CardTableDto) => { qc.setQueryData(['intimacy', 'cards'], d); setError(null); };
  const draw = useMutation({ mutationFn: (lvl: number) => api.post<CardTableDto>('/intimacy/cards/draw', { level: lvl }), onSuccess: set, onError: (e) => setError(toMessage(e)) });
  const done = useMutation({ mutationFn: () => api.post<CardTableDto>('/intimacy/cards/done'), onSuccess: set, onError: (e) => setError(toMessage(e)) });
  const reset = useMutation({ mutationFn: () => api.delete<CardTableDto>('/intimacy/cards'), onSuccess: set, onError: (e) => setError(toMessage(e)) });

  const current = table.data?.current ?? null;
  // Retournement : la face cachée apparaît d'abord, puis la carte se retourne.
  React.useEffect(() => {
    if (!current) { setFlipped(false); return; }
    setFlipped(false);
    const id = setTimeout(() => setFlipped(true), 120);
    return () => clearTimeout(id);
  }, [current?.card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (settings.isPending || !user) return <div className="container-page py-8"><Skeleton className="h-[32rem] rounded-lg" /></div>;
  if (!settings.data?.bothEnabled) {
    return (
      <div className="container-page max-w-3xl space-y-6 py-8">
        <Alert tone="info">{settings.data?.partnerEnabled ? t('subtitle') : t('subtitle')}</Alert>
        <Button asChild variant="outline"><Link href="/intimite"><ArrowLeft className="h-4 w-4" aria-hidden />{t('back')}</Link></Button>
      </div>
    );
  }
  const names = { me: user.profile.displayName, partner: partner?.profile.displayName ?? '' };
  const drawerName = current ? (current.drawnByUserId === user.id ? names.me : names.partner) : '';
  const otherName = current ? (current.drawnByUserId === user.id ? names.partner : names.me) : '';
  const roleLine = current ? (current.card.role === 'BOTH' ? t('forBoth') : current.card.role === 'DRAWER' ? t('forPartner', { drawer: drawerName, partner: otherName }) : t('forDrawer', { drawer: drawerName, partner: otherName })) : '';
  const activeLevel = level ?? table.data?.levels.find((l) => l.available)?.level ?? 1;

  return (
    <div className="container-page max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/intimite"><ArrowLeft className="h-4 w-4" aria-hidden />{t('back')}</Link></Button>
        {table.data && table.data.doneCount > 0 ? <span className="text-sm text-fg-muted">{t('doneCount', { count: table.data.doneCount })}</span> : null}
      </div>

      <section className="card-table relative overflow-hidden rounded-lg px-5 py-8 sm:px-10 sm:py-10" aria-labelledby="cards-title">
        <div className="relative text-center">
          <p className="label-sc text-paper/70">{t('eyebrow')}</p>
          <h1 id="cards-title" className="mt-2 font-display-soft text-4xl text-night-fg sm:text-5xl">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-night-fg/75">{t('subtitle')}</p>
        </div>

        {/* Sceaux de niveau */}
        <div className="relative mt-8 flex flex-wrap justify-center gap-3 sm:gap-5" role="radiogroup" aria-label={t('title')}>
          {(table.data?.levels ?? [1, 2, 3, 4].map((l) => ({ level: l, available: false, reason: null, remaining: 0 }))).map((l) => {
            const active = activeLevel === l.level;
            return (
              <button
                key={l.level}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!l.available}
                onClick={() => setLevel(l.level)}
                title={l.reason ? t(`levelHint.${l.reason}`) : l.remaining === 0 ? t('levelHint.empty') : undefined}
                className={cn('group flex w-[5.5rem] flex-col items-center gap-2 rounded-lg p-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70', active && l.available && 'scale-105', !l.available && 'opacity-60')}
              >
                <span className={cn('wax-seal', (!l.available || !active) && 'is-muted', active && l.available && 'animate-pulse-glow')}>
                  {l.level === 4 ? <Flame className="h-6 w-6" aria-hidden /> : l.reason ? <Lock className="h-5 w-5" aria-hidden /> : <span>{['I', 'II', 'III', 'IV'][l.level - 1]}</span>}
                </span>
                <span className={cn('text-xs font-medium', active ? 'text-night-fg' : 'text-night-fg/70')}>{tl(String(l.level))}</span>
                <span className="text-[10px] text-night-fg/50">{l.reason ? t(`levelHint.${l.reason}`) : t('remaining', { count: l.remaining })}</span>
              </button>
            );
          })}
        </div>

        {error ? <Alert tone="danger" className="mx-auto mt-6 max-w-md">{error}</Alert> : null}

        {/* La table */}
        <div className="relative mx-auto mt-8 flex min-h-[26rem] max-w-md items-center justify-center">
          {table.isPending ? <Skeleton className="h-[24rem] w-[17rem] rounded-[22px]" /> : current ? (
            <div className={cn('card3d h-[24rem] w-[17rem]', flipped && 'is-flipped')} data-testid="current-card">
              <div className="card3d-inner h-full w-full">
                <CardBack />
                <div className="card-face back card-front-paper flex flex-col p-7">
                  <span className="card-corner tl" /><span className="card-corner tr" /><span className="card-corner bl" /><span className="card-corner br" />
                  <div className="flex items-center justify-between">
                    <span className="wax-seal" style={{ width: 44, height: 44, fontSize: 16 }}>{current.card.level === 4 ? <Flame className="h-5 w-5" aria-hidden /> : ['I', 'II', 'III', 'IV'][current.card.level - 1]}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-plum/70">{tl(String(current.card.level))}</span>
                  </div>
                  <p className="my-auto py-4 text-center font-display-italic text-[1.45rem] leading-snug text-plum">{current.card.text}</p>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-plum">{roleLine}</p>
                    <p className="text-[11px] text-plum/60">{t('drawnBy', { name: drawerName })}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-[24rem] w-[17rem]" aria-hidden>
              <div className="card-back-pattern absolute inset-0 -rotate-6 rounded-[22px] opacity-60" />
              <div className="card-back-pattern absolute inset-0 rotate-3 rounded-[22px] opacity-80" />
              <div className="card-back-pattern absolute inset-0 flex items-center justify-center rounded-[22px]"><Logo withWordmark={false} size={56} /></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative mt-8 flex flex-col items-center gap-3">
          {current ? (
            <>
              {current.card.durationSec ? <Timer seconds={current.card.durationSec} key={current.card.id} /> : null}
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => done.mutate()} loading={done.isPending}><Check className="h-5 w-5" aria-hidden />{t('done')}</Button>
                <Button size="lg" variant="night" onClick={() => draw.mutate(activeLevel)} loading={draw.isPending}><Shuffle className="h-5 w-5" aria-hidden />{t('drawAnother')}</Button>
              </div>
            </>
          ) : (
            <Button size="xl" onClick={() => draw.mutate(activeLevel)} loading={draw.isPending} disabled={!table.data?.levels.some((l) => l.available)} className="animate-pulse-glow">
              <Shuffle className="h-5 w-5" aria-hidden />{t('draw')}
            </Button>
          )}
          <p className="max-w-md text-center text-xs text-night-fg/60">{t('rules')}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span>{t('expires')}</span>
        <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(t('resetConfirm'))) reset.mutate(); }} loading={reset.isPending}><RotateCcw className="h-4 w-4" aria-hidden />{t('reset')}</Button>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="card-face card-back-pattern flex items-center justify-center">
      <div className="rounded-full bg-plum-deep/70 p-5 ring-1 ring-white/20"><Logo withWordmark={false} size={56} /></div>
    </div>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const t = useTranslations('intimacy.cards');
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const pct = left === null ? 0 : Math.round(((seconds - left) / seconds) * 100);
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      {left === null ? (
        <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-night-fg hover:bg-white/10" onClick={() => setLeft(seconds)}><TimerReset className="h-4 w-4" aria-hidden />{t('timer')} · {seconds} s</Button>
      ) : (
        <>
          <p className={cn('font-display text-3xl tabular-nums', left === 0 && 'text-primary')}>{left === 0 ? t('timerDone') : t('timerRunning', { seconds: left })}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/10"><div className="h-full rounded-pill bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} /></div>
        </>
      )}
    </div>
  );
}

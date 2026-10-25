'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Eye, Flame, Lock, ShieldCheck, Spade, Trash2 } from 'lucide-react';
import type { DesireChoice, DesireItemDto, DesireMatchesDto, IntimacyCategory, IntimacySettingsDto, MeDto, TonightDto } from '@couple/types';
import { INTIMACY_CATEGORIES } from '@couple/validation';
import { Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, Dialog, DialogClose, DialogContent, DialogTrigger, Doodle, EmptyState, Glow, Skeleton, Switch, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';

export function IntimacyPage() {
  const t = useTranslations('intimacy');
  const { user, refetch } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const settings = useQuery({ queryKey: ['intimacy', 'settings'], queryFn: () => api.get<IntimacySettingsDto>('/intimacy/settings') });
  useRealtimeInvalidation('intimacy.changed', [['intimacy']]);
  const [error, setError] = React.useState<string | null>(null);

  const confirmAdult = useMutation({ mutationFn: () => api.post<MeDto>('/me/confirm-adult', { confirm: true }), onSuccess: async () => { await refetch(); await qc.invalidateQueries({ queryKey: ['intimacy'] }); }, onError: (e) => setError(toMessage(e)) });

  if (settings.isPending || !user) return <div className="container-page py-8"><Skeleton className="h-64 rounded-lg" /></div>;
  const s = settings.data!;

  return (
    <div className="container-page max-w-3xl space-y-8 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {!s.moduleAvailable ? <Alert tone="info">{t('unavailable')}</Alert> : !s.adultConfirmed ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-secondary" aria-hidden />{t('adult.title')}</CardTitle><CardDescription>{t('adult.body')}</CardDescription></CardHeader>
          <CardContent><Button onClick={() => confirmAdult.mutate()} loading={confirmAdult.isPending}>{t('adult.confirm')}</Button></CardContent>
        </Card>
      ) : (
        <>
          <SettingsCard s={s} partner={partner} />
          {s.bothEnabled ? <Tonight partner={partner} /> : null}
          <CardsTeaser locked={s.bothEnabled ? null : s.enabled ? 'partner' : 'me'} partner={partner} />
          {s.bothEnabled ? <DoubleSecret partner={partner} premium={s.premium} /> : null}
        </>
      )}
    </div>
  );
}

function SettingsCard({ s, partner }: { s: IntimacySettingsDto; partner: string }) {
  const t = useTranslations('intimacy');
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [categories, setCategories] = React.useState<IntimacyCategory[]>(s.enabled ? s.enabledCategories : [...INTIMACY_CATEGORIES]);
  const [intensity, setIntensity] = React.useState(s.maxIntensity);
  const [error, setError] = React.useState<string | null>(null);
  const save = useMutation({
    mutationFn: (enabled: boolean) => api.put<IntimacySettingsDto>('/intimacy/settings', { enabled, enabledCategories: categories, maxIntensity: intensity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intimacy'] }),
    onError: (e) => setError(toMessage(e)),
  });
  const del = useMutation({ mutationFn: () => api.delete('/intimacy/responses'), onSuccess: () => qc.invalidateQueries({ queryKey: ['intimacy'] }) });
  const toggle = (c: IntimacyCategory) => setCategories((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div><CardTitle>{t('settings.title')}</CardTitle><CardDescription>{s.enabled ? t('settings.enabled') : t('settings.disabled')}</CardDescription></div>
          <Switch checked={s.enabled} onCheckedChange={(v) => save.mutate(v)} aria-label={t('settings.enable')} disabled={save.isPending} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p className="text-sm text-fg-muted">{t('settings.consent')}</p>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.categories')}</p>
          <div className="flex flex-wrap gap-2">{INTIMACY_CATEGORIES.map((c) => <Chip key={c} active={categories.includes(c)} onClick={() => toggle(c)}>{t(`categories.${c}`)}</Chip>)}</div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.intensity')}</p>
          <div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map((l) => <Chip key={l} active={intensity === l} onClick={() => setIntensity(l)}>{l === 4 ? <Flame className="h-3.5 w-3.5" aria-hidden /> : null}{t(`intensity.${l}`)}</Chip>)}</div>
          <p className="text-xs text-fg-muted">{t('intensityHint')}</p>
        </div>
        {s.enabled ? <Button variant="outline" size="sm" onClick={() => save.mutate(true)} loading={save.isPending}>{t('settings.save')}</Button> : null}
        <Alert tone={s.partnerEnabled ? 'success' : 'info'}>{s.partnerEnabled ? t('settings.partnerEnabled', { partner }) : t('settings.partnerWaiting', { partner })}</Alert>
        {s.enabled ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Dialog>
              <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-danger"><Trash2 className="h-4 w-4" aria-hidden />{t('settings.deleteResponses')}</Button></DialogTrigger>
              <DialogContent title={t('settings.deleteResponses')} description={t('settings.deleteConfirm')}>
                <div className="flex justify-end gap-2"><DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose><DialogClose asChild><Button variant="danger" onClick={() => del.mutate()}>{t('settings.deleteResponses')}</Button></DialogClose></div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={() => save.mutate(false)}>{t('settings.disable')}</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DoubleSecret({ partner, premium }: { partner: string; premium: boolean }) {
  const t = useTranslations('intimacy');
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const items = useQuery({ queryKey: ['intimacy', 'items'], queryFn: () => api.get<DesireItemDto[]>('/intimacy/items') });
  const matches = useQuery({ queryKey: ['intimacy', 'matches'], queryFn: () => api.get<DesireMatchesDto>('/intimacy/matches') });
  const [error, setError] = React.useState<string | null>(null);
  const respond = useMutation({
    mutationFn: ({ id, choice }: { id: string; choice: DesireChoice }) => api.put<DesireItemDto>(`/intimacy/items/${id}/response`, { choice }),
    onSuccess: (item) => {
      qc.setQueryData<DesireItemDto[]>(['intimacy', 'items'], (old) => old?.map((i) => (i.id === item.id ? { ...i, myChoice: item.myChoice } : i)));
      qc.invalidateQueries({ queryKey: ['intimacy', 'matches'] });
    },
    onError: (e) => setError(toMessage(e)),
  });
  const reveal = useMutation({ mutationFn: () => api.post<DesireMatchesDto>('/intimacy/matches/reveal'), onSuccess: (m) => qc.setQueryData(['intimacy', 'matches'], m), onError: (e) => setError(toMessage(e)) });

  const m = matches.data;
  const byCategory = new Map<IntimacyCategory, DesireItemDto[]>();
  for (const i of items.data ?? []) byCategory.set(i.category, [...(byCategory.get(i.category) ?? []), i]);

  return (
    <>
      <Card tone="night" className="overflow-hidden p-6 sm:p-8">
        <Glow tone="primary" size={300} className="-right-24 -top-24" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="label-sc text-paper/70">{t('matches.eyebrow')}</p>
            <h2 className="mt-1 flex items-center gap-2 text-3xl"><Lock className="h-5 w-5" aria-hidden />{t('matches.title')}</h2>
            <p className="mt-1 text-sm opacity-80">{t('matches.privacy')}</p>
          </div>
        </div>
        {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
        <div className="mt-5 space-y-3">
          {matches.isPending ? <Skeleton className="h-10" /> : !m || (m.mutualCount === 0 && m.myAnswersCount === 0) ? <p className="opacity-90">{t('matches.none')}</p> : (
            <>
              <p className="font-display text-xl">{t('matches.count', { count: m.mutualCount })}</p>
              {m.pendingCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm opacity-80">{t('matches.pending', { count: m.pendingCount })}</p>
                  {m.partnerRequested && !m.iRequested ? <Badge tone="coral">{t('matches.partnerRequested', { partner })}</Badge> : null}
                  {m.iRequested ? <p className="text-sm opacity-80">{t('matches.requested', { partner })}</p> : (
                    <Button onClick={() => reveal.mutate()} loading={reveal.isPending}><Eye className="h-4 w-4" aria-hidden />{t('matches.request')}</Button>
                  )}
                </div>
              ) : null}
              {m.revealed.length > 0 ? (
                <div className="animate-curtain rounded-lg bg-white/10 p-4" data-testid="revealed-list">
                  <p className="text-xs uppercase tracking-wider opacity-70">{t('matches.revealed')}</p>
                  <ul className="mt-2 space-y-2">{m.revealed.map((r) => <li key={r.id} className="flex items-start gap-2 font-display-italic text-xl leading-snug">{r.intensity >= 3 ? <Flame className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden /> : <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}{r.text}</li>)}</ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      {items.isPending ? <Skeleton className="h-40 rounded-lg" /> : items.data?.length === 0 ? <EmptyState title={t('matches.none')} /> : (
        <div className="space-y-6">
          {[...byCategory.entries()].map(([category, list]) => (
            <section key={category} className="space-y-3">
              <h3 className="text-lg">{t(`categories.${category}`)}</h3>
              <ul className="space-y-2">
                {list.map((item) => (
                  <li key={item.id} className={cn('flex flex-col gap-3 rounded-md border border-ink/30 bg-bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between', item.intensity >= 4 && 'border-primary bg-bg-blush', item.locked && 'opacity-70')}>
                    <div className="flex items-center gap-2">
                      {item.locked ? <Lock className="h-4 w-4 text-fg-muted" aria-hidden /> : null}
                      <span>{item.text}</span>
                      <Badge tone={item.intensity >= 4 ? 'coral' : item.intensity === 3 ? 'honey' : 'neutral'} className="ml-1">{item.intensity >= 4 ? <Flame className="h-3 w-3" aria-hidden /> : null}{t(`intensity.${item.intensity}`)}</Badge>
                      {item.locked && !premium ? <Badge tone="champagne">{t('locked')}</Badge> : null}
                    </div>
                    <div className="flex gap-2" role="radiogroup" aria-label={item.text}>
                      {(['YES', 'MAYBE', 'NO'] as DesireChoice[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={item.myChoice === c}
                          disabled={item.locked || respond.isPending}
                          onClick={() => respond.mutate({ id: item.id, choice: c })}
                          className={cn('min-w-[72px] rounded-sm border-2 px-3 py-1.5 text-sm font-semibold transition-colors', item.myChoice === c ? (c === 'YES' ? 'border-ink bg-primary text-primary-fg' : c === 'NO' ? 'border-ink bg-ink text-paper' : 'border-ink bg-marker text-ink') : 'border-ink/30 hover:border-ink')}
                        >
                          {t(`choices.${c}`)}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Tonight({ partner }: { partner: string }) {
  const t = useTranslations('intimacy.tonight');
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [error, setError] = React.useState<string | null>(null);
  const state = useQuery({ queryKey: ['intimacy', 'tonight'], queryFn: () => api.get<TonightDto>('/intimacy/tonight') });
  const set = useMutation({ mutationFn: (on: boolean) => api.put<TonightDto>('/intimacy/tonight', { on }), onSuccess: (d) => { qc.setQueryData(['intimacy', 'tonight'], d); qc.invalidateQueries({ queryKey: ['notifications'] }); }, onError: (e) => setError(toMessage(e)) });
  const d = state.data;
  const mutual = !!d?.mutual;
  return (
    <Card tone={mutual ? 'night' : 'warm'} className={cn('overflow-hidden p-6 sm:p-8 transition-colors', mutual && 'animate-bloom')} data-testid="tonight-card">
      <Glow tone={mutual ? 'primary' : 'honey'} size={280} className="-right-20 -top-24" />
      <Doodle name="candle" size={72} className={cn('absolute right-6 top-6 hidden sm:block', mutual ? 'text-primary' : 'text-honey/80')} />
      <div className="relative max-w-xl">
        <p className="label-sc text-paper/70">{t('eyebrow')}</p>
        <h2 className={cn('mt-1 flex items-center gap-2 text-3xl')}><Flame className={cn('h-6 w-6', mutual ? 'text-primary' : 'text-fg-subtle')} aria-hidden />{t('title')}</h2>
        <p className={cn('mt-2 text-sm', mutual ? 'opacity-80' : 'text-fg-muted')}>{t('hint', { partner })}</p>
        {error ? <Alert tone="danger" className="mt-3">{error}</Alert> : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Switch checked={!!d?.mine} onCheckedChange={(v) => set.mutate(v)} aria-label={t('toggle')} disabled={state.isPending || set.isPending} />
          <p className={cn('font-medium', mutual && 'font-display-italic text-xl')}>{state.isPending ? '…' : mutual ? t('mutual') : d?.mine ? t('waiting', { partner }) : t('off')}</p>
        </div>
        {d?.mine ? <p className={cn('mt-2 text-xs', mutual ? 'opacity-70' : 'text-fg-subtle')}>{t('expires')}</p> : null}
      </div>
    </Card>
  );
}

function CardsTeaser({ locked, partner }: { locked: 'me' | 'partner' | null; partner: string }) {
  const t = useTranslations('intimacy.cards');
  const body = (
    <>
      <div className="relative flex items-center gap-5">
        <div className="relative hidden h-24 w-16 shrink-0 sm:block" aria-hidden>
          <div className="card-back-pattern absolute inset-0 -rotate-6 rounded-[10px] opacity-70" />
          <div className="card-back-pattern absolute inset-0 rotate-3 rounded-[10px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label-sc text-paper/70">{t('eyebrow')}</p>
          <h2 className="mt-1 text-3xl text-paper">{t('title')}</h2>
          <p className="mt-1 text-sm text-night-fg/75">{t('subtitle')}</p>
        </div>
        <span className="wax-seal shrink-0"><Spade className="h-5 w-5" aria-hidden /></span>
      </div>
      <p className="relative mt-4 text-sm font-medium text-primary">{locked === null ? `${t('open')} →` : locked === 'me' ? t('lockedMe') : t('lockedPartner', { partner })}</p>
    </>
  );
  const className = 'card-table relative block overflow-hidden rounded-lg p-6 sm:p-8';
  if (locked) return <div className={cn(className, 'opacity-80')} data-testid="cards-teaser" aria-disabled>{body}</div>;
  return <Link href="/intimite/cartes" className={cn(className, 'hover-lift')} data-testid="cards-teaser">{body}</Link>;
}

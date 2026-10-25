'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Eye, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import type { DesireChoice, DesireItemDto, DesireMatchesDto, IntimacyCategory, IntimacySettingsDto, MeDto } from '@couple/types';
import { INTIMACY_CATEGORIES } from '@couple/validation';
import { Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, Dialog, DialogClose, DialogContent, DialogTrigger, EmptyState, Skeleton, Switch, cn } from '@couple/ui';
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
          <div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map((l) => <Chip key={l} active={intensity === l} onClick={() => setIntensity(l)}>{t(`intensity.${l}`)}</Chip>)}</div>
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
      <Card tone="plum" className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl"><Lock className="h-5 w-5" aria-hidden />{t('matches.title')}</h2>
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
                <div className="rounded-lg bg-white/10 p-4" data-testid="revealed-list">
                  <p className="text-xs uppercase tracking-wider opacity-70">{t('matches.revealed')}</p>
                  <ul className="mt-2 space-y-1">{m.revealed.map((r) => <li key={r.id} className="font-display text-lg">{r.text}</li>)}</ul>
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
                  <li key={item.id} className={cn('flex flex-col gap-3 rounded-lg border border-border bg-bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between', item.locked && 'opacity-70')}>
                    <div className="flex items-center gap-2">
                      {item.locked ? <Lock className="h-4 w-4 text-fg-muted" aria-hidden /> : null}
                      <span>{item.text}</span>
                      <Badge tone="neutral" className="ml-1">{t(`intensity.${item.intensity}`)}</Badge>
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
                          className={cn('min-w-[72px] rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors', item.myChoice === c ? (c === 'YES' ? 'border-primary bg-primary text-primary-fg' : c === 'NO' ? 'border-fg-muted bg-fg-muted text-bg' : 'border-secondary bg-secondary text-secondary-fg') : 'border-border hover:bg-bg-muted')}
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

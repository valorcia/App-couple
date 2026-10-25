'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Lock, Play, Spade } from 'lucide-react';
import type { GameCatalogDto, GameCatalogEntryDto, GameSessionDto, GameSessionListItemDto, GameType, Page } from '@couple/types';
import { Alert, Badge, Button, Card, Chip, Dialog, DialogContent, Segmented, Skeleton, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { PageHeader } from '@/components/app/page-header';
import { GAME_META } from './game-meta';
import { PaywallHint } from '@/components/billing/paywall-hint';

export function GamesHome() {
  const t = useTranslations('games');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: () => api.get<GameCatalogDto>('/games/catalog') });
  const open = useQuery({ queryKey: ['games', 'sessions', 'OPEN'], queryFn: () => api.get<Page<GameSessionListItemDto>>('/games/sessions', { query: { status: 'OPEN' } }) });
  const done = useQuery({ queryKey: ['games', 'sessions', 'COMPLETED'], queryFn: () => api.get<Page<GameSessionListItemDto>>('/games/sessions', { query: { status: 'COMPLETED', limit: 5 } }) });
  useRealtimeInvalidation('game.changed', [['games']]);
  const [starting, setStarting] = React.useState<GameCatalogEntryDto | null>(null);

  return (
    <div className="container-page space-y-8 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {open.data && open.data.items.length > 0 ? (
        <section aria-labelledby="open-title" className="space-y-3">
          <h2 id="open-title" className="text-xl">{t('openSessions')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {open.data.items.map((s) => <SessionRow key={s.id} s={s} partner={partner} />)}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">{t('start')}</h2>
          {catalog.data ? (
            catalog.data.premium ? <Badge tone="champagne">{t('premiumAll')}</Badge> : <Link href="/premium" className="text-sm text-fg-muted hover:text-fg"><Badge tone="neutral">{t('sessionsLeft', { count: catalog.data.sessionsLeftToday ?? 0 })}</Badge></Link>
          ) : null}
        </div>
        {catalog.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.data?.games.map((g, i) => {
              const meta = GAME_META[g.gameType];
              const Icon = meta.icon;
              return (
                <Card key={g.gameType} tone={meta.tone} interactive className="flex flex-col gap-3 p-6 animate-rise" style={{ ['--i' as string]: i }}>
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                  <div className="flex-1">
                    <h3 className="text-xl">{t(`types.${g.gameType}.name`)}</h3>
                    <p className="mt-1 text-sm opacity-80">{t(`types.${g.gameType}.tagline`)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">{t('questions', { count: g.totalQuestions })}</span>
                    <Button size="sm" variant={meta.tone === 'plum' || meta.tone === 'night' ? 'primary' : 'secondary'} disabled={!g.available} onClick={() => setStarting(g)}><Play className="h-4 w-4" aria-hidden />{t('play')}</Button>
                  </div>
                </Card>
              );
            })}
            <Card tone="champagne" className="flex flex-col gap-3 p-6">
              {React.createElement(GAME_META.CHALLENGE.icon, { className: 'h-7 w-7', 'aria-hidden': true })}
              <div className="flex-1"><h3 className="text-xl">{t('types.CHALLENGE.name')}</h3><p className="mt-1 text-sm opacity-80">{t('types.CHALLENGE.tagline')}</p></div>
              <div className="flex justify-end"><Button asChild size="sm" variant="secondary"><Link href="/defis"><Play className="h-4 w-4" aria-hidden />{t('play')}</Link></Button></div>
            </Card>
            <Card tone="night" className="card-table flex flex-col gap-3 p-6" data-testid="games-cards-entry">
              <Spade className="h-7 w-7 text-primary" aria-hidden />
              <div className="flex-1"><h3 className="text-xl">Les cartes du soir</h3><p className="mt-1 text-sm opacity-80">Une carte, un geste, à tour de rôle. Réservé à l’espace Intimité, activé par vous deux.</p></div>
              <div className="flex justify-end"><Button asChild size="sm" variant="primary"><Link href="/intimite/cartes"><Play className="h-4 w-4" aria-hidden />{t('play')}</Link></Button></div>
            </Card>
            <Card className="flex flex-col gap-3 p-6">
              <Lock className="h-7 w-7 text-secondary" aria-hidden />
              <div className="flex-1"><h3 className="text-xl">Intimité & séduction</h3><p className="mt-1 text-sm text-fg-muted">Espace facultatif, activé par chacun : « Ce soir ? », Double Secret, envies communes.</p></div>
              <div className="flex justify-end"><Button asChild size="sm" variant="outline"><Link href="/intimite">Découvrir</Link></Button></div>
            </Card>
            {(['MEMORY_QUIZ'] as GameType[]).map((gt) => {
              const Icon = GAME_META[gt].icon;
              return (
                <Card key={gt} className="flex flex-col gap-3 p-6 opacity-80">
                  <Icon className="h-7 w-7 text-secondary" aria-hidden />
                  <div className="flex-1"><h3 className="text-xl">{t(`types.${gt}.name`)}</h3><p className="mt-1 text-sm text-fg-muted">{t(`types.${gt}.tagline`)}</p></div>
                  <Badge tone="champagne" className="w-fit">{tc('comingSoon')}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {done.data && done.data.items.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl">{t('history')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">{done.data.items.map((s) => <SessionRow key={s.id} s={s} partner={partner} />)}</ul>
        </section>
      ) : null}

      <StartDialog entry={starting} premium={catalog.data?.premium ?? false} onClose={() => setStarting(null)} />
    </div>
  );
}

function SessionRow({ s, partner }: { s: GameSessionListItemDto; partner: string }) {
  const t = useTranslations('games');
  const Icon = GAME_META[s.gameType].icon;
  return (
    <li>
      <Link href={`/jouer/${s.id}`} className="flex items-center gap-4 rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-muted">
        <Icon className="h-6 w-6 text-secondary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t(`types.${s.gameType}.name`)}</p>
          <p className="text-sm text-fg-muted">{s.roundsClosed} / {s.roundsTotal}</p>
        </div>
        {s.status === 'OPEN' ? (
          s.myTurn ? <Badge tone="coral">{t('yourTurn')}</Badge> : <Badge tone="neutral">{t('waitingPartner', { partner })}</Badge>
        ) : (
          <Badge tone="success">{t('summary.title')}</Badge>
        )}
      </Link>
    </li>
  );
}

function StartDialog({ entry, premium, onClose }: { entry: GameCatalogEntryDto | null; premium: boolean; onClose: () => void }) {
  const t = useTranslations('games');
  const tc = useTranslations('common');
  const router = useRouter();
  const toMessage = useApiErrorMessage();
  const [codes, setCodes] = React.useState<string[]>([]);
  const [length, setLength] = React.useState<'short' | 'long'>('short');
  const [maxLevel, setMaxLevel] = React.useState(2);
  const [error, setError] = React.useState<string | null>(null);
  const [rawError, setRawError] = React.useState<unknown>(null);
  React.useEffect(() => { setCodes([]); setError(null); setRawError(null); }, [entry?.gameType]);
  const start = useMutation({
    mutationFn: () => api.post<GameSessionDto>('/games/sessions', { gameType: entry!.gameType, categoryCodes: codes, length, maxLevel }),
    onSuccess: (s) => { onClose(); router.push(`/jouer/${s.id}`); },
    onError: (e) => { setError(toMessage(e)); setRawError(e); },
  });
  if (!entry) return null;
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t(`types.${entry.gameType}.name`)} description={t(`types.${entry.gameType}.tagline`)}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {rawError ? <PaywallHint error={rawError} /> : null}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('categories')}</p>
          <div className="flex flex-wrap gap-2">
            {entry.categories.map((c) => {
              const active = codes.includes(c.code);
              return (
                <Chip key={c.code} active={active} onClick={() => !c.locked && setCodes((cs) => (active ? cs.filter((x) => x !== c.code) : [...cs, c.code]))} className={cn(c.locked && 'opacity-60')}>
                  {c.locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}{c.name}
                </Chip>
              );
            })}
          </div>
          <p className="text-xs text-fg-muted">{codes.length === 0 ? t('allCategories') : null}{!premium && entry.categories.some((c) => c.locked) ? ` · ${t('locked')}` : ''}</p>
        </div>
        <Segmented<'short' | 'long'> ariaLabel="Durée" value={length} onChange={setLength} options={[{ value: 'short', label: t('length.short') }, { value: 'long', label: t('length.long') }]} className="grid-cols-2" />
        {entry.gameType === 'CONFESSIONS' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('maxLevel')}</p>
            <div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map((l) => <Chip key={l} active={maxLevel === l} onClick={() => setMaxLevel(l)}>{t(`levels.${l}`)}</Chip>)}</div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{tc('cancel')}</Button>
          <Button onClick={() => start.mutate()} loading={start.isPending}>{t('start')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

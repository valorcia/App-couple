'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEventDto } from '@couple/types';
import { api } from '@/lib/api';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { eventColor } from '@/lib/calendar-utils';
import { DailyQuestionCard } from '@/components/games/daily-question';
import { FeaturedChallenge } from '@/components/challenges/featured-challenge';
import { WhatNow } from '@/components/ideas/what-now';
import * as React from 'react';
import { CalendarDays, ClipboardList, Gamepad2, Gift, ListChecks, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Doodle, EmptyState, Surface } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

function greetingKey(d = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

export function Dashboard() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const coupleActive = user?.couple?.status === 'ACTIVE';
  const upcoming = useQuery({
    queryKey: ['calendar', 'upcoming'],
    queryFn: () => {
      const from = new Date();
      const to = new Date(from.getTime() + 14 * 86_400_000);
      return api.get<CalendarEventDto[]>('/calendar/events', { query: { from: from.toISOString(), to: to.toISOString() } });
    },
    enabled: coupleActive,
  });
  useRealtimeInvalidation('calendar.changed', [['calendar']]);
  const [whatNowOpen, setWhatNowOpen] = React.useState(false);
  React.useEffect(() => {
    const openFromHash = () => { if (window.location.hash === '#on-fait-quoi') setWhatNowOpen(true); };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);
  if (!user) return null;
  const couple = user.couple;
  const nextEvents = (upcoming.data ?? []).filter((e) => new Date(e.endAt) > new Date()).slice(0, 4);
  const partner = couple?.partner;
  // Date de rencontre si renseignée, sinon date d'association.
  const since = couple?.metAt ?? couple?.activatedAt ?? null;
  const days = since ? Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86400_000)) : null;

  return (
    <div className="container-page space-y-8 py-8">
      <div className="animate-fade-up">
        <p className="text-sm capitalize text-fg-subtle">{new Intl.DateTimeFormat(user.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        <h1 className="mt-1 text-[2.4rem] text-secondary sm:text-5xl">{t(`greeting.${greetingKey()}`, { name: user.profile.displayName })}</h1>
        {partner && days !== null ? <p className="mt-2 font-display-italic text-lg text-fg-muted">{t('together', { days })} · {partner.profile.displayName}</p> : null}
      </div>

      {couple?.status !== 'ACTIVE' ? (
        <Card tone="blush" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-secondary">{t('pendingInvitation')}</p>
          <Button asChild variant="secondary"><Link href="/couple">{t('seeInvitation')}</Link></Button>
        </Card>
      ) : null}

      <section id="on-fait-quoi" aria-labelledby="ofq-title" className="animate-rise" style={{ ['--i' as string]: 1 }}>
        <Surface tone="night" glow="primary" className="p-8 sm:p-10">
          <Doodle name="moon" size={96} className="absolute -right-2 -top-4 text-night-fg/15 sm:right-6" />
          <div className="relative max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t('tonight')}</p>
            <h2 id="ofq-title" className="mt-2 font-display-soft text-4xl sm:text-5xl">{t('whatNow')}</h2>
            <p className="mt-3 text-pretty text-night-fg/80">{t('whatNowHint')}</p>
            <Button className="mt-6 animate-pulse-glow" size="xl" onClick={() => setWhatNowOpen(true)} disabled={couple?.status !== 'ACTIVE'}>
              <Sparkles className="h-5 w-5" aria-hidden />{t('whatNow')}
            </Button>
          </div>
        </Surface>
      </section>
      <WhatNow open={whatNowOpen} onClose={() => { setWhatNowOpen(false); if (window.location.hash === '#on-fait-quoi') history.replaceState(null, '', window.location.pathname); }} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="animate-rise" style={{ ['--i' as string]: 2 }}><DailyQuestionCard /></div>
        <Card className="animate-rise" style={{ ['--i' as string]: 3 }}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-secondary"><CalendarDays className="h-5 w-5 text-primary" aria-hidden />{t('upcoming')}</CardTitle></CardHeader>
          <CardContent>
            {nextEvents.length === 0 ? (
              <EmptyState doodle="cup" title={t('noUpcoming')} className="border-0 bg-transparent p-6" action={<Button asChild variant="outline" size="sm"><Link href="/agenda">{t('addEvent')}</Link></Button>} />
            ) : (
              <ol className="relative ml-2 space-y-1 border-l border-dashed border-border-strong pl-5">
                {nextEvents.map((e) => (
                  <li key={e.instanceId} className="relative">
                    <span className="absolute -left-[27px] top-3 h-3 w-3 rounded-full ring-4 ring-bg-elevated" style={{ backgroundColor: eventColor(e) }} aria-hidden />
                    <Link href="/agenda" className="block rounded-md px-2 py-2 hover:bg-bg-muted/70">
                      <span className="block truncate font-medium">{e.busy ? 'Occupé' : e.title}</span>
                      <span className="block text-sm capitalize text-fg-muted">{format(new Date(e.startAt), e.allDay ? 'EEEE d MMMM' : 'EEEE d MMMM · HH:mm', { locale: fr })}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <div className="animate-rise md:col-span-2" style={{ ['--i' as string]: 4 }}><FeaturedChallenge /></div>
      </div>

      <section aria-labelledby="shortcuts-title" className="space-y-3">
        <h2 id="shortcuts-title" className="text-xl text-secondary">{t('shortcuts')}</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
            { icon: ListChecks, label: 'Quotidien', href: '/quotidien' },
            { icon: Gamepad2, label: 'Jouer', href: '/jouer' },
            { icon: ClipboardList, label: 'Défis', href: '/defis' },
            { icon: Gift, label: 'Intimité', href: '/intimite' },
          ].map(({ icon: Icon, label, href }, i) => (
            <Link key={href} href={href} className="hover-lift animate-rise inline-flex items-center gap-2.5 rounded-pill border border-border bg-bg-elevated py-3 pl-4 pr-5 font-display text-lg text-secondary" style={{ ['--i' as string]: 5 + i }}>
              <Icon className="h-5 w-5 text-primary" aria-hidden />{label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarDays, ClipboardList, Gamepad2, Gift, Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

function greetingKey(d = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

export function Dashboard() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { user } = useAuth();
  if (!user) return null;
  const couple = user.couple;
  const partner = couple?.partner;
  // Date de rencontre si renseignée, sinon date d'association.
  const since = couple?.metAt ?? couple?.activatedAt ?? null;
  const days = since ? Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86400_000)) : null;

  return (
    <div className="container-page space-y-8 py-8">
      <div className="animate-fade-up">
        <p className="text-sm text-fg-subtle">{new Intl.DateTimeFormat(user.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        <h1 className="mt-1 text-3xl text-secondary sm:text-4xl">{t(`greeting.${greetingKey()}`, { name: user.profile.displayName })}</h1>
        {partner && days !== null ? <p className="mt-1 text-fg-muted">{t('together', { days })} · {partner.profile.displayName}</p> : null}
      </div>

      {couple?.status !== 'ACTIVE' ? (
        <Card tone="blush" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-secondary">{t('pendingInvitation')}</p>
          <Button asChild variant="secondary"><Link href="/couple">{t('seeInvitation')}</Link></Button>
        </Card>
      ) : null}

      <section id="on-fait-quoi" aria-labelledby="ofq-title">
        <Card tone="plum" className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <h2 id="ofq-title" className="text-3xl">{t('whatNow')}</h2>
          <p className="mt-2 opacity-80">{t('whatNowHint')}</p>
          <Button className="mt-6" size="lg" disabled title={tc('comingSoon')}>
            <Sparkles className="h-5 w-5" aria-hidden />{t('whatNow')}
          </Button>
          <Badge tone="champagne" className="ml-3">{tc('comingSoon')}</Badge>
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" aria-hidden />{t('upcoming')}</CardTitle></CardHeader>
          <CardContent>
            <EmptyState title={t('noUpcoming')} description={tc('comingSoon')} className="border-0 p-6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-primary" aria-hidden />{t('dailyQuestion')}</CardTitle>
            <CardDescription>{tc('comingSoon')}</CardDescription>
          </CardHeader>
          <CardContent><div className="h-16 rounded-md bg-bg-muted" /></CardContent>
        </Card>
      </div>

      <section aria-labelledby="shortcuts-title" className="space-y-3">
        <h2 id="shortcuts-title" className="text-xl">{t('shortcuts')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
            { icon: Gamepad2, label: 'Jouer', href: '/jouer' },
            { icon: ClipboardList, label: 'Listes', href: '/listes' },
            { icon: Gift, label: 'Surprise', href: '/surprises' },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bg-elevated p-5 text-sm font-medium transition-colors hover:bg-bg-muted">
              <Icon className="h-6 w-6 text-secondary" aria-hidden />{label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

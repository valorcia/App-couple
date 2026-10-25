import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CalendarDays, Check, Gamepad2, Lock, MessageCircleHeart, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Doodle, Glow, SectionHeader, Surface } from '@couple/ui';

export default async function HomePage() {
  const t = await getTranslations('marketing');
  const steps = t.raw('whatNow.steps') as string[];
  const gamesList = t.raw('games.list') as string[];
  const points = t.raw('privacy.points') as { title: string; body: string }[];
  const faq = t.raw('faq.items') as { q: string; a: string }[];
  const freeItems = t.raw('pricing.free.items') as string[];
  const premiumItems = t.raw('pricing.premium.items') as string[];

  return (
    <>
      {/* Héros */}
      <section className="relative overflow-hidden">
        <Glow tone="primary" size={520} className="-right-40 -top-40" />
        <Glow tone="honey" size={420} className="-left-40 top-[40%]" />
        <div className="container-page grid gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24 lg:py-28">
          <div className="space-y-7 animate-rise">
            <p className="inline-flex items-center gap-2 rounded-pill border border-border bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-fg-muted"><Doodle name="candle" size={16} className="text-primary" />{t('hero.eyebrow')}</p>
            <h1 className="text-balance text-[2.6rem] leading-[1.02] text-secondary sm:text-6xl lg:text-[4.4rem]">
              {t('hero.title')} <span className="font-display-italic text-primary">{t('hero.titleAccent')}</span>
            </h1>
            <p className="max-w-xl text-pretty text-lg text-fg-muted">{t('hero.subtitle')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl"><Link href="/inscription">{t('hero.ctaPrimary')}</Link></Button>
              <Button asChild size="xl" variant="outline"><Link href="/connexion">{t('hero.ctaSecondary')}</Link></Button>
            </div>
            <p className="text-sm text-fg-subtle">{t('hero.note')}</p>
          </div>
          <HeroFan />
        </div>
      </section>

      {/* Piliers */}
      <section id="fonctionnalites" className="container-page py-20">
        <SectionHeader eyebrow={t('pillars.eyebrow')} title={t('pillars.title')} className="mx-auto max-w-2xl text-center sm:block [&_h2]:text-3xl sm:[&_h2]:text-4xl" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Pillar doodle="heart-knot" tone="blush" title={t('pillars.love.title')} body={t('pillars.love.body')} items={t.raw('pillars.love.items') as string[]} i={0} />
          <Pillar doodle="garland" tone="honey" title={t('pillars.play.title')} body={t('pillars.play.body')} items={t.raw('pillars.play.items') as string[]} i={1} />
          <Pillar doodle="notebook" tone="sage" title={t('pillars.build.title')} body={t('pillars.build.body')} items={t.raw('pillars.build.items') as string[]} i={2} />
        </div>
      </section>

      {/* On fait quoi ? */}
      <section className="container-page py-10">
        <Surface tone="night" glow="primary" className="p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t('whatNow.eyebrow')}</p>
              <h2 className="font-display-soft text-4xl sm:text-5xl">{t('whatNow.title')}</h2>
              <p className="max-w-lg text-pretty text-night-fg/80">{t('whatNow.body')}</p>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">{steps.map((s) => <li key={s} className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{s}</li>)}</ul>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-night-fg/60">{t('whatNow.title')}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {['Ce soir', 'À deux', 'Petit budget', 'Romantique'].map((x, i) => <span key={x} className={i === 3 ? 'rounded-md bg-primary px-3 py-2 text-center font-medium text-primary-fg' : 'rounded-md border border-white/15 px-3 py-2 text-center'}>{x}</span>)}
              </div>
              <div className="mt-4 space-y-2">
                {[['Dîner aux chandelles à la maison', '2 h · 15 €'], ['Soirée spa improvisée', '1 h 30 · gratuit']].map(([a, b]) => <div key={a} className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2 text-sm"><span>{a}</span><span className="text-night-fg/60">{b}</span></div>)}
              </div>
              <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--primary),var(--primary-hover))] px-5 py-3 text-sm font-semibold text-primary-fg"><CalendarDays className="h-4 w-4" aria-hidden />Ajouter à l’agenda</span>
            </div>
          </div>
        </Surface>
      </section>

      {/* Jeux */}
      <section id="jeux" className="container-page py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <SectionHeader eyebrow={t('games.eyebrow')} title={t('games.title')} hint={t('games.body')} className="[&_h2]:text-3xl sm:[&_h2]:text-4xl" />
            <ul className="grid gap-2 text-sm sm:grid-cols-2">{gamesList.map((g) => <li key={g} className="flex items-center gap-2 rounded-pill border border-border bg-bg-elevated/70 px-3 py-1.5"><Gamepad2 className="h-4 w-4 text-primary" aria-hidden />{g}</li>)}</ul>
          </div>
          <Card tone="plum" className="relative overflow-hidden p-8">
            <Glow tone="primary" size={260} className="-right-20 -top-20" />
            <div className="relative">
              <p className="text-xs uppercase tracking-widest opacity-75">{t('games.cardLabel')}</p>
              <p className="mt-4 font-display-soft text-2xl leading-snug sm:text-3xl">{t('games.cardQuestion')}</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-white/10 p-4 text-sm"><p className="opacity-70">{t('games.you')}</p><p className="mt-1 font-medium">{t('games.answered')}</p></div>
                <div className="rounded-md bg-white/10 p-4 text-sm"><p className="opacity-70">{t('games.partner')}</p><p className="mt-1 font-medium">{t('games.waiting')}</p></div>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm opacity-80"><Lock className="h-4 w-4" aria-hidden />{t('games.cardNote')}</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Confidentialité */}
      <section className="container-page py-10">
        <Surface tone="honey" glow="honey" className="p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t('privacy.eyebrow')}</p>
              <h2 className="text-balance text-3xl text-secondary sm:text-4xl">{t('privacy.title')}</h2>
              <p className="text-pretty text-fg-muted">{t('privacy.body')}</p>
              <Doodle name="lock" size={88} className="mt-2 text-secondary/70" />
            </div>
            <ul className="grid gap-4">
              {points.map((p) => (
                <li key={p.title} className="flex gap-4 rounded-lg bg-bg-elevated/80 p-5 shadow-card">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-sage text-success"><Check className="h-4 w-4" aria-hidden /></span>
                  <div><p className="font-medium">{p.title}</p><p className="mt-1 text-sm text-fg-muted">{p.body}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </Surface>
      </section>

      {/* Témoignage (exemple) */}
      <section className="container-page py-16 text-center">
        <Badge tone="neutral">{t('testimonial.label')}</Badge>
        <p className="mx-auto mt-5 max-w-3xl font-display-italic text-2xl leading-snug text-secondary sm:text-3xl">{t('testimonial.quote')}</p>
        <p className="mt-4 text-sm text-fg-subtle">{t('testimonial.author')}</p>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="container-page py-16">
        <SectionHeader eyebrow={t('pricing.eyebrow')} title={t('pricing.title')} hint={t('pricing.body')} className="mx-auto max-w-2xl text-center sm:block [&_h2]:text-3xl sm:[&_h2]:text-4xl" />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          <Card className="p-8">
            <p className="font-display text-2xl">{t('pricing.free.name')}</p>
            <p className="mt-2 text-fg-muted">{t('pricing.free.tagline')}</p>
            <ul className="mt-6 space-y-2.5 text-sm">{freeItems.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{f}</li>)}</ul>
          </Card>
          <Surface tone="night" glow="primary" className="p-8">
            <p className="font-display text-2xl">{t('pricing.premium.name')}</p>
            <p className="mt-3 font-display-soft text-4xl">{t('pricing.premium.monthly')}</p>
            <p className="text-sm text-night-fg/70">{t('pricing.premium.yearly')}</p>
            <ul className="mt-6 space-y-2.5 text-sm">{premiumItems.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{f}</li>)}</ul>
            <Button asChild className="mt-8 w-full" size="lg"><Link href="/inscription">{t('pricing.premium.cta')}</Link></Button>
          </Surface>
        </div>
        <p className="mt-4 text-center text-xs text-fg-subtle">{t('pricing.note')}</p>
      </section>

      {/* FAQ */}
      <section className="container-page py-16">
        <SectionHeader eyebrow={t('faq.eyebrow')} title={t('faq.title')} className="mx-auto max-w-2xl text-center sm:block [&_h2]:text-3xl" />
        <dl className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {faq.map((f) => <div key={f.q} className="rounded-lg border border-border bg-bg-elevated/80 p-6"><dt className="font-display text-lg text-secondary">{f.q}</dt><dd className="mt-2 text-sm text-fg-muted">{f.a}</dd></div>)}
        </dl>
      </section>

      {/* CTA final */}
      <section className="container-page pb-24 pt-8">
        <Surface tone="blush" glow="primary" className="p-10 text-center sm:p-14">
          <Doodle name="heart-knot" size={64} className="mx-auto text-primary" />
          <h2 className="mt-4 text-balance text-3xl text-secondary sm:text-4xl">{t('ctaBottom.title')}</h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-fg-muted">{t('ctaBottom.body')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl"><Link href="/inscription">{t('ctaBottom.cta')}</Link></Button>
            <Button asChild size="xl" variant="ghost"><Link href="/connexion">{t('ctaBottom.demo')}</Link></Button>
          </div>
        </Surface>
      </section>
    </>
  );
}

async function HeroFan() {
  const t = await getTranslations('marketing.mock');
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-md animate-bloom" aria-hidden>
      <Glow tone="blush" size={420} className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      {/* Carte agenda, inclinée à gauche */}
      <Card className="absolute left-0 top-10 w-64 -rotate-6 p-5 shadow-lift animate-float" style={{ animationDelay: '0.6s' }}>
        <p className="text-xs uppercase tracking-wider text-fg-subtle">{t('upcoming')}</p>
        <p className="mt-2 font-medium">{t('event')}</p>
        <p className="text-sm text-fg-muted">{t('eventMeta')}</p>
        <div className="mt-4 flex gap-1.5">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} className={i === 5 ? 'h-7 w-7 rounded-full bg-primary text-center text-xs leading-7 text-primary-fg' : 'h-7 w-7 rounded-full bg-bg-muted text-center text-xs leading-7 text-fg-muted'}>{i + 3}</span>)}</div>
      </Card>
      {/* Téléphone central */}
      <div className="absolute left-1/2 top-0 w-[270px] -translate-x-1/2 rounded-[40px] border border-border bg-bg-elevated p-3 shadow-lift">
        <div className="rounded-[30px] bg-bg p-5">
          <p className="text-xs text-fg-subtle">{t('date')}</p>
          <p className="mt-1 font-display-soft text-2xl text-secondary">{t('greeting')}</p>
          <div className="postcard relative mt-5 rounded-lg border border-border/60 p-4">
            <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{t('daily')}</p>
            <p className="mt-1 pr-8 font-display-italic text-lg leading-snug text-secondary">{t('dailyText')}</p>
          </div>
          <div className="mt-3 rounded-lg surface-night p-4 text-night-fg">
            <p className="text-[10px] uppercase tracking-wider text-night-fg/60">Double Secret</p>
            <p className="mt-1 font-display text-lg">{t('match')}</p>
            <p className="text-xs text-night-fg/70">{t('matchHint')}</p>
          </div>
          <div className="mt-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--primary),var(--primary-hover))] px-6 py-3 text-sm font-semibold text-primary-fg shadow-soft"><Sparkles className="h-4 w-4" aria-hidden />{t('whatNow')}</span>
          </div>
        </div>
      </div>
      {/* Carte jeu, inclinée à droite */}
      <Card tone="plum" className="absolute right-0 top-56 w-60 rotate-6 p-5 shadow-lift animate-float" style={{ animationDelay: '1.4s' }}>
        <p className="text-[10px] uppercase tracking-wider opacity-70">Dilemme</p>
        <p className="mt-2 font-display text-lg leading-snug">Montagne en hiver ou mer en été ?</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-md bg-white/15 px-2 py-2 text-center">Montagne</span><span className="rounded-md bg-primary px-2 py-2 text-center font-medium text-primary-fg">Mer</span></div>
      </Card>
      <MessageCircleHeart className="absolute -left-2 bottom-16 h-10 w-10 text-primary/60" />
      <Doodle name="garland" size={120} className="absolute -right-6 -top-8 text-honey" />
    </div>
  );
}

function Pillar({ doodle, tone, title, body, items, i }: { doodle: 'heart-knot' | 'garland' | 'notebook'; tone: 'blush' | 'honey' | 'sage'; title: string; body: string; items: string[]; i: number }) {
  return (
    <Card tone={tone} className="animate-rise p-8 hover-lift" style={{ ['--i' as string]: i }}>
      <Doodle name={doodle} size={64} className="text-secondary/80" />
      <h3 className="mt-5 text-2xl text-secondary">{title}</h3>
      <p className="mt-2 text-pretty text-sm text-fg-muted">{body}</p>
      <ul className="mt-5 flex flex-wrap gap-2">{items.map((x) => <li key={x} className="rounded-pill bg-bg-elevated/70 px-3 py-1 text-xs font-medium text-secondary">{x}</li>)}</ul>
    </Card>
  );
}

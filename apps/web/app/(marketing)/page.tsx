import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CalendarDays, Check, Sparkles } from 'lucide-react';
import { Button, Doodle, Surface } from '@couple/ui';

export default async function HomePage() {
  const t = await getTranslations('marketing');
  const steps = t.raw('whatNow.steps') as string[];
  const gamesList = t.raw('games.list') as string[];
  const points = t.raw('privacy.points') as { title: string; body: string }[];
  const faq = t.raw('faq.items') as { q: string; a: string }[];
  const freeItems = t.raw('pricing.free.items') as string[];
  const premiumItems = t.raw('pricing.premium.items') as string[];
  const pillars = [
    { no: '01', doodle: 'heart-knot' as const, title: t('pillars.love.title'), body: t('pillars.love.body'), items: t.raw('pillars.love.items') as string[] },
    { no: '02', doodle: 'garland' as const, title: t('pillars.play.title'), body: t('pillars.play.body'), items: t.raw('pillars.play.items') as string[] },
    { no: '03', doodle: 'notebook' as const, title: t('pillars.build.title'), body: t('pillars.build.body'), items: t.raw('pillars.build.items') as string[] },
  ];

  return (
    <>
      {/* Une : titre énorme, surligné au marqueur, collage scotché à droite */}
      <section className="container-page grid gap-10 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-20 lg:py-24">
        <div className="animate-rise">
          <p className="label-sc flex items-center gap-3"><Doodle name="candle" size={18} className="text-primary" />{t('hero.eyebrow')}</p>
          <h1 className="mt-5 text-balance text-[3rem] leading-[0.92] sm:text-[4.4rem] lg:text-[5.4rem]">
            {t('hero.title')} <span className="marker font-display-italic font-medium">{t('hero.titleAccent')}</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-fg-muted">{t('hero.subtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl"><Link href="/inscription">{t('hero.ctaPrimary')}</Link></Button>
            <Button asChild size="xl" variant="outline"><Link href="/connexion">{t('hero.ctaSecondary')}</Link></Button>
          </div>
          <p className="mt-4 text-sm text-fg-subtle">{t('hero.note')}</p>
        </div>
        <HeroCollage />
      </section>

      {/* Trois piliers : colonnes séparées par des filets, gros folios */}
      <section id="fonctionnalites" className="container-page py-16">
        <div className="rule-double pt-3"><p className="label-sc">{t('pillars.eyebrow')}</p><h2 className="mt-2 text-3xl sm:text-5xl">{t('pillars.title')}</h2></div>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-ink/25">
          {pillars.map((p, i) => (
            <article key={p.no} className="animate-rise md:px-8 md:first:pl-0 md:last:pr-0" style={{ ['--i' as string]: i }}>
              <div className="flex items-end justify-between"><span className="font-display text-6xl font-light leading-none text-primary">{p.no}</span><Doodle name={p.doodle} size={56} className="text-ink/80" /></div>
              <h3 className="mt-4 text-2xl">{p.title}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-fg-muted">{p.body}</p>
              <ul className="mt-5 space-y-1.5 border-t border-ink/25 pt-4 text-sm">{p.items.map((x) => <li key={x} className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-primary" aria-hidden />{x}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      {/* L'affiche « On fait quoi ? » */}
      <section className="container-page py-10">
        <Surface tone="night" className="p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-[1fr_0.85fr] md:items-center">
            <div>
              <p className="label-sc text-paper/70">{t('whatNow.eyebrow')}</p>
              <h2 className="mt-3 text-[3rem] leading-[0.95] sm:text-[4.5rem]">{t('whatNow.title')}</h2>
              <p className="mt-5 max-w-lg text-pretty text-paper/75">{t('whatNow.body')}</p>
              <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">{steps.map((s, i) => <li key={s} className="flex items-start gap-3"><span className="font-display text-primary">{String(i + 1).padStart(2, '0')}</span>{s}</li>)}</ul>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-md border-2 border-paper/70 p-5">
              <p className="label-sc text-paper/60">{t('whatNow.title')}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {['Ce soir', 'À deux', 'Petit budget', 'Romantique'].map((x, i) => <span key={x} className={i === 3 ? 'border-2 border-primary bg-primary px-3 py-2 text-center font-semibold text-primary-fg' : 'border-2 border-paper/40 px-3 py-2 text-center'}>{x}</span>)}
              </div>
              <div className="mt-4 divide-y divide-paper/20 border-y border-paper/20">
                {[['Dîner aux chandelles à la maison', '2 h · 15 €'], ['Soirée spa improvisée', '1 h 30 · gratuit']].map(([a, b]) => <div key={a} className="flex items-center justify-between py-2 text-sm"><span>{a}</span><span className="text-paper/60">{b}</span></div>)}
              </div>
              <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-paper bg-paper px-5 py-3 text-sm font-semibold text-ink"><CalendarDays className="h-4 w-4" aria-hidden />Ajouter à l’agenda</span>
            </div>
          </div>
        </Surface>
      </section>

      {/* Jeux : index numéroté + carte encre */}
      <section id="jeux" className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <div className="rule-double pt-3"><p className="label-sc">{t('games.eyebrow')}</p><h2 className="mt-2 text-3xl sm:text-5xl">{t('games.title')}</h2></div>
            <p className="mt-4 text-pretty text-fg-muted">{t('games.body')}</p>
            <ol className="mt-6 divide-y divide-ink/25 border-y border-ink/25">{gamesList.map((g, i) => <li key={g} className="flex items-baseline gap-4 py-2.5 font-display text-xl"><span className="w-8 text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>{g}</li>)}</ol>
          </div>
          <div className="tape rounded-md border-2 border-ink bg-ink p-8 text-paper shadow-lift md:rotate-1">
            <p className="label-sc text-paper/60">{t('games.cardLabel')}</p>
            <p className="mt-4 text-2xl leading-tight sm:text-3xl">{t('games.cardQuestion')}</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="border-2 border-paper/40 p-4 text-sm"><p className="text-paper/60">{t('games.you')}</p><p className="mt-1 font-semibold">{t('games.answered')}</p></div>
              <div className="border-2 border-dashed border-paper/40 p-4 text-sm"><p className="text-paper/60">{t('games.partner')}</p><p className="mt-1 font-semibold">{t('games.waiting')}</p></div>
            </div>
            <p className="mt-6 text-sm text-paper/70">{t('games.cardNote')}</p>
          </div>
        </div>
      </section>

      {/* Confidentialité : encadré jaune */}
      <section className="container-page py-10">
        <Surface tone="honey" className="p-8 sm:p-12">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <p className="label-sc">{t('privacy.eyebrow')}</p>
              <h2 className="mt-2 text-balance text-3xl sm:text-5xl">{t('privacy.title')}</h2>
              <p className="mt-4 text-pretty text-ink/75">{t('privacy.body')}</p>
              <Doodle name="lock" size={88} className="mt-4 text-ink" />
            </div>
            <ol className="divide-y divide-ink/30 border-y border-ink/30">
              {points.map((p, i) => (
                <li key={p.title} className="flex gap-5 py-5">
                  <span className="font-display text-3xl font-light leading-none text-primary">{String(i + 1).padStart(2, '0')}</span>
                  <div><p className="font-display text-xl">{p.title}</p><p className="mt-1 text-sm text-ink/75">{p.body}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </Surface>
      </section>

      {/* Citation (exemple) */}
      <section className="container-page py-16 text-center">
        <span className="stamp text-primary">{t('testimonial.label')}</span>
        <p className="mx-auto mt-6 max-w-3xl font-display-italic text-3xl leading-tight sm:text-4xl">{t('testimonial.quote')}</p>
        <p className="label-sc mt-5">{t('testimonial.author')}</p>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="container-page py-16">
        <div className="rule-double pt-3 text-center"><p className="label-sc">{t('pricing.eyebrow')}</p><h2 className="mt-2 text-3xl sm:text-5xl">{t('pricing.title')}</h2><p className="mx-auto mt-3 max-w-xl text-pretty text-fg-muted">{t('pricing.body')}</p></div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          <div className="rounded-md border-2 border-ink p-8">
            <p className="font-display text-3xl">{t('pricing.free.name')}</p>
            <p className="mt-1 text-fg-muted">{t('pricing.free.tagline')}</p>
            <ul className="mt-6 space-y-2.5 border-t border-ink/25 pt-5 text-sm">{freeItems.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{f}</li>)}</ul>
          </div>
          <Surface tone="night" className="p-8">
            <span className="stamp absolute -right-3 -top-3 bg-marker text-ink">Pour deux</span>
            <p className="font-display text-3xl">{t('pricing.premium.name')}</p>
            <p className="mt-3 font-display-soft text-5xl">{t('pricing.premium.monthly')}</p>
            <p className="text-sm text-paper/70">{t('pricing.premium.yearly')}</p>
            <ul className="mt-6 space-y-2.5 border-t border-paper/25 pt-5 text-sm">{premiumItems.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{f}</li>)}</ul>
            <Button asChild className="mt-8 w-full" size="lg"><Link href="/inscription">{t('pricing.premium.cta')}</Link></Button>
          </Surface>
        </div>
        <p className="mt-4 text-center text-xs text-fg-subtle">{t('pricing.note')}</p>
      </section>

      {/* FAQ en liste à filets */}
      <section className="container-page py-16">
        <div className="rule-double pt-3"><p className="label-sc">{t('faq.eyebrow')}</p><h2 className="mt-2 text-3xl sm:text-4xl">{t('faq.title')}</h2></div>
        <dl className="mt-8 divide-y divide-ink/25 border-b border-ink/25">
          {faq.map((f, i) => <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[3rem_1fr_1.4fr]"><span className="font-display text-sm text-primary">{String(i + 1).padStart(2, '0')}</span><dt className="font-display text-xl">{f.q}</dt><dd className="text-sm text-fg-muted">{f.a}</dd></div>)}
        </dl>
      </section>

      {/* Dernière page */}
      <section className="container-page pb-24 pt-8">
        <Surface tone="blush" className="p-10 text-center sm:p-14">
          <Doodle name="heart-knot" size={64} className="mx-auto text-primary" />
          <h2 className="mt-4 text-balance text-3xl sm:text-5xl">{t('ctaBottom.title')}</h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-fg-muted">{t('ctaBottom.body')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl"><Link href="/inscription">{t('ctaBottom.cta')}</Link></Button>
            <Button asChild size="xl" variant="outline"><Link href="/connexion">{t('ctaBottom.demo')}</Link></Button>
          </div>
        </Surface>
      </section>
    </>
  );
}

async function HeroCollage() {
  const t = await getTranslations('marketing.mock');
  return (
    <div className="relative mx-auto h-[540px] w-full max-w-md animate-bloom" aria-hidden>
      {/* Agenda, scotché, penché à gauche */}
      <div className="tape absolute -left-3 top-10 w-56 -rotate-6 rounded-md border-2 border-ink bg-bg-elevated p-4 shadow-hard">
        <p className="label-sc">{t('upcoming')}</p>
        <p className="mt-2 font-display text-base leading-tight">{t('event')}</p>
        <p className="text-sm text-fg-muted">{t('eventMeta')}</p>
        <div className="mt-4 flex gap-1">{[3, 4, 5, 6, 7, 8, 9].map((d, i) => <span key={d} className={i === 5 ? 'h-7 w-7 border-2 border-ink bg-primary text-center text-xs font-semibold leading-6 text-primary-fg' : 'h-7 w-7 border border-ink/30 text-center text-xs leading-7'}>{d}</span>)}</div>
      </div>
      {/* Téléphone */}
      <div className="absolute left-1/2 top-0 w-[270px] -translate-x-1/2 rounded-[28px] border-2 border-ink bg-ink p-2.5 shadow-lift">
        <div className="rounded-[20px] bg-bg p-5">
          <p className="label-sc">{t('date')}</p>
          <p className="mt-1 font-display text-2xl leading-none">{t('greeting')}</p>
          <div className="postcard relative mt-5 rounded-sm border border-ink/40 p-4">
            <p className="label-sc">{t('daily')}</p>
            <p className="mt-1 pr-8 font-display text-lg leading-tight">{t('dailyText')}</p>
          </div>
          <div className="mt-3 rounded-sm border-2 border-ink bg-ink p-4 text-paper">
            <p className="label-sc text-paper/60">Double Secret</p>
            <p className="mt-1 font-display text-lg leading-tight">{t('match')}</p>
            <p className="text-xs text-paper/70">{t('matchHint')}</p>
          </div>
          <div className="mt-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-primary px-5 py-3 text-sm font-semibold text-primary-fg shadow-hard"><Sparkles className="h-4 w-4" aria-hidden />{t('whatNow')}</span>
          </div>
        </div>
      </div>
      {/* Dilemme, penché à droite */}
      <div className="tape absolute right-0 top-64 w-56 rotate-6 rounded-md border-2 border-ink bg-marker p-5 text-ink shadow-hard">
        <p className="label-sc">Dilemme</p>
        <p className="mt-2 font-display text-lg leading-tight">Montagne en hiver ou mer en été ?</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold"><span className="border-2 border-ink px-2 py-2 text-center">Montagne</span><span className="border-2 border-ink bg-ink px-2 py-2 text-center text-paper">Mer</span></div>
      </div>
      <Doodle name="garland" size={120} className="absolute -right-6 -top-10 text-primary" />
      <Doodle name="cup" size={64} className="absolute -left-2 bottom-10 text-ink/70" />
    </div>
  );
}

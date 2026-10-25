import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CalendarDays, Gamepad2, Gift, Lock, MessageCircleHeart, Sparkles } from 'lucide-react';
import { Blob, Button, Card } from '@couple/ui';

export default async function HomePage() {
  const t = await getTranslations('marketing');
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 opacity-70 blur-sm" aria-hidden><Blob size={420} /></div>
        <div className="container-page grid gap-10 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-28">
          <div className="space-y-6 animate-fade-up">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{t('hero.eyebrow')}</p>
            <h1 className="text-4xl leading-[1.08] text-secondary sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
            <p className="max-w-xl text-lg text-fg-muted">{t('hero.subtitle')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/inscription">{t('hero.ctaPrimary')}</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="#fonctionnalites">{t('hero.ctaSecondary')}</Link></Button>
            </div>
            <p className="text-sm text-fg-subtle">{t('hero.note')}</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <PhoneMock />
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="container-page py-20">
        <h2 className="text-center text-3xl text-secondary sm:text-4xl">{t('pillars.title')}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Pillar icon={<MessageCircleHeart className="h-6 w-6" />} title={t('pillars.love.title')} body={t('pillars.love.body')} tone="blush" />
          <Pillar icon={<Gamepad2 className="h-6 w-6" />} title={t('pillars.play.title')} body={t('pillars.play.body')} tone="champagne" />
          <Pillar icon={<CalendarDays className="h-6 w-6" />} title={t('pillars.build.title')} body={t('pillars.build.body')} tone="plum" />
        </div>
      </section>

      <section id="jeux" className="bg-bg-muted/60 py-20">
        <div className="container-page grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h2 className="text-3xl text-secondary sm:text-4xl">Des jeux pensés pour deux</h2>
            <p className="text-fg-muted">Réponses secrètes révélées en même temps, dilemmes, « Lequel de nous deux ? », défis à relever ensemble, quiz de vos souvenirs. Chaque jeu est une excuse pour parler, rire et se surprendre, pas pour fixer un écran.</p>
            <ul className="grid gap-3 text-sm">
              {['Réponses secrètes', 'Qui connaît le mieux l’autre ?', 'Dilemmes', 'Lequel de nous deux ?', 'Défis à deux', 'Confessions', 'Nos souvenirs'].map((g) => (
                <li key={g} className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden />{g}</li>
              ))}
            </ul>
          </div>
          <Card tone="plum" className="p-8">
            <p className="text-sm uppercase tracking-widest opacity-80">Réponses secrètes</p>
            <p className="mt-4 font-display text-2xl">« Quel est le moment de notre histoire que tu rejouerais volontiers ? »</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-white/10 p-4 text-sm"><p className="opacity-70">Vous</p><p className="mt-1 font-medium">Répondu ✓</p></div>
              <div className="rounded-md bg-white/10 p-4 text-sm"><p className="opacity-70">Votre partenaire</p><p className="mt-1 font-medium">En attente…</p></div>
            </div>
            <p className="mt-6 text-sm opacity-80">Les réponses se dévoilent en même temps, jamais avant.</p>
          </Card>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="flex justify-center"><Lock className="h-24 w-24 text-secondary" strokeWidth={1.25} aria-hidden /></div>
          <div className="space-y-4">
            <h2 className="text-3xl text-secondary sm:text-4xl">{t('privacy.title')}</h2>
            <p className="text-fg-muted">{t('privacy.body')}</p>
          </div>
        </div>
      </section>

      <section id="tarifs" className="bg-bg-muted/60 py-20">
        <div className="container-page">
          <h2 className="text-center text-3xl text-secondary sm:text-4xl">Un seul abonnement pour deux</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-fg-muted">Commencez gratuitement. Passez à Premium Couple quand vous le souhaitez : un paiement couvre les deux partenaires.</p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            <Card className="p-8">
              <p className="font-display text-2xl">Gratuit</p>
              <p className="mt-2 text-fg-muted">Pour commencer à deux.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {['Agenda partagé', 'Listes et tâches', 'Question du jour', 'Quelques jeux et défis', 'Souvenirs (limités)', 'Assistant IA (quota limité)'].map((f) => <li key={f}>· {f}</li>)}
              </ul>
            </Card>
            <Card tone="champagne" className="p-8">
              <p className="font-display text-2xl">Premium Couple</p>
              <p className="mt-2 opacity-80">Prix indicatifs : 4,99 € / mois ou 29,99 € / an.</p>
              <ul className="mt-6 space-y-2 text-sm">
                {['Tous les jeux et toutes les catégories', 'Double Secret complet', 'Expériences et surprises personnalisées', 'Générateur de rendez-vous', 'Assistant IA élargi', 'Souvenirs interactifs et projets avancés'].map((f) => <li key={f}>· {f}</li>)}
              </ul>
              <Button asChild className="mt-8 w-full" variant="secondary"><Link href="/inscription">Commencer</Link></Button>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-page py-20 text-center">
        <h2 className="text-3xl text-secondary sm:text-4xl">{t('ctaBottom.title')}</h2>
        <p className="mx-auto mt-3 max-w-md text-fg-muted">{t('ctaBottom.body')}</p>
        <Button asChild size="lg" className="mt-8"><Link href="/inscription">{t('ctaBottom.cta')}</Link></Button>
      </section>
    </>
  );
}

function Pillar({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: 'blush' | 'champagne' | 'plum' }) {
  return (
    <Card tone={tone} className="p-8">
      <div className="inline-flex rounded-full bg-white/40 p-3">{icon}</div>
      <h3 className="mt-5 text-2xl">{title}</h3>
      <p className="mt-2 text-sm opacity-85">{body}</p>
    </Card>
  );
}

function PhoneMock() {
  return (
    <div className="relative rounded-[36px] border border-border bg-bg-elevated p-3 shadow-soft">
      <div className="rounded-[28px] bg-bg p-5">
        <p className="text-xs text-fg-subtle">Vendredi 7 novembre</p>
        <p className="mt-1 font-display text-2xl text-secondary">Bonsoir Camille</p>
        <Card className="mt-5 p-4">
          <p className="text-xs uppercase tracking-wider text-fg-subtle">À venir</p>
          <p className="mt-1 text-sm font-medium">Dîner chez Nadia · 20 h</p>
          <p className="text-sm text-fg-muted">Samedi · Partagé</p>
        </Card>
        <Card tone="blush" className="mt-3 p-4">
          <p className="text-xs uppercase tracking-wider text-secondary/70">Question du jour</p>
          <p className="mt-1 font-display text-lg text-secondary">Quelle habitude de l&apos;autre te fait sourire ?</p>
        </Card>
        <div className="mt-5 flex justify-center">
          <span className="rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-primary-fg shadow-soft"><Gift className="mr-2 inline h-4 w-4" aria-hidden />On fait quoi ?</span>
        </div>
      </div>
    </div>
  );
}

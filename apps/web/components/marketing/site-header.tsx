'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Logo } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

export function SiteHeader() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-bg">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="Entre Nous — accueil"><Logo /></Link>
        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Navigation principale">
          {[['/#fonctionnalites', t('features')], ['/#jeux', t('games')], ['/#tarifs', t('pricing')]].map(([href, label]) => (
            <Link key={href} href={href!} className="label-sc px-3 py-1.5 text-fg hover:text-primary">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm"><Link href="/accueil">{t('home')}</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link href="/connexion">{t('login')}</Link></Button>
              <Button asChild size="sm"><Link href="/inscription">{t('signup')}</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

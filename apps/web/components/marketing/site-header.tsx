'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Logo } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

export function SiteHeader() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="Entre Nous — accueil">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-fg-muted md:flex" aria-label="Navigation principale">
          <Link href="/#fonctionnalites" className="hover:text-fg">{t('features')}</Link>
          <Link href="/#jeux" className="hover:text-fg">{t('games')}</Link>
          <Link href="/#tarifs" className="hover:text-fg">{t('pricing')}</Link>
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

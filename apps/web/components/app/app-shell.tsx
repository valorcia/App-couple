'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, Sparkles } from 'lucide-react';
import { Avatar, Logo, cn } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { DemoBanner } from '@/components/app/demo-banner';

const NAV = [
  { href: '/accueil', key: 'home' },
  { href: '/agenda', key: 'calendar' },
  { href: '/jouer', key: 'play' },
  { href: '/quotidien', key: 'daily' },
  { href: '/couple', key: 'us' },
  { href: '/profil', key: 'more' },
] as const;
/** Barre mobile : quatre entrées + le bouton central « On fait quoi ? ». Quotidien et Nous sont dans « Plus ». */
const MOBILE_LEFT = [NAV[0], NAV[1]] as const;
const MOBILE_RIGHT = [NAV[2], NAV[5]] as const;

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href) || (href === '/quotidien' && pathname.startsWith('/projets'));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="hidden w-[16.5rem] shrink-0 flex-col border-r-2 border-ink/80 px-6 py-6 md:flex">
          <Link href="/accueil" aria-label="Accueil" className="rule-double pt-3"><Logo /></Link>
          <p className="label-sc mt-8">Sommaire</p>
          <nav className="mt-1 flex flex-col" aria-label="Application">
            {NAV.map(({ href, key }, i) => {
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} className="nav-item" aria-current={active ? 'page' : undefined}>
                  <span className="nav-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nav-label">{t(key)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-4">
            <NotificationBell className="w-full justify-start gap-3 px-1 text-[15px] font-medium" />
            <Link href="/accueil#on-fait-quoi" className="flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-primary text-[15px] font-semibold text-primary-fg shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              <Sparkles className="h-4 w-4" aria-hidden />{td('whatNow')}
            </Link>
            {user && !user.entitlements.includes('premium') ? <Link href="/premium" className="block rounded-sm border-2 border-ink bg-marker px-4 py-2 text-center text-sm font-semibold text-ink shadow-card">Premium Couple</Link> : null}
            {user ? (
              <div className="rule-strong flex items-center gap-3 pt-4">
                <Avatar name={user.profile.displayName} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.profile.displayName}</p>
                  <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                </div>
                <button onClick={onLogout} className="rounded-sm border border-transparent p-2 text-fg-muted hover:border-ink hover:text-fg" aria-label={tc('logout')}><LogOut className="h-4 w-4" /></button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b-2 border-ink/80 px-4 md:hidden">
            <Link href="/accueil" aria-label="Accueil"><Logo size={24} /></Link>
            <div className="flex items-center gap-1"><NotificationBell />{user ? <Link href="/profil" aria-label="Profil"><Avatar name={user.profile.displayName} size={32} /></Link> : null}</div>
          </header>
          <main className="flex-1 pb-28 md:pb-0">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-bg md:hidden" aria-label="Navigation mobile" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <ul className="grid grid-cols-5 items-end">
              {MOBILE_LEFT.map((item, i) => <MobileItem key={item.href} no={i + 1} item={item} active={isActive(pathname, item.href)} label={t(item.key)} />)}
              <li className="flex justify-center">
                <Link href="/accueil#on-fait-quoi" aria-label={td('whatNow')} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-md border-2 border-ink bg-primary text-primary-fg shadow-hard">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </Link>
              </li>
              {MOBILE_RIGHT.map((item, i) => <MobileItem key={item.href} no={i === 0 ? 3 : 6} item={item} active={isActive(pathname, item.href)} label={t(item.key)} />)}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function MobileItem({ item, active, label, no }: { item: (typeof NAV)[number]; active: boolean; label: string; no: number }) {
  return (
    <li>
      <Link href={item.href} className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', active ? 'text-primary' : 'text-fg-muted')} aria-current={active ? 'page' : undefined}>
        <span className="font-display text-base tabular-nums">{String(no).padStart(2, '0')}</span>
        <span className={cn(active && 'marker')}>{label}</span>
      </Link>
    </li>
  );
}

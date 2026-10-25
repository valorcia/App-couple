'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Gamepad2, Home, ListChecks, LogOut, MoreHorizontal, Sparkles, Users } from 'lucide-react';
import { Avatar, Logo, cn } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { DemoBanner } from '@/components/app/demo-banner';

const NAV = [
  { href: '/accueil', key: 'home', icon: Home },
  { href: '/agenda', key: 'calendar', icon: CalendarDays },
  { href: '/jouer', key: 'play', icon: Gamepad2 },
  { href: '/quotidien', key: 'daily', icon: ListChecks },
  { href: '/couple', key: 'us', icon: Users },
  { href: '/profil', key: 'more', icon: MoreHorizontal },
] as const;
/** Barre mobile : 4 entrées + le bouton central « On fait quoi ? ». Quotidien et Nous sont dans « Plus ». */
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
        <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-border/60 bg-bg-blush/35 px-5 py-6 md:flex">
          <Link href="/accueil" aria-label="Accueil" className="px-3"><Logo /></Link>
          <nav className="mt-10 flex flex-col gap-1" aria-label="Application">
            {NAV.map(({ href, key, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} className="nav-item" aria-current={active ? 'page' : undefined}>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors', active ? 'bg-primary/15 text-primary' : 'bg-transparent')}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  {t(key)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3">
            <NotificationBell className="w-full justify-start gap-3 rounded-pill px-4 text-[15px] font-medium" />
            <Link href="/accueil#on-fait-quoi" className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-[linear-gradient(135deg,var(--primary),var(--primary-hover))] text-[15px] font-semibold text-primary-fg shadow-soft transition-transform hover:-translate-y-0.5">
              <Sparkles className="h-4 w-4" aria-hidden />{td('whatNow')}
            </Link>
            {user && !user.entitlements.includes('premium') ? <Link href="/premium" className="block rounded-pill bg-bg-honey px-4 py-2 text-center text-sm font-medium text-accent-fg hover:brightness-[0.98]">Premium Couple</Link> : null}
            {user ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-bg-elevated/80 p-3">
                <Avatar name={user.profile.displayName} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.profile.displayName}</p>
                  <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                </div>
                <button onClick={onLogout} className="rounded-full p-2 text-fg-muted hover:bg-bg-muted" aria-label={tc('logout')}><LogOut className="h-4 w-4" /></button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="flex h-14 items-center justify-between px-4 md:hidden">
            <Link href="/accueil" aria-label="Accueil"><Logo size={24} /></Link>
            <div className="flex items-center gap-1"><NotificationBell />{user ? <Link href="/profil" aria-label="Profil"><Avatar name={user.profile.displayName} size={32} /></Link> : null}</div>
          </header>
          <main className="flex-1 pb-28 md:pb-0">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg-elevated/92 backdrop-blur md:hidden" aria-label="Navigation mobile" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <ul className="grid grid-cols-5 items-end">
              {MOBILE_LEFT.map((item) => <MobileItem key={item.href} item={item} active={isActive(pathname, item.href)} label={t(item.key)} />)}
              <li className="flex justify-center">
                <Link href="/accueil#on-fait-quoi" aria-label={td('whatNow')} className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-hover))] text-primary-fg shadow-lift ring-4 ring-bg">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </Link>
              </li>
              {MOBILE_RIGHT.map((item) => <MobileItem key={item.href} item={item} active={isActive(pathname, item.href)} label={t(item.key)} />)}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function MobileItem({ item, active, label }: { item: (typeof NAV)[number]; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <li>
      <Link href={item.href} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-primary' : 'text-fg-muted')} aria-current={active ? 'page' : undefined}>
        <Icon className="h-5 w-5" aria-hidden />
        {label}
      </Link>
    </li>
  );
}

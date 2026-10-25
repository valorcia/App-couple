'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Gamepad2, Home, LogOut, MoreHorizontal, Sparkles, Users } from 'lucide-react';
import { Avatar, Button, Logo, cn } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

const NAV = [
  { href: '/accueil', key: 'home', icon: Home },
  { href: '/agenda', key: 'calendar', icon: CalendarDays },
  { href: '/jouer', key: 'play', icon: Gamepad2 },
  { href: '/couple', key: 'us', icon: Users },
  { href: '/profil', key: 'more', icon: MoreHorizontal },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/60 p-6 md:flex">
        <Link href="/accueil" aria-label="Accueil"><Logo /></Link>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Application">
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-bg-blush text-secondary' : 'text-fg-muted hover:bg-bg-muted hover:text-fg')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <Button asChild className="w-full"><Link href="/accueil#on-fait-quoi"><Sparkles className="h-4 w-4" aria-hidden />On fait quoi ?</Link></Button>
          {user ? (
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
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
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <Link href="/accueil" aria-label="Accueil"><Logo size={24} /></Link>
          {user ? <Avatar name={user.profile.displayName} size={32} /> : null}
        </header>
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 backdrop-blur md:hidden" aria-label="Navigation mobile" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <ul className="grid grid-cols-5">
            {NAV.map(({ href, key, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-primary' : 'text-fg-muted')} aria-current={active ? 'page' : undefined}>
                    <Icon className="h-5 w-5" aria-hidden />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

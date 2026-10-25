'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Flag, LogOut, Package, ScrollText, Settings, Users } from 'lucide-react';
import { Badge, Logo, Skeleton, cn } from '@couple/ui';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: Activity },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/produits', label: 'Produits & prix', icon: Package },
  { href: '/flags', label: 'Feature flags', icon: Flag },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
  { href: '/audit', label: 'Journal d’audit', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  React.useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPPORT')) router.replace('/connexion');
  }, [user, isLoading, router]);
  if (isLoading || !user) return <div className="p-10"><Skeleton className="h-8 w-40" /></div>;
  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-elevated/60 p-6">
        <Logo />
        <Badge tone="champagne" className="mt-2 w-fit">Administration</Badge>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium', pathname.startsWith(href) ? 'bg-bg-blush text-secondary' : 'text-fg-muted hover:bg-bg-muted')}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between rounded-md border border-border p-3 text-sm">
          <div className="min-w-0"><p className="truncate font-medium">{user.profile.displayName}</p><p className="text-xs text-fg-subtle">{user.role}</p></div>
          <button onClick={async () => { await logout(); router.replace('/connexion'); }} aria-label="Se déconnecter" className="rounded-full p-2 hover:bg-bg-muted"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

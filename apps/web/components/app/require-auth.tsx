'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@couple/ui';
import { useAuth } from '@/lib/auth-provider';

/**
 * Garde côté client : redirige vers la connexion si non authentifié, vers la vérification
 * e-mail si nécessaire, et vers l'association du couple si aucun couple actif (sauf pages autorisées).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (user === null) {
      router.replace(`/connexion?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !user.emailVerified && pathname !== '/verifier-email') {
      router.replace('/verifier-email');
      return;
    }
    const coupleActive = user?.couple?.status === 'ACTIVE';
    const allowedWithoutCouple = ['/couple', '/rejoindre', '/profil'];
    if (user && !coupleActive && !allowedWithoutCouple.some((p) => pathname.startsWith(p))) {
      router.replace('/couple');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="container-page space-y-4 py-10" aria-busy>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }
  return <>{children}</>;
}

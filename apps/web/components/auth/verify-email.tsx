'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert, Button } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { AuthCard } from './auth-card';

export function VerifyEmail() {
  const t = useTranslations('auth.verify');
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const { user, refetch } = useAuth();
  const [state, setState] = React.useState<'idle' | 'verifying' | 'success' | 'invalid' | 'resent'>(token ? 'verifying' : 'idle');

  // Références stables : l'effet ne doit pas être annulé quand le contexte d'auth se met à jour.
  const latest = React.useRef({ refetch, router });
  latest.current = { refetch, router };
  const verifiedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!token || verifiedRef.current === token) return;
    verifiedRef.current = token;
    api
      .post('/auth/verify-email', { token }, { auth: false })
      .then(async () => {
        setState('success');
        await latest.current.refetch();
        // RequireAuth redirige vers la connexion (avec retour) si aucune session n'est restaurée.
        setTimeout(() => latest.current.router.replace('/couple'), 1200);
      })
      .catch(() => setState('invalid'));
  }, [token]);

  const resend = async () => {
    await api.post('/auth/resend-verification');
    setState('resent');
  };

  if (token) {
    return (
      <AuthCard title={t('title')}>
        {state === 'verifying' ? <p className="text-fg-muted">{t('verifying')}</p> : null}
        {state === 'success' ? <Alert tone="success">{t('success')}</Alert> : null}
        {state === 'invalid' ? (
          <>
            <Alert tone="danger">{t('invalid')}</Alert>
            <Button asChild variant="outline" className="w-full"><Link href="/connexion">Se connecter</Link></Button>
          </>
        ) : null}
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('title')}>
      <p className="text-fg-muted">{t('body', { email: user?.email ?? '…' })}</p>
      {state === 'resent' ? <Alert tone="success">{t('resent')}</Alert> : null}
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={resend} disabled={!user || state === 'resent'}>{t('resend')}</Button>
        {user?.emailVerified ? <Button asChild><Link href="/couple">Continuer</Link></Button> : null}
      </div>
    </AuthCard>
  );
}

'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { MeDto } from '@couple/types';
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
  const qc = useQueryClient();
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
      .then(() => {
        setState('success');
        // Patch immédiat du cache si /me est déjà chargé (évite un aller-retour vers cet écran).
        qc.setQueryData<MeDto | undefined>(['me'], (old) => (old ? { ...old, emailVerified: true } : old));
      })
      .catch(() => setState('invalid'));
  }, [token, qc]);

  // Redirection déterministe : on attend que le profil chargé soit réellement vérifié. Si /me a été
  // chargé avant la fin de la vérification (réponse périmée), on le recharge (3 tentatives max).
  const retries = React.useRef(0);
  const verified = user?.emailVerified ?? null;
  React.useEffect(() => {
    if (state !== 'success' || verified === null) return;
    if (verified) {
      const t = setTimeout(() => latest.current.router.replace('/couple'), 900);
      return () => clearTimeout(t);
    }
    if (retries.current >= 3) return;
    retries.current += 1;
    const t = setTimeout(() => void latest.current.refetch(), 400);
    return () => clearTimeout(t);
  }, [state, verified]);

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

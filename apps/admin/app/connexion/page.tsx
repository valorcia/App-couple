'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AuthResponseDto } from '@couple/types';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Logo } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setSession, logout } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.post<AuthResponseDto>('/auth/login', { email, password }, { auth: false });
      if (res.user.role !== 'ADMIN' && res.user.role !== 'SUPPORT') {
        // Session ouverte côté API : on la referme immédiatement.
        setSession(res);
        await logout();
        setError('Ce compte ne dispose pas des droits d’administration.');
        return;
      }
      setSession(res);
      router.replace('/tableau-de-bord');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader><Logo /><CardTitle className="mt-4">Administration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Field label="E-mail" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
            <Field label="Mot de passe" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
            <Button type="submit" className="w-full" loading={pending}>Se connecter</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

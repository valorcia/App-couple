'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Copy, RefreshCw, UserPlus, KeyRound } from 'lucide-react';
import type { CoupleDto, InvitationDto } from '@couple/types';
import { Alert, Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogTrigger, Field, Input } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { PageHeader } from '@/components/app/page-header';
import { JoinCouple } from './join-couple';

export function CoupleSpace() {
  const { user } = useAuth();
  // Le code en clair n'existe qu'au moment de sa création : on le conserve en mémoire le temps de l'afficher.
  const [fresh, setFresh] = React.useState<InvitationDto | null>(null);
  if (!user) return null;
  const couple = user.couple;
  if (!couple) return <Setup onInvitationCreated={setFresh} />;
  if (couple.status === 'PENDING') return <WaitingForPartner couple={couple} fresh={fresh} onRenewed={setFresh} />;
  return <LinkedCouple couple={couple} />;
}

function Setup({ onInvitationCreated }: { onInvitationCreated: (inv: InvitationDto) => void }) {
  const t = useTranslations('couple');
  const [mode, setMode] = React.useState<'choose' | 'invite' | 'join'>('choose');
  return (
    <div className="container-page max-w-xl space-y-8 py-10">
      <PageHeader title={t('setup.title')} subtitle={t('setup.subtitle')} />
      {mode === 'choose' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => setMode('invite')} className="flex flex-col items-start gap-3 rounded-lg border border-border bg-bg-elevated p-6 text-left transition-colors hover:bg-bg-blush">
            <UserPlus className="h-7 w-7 text-primary" aria-hidden />
            <span className="font-display text-xl">{t('setup.invite')}</span>
          </button>
          <button onClick={() => setMode('join')} className="flex flex-col items-start gap-3 rounded-lg border border-border bg-bg-elevated p-6 text-left transition-colors hover:bg-bg-blush">
            <KeyRound className="h-7 w-7 text-secondary" aria-hidden />
            <span className="font-display text-xl">{t('setup.join')}</span>
          </button>
        </div>
      ) : null}
      {mode === 'invite' ? <CreateInvitation onBack={() => setMode('choose')} onCreated={onInvitationCreated} /> : null}
      {mode === 'join' ? (
        <Card><CardHeader><CardTitle>{t('join.title')}</CardTitle></CardHeader><CardContent><JoinCouple onBack={() => setMode('choose')} /></CardContent></Card>
      ) : null}
    </div>
  );
}

function CreateInvitation({ onBack, onCreated }: { onBack: () => void; onCreated: (inv: InvitationDto) => void }) {
  const t = useTranslations('couple.invite');
  const tc = useTranslations('common');
  const { refetch } = useAuth();
  const toMessage = useApiErrorMessage();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const create = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post<CoupleDto>('/couples', email ? { targetEmail: email } : {});
      if (res.pendingInvitation) onCreated(res.pendingInvitation);
      await refetch(); // → le couple passe en PENDING, l'écran d'attente affiche le code conservé.
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t('title')}</CardTitle><CardDescription>{t('body')}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Field label={t('emailOptional')} htmlFor="targetEmail">
          <Input id="targetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>{tc('back')}</Button>
          <Button className="flex-1" size="lg" loading={pending} onClick={create}>{t('generate')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InvitationCode({ invitation }: { invitation: InvitationDto }) {
  const t = useTranslations('couple.invite');
  const tc = useTranslations('common');
  const [copied, setCopied] = React.useState(false);
  const code = invitation.code ?? '';
  const link = typeof window !== 'undefined' ? `${window.location.origin}/rejoindre?code=${code}` : '';
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  };
  return (
    <Card tone="blush" className="animate-fade-up">
      <CardHeader><CardTitle className="text-secondary">{t('title')}</CardTitle><CardDescription className="text-secondary/80">{t('body')}</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg bg-bg-elevated p-5">
          <span className="font-display text-4xl tracking-[0.3em] text-secondary" aria-label={`Code ${code.split('').join(' ')}`}>{code}</span>
          <Button variant="outline" size="sm" onClick={() => copy(code)} aria-live="polite">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? tc('copied') : tc('copy')}</Button>
        </div>
        {link ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary/70">{t('shareLink')}</p>
            <button onClick={() => copy(link)} className="w-full truncate rounded-md bg-bg-elevated px-3 py-2 text-left text-sm text-fg-muted hover:text-fg">{link}</button>
          </div>
        ) : null}
        <p className="text-sm text-secondary/80">{t('expires', { date: new Intl.DateTimeFormat('fr', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(invitation.expiresAt)) })}</p>
      </CardContent>
    </Card>
  );
}

function WaitingForPartner({ couple, fresh, onRenewed }: { couple: CoupleDto; fresh: InvitationDto | null; onRenewed: (inv: InvitationDto) => void }) {
  const t = useTranslations('couple');
  const { refetch } = useAuth();
  const toMessage = useApiErrorMessage();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Rafraîchit périodiquement pour détecter l'arrivée du partenaire.
  React.useEffect(() => {
    const id = setInterval(() => void refetch(), 8000);
    return () => clearInterval(id);
  }, [refetch]);

  const regenerate = async () => {
    setPending(true);
    setError(null);
    try {
      onRenewed(await api.post<InvitationDto>('/couples/invitations', {}));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="container-page max-w-xl space-y-6 py-10">
      <PageHeader title={t('invite.waiting')} />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {fresh?.code ? (
        <InvitationCode invitation={fresh} />
      ) : (
        <Card>
          <CardHeader><CardTitle>{t('invite.title')}</CardTitle><CardDescription>{t('invite.body')}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {couple.pendingInvitation ? (
              <p className="text-sm text-fg-muted">{t('invite.expires', { date: new Intl.DateTimeFormat('fr', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(couple.pendingInvitation.expiresAt)) })}</p>
            ) : (
              <Alert tone="warning">Aucune invitation active.</Alert>
            )}
            <Button variant="outline" onClick={regenerate} loading={pending}><RefreshCw className="h-4 w-4" aria-hidden />{t('invite.regenerate')}</Button>
          </CardContent>
        </Card>
      )}
      <LeaveCouple />
    </div>
  );
}

function LinkedCouple({ couple }: { couple: CoupleDto }) {
  const t = useTranslations('couple');
  const { user } = useAuth();
  const partner = couple.partner!;
  return (
    <div className="container-page max-w-2xl space-y-8 py-10">
      <PageHeader title={couple.name ?? t('linked.title')} subtitle={t('linked.body', { partner: partner.profile.displayName })} />
      <Card className="flex items-center gap-6 p-6">
        <div className="flex -space-x-3">
          <Avatar name={user?.profile.displayName ?? ''} size={64} className="ring-4 ring-bg-elevated" />
          <Avatar name={partner.profile.displayName} size={64} className="ring-4 ring-bg-elevated" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-xl">{user?.profile.displayName} & {partner.profile.displayName}</p>
          <Badge tone="success">Ensemble depuis le {new Intl.DateTimeFormat('fr', { dateStyle: 'long' }).format(new Date(couple.activatedAt!))}</Badge>
        </div>
      </Card>
      <CoupleDetailsForm couple={couple} />
      <LeaveCouple />
    </div>
  );
}

function CoupleDetailsForm({ couple }: { couple: CoupleDto }) {
  const tc = useTranslations('common');
  const { refetch } = useAuth();
  const toMessage = useApiErrorMessage();
  const [name, setName] = React.useState(couple.name ?? '');
  const [metAt, setMetAt] = React.useState(couple.metAt ?? '');
  const [anniversaryAt, setAnniversaryAt] = React.useState(couple.anniversaryAt ?? '');
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('saving');
    try {
      await api.patch('/couples/me', { name: name || null, metAt: metAt || null, anniversaryAt: anniversaryAt || null });
      await refetch();
      setState('saved');
    } catch (err) {
      setError(toMessage(err));
      setState('error');
    }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Notre espace</CardTitle><CardDescription>Informations facultatives, visibles par vous deux uniquement.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          {state === 'error' && error ? <Alert tone="danger">{error}</Alert> : null}
          {state === 'saved' ? <Alert tone="success">Enregistré.</Alert> : null}
          <Field label="Nom de notre espace" htmlFor="coupleName"><Input id="coupleName" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date de rencontre" htmlFor="metAt"><Input id="metAt" type="date" value={metAt} onChange={(e) => setMetAt(e.target.value)} /></Field>
            <Field label="Anniversaire" htmlFor="anniversaryAt"><Input id="anniversaryAt" type="date" value={anniversaryAt} onChange={(e) => setAnniversaryAt(e.target.value)} /></Field>
          </div>
          <Button type="submit" loading={state === 'saving'}>{tc('save')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LeaveCouple() {
  const t = useTranslations('couple.leave');
  const tc = useTranslations('common');
  const router = useRouter();
  const { refetch } = useAuth();
  const [pending, setPending] = React.useState(false);
  const leave = async () => {
    setPending(true);
    try {
      await api.delete('/couples/me', { confirm: true });
      await refetch();
      router.replace('/couple');
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="link" className="text-fg-muted">{t('title')}</Button></DialogTrigger>
      <DialogContent title={t('title')} description={t('body')}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="ghost">{tc('cancel')}</Button></DialogClose>
          <Button variant="danger" onClick={leave} loading={pending}>{t('confirm')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

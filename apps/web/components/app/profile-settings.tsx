'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { changePasswordSchema, updateProfileSchema } from '@couple/validation';
import type { MeDto } from '@couple/types';
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Segmented, Textarea } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useZodForm } from '@/lib/use-form';
import { useTheme, type ThemePref } from '@/lib/theme';
import { PageHeader } from './page-header';
import { useQuery } from '@tanstack/react-query';
import type { BillingStatusDto } from '@couple/types';
import { SubscriptionStatusCard } from '@/components/billing/premium-page';

export function ProfileSettings() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const ta = useTranslations('auth');
  const tn = useTranslations('notifications');
  const td = useTranslations('daily');
  const { user, refetch, logout } = useAuth();
  const router = useRouter();
  const toMessage = useApiErrorMessage();
  const [theme, setTheme] = useTheme();

  const form = useZodForm(updateProfileSchema, {
    displayName: user?.profile.displayName,
    bio: user?.profile.bio ?? '',
    interests: user?.profile.interests ?? [],
    locale: user?.locale as 'fr',
    timezone: user?.timezone,
  });
  const [status, setStatus] = React.useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);
  const [pending, setPending] = React.useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    setStatus(null);
    try {
      await api.patch<MeDto>('/me/profile', { ...data, bio: data.bio || null });
      await refetch();
      setStatus({ tone: 'success', msg: t('saved') });
    } catch (err) {
      setStatus({ tone: 'danger', msg: toMessage(err) });
    } finally {
      setPending(false);
    }
  };

  const pw = useZodForm(changePasswordSchema, { currentPassword: '', newPassword: '' });
  const [pwStatus, setPwStatus] = React.useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = pw.validate();
    if (!data) return;
    try {
      await api.post('/auth/change-password', data);
      setPwStatus({ tone: 'success', msg: t('passwordChanged') });
      pw.set('currentPassword', '');
      pw.set('newPassword', '');
      // Les autres sessions sont révoquées ; la nôtre a un access token encore valide jusqu'à expiration → on se reconnecte proprement.
      await api.refresh();
    } catch (err) {
      setPwStatus({ tone: 'danger', msg: toMessage(err) });
    }
  };

  const billing = useQuery({ queryKey: ['billing', 'status'], queryFn: () => api.get<BillingStatusDto>('/billing/status'), enabled: user?.couple?.status === 'ACTIVE' });
  if (!user) return null;
  return (
    <div className="container-page max-w-2xl space-y-8 py-10">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {user.couple?.status === 'ACTIVE' ? <SubscriptionStatusCard status={billing.data} /> : null}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={save} className="space-y-4" noValidate>
            {status ? <Alert tone={status.tone}>{status.msg}</Alert> : null}
            <Field label={ta('fields.displayName')} htmlFor="displayName" error={form.errors.displayName}>
              <Input id="displayName" maxLength={40} value={form.values.displayName ?? ''} onChange={(e) => form.set('displayName', e.target.value)} />
            </Field>
            <Field label={t('bio')} htmlFor="bio" error={form.errors.bio}>
              <Textarea id="bio" maxLength={280} value={form.values.bio ?? ''} onChange={(e) => form.set('bio', e.target.value)} />
            </Field>
            <Field label={t('interests')} htmlFor="interests" hint={t('interestsHint')}>
              <Input id="interests" value={(form.values.interests ?? []).join(', ')} onChange={(e) => form.set('interests', e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('locale')} htmlFor="locale">
                <select id="locale" className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={form.values.locale ?? 'fr'} onChange={(e) => form.set('locale', e.target.value as 'fr')}>
                  <option value="fr">Français</option>
                  <option value="en">English (bientôt)</option>
                </select>
              </Field>
              <Field label={t('timezone')} htmlFor="timezone" error={form.errors.timezone}>
                <Input id="timezone" value={form.values.timezone ?? ''} onChange={(e) => form.set('timezone', e.target.value)} />
              </Field>
            </div>
            <Button type="submit" loading={pending}>{tc('save')}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex items-center justify-between p-5">
        <div><p className="font-medium">{tn('settings.title')}</p><p className="text-sm text-fg-muted">{tn('settings.subtitle')}</p></div>
        <Button asChild variant="outline" size="sm"><Link href="/profil/notifications">{tc('continue')}</Link></Button>
      </Card>
      <Card className="flex items-center justify-between p-5 md:hidden">
        <div><p className="font-medium">{td('title')}</p><p className="text-sm text-fg-muted">{td('subtitle')}</p></div>
        <Button asChild variant="outline" size="sm"><Link href="/quotidien">{tc('continue')}</Link></Button>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('theme')}</CardTitle></CardHeader>
        <CardContent>
          <Segmented<ThemePref>
            ariaLabel={t('theme')}
            value={theme}
            onChange={setTheme}
            options={[{ value: 'system', label: t('themeSystem') }, { value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('security')}</CardTitle><CardDescription>{t('changePassword')}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={changePassword} className="space-y-4" noValidate>
            {pwStatus ? <Alert tone={pwStatus.tone}>{pwStatus.msg}</Alert> : null}
            <Field label={t('currentPassword')} htmlFor="currentPassword" error={pw.errors.currentPassword}>
              <Input id="currentPassword" type="password" autoComplete="current-password" value={pw.values.currentPassword ?? ''} onChange={(e) => pw.set('currentPassword', e.target.value)} />
            </Field>
            <Field label={ta('fields.newPassword')} htmlFor="newPassword" error={pw.errors.newPassword}>
              <Input id="newPassword" type="password" autoComplete="new-password" value={pw.values.newPassword ?? ''} onChange={(e) => pw.set('newPassword', e.target.value)} />
            </Field>
            <Button type="submit" variant="outline">{t('changePassword')}</Button>
          </form>
          <div className="border-t border-border pt-6">
            <Button variant="ghost" onClick={async () => { await logout(true); router.replace('/'); }}>{t('logoutEverywhere')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

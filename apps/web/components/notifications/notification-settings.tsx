'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { NotificationCategory, NotificationPreferenceDto, NotificationPreferencesDto } from '@couple/types';
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Skeleton, Switch } from '@couple/ui';
import { api } from '@/lib/api';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { PageHeader } from '@/components/app/page-header';

export function NotificationSettings() {
  const t = useTranslations('notifications');
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const prefs = useQuery({ queryKey: ['notifications', 'preferences'], queryFn: () => api.get<NotificationPreferencesDto>('/notifications/preferences') });
  const [draft, setDraft] = React.useState<NotificationPreferenceDto[] | null>(null);
  const [quietStart, setQuietStart] = React.useState('');
  const [quietEnd, setQuietEnd] = React.useState('');
  const [status, setStatus] = React.useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);
  React.useEffect(() => {
    if (prefs.data && !draft) {
      setDraft(prefs.data.preferences);
      setQuietStart(prefs.data.quietStart ?? '');
      setQuietEnd(prefs.data.quietEnd ?? '');
    }
  }, [prefs.data, draft]);
  const save = useMutation({
    mutationFn: () => api.put<NotificationPreferencesDto>('/notifications/preferences', { preferences: draft, quietStart: quietStart || null, quietEnd: quietEnd || null }),
    onSuccess: (d) => { qc.setQueryData(['notifications', 'preferences'], d); setStatus({ tone: 'success', msg: t('settings.saved') }); },
    onError: (e) => setStatus({ tone: 'danger', msg: toMessage(e) }),
  });
  const update = (category: NotificationCategory, patch: Partial<NotificationPreferenceDto>) => setDraft((d) => d?.map((p) => (p.category === category ? { ...p, ...patch } : p)) ?? null);

  if (prefs.isPending || !draft) return <div className="container-page py-8"><Skeleton className="h-64 rounded-lg" /></div>;
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      {status ? <Alert tone={status.tone}>{status.msg}</Alert> : null}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-3 text-sm">
            <span /><span className="text-xs uppercase tracking-wider text-fg-muted">{t('settings.push')}</span><span className="text-xs uppercase tracking-wider text-fg-muted">{t('settings.inApp')}</span><span className="text-xs uppercase tracking-wider text-fg-muted">{t('settings.maxPerDay')}</span>
            {draft.map((p) => (
              <React.Fragment key={p.category}>
                <span className="font-medium">{t(`categories.${p.category}`)}</span>
                <Switch checked={p.push} onCheckedChange={(v) => update(p.category, { push: v })} aria-label={`${t('settings.push')} ${t(`categories.${p.category}`)}`} />
                <Switch checked={p.inApp} onCheckedChange={(v) => update(p.category, { inApp: v })} aria-label={`${t('settings.inApp')} ${t(`categories.${p.category}`)}`} />
                <Input type="number" min={1} max={50} className="h-9 w-20" value={p.maxPerDay ?? ''} onChange={(e) => update(p.category, { maxPerDay: e.target.value ? Number(e.target.value) : null })} aria-label={`${t('settings.maxPerDay')} ${t(`categories.${p.category}`)}`} />
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('settings.quiet')}</CardTitle><CardDescription>{t('settings.quietHint')}</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.from')} htmlFor="quietStart"><Input id="quietStart" type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} /></Field>
          <Field label={t('settings.to')} htmlFor="quietEnd"><Input id="quietEnd" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('settings.devices')}</CardTitle></CardHeader>
        <CardContent>
          {prefs.data!.devices.length === 0 ? <p className="text-sm text-fg-muted">{t('settings.noDevices')}</p> : (
            <ul className="space-y-1 text-sm">{prefs.data!.devices.map((d) => <li key={d.id}>{d.deviceName ?? d.platform} · {d.platform} · {new Date(d.lastSeenAt).toLocaleDateString('fr-FR')}</li>)}</ul>
          )}
        </CardContent>
      </Card>
      <Button onClick={() => save.mutate()} loading={save.isPending}>{t('settings.save')}</Button>
    </div>
  );
}

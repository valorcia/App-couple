'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, SlidersHorizontal } from 'lucide-react';
import type { DailyQuestionDto, DailyQuestionSettingsDto } from '@couple/types';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Chip, Dialog, DialogClose, DialogContent, DialogTrigger, Field, Segmented, Select, Skeleton, Textarea } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';

const LEVELS = ['1', '2', '3', '4'] as const;
type Level = (typeof LEVELS)[number];

export function DailyQuestionCard() {
  const t = useTranslations('games.daily');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const active = user?.couple?.status === 'ACTIVE';
  const daily = useQuery({ queryKey: ['games', 'daily'], queryFn: () => api.get<DailyQuestionDto | { daily: null }>('/games/daily'), enabled: active });
  const settings = useQuery({ queryKey: ['games', 'daily', 'settings'], queryFn: () => api.get<DailyQuestionSettingsDto>('/games/daily/settings'), enabled: active });
  useRealtimeInvalidation('daily.changed', [['games', 'daily']]);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const send = useMutation({ mutationFn: () => api.post<DailyQuestionDto>('/games/daily/answer', { text: text.trim() }), onSuccess: (d) => { qc.setQueryData(['games', 'daily'], d); setText(''); }, onError: (e) => setError(toMessage(e)) });

  const data = daily.data && 'text' in daily.data ? daily.data : null;
  const s = settings.data;
  const themeLine = s ? (s.themes.length ? s.availableThemes.filter((th) => s.themes.includes(th.code)).map((th) => th.name).join(' · ') : t('settings.surprise')) : null;
  return (
    <Card tone="honey" className="postcard h-full">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="label-sc">{t('title')}</CardTitle>
          {s ? <p className="mt-1 text-xs text-secondary/80" data-testid="daily-settings-line">{themeLine} · {t(`settings.levels.${s.intensity as 1 | 2 | 3 | 4}`)} · {t('settings.at', { hour: s.hour })}</p> : null}
        </div>
        {s ? <DailySettingsDialog settings={s} partner={partner} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {daily.isPending ? <Skeleton className="h-16" /> : !data ? <p className="text-sm text-secondary/80">{t('none')}</p> : (
          <>
            {data.categoryName ? <Badge tone="neutral">{data.categoryName}{data.level >= 3 ? ` · ${t(`settings.levels.${data.level as 3 | 4}`)}` : ''}</Badge> : null}
            <p className="pr-10 font-display text-2xl leading-tight">{data.text}</p>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {data.revealedAt ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-bg-elevated p-3"><p className="text-xs uppercase tracking-wider text-fg-subtle">{user?.profile.displayName}</p><p className="mt-1">{data.myAnswer}</p></div>
                <div className="rounded-md bg-bg-elevated p-3"><p className="text-xs uppercase tracking-wider text-fg-subtle">{partner}</p><p className="mt-1">{data.partnerAnswer}</p></div>
              </div>
            ) : data.myAnswer ? (
              <p className="flex items-center gap-2 text-sm text-secondary/80"><Check className="h-4 w-4" aria-hidden />{t('waiting', { partner })}</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }} className="space-y-2">
                {data.partnerAnswered ? <Badge tone="coral">{t('partnerFirst', { partner })}</Badge> : null}
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} aria-label={t('title')} className="bg-bg-elevated" />
                <div className="flex justify-end"><Button size="sm" variant="secondary" type="submit" loading={send.isPending} disabled={!text.trim()}>{t('answer')}</Button></div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Réglage partagé : thèmes (ou surprise), intensité plafonnée, heure de la notification. */
function DailySettingsDialog({ settings, partner }: { settings: DailyQuestionSettingsDto; partner: string }) {
  const t = useTranslations('games.daily.settings');
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [open, setOpen] = React.useState(false);
  const [themes, setThemes] = React.useState<string[]>(settings.themes);
  const [intensity, setIntensity] = React.useState<Level>(String(settings.intensity) as Level);
  const [hour, setHour] = React.useState(settings.hour);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  // À l'ouverture seulement : après un enregistrement, la requête est remise à jour et le message « enregistré » doit rester affiché.
  const latest = React.useRef(settings);
  latest.current = settings;
  React.useEffect(() => {
    if (!open) return;
    const cur = latest.current;
    setThemes(cur.themes); setIntensity(String(cur.intensity) as Level); setHour(cur.hour); setError(null); setSaved(null);
  }, [open]);

  const save = useMutation({
    mutationFn: () => api.put<DailyQuestionSettingsDto>('/games/daily/settings', { themes, intensity: Number(intensity), hour }),
    onSuccess: (d) => {
      qc.setQueryData(['games', 'daily', 'settings'], d);
      void qc.invalidateQueries({ queryKey: ['games', 'daily'] });
      setSaved(d.redrawn ? t('redrawn') : t('fromTomorrow'));
    },
    onError: (e) => setError(toMessage(e)),
  });
  const toggle = (code: string) => setThemes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  const max = settings.maxIntensity;
  const hours = Array.from({ length: 17 }, (_, i) => 6 + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm" aria-label={t('open')} data-testid="daily-settings-open"><SlidersHorizontal className="h-4 w-4" aria-hidden />{t('open')}</Button></DialogTrigger>
      <DialogContent title={t('title')} description={t('description', { partner })}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="label-sc">{t('themes')}</legend>
            <p className="text-sm text-fg-muted">{t('themesHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={themes.length === 0} onClick={() => setThemes([])}>{t('surprise')}</Chip>
              {settings.availableThemes.map((th) => (
                <Chip key={th.code} active={themes.includes(th.code)} onClick={() => toggle(th.code)} className={th.intimate ? 'border-primary/60' : undefined}>
                  {th.name}{th.intimate ? ' 🔥' : ''}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="label-sc">{t('intensity')}</legend>
            <Segmented<Level>
              ariaLabel={t('intensity')}
              value={intensity}
              onChange={(v) => { if (Number(v) <= max) setIntensity(v); }}
              options={LEVELS.map((l) => ({ value: l, label: `${Number(l) > max ? '🔒 ' : ''}${t(`levels.${l}`)}` }))}
            />
            <p className="text-sm text-fg-muted">{max < 3 ? t('intensityLocked') : t('intensityHint', { max: t(`levels.${String(max) as Level}`) })}</p>
          </fieldset>
          <Field label={t('hour')} htmlFor="daily-hour" hint={t('hourHint')}>
            <Select id="daily-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {hours.map((h) => <option key={h} value={h}>{t('at', { hour: h })}</option>)}
            </Select>
          </Field>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {saved ? <Alert tone="success">{saved}</Alert> : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="ghost" type="button">{t('close')}</Button></DialogClose>
            <Button type="submit" loading={save.isPending}>{t('save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

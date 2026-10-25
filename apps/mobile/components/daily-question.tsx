import * as React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyQuestionDto, DailyQuestionSettingsDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

export function DailyQuestionCard() {
  const t = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const partner = user?.couple?.partner?.profile.displayName ?? 'votre partenaire';
  const daily = useQuery({ queryKey: ['games', 'daily'], queryFn: () => api.get<DailyQuestionDto | { daily: null }>('/games/daily') });
  const settings = useQuery({ queryKey: ['games', 'daily', 'settings'], queryFn: () => api.get<DailyQuestionSettingsDto>('/games/daily/settings') });
  useRealtimeInvalidation('daily.changed', [['games', 'daily']]);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const send = useMutation({ mutationFn: () => api.post<DailyQuestionDto>('/games/daily/answer', { text: text.trim() }), onSuccess: (d) => { qc.setQueryData(['games', 'daily'], d); setText(''); }, onError: (e) => setError(tError(errorCode(e))) });
  const data = daily.data && 'text' in daily.data ? daily.data : null;
  return (
    <Card tone="blush">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: t.secondary, opacity: 0.7 }}>Question du jour</Text>
          {settings.data ? <Text style={{ fontSize: 12, color: t.secondary, opacity: 0.8, marginTop: 2 }}>{settingsLine(settings.data)}</Text> : null}
        </View>
        {settings.data ? <Pressable accessibilityRole="button" accessibilityLabel="Régler la question du jour" onPress={() => setSettingsOpen(true)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderColor: t.fg, borderRadius: radius.sm }}><Text style={{ color: t.fg, fontWeight: '700', fontSize: 12 }}>Régler</Text></Pressable> : null}
      </View>
      {settings.data ? <DailySettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings.data} partner={partner} /> : null}
      {!data ? <Muted>{daily.isPending ? 'Chargement…' : "Pas de question aujourd'hui."}</Muted> : (
        <>
          {data.categoryName ? <Text style={{ fontSize: 11, color: t.fgSubtle, marginTop: spacing(2) }}>{`${data.categoryName}${data.level >= 3 ? ` · ${LEVELS[data.level - 1]}` : ''}`}</Text> : null}
          <Text style={{ fontSize: 20, lineHeight: 26, color: t.secondary, fontWeight: '600', marginVertical: spacing(2) }}>{data.text}</Text>
          <ErrorBanner message={error} />
          {data.revealedAt ? (
            <View style={{ gap: spacing(2) }}>
              <View style={{ backgroundColor: t.bgElevated, borderRadius: radius.md, padding: spacing(3) }}><Text style={{ fontSize: 11, color: t.fgSubtle }}>{user?.profile.displayName}</Text><Text style={{ color: t.fg }}>{data.myAnswer}</Text></View>
              <View style={{ backgroundColor: t.bgElevated, borderRadius: radius.md, padding: spacing(3) }}><Text style={{ fontSize: 11, color: t.fgSubtle }}>{partner}</Text><Text style={{ color: t.fg }}>{data.partnerAnswer}</Text></View>
            </View>
          ) : data.myAnswer ? (
            <Muted>{`Réponse envoyée. On attend ${partner}.`}</Muted>
          ) : (
            <View style={{ gap: spacing(2) }}>
              {data.partnerAnswered ? <Text style={{ color: t.primary, fontWeight: '600' }}>{`${partner} a déjà répondu, à vous !`}</Text> : null}
              <TextInput value={text} onChangeText={setText} multiline placeholder="Votre réponse, rien que pour vous deux…" placeholderTextColor={t.fgSubtle} accessibilityLabel="Question du jour" style={{ minHeight: 64, backgroundColor: t.bgElevated, borderRadius: radius.md, padding: spacing(3), color: t.fg }} />
              <Button title="Répondre" variant="secondary" onPress={() => send.mutate()} loading={send.isPending} disabled={!text.trim()} />
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const LEVELS = ['Douce', 'Complice', 'Osée', 'Feu'];
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i);

function settingsLine(s: DailyQuestionSettingsDto): string {
  const themes = s.themes.length ? s.availableThemes.filter((th) => s.themes.includes(th.code)).map((th) => th.name).join(' · ') : 'Surprise';
  return `${themes} · ${LEVELS[s.intensity - 1]} · ${s.hour} h`;
}

/** Réglage partagé de la question du jour : thèmes (ou surprise), intensité plafonnée, heure de la notification. */
function DailySettingsModal({ open, onClose, settings, partner }: { open: boolean; onClose: () => void; settings: DailyQuestionSettingsDto; partner: string }) {
  const t = useTheme();
  const qc = useQueryClient();
  const [themes, setThemes] = React.useState<string[]>(settings.themes);
  const [intensity, setIntensity] = React.useState(settings.intensity);
  const [hour, setHour] = React.useState(settings.hour);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  // À l'ouverture seulement : après un enregistrement, le message « enregistré » doit rester affiché.
  const latest = React.useRef(settings);
  latest.current = settings;
  React.useEffect(() => {
    if (!open) return;
    const cur = latest.current;
    setThemes(cur.themes); setIntensity(cur.intensity); setHour(cur.hour); setError(null); setSaved(null);
  }, [open]);
  const save = useMutation({
    mutationFn: () => api.put<DailyQuestionSettingsDto>('/games/daily/settings', { themes, intensity, hour }),
    onSuccess: (d) => { qc.setQueryData(['games', 'daily', 'settings'], d); void qc.invalidateQueries({ queryKey: ['games', 'daily'] }); setSaved(d.redrawn ? 'Réglage enregistré. La question du jour a été retirée : personne n’avait encore répondu.' : 'Réglage enregistré. Il s’applique dès la question de demain.'); },
    onError: (e) => setError(tError(errorCode(e))),
  });
  const chip = (active: boolean, label: string, onPress: () => void, disabled = false) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active, disabled }} onPress={onPress} disabled={disabled} style={{ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: active ? t.fg : t.border, backgroundColor: active ? t.fg : 'transparent', borderRadius: radius.sm, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: active ? t.bg : t.fg, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: spacing(5), paddingTop: spacing(8), gap: spacing(4) }}>
        <Title>Régler la question du jour</Title>
        <Muted>{`Un seul réglage pour vous deux : ${partner} verra le changement. Chaque matin, une notification vous prévient tous les deux.`}</Muted>
        <View>
          <Text style={{ color: t.fg, fontWeight: '700', marginBottom: spacing(2) }}>Thèmes</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {chip(themes.length === 0, 'Surprise', () => setThemes([]))}
            {settings.availableThemes.map((th) => chip(themes.includes(th.code), th.intimate ? `${th.name} 🔥` : th.name, () => setThemes((prev) => (prev.includes(th.code) ? prev.filter((c) => c !== th.code) : [...prev, th.code]))))}
          </View>
        </View>
        <View>
          <Text style={{ color: t.fg, fontWeight: '700', marginBottom: spacing(2) }}>Intensité</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {LEVELS.map((label, i) => chip(intensity === i + 1, i + 1 > settings.maxIntensity ? `🔒 ${label}` : label, () => setIntensity(i + 1), i + 1 > settings.maxIntensity))}
          </View>
          <Muted>{settings.maxIntensity < 3 ? '« Osée » et « Feu » s’ouvrent quand l’espace Intimité est activé par vous deux.' : `Jusqu’à « ${LEVELS[settings.maxIntensity - 1]} », le plus bas de vos deux réglages Intimité.`}</Muted>
        </View>
        <View>
          <Text style={{ color: t.fg, fontWeight: '700', marginBottom: spacing(2) }}>Heure de la notification (heure locale de chacun)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>{HOURS.map((h) => chip(hour === h, `${h} h`, () => setHour(h)))}</View>
        </View>
        <ErrorBanner message={error} />
        {saved ? <Text style={{ color: t.success, fontWeight: '600' }}>{saved}</Text> : null}
        <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} />
        <Button title="Fermer" variant="ghost" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

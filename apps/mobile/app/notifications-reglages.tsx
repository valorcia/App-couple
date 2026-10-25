import * as React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import type { NotificationCategory, NotificationPreferenceDto, NotificationPreferencesDto } from '@couple/types';
import { Button, Card, ErrorBanner, Field, Muted, Screen } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { tError } from '@/lib/i18n';
import { spacing, useTheme } from '@/lib/theme';

const LABELS: Record<NotificationCategory, string> = { CALENDAR: 'Agenda', INVITATION: 'Invitations', GAME: 'Jeux', CHALLENGE: 'Défis', SURPRISE: 'Surprises', ANNIVERSARY: 'Anniversaires', SUGGESTION: 'Suggestions', DAILY_QUESTION: 'Question du jour', SYSTEM: 'Compte et sécurité', MARKETING: 'Nouveautés (facultatif)' };

export default function NotificationSettingsScreen() {
  const t = useTheme();
  const prefs = useQuery({ queryKey: ['notifications', 'preferences'], queryFn: () => api.get<NotificationPreferencesDto>('/notifications/preferences') });
  const [draft, setDraft] = React.useState<NotificationPreferenceDto[] | null>(null);
  const [quietStart, setQuietStart] = React.useState('');
  const [quietEnd, setQuietEnd] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => { if (prefs.data && !draft) { setDraft(prefs.data.preferences); setQuietStart(prefs.data.quietStart ?? ''); setQuietEnd(prefs.data.quietEnd ?? ''); } }, [prefs.data, draft]);
  const save = useMutation({ mutationFn: () => api.put('/notifications/preferences', { preferences: draft, quietStart: quietStart || null, quietEnd: quietEnd || null }), onSuccess: () => setSaved(true), onError: (e) => setError(tError(errorCode(e))) });
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <ErrorBanner message={error} />
        {saved ? <Muted>Préférences enregistrées.</Muted> : null}
        <Card>
          {(draft ?? []).map((p) => (
            <View key={p.category} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2) }}>
              <Text style={{ color: t.fg, flex: 1 }}>{LABELS[p.category]}</Text>
              <Switch value={p.push} onValueChange={(v) => setDraft((d) => d!.map((x) => (x.category === p.category ? { ...x, push: v } : x)))} accessibilityLabel={`Push ${LABELS[p.category]}`} />
            </View>
          ))}
        </Card>
        <Card style={{ marginTop: spacing(3) }}>
          <Text style={{ color: t.fg, fontWeight: '600', marginBottom: spacing(2) }}>Heures silencieuses (HH:MM)</Text>
          <View style={{ flexDirection: 'row', gap: spacing(3) }}><View style={{ flex: 1 }}><Field label="De" value={quietStart} onChangeText={setQuietStart} placeholder="22:00" /></View><View style={{ flex: 1 }}><Field label="À" value={quietEnd} onChangeText={setQuietEnd} placeholder="08:00" /></View></View>
        </Card>
        <View style={{ height: spacing(4) }} />
        <Button title="Enregistrer" onPress={() => { setSaved(false); save.mutate(); }} loading={save.isPending} />
      </ScrollView>
    </Screen>
  );
}

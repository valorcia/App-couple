import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import type { CardTableDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

const LEVELS = ['Douceur', 'Complicité', 'Désir', 'Feu'];

/** « Les cartes du soir » : table partagée, même carte sur les deux téléphones. */
export default function CardsScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const partner = user?.couple?.partner?.profile.displayName ?? 'votre partenaire';
  const table = useQuery({ queryKey: ['intimacy', 'cards'], queryFn: () => api.get<CardTableDto>('/intimacy/cards') });
  useRealtimeInvalidation('intimacy.changed', [['intimacy']]);
  const [level, setLevel] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [left, setLeft] = React.useState<number | null>(null);
  const set = (d: CardTableDto) => { qc.setQueryData(['intimacy', 'cards'], d); setError(null); setLeft(null); };
  const onError = (e: unknown) => setError(tError(errorCode(e)));
  const draw = useMutation({ mutationFn: (lvl: number) => api.post<CardTableDto>('/intimacy/cards/draw', { level: lvl }), onSuccess: set, onError });
  const done = useMutation({ mutationFn: () => api.post<CardTableDto>('/intimacy/cards/done', {}), onSuccess: set, onError });
  const reset = useMutation({ mutationFn: () => api.delete<CardTableDto>('/intimacy/cards'), onSuccess: set, onError });
  React.useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const d = table.data;
  const current = d?.current ?? null;
  const activeLevel = level ?? d?.levels.find((l) => l.available)?.level ?? 1;
  const drawer = current ? (current.drawnByUserId === user?.id ? user?.profile.displayName ?? 'Vous' : partner) : '';
  const other = current ? (current.drawnByUserId === user?.id ? partner : user?.profile.displayName ?? 'Vous') : '';
  const roleLine = current ? (current.card.role === 'BOTH' ? 'À deux' : current.card.role === 'DRAWER' ? `${drawer} pour ${other}` : `${other} pour ${drawer}`) : '';

  return (
    <Screen style={{ backgroundColor: t.night }}>
      <Stack.Screen options={{ headerShown: true, title: 'Les cartes du soir', headerStyle: { backgroundColor: t.night }, headerTintColor: t.nightFg }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <Text style={{ color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>Une carte, un geste, à tour de rôle</Text>
        <Text style={{ color: t.nightFg, fontSize: 30, fontWeight: '600', marginTop: spacing(1) }}>Les cartes du soir</Text>
        <Text style={{ color: t.nightFg, opacity: 0.75, marginTop: spacing(2) }}>La carte tirée s’affiche sur vos deux téléphones. Un « non » ne se discute pas : on repose la carte.</Text>
        <ErrorBanner message={error} />
        {table.isError ? (
          <Card style={{ marginTop: spacing(4) }}>
            <Text style={{ color: t.fg, fontWeight: '600' }}>La table est fermée.</Text>
            <Muted>Les cartes du soir s’ouvrent quand l’espace Intimité est activé par vous deux.</Muted>
            <View style={{ height: spacing(3) }} /><Button title="Aller à l’espace Intimité" variant="secondary" onPress={() => router.replace('/intimite')} />
          </Card>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(5) }}>
          {(d?.levels ?? []).map((l) => {
            const active = l.level === activeLevel;
            return (
              <Pressable key={l.level} accessibilityRole="radio" accessibilityState={{ checked: active, disabled: !l.available }} disabled={!l.available} onPress={() => setLevel(l.level)} style={{ alignItems: 'center', width: '23%', opacity: l.available ? 1 : 0.5 }}>
                <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: active && l.available ? t.primary : '#3F3043' }}>
                  <Text style={{ color: t.nightFg, fontSize: 18, fontStyle: 'italic', fontWeight: '600' }}>{l.level === 4 ? '🔥' : ['I', 'II', 'III', 'IV'][l.level - 1]}</Text>
                </View>
                <Text style={{ color: t.nightFg, fontSize: 12, marginTop: spacing(1) }}>{LEVELS[l.level - 1]}</Text>
                <Text style={{ color: t.nightFg, opacity: 0.5, fontSize: 10 }}>{l.reason === 'intensity' ? 'hors réglage' : l.reason === 'premium' ? 'Premium' : `${l.remaining} carte(s)`}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ alignItems: 'center', marginTop: spacing(6) }}>
          {current ? (
            <View style={{ width: 260, minHeight: 360, borderRadius: 22, backgroundColor: '#FFFAF1', padding: spacing(6), justifyContent: 'space-between', borderWidth: 8, borderColor: '#F4E7D4' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontStyle: 'italic', fontWeight: '700' }}>{current.card.level === 4 ? '🔥' : ['I', 'II', 'III', 'IV'][current.card.level - 1]}</Text></View>
                <Text style={{ color: '#4B2A46', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7 }}>{LEVELS[current.card.level - 1]}</Text>
              </View>
              <Text style={{ color: '#4B2A46', fontSize: 21, lineHeight: 28, fontStyle: 'italic', textAlign: 'center', marginVertical: spacing(4) }}>{current.card.text}</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#4B2A46', fontWeight: '600' }}>{roleLine}</Text>
                <Text style={{ color: '#4B2A46', opacity: 0.6, fontSize: 11 }}>{`Tirée par ${drawer}`}</Text>
              </View>
            </View>
          ) : (
            <View style={{ width: 260, height: 360, borderRadius: 22, backgroundColor: '#2F1D33', borderWidth: 10, borderColor: '#3B2740', alignItems: 'center', justifyContent: 'center' }}>
              <Muted>Choisissez un niveau, puis tirez.</Muted>
            </View>
          )}
        </View>

        <View style={{ marginTop: spacing(6), gap: spacing(2) }}>
          {current ? (
            <>
              {current.card.durationSec ? (
                left === null ? <Button title={`Lancer le minuteur · ${current.card.durationSec} s`} variant="ghost" onPress={() => setLeft(current.card.durationSec)} /> : <Text style={{ color: left === 0 ? t.primary : t.nightFg, textAlign: 'center', fontSize: 28, fontWeight: '600' }}>{left === 0 ? 'Temps écoulé' : `${left} s`}</Text>
              ) : null}
              <Button title="Fait" onPress={() => done.mutate()} loading={done.isPending} />
              <Button title="Autre carte" variant="secondary" onPress={() => draw.mutate(activeLevel)} loading={draw.isPending} />
            </>
          ) : (
            <Button title="Tirer une carte" onPress={() => draw.mutate(activeLevel)} loading={draw.isPending} disabled={!d?.levels.some((l) => l.available)} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(2) }}>
            <Text style={{ color: t.nightFg, opacity: 0.6, fontSize: 12 }}>{`${d?.doneCount ?? 0} carte(s) réalisée(s) · tout s’efface au matin`}</Text>
            <Pressable onPress={() => reset.mutate()} hitSlop={8}><Text style={{ color: t.nightFg, opacity: 0.8, fontSize: 12, textDecorationLine: 'underline' }}>Terminer la soirée</Text></Pressable>
          </View>
        </View>
        <Card tone="honey" style={{ marginTop: spacing(5), borderRadius: radius.md }}><Muted>Niveaux disponibles selon l’intensité acceptée par chacun de vous deux dans l’espace Intimité.</Muted></Card>
      </ScrollView>
    </Screen>
  );
}

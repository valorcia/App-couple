import * as React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { GameCatalogDto, GameCatalogEntryDto, GameSessionDto, GameSessionListItemDto, Page } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

export const GAME_NAMES: Record<string, { name: string; tagline: string }> = {
  SECRET_ANSWERS: { name: 'Réponses secrètes', tagline: 'Même question, réponses cachées, révélation simultanée.' },
  WHO_KNOWS_BEST: { name: "Qui connaît le mieux l'autre ?", tagline: "L'un répond sur lui-même, l'autre devine." },
  DILEMMA: { name: 'Dilemmes', tagline: 'Deux options, un choix secret chacun.' },
  WHICH_OF_US: { name: 'Lequel de nous deux ?', tagline: 'Une affirmation, un vote.' },
  CONFESSIONS: { name: 'Confessions', tagline: 'Des questions plus profondes, par niveaux, toujours refusables.' },
  CHALLENGE: { name: 'Défis à deux', tagline: 'À relever ensemble.' },
  MEMORY_QUIZ: { name: 'Nos souvenirs', tagline: 'Bientôt.' },
};

export default function PlayScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const partner = user?.couple?.partner?.profile.displayName ?? '';
  const catalog = useQuery({ queryKey: ['games', 'catalog'], queryFn: () => api.get<GameCatalogDto>('/games/catalog') });
  const open = useQuery({ queryKey: ['games', 'sessions', 'OPEN'], queryFn: () => api.get<Page<GameSessionListItemDto>>('/games/sessions', { query: { status: 'OPEN' } }) });
  useRealtimeInvalidation('game.changed', [['games']]);
  const [starting, setStarting] = React.useState<GameCatalogEntryDto | null>(null);
  return (
    <Screen style={{ paddingTop: 64 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} showsVerticalScrollIndicator={false}>
        <Title>Jouer</Title>
        <Muted>Les réponses se dévoilent en même temps, jamais avant.</Muted>
        {open.data && open.data.items.length > 0 ? (
          <View style={{ marginTop: spacing(5) }}>
            <Text style={{ color: t.secondary, fontWeight: '600', marginBottom: spacing(2) }}>Parties en cours</Text>
            {open.data.items.map((s) => (
              <Pressable key={s.id} onPress={() => router.push(`/jouer/${s.id}`)} style={{ backgroundColor: t.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: spacing(4), marginBottom: spacing(2), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View><Text style={{ color: t.fg, fontWeight: '600' }}>{GAME_NAMES[s.gameType]?.name}</Text><Muted>{`${s.roundsClosed} / ${s.roundsTotal}`}</Muted></View>
                <Text style={{ color: s.myTurn ? t.primary : t.fgMuted, fontWeight: '600' }}>{s.myTurn ? 'À vous' : `Attente de ${partner}`}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={{ color: t.secondary, fontWeight: '600', marginTop: spacing(5), marginBottom: spacing(2) }}>Lancer une partie</Text>
        {catalog.data ? <Muted>{catalog.data.premium ? 'Premium : toutes les catégories, parties illimitées.' : `${catalog.data.sessionsLeftToday ?? 0} partie(s) gratuite(s) restante(s) aujourd'hui`}</Muted> : null}
        {(catalog.data?.games ?? []).map((g) => (
          <Card key={g.gameType} style={{ marginTop: spacing(3) }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: t.fg }}>{GAME_NAMES[g.gameType]?.name}</Text>
            <Muted>{GAME_NAMES[g.gameType]?.tagline}</Muted>
            <View style={{ height: spacing(3) }} />
            <Button title="Jouer" variant="secondary" disabled={!g.available} onPress={() => setStarting(g)} />
          </Card>
        ))}
        <Card style={{ marginTop: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.fg }}>Défis à deux</Text><Muted>Romantiques, drôles, créatifs…</Muted>
          <View style={{ height: spacing(3) }} /><Button title="Voir les défis" variant="secondary" onPress={() => router.push('/defis')} />
        </Card>
        <Card tone="night" style={{ marginTop: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.nightFg }}>Les cartes du soir</Text><Text style={{ color: t.nightFg, opacity: 0.75, marginTop: 4 }}>Une carte, un geste, à tour de rôle. Réservé à l’espace Intimité, activé par vous deux.</Text>
          <View style={{ height: spacing(3) }} /><Button title="Jouer" onPress={() => router.push('/intimite-cartes')} />
        </Card>
        <Card style={{ marginTop: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.fg }}>Intimité & séduction</Text><Muted>Espace facultatif, activé par chacun : « Ce soir ? », Double Secret.</Muted>
          <View style={{ height: spacing(3) }} /><Button title="Découvrir" variant="ghost" onPress={() => router.push('/intimite')} />
        </Card>
      </ScrollView>
      <StartModal entry={starting} onClose={() => setStarting(null)} />
    </Screen>
  );
}

function StartModal({ entry, onClose }: { entry: GameCatalogEntryDto | null; onClose: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const [codes, setCodes] = React.useState<string[]>([]);
  const [length, setLength] = React.useState<'short' | 'long'>('short');
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { setCodes([]); setError(null); }, [entry?.gameType]);
  const start = useMutation({ mutationFn: () => api.post<GameSessionDto>('/games/sessions', { gameType: entry!.gameType, categoryCodes: codes, length }), onSuccess: (s) => { onClose(); router.push(`/jouer/${s.id}`); }, onError: (e) => setError(tError(errorCode(e))) });
  if (!entry) return null;
  return (
    <Modal visible={!!entry} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: spacing(5), paddingTop: spacing(8) }}>
        <Title>{GAME_NAMES[entry.gameType]?.name}</Title>
        <ErrorBanner message={error} />
        <Text style={{ color: t.fg, fontWeight: '600', marginBottom: spacing(2) }}>Catégories</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          {entry.categories.map((c) => {
            const active = codes.includes(c.code);
            return (
              <Pressable key={c.code} disabled={c.locked} onPress={() => setCodes((cs) => (active ? cs.filter((x) => x !== c.code) : [...cs, c.code]))} style={{ opacity: c.locked ? 0.5 : 1, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.pill, borderWidth: 1, borderColor: active ? t.secondary : t.border, backgroundColor: active ? t.secondary : t.bgElevated }}>
                <Text style={{ color: active ? t.secondaryFg : t.fg }}>{c.locked ? '🔒 ' : ''}{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Muted>{codes.length === 0 ? 'Toutes les catégories accessibles' : ''}</Muted>
        <View style={{ flexDirection: 'row', gap: spacing(2), marginVertical: spacing(4) }}>
          {(['short', 'long'] as const).map((l) => (
            <Pressable key={l} onPress={() => setLength(l)} style={{ flex: 1, padding: spacing(3), borderRadius: radius.md, borderWidth: 1, borderColor: length === l ? t.primary : t.border, alignItems: 'center' }}><Text style={{ color: length === l ? t.primary : t.fg, fontWeight: '600' }}>{l === 'short' ? 'Courte (5)' : 'Longue (10)'}</Text></Pressable>
          ))}
        </View>
        <Button title="Lancer la partie" onPress={() => start.mutate()} loading={start.isPending} />
        <View style={{ height: 8 }} />
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

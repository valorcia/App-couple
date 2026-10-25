import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import type { ChallengeDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { spacing, useTheme } from '@/lib/theme';

export default function ChallengesScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const partner = user?.couple?.partner?.profile.displayName ?? 'votre partenaire';
  const catalog = useQuery({ queryKey: ['challenges', 'list'], queryFn: () => api.get<ChallengeDto[]>('/challenges') });
  const progress = useQuery({ queryKey: ['challenges', 'progress'], queryFn: () => api.get<ChallengeDto[]>('/challenges/progress') });
  useRealtimeInvalidation('challenge.changed', [['challenges']]);
  const [selected, setSelected] = React.useState<ChallengeDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const act = useMutation({ mutationFn: ({ id, action }: { id: string; action: string }) => api.post<ChallengeDto>(`/challenges/${id}/${action}`, {}), onSuccess: (c) => { setSelected(c); qc.invalidateQueries({ queryKey: ['challenges'] }); }, onError: (e) => setError(tError(errorCode(e))) });
  const active = (progress.data ?? []).filter((c) => c.progress && ['PROPOSED', 'ACCEPTED'].includes(c.progress.status));
  const activeIds = new Set(active.map((c) => c.id));
  const Row = ({ c }: { c: ChallengeDto }) => (
    <Pressable onPress={() => setSelected(c)} style={{ opacity: c.locked ? 0.6 : 1 }}>
      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={{ color: t.fg, fontSize: 17, fontWeight: '600' }}>{c.locked ? '🔒 ' : ''}{c.title}</Text>
        <Muted>{[c.durationMinutes ? `${c.durationMinutes} min` : null, c.difficulty, c.budget, c.progress?.status].filter(Boolean).join(' · ')}</Muted>
      </Card>
    </Pressable>
  );
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Défis à deux', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        {selected ? (
          <Card>
            <Text style={{ color: t.fg, fontSize: 22, fontWeight: '600' }}>{selected.title}</Text>
            <Muted>{selected.description}</Muted>
            <ErrorBanner message={error} />
            {selected.instructions.map((s, i) => <Text key={i} style={{ color: t.fg, marginTop: spacing(1) }}>{`${i + 1}. ${s}`}</Text>)}
            <View style={{ height: spacing(4) }} />
            {selected.locked ? <Muted>Réservé à Premium.</Muted> : !selected.progress || ['SKIPPED', 'COMPLETED'].includes(selected.progress.status) ? (
              <Button title={`Proposer à ${partner}`} onPress={() => act.mutate({ id: selected.id, action: 'propose' })} loading={act.isPending} />
            ) : (
              <View style={{ gap: spacing(2) }}>
                {selected.progress.status === 'PROPOSED' && selected.progress.proposedByUserId !== user?.id ? <Button title="On le fait" onPress={() => act.mutate({ id: selected.id, action: 'accept' })} loading={act.isPending} /> : null}
                {selected.progress.completedByMe ? <Muted>{selected.progress.completedByPartner ? 'Réussi ensemble.' : `En attente de ${partner}.`}</Muted> : <Button title="J'ai fait ma part" variant="secondary" onPress={() => act.mutate({ id: selected.id, action: 'complete' })} loading={act.isPending} />}
                <Button title="Passer (sans pénalité)" variant="ghost" onPress={() => act.mutate({ id: selected.id, action: 'skip' })} />
              </View>
            )}
            <View style={{ height: spacing(2) }} />
            <Button title="Retour" variant="ghost" onPress={() => { setSelected(null); setError(null); }} />
          </Card>
        ) : (
          <>
            <Text style={{ color: t.secondary, fontWeight: '600', marginBottom: spacing(2) }}>En cours</Text>
            {active.length === 0 ? <Muted>Aucun défi en cours.</Muted> : active.map((c) => <Row key={c.id} c={c} />)}
            <Text style={{ color: t.secondary, fontWeight: '600', marginVertical: spacing(2) }}>Catalogue</Text>
            {(catalog.data ?? []).filter((c) => !activeIds.has(c.id)).map((c) => <Row key={c.id} c={c} />)}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

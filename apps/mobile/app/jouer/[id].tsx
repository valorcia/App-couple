import * as React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { AnswerPayloadDto, GameRoundDto, GameSessionDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';
import { GAME_NAMES } from './../(tabs)/jouer';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const partner = user?.couple?.partner?.profile.displayName ?? 'votre partenaire';
  const session = useQuery({ queryKey: ['games', 'session', id], queryFn: () => api.get<GameSessionDto>(`/games/sessions/${id}`) });
  useRealtimeInvalidation('game.changed', [['games']]);
  const [view, setView] = React.useState<number | 'summary' | null>(null);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { if (view === null && session.data) setView(session.data.currentRoundIndex ?? 'summary'); }, [view, session.data]);
  const refresh = (s: GameSessionDto) => qc.setQueryData(['games', 'session', id], s);
  const answer = useMutation({ mutationFn: ({ index, payload }: { index: number; payload: AnswerPayloadDto }) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/answer`, { answer: payload }), onSuccess: (s) => { refresh(s); setText(''); }, onError: (e) => setError(tError(errorCode(e))) });
  const skip = useMutation({ mutationFn: (index: number) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/skip`), onSuccess: refresh, onError: (e) => setError(tError(errorCode(e))) });
  const verdict = useMutation({ mutationFn: ({ index, v }: { index: number; v: 'EXACT' | 'CLOSE' | 'MISS' }) => api.post<GameSessionDto>(`/games/sessions/${id}/rounds/${index}/verdict`, { verdict: v }), onSuccess: refresh, onError: (e) => setError(tError(errorCode(e))) });

  if (!session.data || view === null || !user) return <Screen><Muted>Chargement…</Muted></Screen>;
  const s = session.data;
  const total = s.rounds.length;
  const activeIndex = view === 'summary' ? total - 1 : Math.min(view, total - 1);
  const round = s.rounds[activeIndex]!;
  const partnerId = s.participantIds.find((p) => p !== user.id) ?? '';
  const closed = !!round.revealedAt || round.skipped;
  const nextOpen = s.rounds.find((r) => r.index > activeIndex && !r.revealedAt && !r.skipped)?.index ?? s.currentRoundIndex;
  const continueTarget: number | 'summary' | null = closed ? (nextOpen !== null && nextOpen !== undefined && nextOpen !== activeIndex ? nextOpen : s.status !== 'OPEN' ? 'summary' : null) : null;
  const render = (a: AnswerPayloadDto) => (a.kind === 'text' ? a.text : a.kind === 'vote' ? (a.userId === user.id ? user.profile.displayName : partner) : (round.prompt.options?.[a.index] ?? `Option ${a.index + 1}`));

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: GAME_NAMES[s.gameType]?.name ?? 'Partie', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <Muted>{view === 'summary' ? 'Partie terminée' : `Manche ${activeIndex + 1} / ${total}`}</Muted>
        <View style={{ flexDirection: 'row', gap: 4, marginVertical: spacing(3) }}>{s.rounds.map((r) => <View key={r.index} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: view !== 'summary' && r.index === activeIndex ? t.primary : r.revealedAt || r.skipped ? t.secondary : t.border }} />)}</View>
        <ErrorBanner message={error} />
        {view === 'summary' ? (
          <Card tone="blush"><Text style={{ fontSize: 24, fontWeight: '600', color: t.secondary }}>Partie terminée</Text><Muted>{`${(s.summary as { revealed?: number })?.revealed ?? 0} manche(s) révélée(s)`}</Muted></Card>
        ) : (
          <>
            <Card tone="plum">
              <Text style={{ color: '#F8F3EC', fontSize: 22, fontWeight: '600', lineHeight: 28 }}>{round.prompt.text}</Text>
              {s.gameType === 'WHO_KNOWS_BEST' ? <Text style={{ color: '#F8F3EC', opacity: 0.8, marginTop: spacing(2) }}>{round.prompt.subjectUserId === user.id ? `Répondez pour vous-même : ${partner} devra deviner.` : `Devinez la réponse de ${partner}.`}</Text> : null}
            </Card>
            <View style={{ height: spacing(4) }} />
            {round.skipped ? <Muted>Question passée.</Muted> : round.revealedAt ? (
              <RevealView round={round} me={user.profile.displayName} partner={partner} render={render} canVerdict={s.gameType === 'WHO_KNOWS_BEST' && round.awaitingVerdictFrom === user.id} onVerdict={(v) => verdict.mutate({ index: round.index, v })} />
            ) : round.myAnswer ? (
              <Card><Text style={{ color: t.fg, fontWeight: '600' }}>{`Réponse envoyée. En attente de ${partner}…`}</Text><Muted>{render(round.myAnswer)}</Muted></Card>
            ) : (
              <View>
                {round.partnerAnswered ? <Text style={{ color: t.primary, fontWeight: '600', marginBottom: spacing(2) }}>{`${partner} a déjà répondu.`}</Text> : null}
                {s.gameType === 'DILEMMA' && round.prompt.options ? round.prompt.options.map((o, i) => (
                  <Pressable key={i} onPress={() => answer.mutate({ index: round.index, payload: { kind: 'choice', index: i } })} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: spacing(5), marginBottom: spacing(2), backgroundColor: t.bgElevated }}><Text style={{ color: t.fg, fontSize: 18, fontWeight: '600' }}>{o}</Text></Pressable>
                )) : s.gameType === 'WHICH_OF_US' ? (
                  <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                    {[{ id: user.id, name: user.profile.displayName }, { id: partnerId, name: partner }].map((p) => (
                      <Pressable key={p.id} onPress={() => answer.mutate({ index: round.index, payload: { kind: 'vote', userId: p.id } })} style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: spacing(5), backgroundColor: t.bgElevated }}><Text style={{ color: t.fg, fontWeight: '600' }}>{p.name}</Text></Pressable>
                    ))}
                  </View>
                ) : (
                  <View>
                    <TextInput value={text} onChangeText={setText} multiline placeholder="Votre réponse, rien que pour vous deux…" placeholderTextColor={t.fgSubtle} style={{ minHeight: 96, backgroundColor: t.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: spacing(3), color: t.fg, marginBottom: spacing(3) }} />
                    <Button title="Envoyer" onPress={() => answer.mutate({ index: round.index, payload: { kind: 'text', text: text.trim() } })} loading={answer.isPending} disabled={!text.trim()} />
                  </View>
                )}
                <View style={{ height: spacing(3) }} />
                <Button title="Passer cette question" variant="ghost" onPress={() => skip.mutate(round.index)} />
              </View>
            )}
            {continueTarget !== null ? <View style={{ marginTop: spacing(4) }}><Button title={continueTarget === 'summary' ? 'Voir le résumé' : 'Continuer'} onPress={() => setView(continueTarget)} /></View> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function RevealView({ round, me, partner, render, canVerdict, onVerdict }: { round: GameRoundDto; me: string; partner: string; render: (a: AnswerPayloadDto) => string; canVerdict: boolean; onVerdict: (v: 'EXACT' | 'CLOSE' | 'MISS') => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing(3) }}>
      <Card><Text style={{ fontSize: 11, color: t.fgSubtle, textTransform: 'uppercase' }}>{me}</Text><Text style={{ color: t.fg, fontSize: 18, fontWeight: '600' }}>{round.myAnswer ? render(round.myAnswer) : '—'}</Text></Card>
      <Card><Text style={{ fontSize: 11, color: t.fgSubtle, textTransform: 'uppercase' }}>{partner}</Text><Text style={{ color: t.fg, fontSize: 18, fontWeight: '600' }}>{round.partnerAnswer ? render(round.partnerAnswer) : '—'}</Text></Card>
      {round.funLine ? <Muted>{round.funLine}</Muted> : null}
      {canVerdict ? (
        <View style={{ flexDirection: 'row', gap: spacing(2) }}>
          <Button title="Dans le mille" onPress={() => onVerdict('EXACT')} />
          <Button title="Pas loin" variant="secondary" onPress={() => onVerdict('CLOSE')} />
          <Button title="Raté" variant="ghost" onPress={() => onVerdict('MISS')} />
        </View>
      ) : round.awaitingVerdictFrom ? <Muted>{`En attente du verdict de ${partner}.`}</Muted> : null}
    </View>
  );
}

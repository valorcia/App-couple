import * as React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import type { DesireChoice, DesireItemDto, DesireMatchesDto, IntimacySettingsDto, MeDto, TonightDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

const CAT: Record<string, string> = { tenderness: 'Tendresse', romance: 'Romantisme', seduction: 'Séduction', complicity: 'Complicité', desires: 'Désirs', fantasies: 'Fantasmes', experiences: 'Expériences' };

export default function IntimacyScreen() {
  const t = useTheme();
  const { user, refetch } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const partner = user?.couple?.partner?.profile.displayName ?? 'votre partenaire';
  const settings = useQuery({ queryKey: ['intimacy', 'settings'], queryFn: () => api.get<IntimacySettingsDto>('/intimacy/settings') });
  const items = useQuery({ queryKey: ['intimacy', 'items'], queryFn: () => api.get<DesireItemDto[]>('/intimacy/items'), enabled: settings.data?.bothEnabled === true });
  const matches = useQuery({ queryKey: ['intimacy', 'matches'], queryFn: () => api.get<DesireMatchesDto>('/intimacy/matches'), enabled: settings.data?.bothEnabled === true });
  const tonight = useQuery({ queryKey: ['intimacy', 'tonight'], queryFn: () => api.get<TonightDto>('/intimacy/tonight'), enabled: settings.data?.bothEnabled === true });
  useRealtimeInvalidation('intimacy.changed', [['intimacy']]);
  const [error, setError] = React.useState<string | null>(null);
  const setTonight = useMutation({ mutationFn: (on: boolean) => api.put<TonightDto>('/intimacy/tonight', { on }), onSuccess: (d) => qc.setQueryData(['intimacy', 'tonight'], d), onError: (e) => setError(tError(errorCode(e))) });
  const confirmAdult = useMutation({ mutationFn: () => api.post<MeDto>('/me/confirm-adult', { confirm: true }), onSuccess: async () => { await refetch(); qc.invalidateQueries({ queryKey: ['intimacy'] }); } });
  const toggle = useMutation({ mutationFn: (enabled: boolean) => api.put<IntimacySettingsDto>('/intimacy/settings', { enabled, maxIntensity: settings.data?.maxIntensity ?? 2, enabledCategories: settings.data?.enabledCategories?.length ? settings.data.enabledCategories : undefined }), onSuccess: () => qc.invalidateQueries({ queryKey: ['intimacy'] }), onError: (e) => setError(tError(errorCode(e))) });
  const respond = useMutation({ mutationFn: ({ id, choice }: { id: string; choice: DesireChoice }) => api.put<DesireItemDto>(`/intimacy/items/${id}/response`, { choice }), onSuccess: (item) => { qc.setQueryData<DesireItemDto[]>(['intimacy', 'items'], (old) => old?.map((i) => (i.id === item.id ? { ...i, myChoice: item.myChoice } : i))); qc.invalidateQueries({ queryKey: ['intimacy', 'matches'] }); }, onError: (e) => setError(tError(errorCode(e))) });
  const reveal = useMutation({ mutationFn: () => api.post<DesireMatchesDto>('/intimacy/matches/reveal'), onSuccess: (m) => qc.setQueryData(['intimacy', 'matches'], m), onError: (e) => setError(tError(errorCode(e))) });
  const s = settings.data;
  const m = matches.data;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Intimité & séduction', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <Muted>Un espace facultatif, activé par chacun. Vos réponses restent les vôtres : seuls vos points communs peuvent être révélés, d&apos;un commun accord.</Muted>
        <ErrorBanner message={error} />
        {!s ? <Muted>Chargement…</Muted> : !s.moduleAvailable ? <Muted>Cet espace n&apos;est pas disponible pour le moment.</Muted> : !s.adultConfirmed ? (
          <Card style={{ marginTop: spacing(4) }}><Text style={{ color: t.fg, fontWeight: '600', fontSize: 18 }}>Confirmer ma majorité</Text><Muted>Cet espace est réservé aux personnes majeures.</Muted><View style={{ height: spacing(3) }} /><Button title="Je confirme avoir 18 ans ou plus" onPress={() => confirmAdult.mutate()} loading={confirmAdult.isPending} /></Card>
        ) : (
          <>
            <Card style={{ marginTop: spacing(4) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: t.fg, fontWeight: '600', fontSize: 18 }}>{s.enabled ? 'Activé pour vous' : "Activer l'espace pour moi"}</Text><Switch value={s.enabled} onValueChange={(v) => toggle.mutate(v)} /></View>
              <Muted>{s.partnerEnabled ? `${partner} a activé l'espace.` : `${partner} n'a pas encore activé l'espace. Rien n'est visible tant que vous n'êtes pas deux.`}</Muted>
            </Card>
            {s.bothEnabled ? (
              <>
                <Card tone={tonight.data?.mutual ? 'night' : 'honey'} style={{ marginTop: spacing(3) }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: tonight.data?.mutual ? t.nightFg : t.fg, fontWeight: '600', fontSize: 20 }}>🔥 Ce soir ?</Text>
                    <Switch value={!!tonight.data?.mine} onValueChange={(v) => setTonight.mutate(v)} disabled={tonight.isPending || setTonight.isPending} accessibilityLabel="Allumer le signal « Ce soir ? »" />
                  </View>
                  <Text style={{ color: tonight.data?.mutual ? t.nightFg : t.fgMuted, marginTop: spacing(1) }}>
                    {tonight.data?.mutual ? 'Vous êtes deux à y penser ce soir.' : tonight.data?.mine ? `Signal allumé. Rien n’est visible tant que ${partner} n’allume pas le sien.` : `Allumez votre signal si l’envie est là. ${partner} ne le saura que si le sien est allumé aussi.`}
                  </Text>
                </Card>
                <Pressable accessibilityRole="button" onPress={() => router.push('/intimite-cartes')}>
                  <Card tone="night" style={{ marginTop: spacing(3) }}>
                    <Text style={{ color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>Une carte, un geste, à tour de rôle</Text>
                    <Text style={{ color: t.nightFg, fontSize: 22, fontWeight: '600', marginTop: spacing(1) }}>Les cartes du soir</Text>
                    <Text style={{ color: t.nightFg, opacity: 0.75, marginTop: spacing(1) }}>Tirez une carte : elle s’affiche sur vos deux téléphones. Ouvrir →</Text>
                  </Card>
                </Pressable>
                <Card tone="plum" style={{ marginTop: spacing(3) }}>
                  <Text style={{ color: '#F8F3EC', fontSize: 22, fontWeight: '600' }}>🔒 Double Secret</Text>
                  {!m || (m.mutualCount === 0 && m.myAnswersCount === 0) ? <Text style={{ color: '#F8F3EC', opacity: 0.85 }}>Répondez aux envies ci-dessous : vous ne verrez que celles que vous partagez.</Text> : (
                    <>
                      <Text style={{ color: '#F8F3EC', fontSize: 18, marginTop: spacing(2) }}>{`Vous avez ${m.mutualCount} envie(s) en commun.`}</Text>
                      {m.pendingCount > 0 ? (m.iRequested ? <Text style={{ color: '#F8F3EC', opacity: 0.85 }}>{`Demande envoyée. ${partner} doit aussi le souhaiter.`}</Text> : <View style={{ marginTop: spacing(2) }}><Button title="Je veux les découvrir" onPress={() => reveal.mutate()} loading={reveal.isPending} /></View>) : null}
                      {m.partnerRequested && !m.iRequested ? <Text style={{ color: t.primary, fontWeight: '600', marginTop: spacing(2) }}>{`${partner} souhaite découvrir vos points communs.`}</Text> : null}
                      {m.revealed.map((r) => <Text key={r.id} style={{ color: '#F8F3EC', fontSize: 17, marginTop: spacing(2) }}>• {r.text}</Text>)}
                    </>
                  )}
                </Card>
                {(items.data ?? []).map((item) => (
                  <Card key={item.id} style={{ marginTop: spacing(2), opacity: item.locked ? 0.6 : 1 }}>
                    <Text style={{ color: t.fg }}>{item.locked ? '🔒 ' : ''}{item.text}</Text>
                    <Muted>{`${CAT[item.category]}${item.intensity >= 4 ? ' · 🔥 Feu' : item.intensity === 3 ? ' · Désir' : ''}`}</Muted>
                    <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
                      {(['YES', 'MAYBE', 'NO'] as DesireChoice[]).map((c) => (
                        <Pressable key={c} disabled={item.locked} accessibilityRole="radio" accessibilityState={{ checked: item.myChoice === c }} onPress={() => respond.mutate({ id: item.id, choice: c })} style={{ paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radius.pill, borderWidth: 1, borderColor: item.myChoice === c ? t.primary : t.border, backgroundColor: item.myChoice === c ? t.primary : 'transparent' }}>
                          <Text style={{ color: item.myChoice === c ? t.primaryFg : t.fg }}>{c === 'YES' ? 'Oui' : c === 'NO' ? 'Non' : 'Peut-être'}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

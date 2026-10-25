import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { CalendarEventDto, ChallengeFeaturedDto } from '@couple/types';
import { Card, Muted, Screen, Title } from '@/components/ui';
import { DailyQuestionCard } from '@/components/daily-question';
import { WhatNowModal } from '@/components/what-now';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDay, fmtTime } from '@/lib/format';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const t = useTheme();
  const router = useRouter();
  const [whatNow, setWhatNow] = React.useState(false);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bel après-midi' : 'Bonsoir';
  const upcoming = useQuery({
    queryKey: ['calendar', 'upcoming'],
    queryFn: () => { const from = new Date(); return api.get<CalendarEventDto[]>('/calendar/events', { query: { from: from.toISOString(), to: new Date(from.getTime() + 14 * 86_400_000).toISOString() } }); },
  });
  const featured = useQuery({ queryKey: ['challenges', 'featured'], queryFn: () => api.get<ChallengeFeaturedDto>('/challenges/featured') });
  useRealtimeInvalidation('calendar.changed', [['calendar']]);
  useRealtimeInvalidation('challenge.changed', [['challenges']]);
  const next = (upcoming.data ?? []).filter((e) => new Date(e.endAt) > new Date()).slice(0, 3);
  return (
    <Screen style={{ paddingTop: 64 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <Title>{`${greet} ${user?.profile.displayName ?? ''}`}</Title>
        {user?.couple?.partner ? <Muted>{`Avec ${user.couple.partner.profile.displayName}`}</Muted> : null}
        <View style={{ height: 20 }} />
        <Card tone="plum">
          <Text style={{ color: '#F8F3EC', fontSize: 26, fontWeight: '600' }}>On fait quoi ?</Text>
          <Text style={{ color: '#F8F3EC', opacity: 0.8, marginTop: 6 }}>Une idée pour maintenant, ce soir ou ce week-end.</Text>
          <Pressable accessibilityRole="button" onPress={() => setWhatNow(true)} style={{ marginTop: spacing(4), alignSelf: 'flex-start', backgroundColor: t.primary, paddingHorizontal: spacing(5), paddingVertical: spacing(3), borderRadius: radius.pill }}>
            <Text style={{ color: t.primaryFg, fontWeight: '600' }}>On fait quoi ?</Text>
          </Pressable>
        </Card>
        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.push('/quotidien')} accessibilityRole="button">
          <Card>
            <Text style={{ color: t.fgSubtle, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Notre quotidien</Text>
            <Text style={{ color: t.fg, fontWeight: '600', marginTop: spacing(1) }}>Courses, tâches et projets</Text>
            <Muted>Partagés en temps réel, sans classement.</Muted>
          </Card>
        </Pressable>
        <View style={{ height: 12 }} />
        <DailyQuestionCard />
        <View style={{ height: 12 }} />
        <Card>
          <Text style={{ color: t.fgSubtle, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>À venir</Text>
          {next.length === 0 ? <Muted>Rien de prévu. C&apos;est une invitation.</Muted> : next.map((e) => (
            <Pressable key={e.instanceId} onPress={() => router.push('/(tabs)/agenda')} style={{ marginTop: spacing(2) }}>
              <Text style={{ color: t.fg, fontWeight: '600' }}>{e.busy ? 'Occupé' : e.title}</Text>
              <Muted>{`${fmtDay(e.startAt)}${e.allDay ? '' : ` · ${fmtTime(e.startAt)}`}`}</Muted>
            </Pressable>
          ))}
        </Card>
        <View style={{ height: 12 }} />
        <Card>
          <Text style={{ color: t.fgSubtle, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{featured.data?.kind === 'active' ? 'Défi du moment' : 'Suggestion du jour'}</Text>
          {featured.data?.challenge ? (
            <Pressable onPress={() => router.push('/defis')}><Text style={{ color: t.fg, fontWeight: '600', marginTop: spacing(1) }}>{featured.data.challenge.title}</Text><Muted>{featured.data.challenge.description}</Muted></Pressable>
          ) : <Muted>Aucun défi en cours.</Muted>}
        </Card>
      </ScrollView>
      <WhatNowModal open={whatNow} onClose={() => setWhatNow(false)} />
    </Screen>
  );
}

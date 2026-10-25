import * as React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyQuestionDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted } from '@/components/ui';
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
  useRealtimeInvalidation('daily.changed', [['games', 'daily']]);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const send = useMutation({ mutationFn: () => api.post<DailyQuestionDto>('/games/daily/answer', { text: text.trim() }), onSuccess: (d) => { qc.setQueryData(['games', 'daily'], d); setText(''); }, onError: (e) => setError(tError(errorCode(e))) });
  const data = daily.data && 'text' in daily.data ? daily.data : null;
  return (
    <Card tone="blush">
      <Text style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: t.secondary, opacity: 0.7 }}>Question du jour</Text>
      {!data ? <Muted>{daily.isPending ? 'Chargement…' : "Pas de question aujourd'hui."}</Muted> : (
        <>
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

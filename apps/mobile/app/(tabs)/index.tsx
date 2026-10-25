import { ScrollView, Text, View } from 'react-native';
import { Card, Muted, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const t = useTheme();
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bel après-midi' : 'Bonsoir';
  return (
    <Screen style={{ paddingTop: 64 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>{`${greet} ${user?.profile.displayName ?? ''}`}</Title>
        {user?.couple?.partner ? <Muted>{`Avec ${user.couple.partner.profile.displayName}`}</Muted> : null}
        <View style={{ height: 20 }} />
        <Card tone="plum">
          <Text style={{ color: t.secondaryFg, fontSize: 26, fontWeight: '600' }}>On fait quoi ?</Text>
          <Text style={{ color: t.secondaryFg, opacity: 0.8, marginTop: 6 }}>Une idée pour maintenant, ce soir ou ce week-end. Bientôt disponible.</Text>
        </Card>
        <View style={{ height: 12 }} />
        <Card>
          <Text style={{ color: t.fgSubtle, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>À venir</Text>
          <Muted>Rien de prévu. C&apos;est une invitation.</Muted>
        </Card>
      </ScrollView>
    </Screen>
  );
}

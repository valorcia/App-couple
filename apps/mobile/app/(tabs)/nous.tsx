import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { spacing, useTheme } from '@/lib/theme';

export default function UsScreen() {
  const { user } = useAuth();
  const t = useTheme();
  const router = useRouter();
  const couple = user?.couple;
  return (
    <Screen style={{ paddingTop: 64 }}>
      <ScrollView>
        <Title>{couple?.name ?? 'Nous'}</Title>
        <Muted>{couple?.partner ? `${user?.profile.displayName} & ${couple.partner.profile.displayName}` : 'Associez votre partenaire.'}</Muted>
        <View style={{ height: spacing(4) }} />
        {couple?.metAt ? <Card><Text style={{ color: t.fgSubtle, fontSize: 12, textTransform: 'uppercase' }}>Rencontre</Text><Text style={{ color: t.fg }}>{new Date(couple.metAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</Text></Card> : null}
        <View style={{ height: spacing(3) }} />
        <Card><Text style={{ color: t.fg, fontWeight: '600', fontSize: 18 }}>Intimité & séduction</Text><Muted>Espace facultatif, activé par chacun.</Muted><View style={{ height: spacing(3) }} /><Button title="Ouvrir" variant="secondary" onPress={() => router.push('/intimite')} /></Card>
        <View style={{ height: spacing(3) }} />
        <Card><Text style={{ color: t.fg, fontWeight: '600', fontSize: 18 }}>Premium Couple</Text><Muted>{user?.entitlements.includes('premium') ? 'Actif pour votre couple.' : 'Un seul abonnement pour vous deux.'}</Muted><View style={{ height: spacing(3) }} /><Button title="Voir" variant="ghost" onPress={() => router.push('/premium')} /></Card>
      </ScrollView>
    </Screen>
  );
}

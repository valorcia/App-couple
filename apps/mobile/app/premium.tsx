import * as React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import type { BillingStatusDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadOffers, type Offer, purchasesConfigured, restorePurchases } from '@/lib/purchases';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { spacing, useTheme } from '@/lib/theme';

const INCLUDES = ['Tous les jeux et toutes les catégories', 'Questions illimitées', 'Double Secret complet', 'Défis, missions et surprises', 'Assistant IA avec quotas élargis', 'Souvenirs interactifs et projets avancés'];

export default function PremiumScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { refetch } = useAuth();
  const status = useQuery({ queryKey: ['billing', 'status'], queryFn: () => api.get<BillingStatusDto>('/billing/status') });
  useRealtimeInvalidation('entitlements.changed', [['billing'], ['me'], ['games']]);
  const [offers, setOffers] = React.useState<Offer[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { loadOffers().then(setOffers).catch(() => setOffers([])); }, []);
  const buy = async (o: Offer) => {
    setBusy(true);
    setError(null);
    try {
      const ok = await o.purchase();
      if (ok) { await qc.invalidateQueries({ queryKey: ['billing'] }); await refetch(); }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sub = status.data?.subscription;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Premium Couple', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }}>
        <Muted>Un seul abonnement pour vous deux. Résiliable à tout moment.</Muted>
        <ErrorBanner message={error} />
        <Card style={{ marginTop: spacing(4) }}>
          <Text style={{ color: t.fg, fontWeight: '600' }}>{status.data?.premium ? 'Premium actif pour votre couple.' : "Vous utilisez l'offre gratuite."}</Text>
          {sub ? <Muted>{`${sub.status}${sub.currentPeriodEnd ? ` · jusqu'au ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}` : ''} · géré via ${sub.manageVia}`}</Muted> : null}
          {sub?.manageVia === 'stripe' ? <Muted>Abonnement souscrit sur le web : gérez-le depuis le site.</Muted> : null}
        </Card>
        {!status.data?.premium ? (
          <View style={{ marginTop: spacing(3), gap: spacing(3) }}>
            {!purchasesConfigured ? <Card><Muted>L&apos;achat mobile n&apos;est pas encore configuré (clés RevenueCat). Vous pouvez souscrire depuis le site web.</Muted></Card> : offers === null ? <Muted>Chargement des offres…</Muted> : offers.length === 0 ? <Card><Muted>Aucune offre disponible pour le moment.</Muted></Card> : offers.map((o) => (
              <Card key={o.identifier} tone={o.period === 'YEAR' ? 'blush' : 'default'}>
                <Text style={{ color: t.fg, fontSize: 18, fontWeight: '600' }}>{o.title}</Text>
                <Text style={{ color: t.secondary, fontSize: 28, fontWeight: '700' }}>{o.priceString}<Text style={{ fontSize: 14, color: t.fgMuted }}>{o.period === 'YEAR' ? ' / an' : o.period === 'MONTH' ? ' / mois' : ''}</Text></Text>
                <View style={{ height: spacing(3) }} />
                <Button title="Choisir cette offre" onPress={() => buy(o)} loading={busy} />
              </Card>
            ))}
            {purchasesConfigured ? <Button title="Restaurer mes achats" variant="ghost" onPress={async () => { setBusy(true); try { if (await restorePurchases()) await qc.invalidateQueries({ queryKey: ['billing'] }); } finally { setBusy(false); } }} loading={busy} /> : null}
          </View>
        ) : null}
        <Card style={{ marginTop: spacing(3) }}>
          <Text style={{ color: t.fg, fontWeight: '600', fontSize: 18 }}>Premium comprend</Text>
          {INCLUDES.map((i) => <Text key={i} style={{ color: t.fg, marginTop: spacing(1) }}>✓ {i}</Text>)}
        </Card>
        {sub?.manageVia === 'apple' ? <Button title="Gérer dans l'App Store" variant="ghost" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} /> : sub?.manageVia === 'google' ? <Button title="Gérer dans Google Play" variant="ghost" onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')} /> : null}
      </ScrollView>
    </Screen>
  );
}

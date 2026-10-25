import * as React from 'react';
import { View } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function VerifyScreen() {
  const { user, refetch, logout } = useAuth();
  const [sent, setSent] = React.useState(false);
  React.useEffect(() => {
    const id = setInterval(() => void refetch(), 5000);
    return () => clearInterval(id);
  }, [refetch]);
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Card>
        <Title>Confirmez votre adresse</Title>
        <Muted>{`Nous avons envoyé un lien à ${user?.email ?? '…'}. Ouvrez-le pour activer votre compte ; cet écran se mettra à jour automatiquement.`}</Muted>
        <View style={{ height: 20 }} />
        <Button title={sent ? 'E-mail renvoyé' : "Renvoyer l'e-mail"} variant="secondary" disabled={sent} onPress={async () => { await api.post('/auth/resend-verification'); setSent(true); }} />
        <View style={{ height: 8 }} />
        <Button title="Se déconnecter" variant="ghost" onPress={() => void logout()} />
      </Card>
    </Screen>
  );
}

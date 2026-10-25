import { View } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  return (
    <Screen style={{ paddingTop: 64 }}>
      <Title>Plus</Title>
      <Card>
        <Muted>{user?.email ?? ''}</Muted>
        <View style={{ height: 12 }} />
        <Button title="Se déconnecter" variant="secondary" onPress={() => void logout()} />
      </Card>
    </Screen>
  );
}

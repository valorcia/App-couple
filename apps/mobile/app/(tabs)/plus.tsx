import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { spacing } from '@/lib/theme';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <Screen style={{ paddingTop: 64 }}>
      <Title>Plus</Title>
      <Card>
        <Muted>{user?.email ?? ''}</Muted>
        <View style={{ height: spacing(3) }} />
        <Button title="Notifications" variant="secondary" onPress={() => router.push('/notifications-reglages')} />
        <View style={{ height: spacing(2) }} />
        <Button title="Premium Couple" variant="secondary" onPress={() => router.push('/premium')} />
        <View style={{ height: spacing(2) }} />
        <Button title="Quotidien : courses, tâches, projets" variant="secondary" onPress={() => router.push('/quotidien')} />
        <View style={{ height: spacing(2) }} />
        <Button title="Défis" variant="ghost" onPress={() => router.push('/defis')} />
        <View style={{ height: spacing(4) }} />
        <Button title="Se déconnecter" variant="ghost" onPress={() => void logout()} />
      </Card>
    </Screen>
  );
}

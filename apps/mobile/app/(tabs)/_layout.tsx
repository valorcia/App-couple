import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.primary, tabBarInactiveTintColor: t.fgMuted, tabBarStyle: { backgroundColor: t.bgElevated, borderTopColor: t.border } }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="jouer" options={{ title: 'Jouer', tabBarIcon: icon('game-controller-outline') }} />
      <Tabs.Screen name="nous" options={{ title: 'Nous', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="plus" options={{ title: 'Plus', tabBarIcon: icon('ellipsis-horizontal') }} />
    </Tabs>
  );
}

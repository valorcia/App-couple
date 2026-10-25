import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppProviders, useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { registerForPush } from '@/lib/push';
import { configurePurchases } from '@/lib/purchases';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <AuthGate />
    </AppProviders>
  );
}

/** Redirige selon l'état de session : (auth) si déconnecté, couple si aucun couple actif, (tabs) sinon. */
function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();
  const t = useTheme();

  // Enregistre le jeton push une fois la session établie (silencieux si refus).
  const registered = React.useRef(false);
  React.useEffect(() => {
    if (user?.emailVerified && !registered.current) {
      registered.current = true;
      void registerForPush();
      void configurePurchases(user.id);
    }
    if (!user) registered.current = false;
  }, [user]);

  React.useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/connexion');
    else if (user && !user.emailVerified && segments[1] !== 'verifier') router.replace('/(auth)/verifier');
    else if (user && user.emailVerified && user.couple?.status !== 'ACTIVE' && segments[0] !== 'couple') router.replace('/couple');
    else if (user && user.emailVerified && user.couple?.status === 'ACTIVE' && (inAuth || segments[0] === 'couple')) router.replace('/(tabs)');
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="couple" options={{ headerShown: true, title: 'Nous', headerTintColor: t.secondary, headerStyle: { backgroundColor: t.bg } }} />
      <Stack.Screen name="jouer/[id]" />
      <Stack.Screen name="defis" />
      <Stack.Screen name="quotidien" />
      <Stack.Screen name="projets/[id]" />
      <Stack.Screen name="intimite" />
      <Stack.Screen name="intimite-cartes" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="notifications-reglages" />
    </Stack>
  );
}

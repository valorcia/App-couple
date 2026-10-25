import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import type { AuthResponseDto } from '@couple/types';
import { loginSchema } from '@couple/validation';
import { Button, ErrorBanner, Field, Muted, Screen, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const t = useTheme();
  const { setSession } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError('Vérifiez votre e-mail et votre mot de passe.');
    setPending(true);
    setError(null);
    try {
      const res = await api.post<AuthResponseDto>('/auth/login', parsed.data, { auth: false });
      await setSession(res);
      router.replace(res.user.emailVerified ? '/(tabs)' : '/(auth)/verifier');
    } catch (err) {
      setError(tError(errorCode(err)));
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Title>Bon retour</Title>
          <Muted>Connectez-vous pour retrouver votre espace.</Muted>
          <Text style={{ height: 24 }} />
          <ErrorBanner message={error} />
          <Field label="Adresse e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
          <Button title="Se connecter" onPress={submit} loading={pending} />
          <Link href="/(auth)/inscription" style={{ marginTop: 20, textAlign: 'center', color: t.primary, fontWeight: '600' }}>
            Pas encore de compte ? Créer un compte
          </Link>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Localization from 'expo-localization';
import type { AuthResponseDto } from '@couple/types';
import { registerSchema } from '@couple/validation';
import { Button, ErrorBanner, Field, Muted, Screen, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const t = useTheme();
  const { setSession } = useAuth();
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [accept, setAccept] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    const parsed = registerSchema.safeParse({
      displayName, email, password, acceptTerms: accept || undefined, locale: 'fr',
      timezone: Localization.getCalendars()[0]?.timeZone ?? 'Europe/Paris',
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Informations invalides.');
    setPending(true);
    setError(null);
    try {
      const res = await api.post<AuthResponseDto>('/auth/register', parsed.data, { auth: false });
      await setSession(res);
      router.replace('/(auth)/verifier');
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
          <Title>Créons votre espace</Title>
          <Muted>Un compte par personne. Vous inviterez votre partenaire juste après.</Muted>
          <View style={{ height: 24 }} />
          <ErrorBanner message={error} />
          <Field label="Prénom ou pseudonyme" value={displayName} onChangeText={setDisplayName} autoComplete="given-name" />
          <Field label="Adresse e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Mot de passe (10 caractères min.)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accept }} onPress={() => setAccept((a) => !a)} style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: accept ? t.primary : t.border, backgroundColor: accept ? t.primary : 'transparent' }} />
            <Text style={{ flex: 1, color: t.fgMuted }}>J&apos;accepte les conditions générales et la politique de confidentialité.</Text>
          </Pressable>
          <Button title="Créer mon compte" onPress={submit} loading={pending} />
          <Link href="/(auth)/connexion" style={{ marginTop: 20, textAlign: 'center', color: t.primary, fontWeight: '600' }}>
            Déjà un compte ? Se connecter
          </Link>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

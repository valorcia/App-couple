import * as React from 'react';
import { Share, Text, View } from 'react-native';
import type { CoupleDto, InvitationDto } from '@couple/types';
import { Button, Card, ErrorBanner, Field, Muted, Screen, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export default function CoupleScreen() {
  const { user, refetch } = useAuth();
  const t = useTheme();
  const [mode, setMode] = React.useState<'choose' | 'join'>('choose');
  const [code, setCode] = React.useState('');
  const [fresh, setFresh] = React.useState<InvitationDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (user?.couple?.status !== 'PENDING') return;
    const id = setInterval(() => void refetch(), 8000);
    return () => clearInterval(id);
  }, [user?.couple?.status, refetch]);

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(tError(errorCode(err)));
    } finally {
      setPending(false);
    }
  };
  const create = () => run(async () => {
    const res = await api.post<CoupleDto>('/couples', {});
    if (res.pendingInvitation) setFresh(res.pendingInvitation);
    await refetch();
  });
  const renew = () => run(async () => setFresh(await api.post<InvitationDto>('/couples/invitations', {})));
  const join = () => run(async () => {
    await api.post('/couples/join', { code });
    await refetch();
  });

  if (user?.couple?.status === 'PENDING' || fresh) {
    return (
      <Screen>
        <Title>En attente de votre partenaire</Title>
        <ErrorBanner message={error} />
        {fresh?.code ? (
          <Card tone="blush">
            <Muted>Partagez ce code. Il est valable 72 heures et ne sert qu&apos;une fois.</Muted>
            <Text selectable accessibilityLabel={`Code ${fresh.code.split('').join(' ')}`} style={{ fontSize: 40, letterSpacing: 8, color: t.secondary, fontWeight: '700', marginVertical: 16 }}>{fresh.code}</Text>
            <Button title="Partager" variant="secondary" onPress={() => void Share.share({ message: `Rejoins-moi sur Entre Nous avec le code ${fresh.code}` })} />
          </Card>
        ) : (
          <Card>
            <Muted>Le code n&apos;est affiché qu&apos;au moment de sa création. Générez-en un nouveau si besoin.</Muted>
            <View style={{ height: 16 }} />
            <Button title="Nouveau code" variant="secondary" onPress={renew} loading={pending} />
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Et maintenant, à deux</Title>
      <Muted>Invitez votre partenaire ou rejoignez son espace avec son code.</Muted>
      <View style={{ height: 24 }} />
      <ErrorBanner message={error} />
      {mode === 'choose' ? (
        <>
          <Button title="Inviter mon partenaire" onPress={create} loading={pending} />
          <View style={{ height: 12 }} />
          <Button title="J'ai un code" variant="secondary" onPress={() => setMode('join')} />
        </>
      ) : (
        <>
          <Field label="Code d'invitation" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={12} />
          <Button title="Rejoindre" onPress={join} loading={pending} />
          <View style={{ height: 8 }} />
          <Button title="Retour" variant="ghost" onPress={() => setMode('choose')} />
        </>
      )}
    </Screen>
  );
}

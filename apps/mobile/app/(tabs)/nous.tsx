import { Muted, Screen, Title } from '@/components/ui';

export default function NousScreen() {
  return (
    <Screen style={{ paddingTop: 64 }}>
      <Title>Nous</Title>
      <Muted>Ce module arrive avec la phase 3 (voir docs/ROADMAP.md).</Muted>
    </Screen>
  );
}

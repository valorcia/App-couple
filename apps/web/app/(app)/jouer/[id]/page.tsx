import { SessionPlay } from '@/components/games/session-play';
export const metadata = { title: 'Partie' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionPlay id={id} />;
}

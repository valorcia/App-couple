import Link from 'next/link';
import { Button, EmptyState } from '@couple/ui';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-dvh items-center justify-center py-20">
      <EmptyState title="Page introuvable" description="Le lien a peut-être expiré ou changé." action={<Button asChild><Link href="/">Retour à l&apos;accueil</Link></Button>} />
    </div>
  );
}

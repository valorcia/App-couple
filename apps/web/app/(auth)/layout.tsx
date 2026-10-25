import Link from 'next/link';
import { Blob, Logo } from '@couple/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute -left-32 top-20 opacity-60" aria-hidden><Blob size={360} /></div>
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Entre Nous — accueil"><Logo /></Link>
      </header>
      <main className="container-page flex flex-1 items-start justify-center py-10 sm:items-center">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

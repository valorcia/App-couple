import Link from 'next/link';
import { Blob, Doodle, Logo } from '@couple/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-24 opacity-70 animate-float" aria-hidden><Blob size={380} /></div>
      <div className="pointer-events-none absolute -right-10 bottom-10 text-secondary/15" aria-hidden><Doodle name="moon" size={180} /></div>
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Entre Nous — accueil"><Logo /></Link>
      </header>
      <main className="container-page flex flex-1 items-start justify-center py-10 sm:items-center">
        <div className="w-full max-w-md animate-rise">{children}</div>
      </main>
    </div>
  );
}

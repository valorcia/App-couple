import type { Metadata } from 'next';
import { Providers } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = { title: { default: 'Administration · Entre Nous', template: '%s · Admin Entre Nous' }, robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}

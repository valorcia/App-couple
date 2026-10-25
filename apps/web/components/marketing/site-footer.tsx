import Link from 'next/link';
import { Doodle, Logo } from '@couple/ui';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-bg-blush/30">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-fg-muted md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3"><Logo /><Doodle name="cup" size={28} className="text-honey" /></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pied de page">
          <Link href="/confidentialite" className="hover:text-fg">Confidentialité</Link>
          <Link href="/conditions" className="hover:text-fg">Conditions générales</Link>
          <Link href="/cookies" className="hover:text-fg">Cookies</Link>
          <Link href="/contact" className="hover:text-fg">Contact</Link>
        </nav>
        <p>© {new Date().getFullYear()} Entre Nous · Fait avec soin, en Europe.</p>
      </div>
    </footer>
  );
}

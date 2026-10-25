import * as React from 'react';
import { cn } from '../cn';
import { Glow } from './glow';

/** Section enveloppante avec halo intégré : pour les « pièces » principales (héros, jeu en cours, Double Secret). */
export function Surface({ tone = 'warm', glow = 'primary', className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'warm' | 'night' | 'honey' | 'blush'; glow?: 'primary' | 'honey' | 'blush' | 'sage' | null }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        tone === 'night' && 'surface-night shadow-soft',
        tone === 'warm' && 'surface-warm border border-border/70 shadow-card',
        tone === 'honey' && 'surface-honey border border-border/60 shadow-card',
        tone === 'blush' && 'bg-bg-blush border border-transparent shadow-card',
        className,
      )}
      {...props}
    >
      {glow ? <Glow tone={glow} className="-right-24 -top-24" /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

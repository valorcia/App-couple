import * as React from 'react';
import { cn } from '../cn';

/** Panneau imprimé : contour encre, ombre dure ; `night` = affiche encre, `honey` = papier jaune, `blush` = papier rose. */
export function Surface({ tone = 'warm', glow: _glow = null, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'warm' | 'night' | 'honey' | 'blush'; glow?: 'primary' | 'honey' | 'blush' | 'sage' | null }) {
  return (
    <div
      className={cn(
        'relative rounded-md border-2 border-ink shadow-hard',
        tone === 'night' && 'bg-ink text-paper',
        tone === 'warm' && 'bg-bg-elevated',
        tone === 'honey' && 'bg-bg-honey text-ink',
        tone === 'blush' && 'bg-bg-blush',
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

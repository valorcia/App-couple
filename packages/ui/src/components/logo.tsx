import * as React from 'react';
import { cn } from '../cn';

/** Marque : deux cercles (orange, prune) dont le commun est surligné au marqueur, contour encre. Même dessin que l'icône mobile. */
export function Logo({ className, withWordmark = true, size = 28 }: { className?: string; withWordmark?: boolean; size?: number }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <defs><clipPath id={`lens-${id}`}><circle cx="16" cy="20" r="11" /></clipPath></defs>
        <g transform="translate(1.2 1.2)" fill="var(--ink)"><circle cx="16" cy="20" r="11" /><circle cx="22" cy="20" r="11" /></g>
        <circle cx="16" cy="20" r="11" fill="var(--orange, #e0582b)" />
        <circle cx="22" cy="20" r="11" fill="var(--plum)" />
        <g clipPath={`url(#lens-${id})`}><circle cx="22" cy="20" r="11" fill="var(--marker)" /></g>
        <circle cx="16" cy="20" r="11" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
        <circle cx="22" cy="20" r="11" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      </svg>
      {withWordmark ? <span className="font-display text-xl font-bold tracking-tight">Entre Nous</span> : null}
    </span>
  );
}

import * as React from 'react';
import { cn } from '../cn';

/** Marque : deux cercles qui se chevauchent (sans cœur), mot-symbole en Fraunces. */
export function Logo({ className, withWordmark = true, size = 28 }: { className?: string; withWordmark?: boolean; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle cx="12" cy="16" r="10" fill="var(--coral)" opacity="0.9" />
        <circle cx="20" cy="16" r="10" fill="var(--plum)" opacity="0.75" />
      </svg>
      {withWordmark ? <span className="font-display text-xl font-semibold tracking-tight">Entre Nous</span> : null}
    </span>
  );
}

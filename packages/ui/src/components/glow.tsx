import * as React from 'react';
import { cn } from '../cn';

/** Halo décoratif (lampe, bougie) à placer en absolu dans un conteneur `relative overflow-hidden`. */
export function Glow({ className, tone = 'primary', size = 360 }: { className?: string; tone?: 'primary' | 'honey' | 'blush' | 'sage'; size?: number }) {
  const color = tone === 'primary' ? 'var(--primary)' : tone === 'honey' ? 'var(--honey)' : tone === 'sage' ? 'var(--sage)' : 'var(--blush)';
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute rounded-full blur-3xl', className)}
      style={{ width: size, height: size, background: `radial-gradient(circle, color-mix(in oklab, ${color} 42%, transparent), transparent 70%)` }}
    />
  );
}

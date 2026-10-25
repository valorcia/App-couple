import * as React from 'react';
import { cn } from '../cn';

/** Barre de progression (0–100) avec libellé accessible. */
export function Progress({ value, label, className, tone = 'primary' }: { value: number; label: string; className?: string; tone?: 'primary' | 'plum' | 'success' }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label} className={cn('h-2.5 w-full overflow-hidden rounded-sm border border-ink/40 bg-transparent', className)}>
      <div className={cn('h-full transition-[width] duration-300', tone === 'primary' ? 'bg-primary' : tone === 'plum' ? 'bg-ink' : 'bg-success')} style={{ width: `${v}%` }} />
    </div>
  );
}

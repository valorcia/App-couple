'use client';
import * as React from 'react';
import { cn } from '../cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** Choix exclusif (ex. « Maintenant / Ce soir / Ce week-end »). */
export function Segmented<T extends string>({ options, value, onChange, className, ariaLabel }: { options: SegmentedOption<T>[]; value: T | null; onChange: (v: T) => void; className?: string; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid gap-2', options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-sm border-2 px-3 py-2 text-sm font-semibold transition-colors duration-100',
              active ? 'border-ink bg-ink text-paper' : 'border-ink/30 bg-transparent text-fg hover:border-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-sm border-2 px-3.5 text-sm font-semibold transition-colors duration-100',
        active ? 'border-ink bg-ink text-paper' : 'border-ink/30 bg-transparent text-fg hover:border-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

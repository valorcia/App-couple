'use client';
import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../cn';

/** Case à cocher accessible (bouton role=checkbox), utilisée pour listes et tâches. */
export function Checkbox({ checked, onCheckedChange, label, className, disabled }: { checked: boolean; onCheckedChange: (next: boolean) => void; label: string; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
        checked ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-bg-elevated hover:border-primary/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {checked ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}

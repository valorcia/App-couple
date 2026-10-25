import * as React from 'react';
import { cn } from '../cn';

const PALETTE = ['bg-blush text-plum', 'bg-champagne text-plum', 'bg-plum text-ivory', 'bg-coral text-white'];

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold', !src && PALETTE[idx], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={name}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials || '·'}
    </span>
  );
}

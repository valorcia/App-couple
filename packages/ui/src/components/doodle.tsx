import * as React from 'react';
import { cn } from '../cn';

export type DoodleName = 'cup' | 'plaid' | 'candle' | 'garland' | 'notebook' | 'moon' | 'keys' | 'heart-knot' | 'suitcase' | 'sparkle' | 'lock';

/** Pictos « doodle » monochromes, tracés à main levée, pour états vides et en-têtes. Couleur : currentColor. */
export function Doodle({ name, size = 72, className }: { name: DoodleName; size?: number; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden className={cn('shrink-0', className)}>
      {name === 'cup' ? (
        <g {...common}>
          <path d="M18 32c-1 14 3 26 11 30h18c8-4 12-16 11-30Z" />
          <path d="M58 38c7-1 11 3 10 8s-5 7-11 6" />
          <path d="M29 14c-3 4 3 7 0 11M40 12c-3 4 3 7 0 11" strokeWidth={1.8} />
          <path d="M22 66h32" />
        </g>
      ) : name === 'plaid' ? (
        <g {...common}>
          <path d="M14 30c10-6 22-6 32 0s18 6 22 2" />
          <path d="M14 42c10-6 22-6 32 0s18 6 22 2" />
          <path d="M14 54c10-6 22-6 32 0s18 6 22 2" />
          <path d="M14 30v24M68 32v24" />
          <path d="M14 54c-2 6-1 10 2 12M68 56c2 6 1 10-2 12" strokeWidth={1.8} />
        </g>
      ) : name === 'candle' ? (
        <g {...common}>
          <path d="M40 12c-6 8-7 13-3 17 2-2 4-2 6 0 4-4 3-9-3-17Z" />
          <path d="M40 30v8" />
          <rect x="30" y="38" width="20" height="30" rx="4" />
          <path d="M30 44c4 2 8 2 12 0s6-1 8 0" strokeWidth={1.6} />
          <path d="M22 68h36" />
        </g>
      ) : name === 'garland' ? (
        <g {...common}>
          <path d="M8 28c16 18 32 18 48 0s12-4 16 0" />
          <circle cx="24" cy="38" r="4" /><circle cx="40" cy="42" r="4" /><circle cx="56" cy="36" r="4" />
          <path d="M24 34v-5M40 38v-5M56 32v-5" strokeWidth={1.6} />
        </g>
      ) : name === 'notebook' ? (
        <g {...common}>
          <rect x="20" y="14" width="40" height="52" rx="5" />
          <path d="M28 14v52" strokeWidth={1.6} />
          <path d="M36 28h16M36 38h16M36 48h10" strokeWidth={1.8} />
          <path d="M52 10c3 0 4 2 4 4s-1 4-4 4" strokeWidth={1.6} />
        </g>
      ) : name === 'moon' ? (
        <g {...common}>
          <path d="M46 14c-14 4-20 18-14 31s22 17 34 9c-16 2-28-6-28-20 0-8 3-15 8-20Z" />
          <path d="M20 22l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" strokeWidth={1.6} />
          <path d="M60 60l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" strokeWidth={1.4} />
        </g>
      ) : name === 'keys' ? (
        <g {...common}>
          <circle cx="28" cy="30" r="10" />
          <circle cx="28" cy="30" r="3" strokeWidth={1.6} />
          <path d="M36 36l24 24M52 52l6-6M46 46l6-6" />
          <path d="M20 54c-6 2-8 8-4 12s10 2 12-4" strokeWidth={1.8} />
        </g>
      ) : name === 'heart-knot' ? (
        <g {...common}>
          <path d="M40 62C22 50 14 40 18 30c3-7 12-8 17-3l5 5 5-5c5-5 14-4 17 3 4 10-4 20-22 32Z" />
          <path d="M30 40c6 4 14 4 20 0" strokeWidth={1.6} />
        </g>
      ) : name === 'suitcase' ? (
        <g {...common}>
          <rect x="14" y="28" width="52" height="36" rx="6" />
          <path d="M30 28v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" />
          <path d="M14 42h52M28 42v22M52 42v22" strokeWidth={1.6} />
        </g>
      ) : name === 'lock' ? (
        <g {...common}>
          <rect x="20" y="34" width="40" height="32" rx="7" />
          <path d="M28 34v-8a12 12 0 0 1 24 0v8" />
          <circle cx="40" cy="50" r="3.5" /><path d="M40 53v6" strokeWidth={1.8} />
        </g>
      ) : (
        <g {...common}>
          <path d="M40 14l5 15 15 5-15 5-5 15-5-15-15-5 15-5Z" />
          <path d="M62 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" strokeWidth={1.6} />
          <path d="M18 54l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" strokeWidth={1.4} />
        </g>
      )}
    </svg>
  );
}

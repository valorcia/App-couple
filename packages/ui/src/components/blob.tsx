import * as React from 'react';

/** Illustration abstraite signature : formes organiques superposées (blush, champagne, prune). */
export function Blob({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <filter id="en-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <ellipse cx="90" cy="100" rx="70" ry="62" fill="var(--blush)" filter="url(#en-blur)" opacity="0.9" />
      <ellipse cx="125" cy="85" rx="55" ry="60" fill="var(--champagne)" filter="url(#en-blur)" opacity="0.8" />
      <ellipse cx="110" cy="125" rx="40" ry="36" fill="var(--plum)" filter="url(#en-blur)" opacity="0.55" />
      <circle cx="70" cy="70" r="14" fill="var(--coral)" opacity="0.85" />
    </svg>
  );
}

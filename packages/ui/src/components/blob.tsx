import * as React from 'react';

/** Illustration abstraite signature : formes organiques superposées, chaudes et floues (lampe, braise). */
export function Blob({ size = 160, className }: { size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <filter id={`b-${id}`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <ellipse cx="92" cy="104" rx="74" ry="64" fill="var(--blush)" filter={`url(#b-${id})`} opacity="0.95" />
      <ellipse cx="128" cy="82" rx="58" ry="62" fill="var(--champagne)" filter={`url(#b-${id})`} opacity="0.85" />
      <ellipse cx="108" cy="128" rx="44" ry="38" fill="var(--plum)" filter={`url(#b-${id})`} opacity="0.45" />
      <circle cx="68" cy="68" r="16" fill="var(--coral)" opacity="0.9" />
      <circle cx="150" cy="140" r="7" fill="var(--honey)" opacity="0.9" />
    </svg>
  );
}

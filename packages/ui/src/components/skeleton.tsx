import * as React from 'react';
import { cn } from '../cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('rounded-md bg-[linear-gradient(90deg,var(--bg-muted)_25%,var(--bg-elevated)_50%,var(--bg-muted)_75%)] bg-[length:200%_100%] [animation:en-shimmer_1.4s_linear_infinite]', className)}
      {...props}
    />
  );
}

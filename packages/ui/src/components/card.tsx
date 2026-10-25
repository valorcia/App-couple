import * as React from 'react';
import { cn } from '../cn';

export type CardTone = 'default' | 'blush' | 'plum' | 'champagne' | 'honey' | 'night' | 'sage' | 'warm';

/** Feuilles de papier : contour encre fin, angles presque droits, aplats de couleur ; `interactive` = ombre dure au survol. */
const TONES: Record<CardTone, string> = {
  default: 'border border-ink/30 bg-bg-elevated',
  warm: 'border border-ink/30 bg-bg-elevated',
  blush: 'border border-ink/30 bg-bg-blush',
  champagne: 'border border-ink/30 bg-bg-honey text-ink',
  honey: 'border border-ink/30 bg-bg-honey text-ink',
  sage: 'border border-ink/30 bg-bg-sage',
  plum: 'border border-ink bg-ink text-paper',
  night: 'border border-ink bg-ink text-paper',
};

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone; interactive?: boolean }>(
  ({ className, tone = 'default', interactive = false, ...props }, ref) => (
    <div ref={ref} className={cn('relative rounded-md', TONES[tone], interactive && 'hover-lift cursor-pointer', className)} {...props} />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-6 pb-2', className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-display text-xl', className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-fg-muted', className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-2', className)} {...props} />
);
export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
);

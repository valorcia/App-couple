import * as React from 'react';
import { cn } from '../cn';

export type CardTone = 'default' | 'blush' | 'plum' | 'champagne' | 'honey' | 'night' | 'sage' | 'warm';

const TONES: Record<CardTone, string> = {
  default: 'border border-border bg-bg-elevated shadow-card',
  warm: 'surface-warm border border-border/70 shadow-card',
  blush: 'bg-bg-blush border border-transparent',
  champagne: 'bg-accent text-accent-fg border border-transparent',
  honey: 'surface-honey border border-transparent',
  sage: 'bg-bg-sage border border-transparent',
  plum: 'bg-plum text-ivory border border-transparent shadow-soft',
  night: 'surface-night border border-white/5 shadow-soft',
};

/** Carte « coussin » : coins généreux, ombre colorée ; `interactive` ajoute l'élévation au survol. */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone; interactive?: boolean }>(
  ({ className, tone = 'default', interactive = false, ...props }, ref) => (
    <div ref={ref} className={cn('relative rounded-lg', TONES[tone], interactive && 'hover-lift cursor-pointer', className)} {...props} />
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

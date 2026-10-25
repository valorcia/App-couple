import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

/** Étiquettes « tampon » : petites capitales, contour, angles droits. */
const badgeVariants = cva('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0 text-[13px] font-semibold [font-variant-caps:all-small-caps] tracking-[0.08em] leading-5', {
  variants: {
    tone: {
      neutral: 'border-ink/30 bg-transparent text-fg-muted',
      blush: 'border-ink/40 bg-bg-blush text-fg',
      coral: 'border-primary bg-transparent text-primary',
      champagne: 'border-ink/40 bg-bg-honey text-ink',
      honey: 'border-ink/40 bg-bg-honey text-ink',
      sage: 'border-ink/40 bg-bg-sage text-fg',
      night: 'border-ink bg-ink text-paper',
      success: 'border-success text-success',
      warning: 'border-warning text-warning',
      danger: 'border-danger text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

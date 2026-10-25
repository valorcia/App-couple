import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-bg-muted text-fg-muted',
      blush: 'bg-bg-blush text-secondary',
      coral: 'bg-primary/15 text-primary',
      champagne: 'bg-accent text-accent-fg',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-danger/15 text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

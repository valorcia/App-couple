'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium transition-[background-color,transform,box-shadow,color] duration-200 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        primary: 'bg-[linear-gradient(135deg,var(--primary),var(--primary-hover))] text-primary-fg shadow-soft hover:brightness-105 hover:shadow-lift',
        secondary: 'bg-secondary text-secondary-fg hover:bg-secondary-hover shadow-card',
        outline: 'border border-border-strong bg-bg-elevated/60 text-fg hover:bg-bg-muted',
        ghost: 'text-fg hover:bg-bg-muted',
        soft: 'bg-bg-blush text-secondary hover:bg-blush/70',
        honey: 'bg-bg-honey text-accent-fg hover:brightness-[0.98] shadow-card',
        night: 'bg-night-elevated text-night-fg hover:bg-night border border-white/10',
        danger: 'bg-danger text-white hover:brightness-95',
        link: 'text-primary underline-offset-4 hover:underline rounded-none px-0',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-13 px-7 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      // Slot exige un unique enfant React : pas de spinner en mode asChild.
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} aria-busy={loading || undefined} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../cn';

/** Boutons « imprimés » : bloc plein, contour encre, ombre portée dure qui s'écrase au clic. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[transform,box-shadow,background-color,color] duration-100 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'border-2 border-ink bg-primary text-primary-fg shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        secondary: 'border-2 border-ink bg-ink text-paper shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        outline: 'border-2 border-ink bg-transparent text-fg hover:bg-bg-muted active:translate-x-0.5 active:translate-y-0.5',
        ghost: 'text-fg underline-offset-4 hover:underline',
        soft: 'border-2 border-ink bg-bg-blush text-fg shadow-card hover:shadow-lift active:shadow-none',
        honey: 'border-2 border-ink bg-marker text-ink shadow-card hover:shadow-lift active:shadow-none',
        night: 'border-2 border-paper bg-transparent text-paper hover:bg-paper hover:text-ink',
        danger: 'border-2 border-danger bg-danger text-white hover:brightness-95',
        link: 'text-primary underline underline-offset-4 decoration-2 rounded-none px-0',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-13 px-7 text-base',
        xl: 'h-14 px-8 text-lg',
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

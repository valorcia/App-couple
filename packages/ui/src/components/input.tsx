import * as React from 'react';
import { cn } from '../cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'flex h-12 w-full rounded-md border border-border bg-bg-elevated px-4 text-[15px] text-fg placeholder:text-fg-subtle transition-colors duration-150',
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30',
      'disabled:cursor-not-allowed disabled:opacity-60',
      invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger/30',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-[96px] w-full rounded-md border border-border bg-bg-elevated px-4 py-3 text-[15px] text-fg placeholder:text-fg-subtle',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30',
        invalid && 'border-danger',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

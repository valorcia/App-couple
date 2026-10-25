import * as React from 'react';
import { cn } from '../cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/** Liste déroulante native, stylée comme Input. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'flex h-12 w-full rounded-md border border-border bg-bg-elevated px-3 text-[15px] text-fg transition-colors duration-150',
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60',
      invalid && 'border-danger',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

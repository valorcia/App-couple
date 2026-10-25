'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-plum-deep/45 backdrop-blur-[3px] data-[state=open]:animate-[en-fade-up_150ms_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex w-full flex-col gap-4 border-2 border-ink bg-bg-elevated p-6 shadow-lift focus:outline-none',
          'bottom-0 left-0 right-0 rounded-t-md sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md',
          'data-[state=open]:animate-[en-rise_300ms_var(--ease)]',
          className,
        )}
        {...props}
      >
        <div className="mx-auto -mt-2 mb-1 h-1 w-10 bg-ink/40 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <DialogPrimitive.Title className="font-display text-2xl">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-sm text-fg-muted">{description}</DialogPrimitive.Description> : null}
          </div>
          <DialogPrimitive.Close className="rounded-full p-2 text-fg-muted hover:bg-bg-muted" aria-label="Fermer">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

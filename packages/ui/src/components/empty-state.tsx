import * as React from 'react';
import { cn } from '../cn';
import { Blob } from './blob';

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong p-10 text-center', className)}>
      <Blob size={96} />
      <div className="space-y-1">
        <h3 className="font-display text-xl">{title}</h3>
        {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

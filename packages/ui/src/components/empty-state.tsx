import * as React from 'react';
import { cn } from '../cn';
import { Doodle, type DoodleName } from './doodle';

export function EmptyState({ title, description, action, className, doodle = 'cup' }: { title: string; description?: string; action?: React.ReactNode; className?: string; doodle?: DoodleName }) {
  return (
    <div className={cn('flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong bg-bg-elevated/40 p-10 text-center', className)}>
      <Doodle name={doodle} size={72} className="text-secondary/70" />
      <div className="space-y-1">
        <h3 className="font-display text-xl">{title}</h3>
        {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

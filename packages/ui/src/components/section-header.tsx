import * as React from 'react';
import { cn } from '../cn';

/** En-tête de section : surtitre discret, titre Fraunces, note facultative, actions à droite. */
export function SectionHeader({ eyebrow, title, hint, actions, as: Tag = 'h2', className, id }: { eyebrow?: string; title: string; hint?: string; actions?: React.ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string; id?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <Tag id={id} className={cn('text-balance text-secondary', Tag === 'h1' ? 'text-3xl sm:text-4xl lg:text-[2.75rem]' : Tag === 'h2' ? 'text-2xl' : 'text-xl')}>{title}</Tag>
        {hint ? <p className="mt-1 text-pretty text-fg-muted">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

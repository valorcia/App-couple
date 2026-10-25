import * as React from 'react';
import { cn } from '../cn';

/** En-tête éditorial : folio en petites capitales, filet, titre gras. */
export function SectionHeader({ eyebrow, title, hint, actions, as: Tag = 'h2', className, id }: { eyebrow?: string; title: string; hint?: string; actions?: React.ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string; id?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="label-sc mb-2 flex items-center gap-3 before:h-px before:w-8 before:bg-ink/60">{eyebrow}</p> : null}
        <Tag id={id} className={cn('text-balance', Tag === 'h1' ? 'text-[2.6rem] sm:text-5xl lg:text-[3.6rem]' : Tag === 'h2' ? 'text-2xl sm:text-3xl' : 'text-xl')}>{title}</Tag>
        {hint ? <p className="mt-2 max-w-2xl text-pretty text-fg-muted">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

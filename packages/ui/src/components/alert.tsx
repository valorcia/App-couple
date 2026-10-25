import * as React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../cn';

export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'success' | 'danger' | 'warning'; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' || tone === 'warning' ? AlertCircle : Info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border p-4 text-sm',
        tone === 'info' && 'border-info/30 bg-info/10 text-fg',
        tone === 'success' && 'border-success/30 bg-success/10 text-fg',
        tone === 'warning' && 'border-warning/30 bg-warning/10 text-fg',
        tone === 'danger' && 'border-danger/30 bg-danger/10 text-fg',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'info' && 'text-info', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning', tone === 'danger' && 'text-danger')} aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-fg-muted">{children}</div> : null}
      </div>
    </div>
  );
}

import { Doodle, Surface } from '@couple/ui';

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Surface tone="warm" glow="honey" className="p-7 sm:p-9">
      <Doodle name="candle" size={56} className="absolute right-6 top-6 text-honey/80" />
      <div className="max-w-[26rem] space-y-1 pr-14">
        <h1 className="text-3xl text-secondary sm:text-[2.25rem]">{title}</h1>
        {description ? <p className="text-pretty text-fg-muted">{description}</p> : null}
      </div>
      <div className="mt-7 space-y-6">
        {children}
        {footer ? <div className="text-center text-sm text-fg-muted">{footer}</div> : null}
      </div>
    </Surface>
  );
}

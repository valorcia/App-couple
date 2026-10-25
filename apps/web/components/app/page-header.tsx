import { SectionHeader } from '@couple/ui';

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return <SectionHeader as="h1" eyebrow={eyebrow} title={title} hint={subtitle} actions={actions} className="animate-fade-up" />;
}

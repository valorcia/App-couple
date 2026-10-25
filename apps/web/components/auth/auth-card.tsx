import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@couple/ui';

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="p-2">
      <CardHeader>
        <CardTitle className="text-3xl text-secondary">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        {footer ? <div className="text-center text-sm text-fg-muted">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

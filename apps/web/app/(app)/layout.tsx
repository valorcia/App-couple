import { RequireAuth } from '@/components/app/require-auth';
import { AppShell } from '@/components/app/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

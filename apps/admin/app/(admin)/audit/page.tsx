'use client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@couple/ui';
import { api } from '@/lib/api';

interface Entry { id: string; action: string; actorUserId: string | null; actorRole: string | null; targetType: string | null; targetId: string | null; metadata: Record<string, unknown>; ip: string | null; createdAt: string }

export default function AuditPage() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => api.get<{ items: Entry[] }>('/admin/audit', { query: { limit: 100 } }) });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Journal d&apos;audit</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted text-left text-xs uppercase tracking-wider text-fg-muted"><tr><th className="p-3">Date</th><th className="p-3">Action</th><th className="p-3">Acteur</th><th className="p-3">Cible</th><th className="p-3">Détails</th></tr></thead>
          <tbody>
            {audit.isPending ? <tr><td colSpan={5} className="p-3"><Skeleton className="h-6 w-full" /></td></tr> : audit.data?.items.map((e) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap p-3">{new Date(e.createdAt).toLocaleString('fr')}</td>
                <td className="p-3 font-mono text-xs">{e.action}</td>
                <td className="p-3 font-mono text-xs">{e.actorUserId?.slice(0, 8) ?? '—'} {e.actorRole ? `(${e.actorRole})` : ''}</td>
                <td className="p-3 font-mono text-xs">{e.targetType} {e.targetId?.slice(0, 8)}</td>
                <td className="p-3 font-mono text-xs text-fg-muted">{Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

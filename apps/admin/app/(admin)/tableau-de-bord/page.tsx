'use client';
import { useQuery } from '@tanstack/react-query';
import type { AdminStatsDto } from '@couple/types';
import { Card, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get<AdminStatsDto>('/admin/stats') });
  const items: { label: string; key: keyof AdminStatsDto }[] = [
    { label: 'Utilisateurs', key: 'users' },
    { label: 'Actifs 30 j', key: 'activeUsers30d' },
    { label: 'Couples actifs', key: 'couplesActive' },
    { label: 'Couples Premium', key: 'premiumCouples' },
    { label: 'Inscriptions 7 j', key: 'signups7d' },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Tableau de bord</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(({ label, key }) => (
          <Card key={key} className="p-5">
            <p className="text-sm text-fg-muted">{label}</p>
            {stats.isPending ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 font-display text-3xl">{stats.data?.[key] ?? '—'}</p>}
          </Card>
        ))}
      </div>
      <p className="text-sm text-fg-subtle">Chiffre d&apos;affaires, MRR, résiliations, coûts IA et stockage apparaîtront ici dès que les modules de paiement, d&apos;IA et de médias seront en place (Phase 3–4).</p>
    </div>
  );
}

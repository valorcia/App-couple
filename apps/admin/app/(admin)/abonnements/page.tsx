'use client';
import { useQuery } from '@tanstack/react-query';
import type { AdminSubscriptionDto, Page } from '@couple/types';
import { Badge, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';

export default function SubscriptionsPage() {
  const subs = useQuery({ queryKey: ['admin', 'subscriptions'], queryFn: () => api.get<Page<AdminSubscriptionDto>>('/admin/subscriptions', { query: { limit: 100 } }) });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Abonnements</h1>
      <p className="text-sm text-fg-muted">État synchronisé par les webhooks Stripe et RevenueCat. Aucune donnée de paiement n&apos;est stockée ici.</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted text-left text-xs uppercase tracking-wider text-fg-muted"><tr><th className="p-3">Couple</th><th className="p-3">Fournisseur</th><th className="p-3">Produit</th><th className="p-3">Statut</th><th className="p-3">Fin de période</th><th className="p-3">Créé</th></tr></thead>
          <tbody>
            {subs.isPending ? <tr><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr> : subs.data?.items.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-fg-muted">Aucun abonnement.</td></tr> : subs.data?.items.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{s.coupleId.slice(0, 8)}…</td>
                <td className="p-3">{s.provider}</td>
                <td className="p-3 font-mono text-xs">{s.productCode ?? '—'}</td>
                <td className="p-3"><Badge tone={s.status === 'ACTIVE' || s.status === 'TRIALING' ? 'success' : s.status === 'PAST_DUE' ? 'warning' : 'neutral'}>{s.status}</Badge>{s.cancelAtPeriodEnd ? <span className="ml-2 text-xs text-fg-muted">fin programmée</span> : null}</td>
                <td className="p-3">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('fr') : '—'}</td>
                <td className="p-3">{new Date(s.createdAt).toLocaleDateString('fr')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

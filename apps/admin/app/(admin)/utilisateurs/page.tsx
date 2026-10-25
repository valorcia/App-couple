'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminUserDto, Page } from '@couple/types';
import { Alert, Badge, Button, Dialog, DialogContent, Field, Input, Skeleton, Textarea } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = React.useState('');
  const [search, setSearch] = React.useState('');
  const users = useQuery({ queryKey: ['admin', 'users', search], queryFn: () => api.get<Page<AdminUserDto>>('/admin/users', { query: { q: search || undefined, limit: 50 } }) });
  const [target, setTarget] = React.useState<AdminUserDto | null>(null);
  const [reason, setReason] = React.useState('');
  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/admin/users/${id}/suspend`, { reason }),
    onSuccess: () => { setTarget(null); setReason(''); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); },
  });
  const unsuspend = useMutation({ mutationFn: (id: string) => api.post(`/admin/users/${id}/unsuspend`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }) });
  const isAdmin = me?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Utilisateurs</h1>
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="flex gap-2">
        <Input placeholder="E-mail ou prénom" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Button type="submit" variant="outline">Rechercher</Button>
      </form>
      {users.isError ? <Alert tone="danger">{errorMessage(users.error)}</Alert> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted text-left text-xs uppercase tracking-wider text-fg-muted">
            <tr><th className="p-3">Utilisateur</th><th className="p-3">Statut</th><th className="p-3">E-mail vérifié</th><th className="p-3">Couple</th><th className="p-3">Inscription</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {users.isPending ? (
              <tr><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
            ) : users.data?.items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-fg-muted">Aucun résultat.</td></tr>
            ) : (
              users.data?.items.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3"><p className="font-medium">{u.displayName ?? '—'}</p><p className="text-xs text-fg-muted">{u.email}</p></td>
                  <td className="p-3"><Badge tone={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'warning'}>{u.status}</Badge> {u.role !== 'USER' ? <Badge tone="champagne">{u.role}</Badge> : null}</td>
                  <td className="p-3">{u.emailVerified ? 'Oui' : 'Non'}</td>
                  <td className="p-3">{u.coupleId ? <span className="font-mono text-xs">{u.coupleId.slice(0, 8)}…</span> : '—'}</td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString('fr')}</td>
                  <td className="p-3 text-right">
                    {isAdmin && u.role === 'USER' ? (
                      u.status === 'SUSPENDED' ? (
                        <Button size="sm" variant="outline" onClick={() => unsuspend.mutate(u.id)}>Réactiver</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setTarget(u)}>Suspendre</Button>
                      )
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        {target ? (
          <DialogContent title={`Suspendre ${target.displayName ?? target.email}`} description="Toutes ses sessions seront déconnectées. La raison est journalisée.">
            {suspend.isError ? <Alert tone="danger">{errorMessage(suspend.error)}</Alert> : null}
            <Field label="Raison (obligatoire)" htmlFor="reason"><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTarget(null)}>Annuler</Button>
              <Button variant="danger" loading={suspend.isPending} disabled={reason.trim().length < 5} onClick={() => suspend.mutate({ id: target.id, reason })}>Suspendre</Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

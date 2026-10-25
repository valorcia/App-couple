'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Plus, Upload } from 'lucide-react';
import { Alert, Badge, Button, Dialog, DialogContent, Input, Skeleton, Textarea, cn } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ContentEditor, type ContentType } from '@/components/content-editor';

const TYPES: { key: ContentType; label: string }[] = [
  { key: 'questions', label: 'Questions' }, { key: 'challenges', label: 'Défis' }, { key: 'desires', label: 'Envies' }, { key: 'activities', label: 'Idées d’activités' }, { key: 'categories', label: 'Catégories' }, { key: 'packs', label: 'Packs' },
];

export default function ContentPage() {
  const params = useParams<{ type: string }>();
  const type = (TYPES.some((t) => t.key === params.type) ? params.type : 'questions') as ContentType;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [editing, setEditing] = React.useState<Record<string, unknown> | 'new' | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const list = useQuery({ queryKey: ['admin', 'content', type, q, status], queryFn: () => api.get<{ items: Record<string, unknown>[]; nextCursor: string | null }>(`/admin/content/${type}`, { query: { q: q || undefined, status: status || undefined, limit: 100 } }) });
  const counts = useQuery({ queryKey: ['admin', 'content', 'counts'], queryFn: () => api.get<Record<string, Record<string, number> | number>>('/admin/content/counts') });
  const setStatusM = useMutation({ mutationFn: ({ id, s }: { id: string; s: string }) => api.post(`/admin/content/${type}/${id}/status`, { status: s }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'content'] }) });

  const label = (item: Record<string, unknown>) => String(item.text ?? item.title ?? item.name ?? '');
  const sub = (item: Record<string, unknown>) => [item.gameType, (item.category as { name?: string } | undefined)?.name ?? item.category, item.tier, item.locale, item.intensity ? `intensité ${item.intensity}` : null, item.level && type === 'questions' ? `niveau ${item.level}` : null].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl text-secondary">Contenus</h1>
        {isAdmin ? <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" aria-hidden />Importer</Button><Button size="sm" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Créer</Button></div> : null}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Types de contenu">
        {TYPES.map((t) => {
          const c = counts.data?.[t.key];
          const total = typeof c === 'number' ? c : c ? Object.values(c).reduce((a, b) => a + b, 0) : null;
          return <Link key={t.key} href={`/contenus/${t.key}`} className={cn('rounded-pill border px-4 py-1.5 text-sm font-medium', t.key === type ? 'border-secondary bg-secondary text-secondary-fg' : 'border-border hover:bg-bg-muted')}>{t.label}{total !== null && total !== undefined ? ` (${total})` : ''}</Link>;
        })}
      </nav>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut"><option value="">Tous statuts</option><option value="DRAFT">Brouillons</option><option value="PUBLISHED">Publiés</option><option value="ARCHIVED">Archivés</option></select>
      </div>
      {list.isError ? <Alert tone="danger">{errorMessage(list.error)}</Alert> : null}
      <div className="overflow-hidden rounded-lg border border-border">
        {list.isPending ? <div className="p-3"><Skeleton className="h-6 w-full" /></div> : list.data?.items.length === 0 ? <p className="p-6 text-center text-sm text-fg-muted">Aucun contenu.</p> : (
          <ul className="divide-y divide-border">
            {list.data?.items.map((item) => (
              <li key={String(item.id)} className="flex items-center gap-3 p-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => isAdmin && setEditing(item)} disabled={!isAdmin}>
                  <p className="truncate font-medium">{label(item)}</p>
                  <p className="truncate text-xs text-fg-muted">{sub(item)}</p>
                </button>
                {'status' in item ? <Badge tone={item.status === 'PUBLISHED' ? 'success' : item.status === 'DRAFT' ? 'warning' : 'neutral'}>{String(item.status)}</Badge> : null}
                {isAdmin && 'status' in item ? (
                  item.status === 'PUBLISHED'
                    ? <Button size="sm" variant="ghost" onClick={() => setStatusM.mutate({ id: String(item.id), s: 'ARCHIVED' })} aria-label="Archiver"><Archive className="h-4 w-4" /></Button>
                    : <Button size="sm" variant="outline" onClick={() => setStatusM.mutate({ id: String(item.id), s: 'PUBLISHED' })}>Publier</Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ContentEditor type={type} item={editing} onClose={() => setEditing(null)} />
      <ImportDialog type={type} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ImportDialog({ type, open, onClose }: { type: ContentType; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [json, setJson] = React.useState('');
  const [result, setResult] = React.useState<{ imported: number; failed: number; results: { index: number; error?: string }[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const run = useMutation({
    mutationFn: () => api.post<{ imported: number; failed: number; results: { index: number; error?: string }[] }>('/admin/content/import', { type, items: JSON.parse(json) }),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ['admin', 'content'] }); },
    onError: (e) => setError(e instanceof SyntaxError ? 'JSON invalide.' : errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Importer des ${type}`} description="Collez un tableau JSON d'éléments (mêmes champs que le formulaire). Chaque élément est validé ; les erreurs sont listées par index.">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {result ? <Alert tone={result.failed ? 'warning' : 'success'}>{result.imported} importé(s), {result.failed} en erreur.{result.results.filter((r) => r.error).map((r) => <span key={r.index} className="block text-xs">#{r.index} : {r.error}</span>)}</Alert> : null}
        <Textarea rows={10} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-xs" aria-label="JSON" placeholder='[{"gameType":"DILEMMA","text":"…","options":["A","B"],"status":"PUBLISHED"}]' />
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Fermer</Button><Button onClick={() => { setError(null); run.mutate(); }} loading={run.isPending} disabled={!json.trim()}>Importer</Button></div>
      </DialogContent>
    </Dialog>
  );
}

'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Input } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';

interface Row { key: string; value: unknown; description: string | null; isDefault: boolean }

export default function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get<Row[]>('/admin/settings') });
  const save = useMutation({ mutationFn: (r: { key: string; value: unknown }) => api.put('/admin/settings', r), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }) });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Paramètres</h1>
      <p className="text-sm text-fg-muted">Quotas et limites appliqués côté serveur (cache 30 s). Les valeurs par défaut viennent du code ; une valeur enregistrée les remplace.</p>
      {save.isError ? <Alert tone="danger">{errorMessage(save.error)}</Alert> : null}
      <div className="grid gap-3">
        {settings.data?.map((r) => <SettingRow key={r.key} row={r} onSave={(value) => save.mutate({ key: r.key, value })} saving={save.isPending} />)}
      </div>
    </div>
  );
}

function SettingRow({ row, onSave, saving }: { row: Row; onSave: (v: unknown) => void; saving: boolean }) {
  const [raw, setRaw] = React.useState(JSON.stringify(row.value));
  React.useEffect(() => setRaw(JSON.stringify(row.value)), [row.value]);
  let parsed: unknown = undefined;
  let valid = true;
  try { parsed = JSON.parse(raw); } catch { valid = false; }
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex-1"><p className="font-mono text-sm font-medium">{row.key}</p>{row.isDefault ? <p className="text-xs text-fg-subtle">valeur par défaut</p> : null}</div>
      <Input value={raw} onChange={(e) => setRaw(e.target.value)} invalid={!valid} className="sm:max-w-xs font-mono" aria-label={`Valeur de ${row.key}`} />
      <Button size="sm" variant="outline" disabled={!valid || raw === JSON.stringify(row.value)} loading={saving} onClick={() => onSave(parsed)}>Enregistrer</Button>
    </Card>
  );
}

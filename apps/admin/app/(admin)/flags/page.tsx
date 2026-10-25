'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeatureFlagDto } from '@couple/types';
import { Alert, Button, Card, Field, Input, Switch } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';

export default function FlagsPage() {
  const qc = useQueryClient();
  const flags = useQuery({ queryKey: ['admin', 'flags'], queryFn: () => api.get<FeatureFlagDto[]>('/admin/flags') });
  const upsert = useMutation({
    mutationFn: (f: Partial<FeatureFlagDto> & { key: string; enabled: boolean }) => api.put('/admin/flags', { key: f.key, enabled: f.enabled, description: f.description ?? undefined, rules: f.rules ?? {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  });
  const [key, setKey] = React.useState('');
  const [description, setDescription] = React.useState('');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Feature flags</h1>
      {upsert.isError ? <Alert tone="danger">{errorMessage(upsert.error)}</Alert> : null}
      <div className="grid gap-3">
        {flags.data?.map((f) => (
          <Card key={f.key} className="flex items-center justify-between p-4">
            <div><p className="font-mono text-sm font-medium">{f.key}</p>{f.description ? <p className="text-sm text-fg-muted">{f.description}</p> : null}</div>
            <Switch checked={f.enabled} onCheckedChange={(enabled) => upsert.mutate({ ...f, enabled })} aria-label={`Activer ${f.key}`} />
          </Card>
        ))}
        {flags.data?.length === 0 ? <p className="text-sm text-fg-muted">Aucun flag défini.</p> : null}
      </div>
      <Card className="p-5">
        <form onSubmit={(e) => { e.preventDefault(); upsert.mutate({ key, description, enabled: false }); setKey(''); setDescription(''); }} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Field label="Clé" htmlFor="flagKey"><Input id="flagKey" value={key} onChange={(e) => setKey(e.target.value)} placeholder="intimacy.module" pattern="[a-zA-Z0-9_.-]+" required /></Field>
          <Field label="Description" htmlFor="flagDesc"><Input id="flagDesc" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Button type="submit" loading={upsert.isPending}>Ajouter</Button>
        </form>
      </Card>
    </div>
  );
}

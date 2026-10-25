'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductDto } from '@couple/types';
import { Alert, Badge, Button, Card, Field, Input } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';

const empty = { code: '', type: 'SUBSCRIPTION' as 'SUBSCRIPTION' | 'PACK', name: '', priceCents: 499, interval: 'MONTH' as 'MONTH' | 'YEAR' | null, entitlementKey: 'premium', stripePriceId: '', appleProductId: '', googleProductId: '', active: true };

export default function ProductsPage() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: () => api.get<ProductDto[]>('/admin/products') });
  const [form, setForm] = React.useState(empty);
  const upsert = useMutation({
    mutationFn: (p: typeof empty) => api.put('/admin/products', { ...p, interval: p.type === 'PACK' ? null : p.interval, stripePriceId: p.stripePriceId || null, appleProductId: p.appleProductId || null, googleProductId: p.googleProductId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'products'] }); setForm(empty); },
  });
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-secondary">Produits & prix</h1>
      <p className="text-sm text-fg-muted">Les prix sont configurés ici ; les identifiants Stripe / Apple / Google relient chaque produit aux boutiques. Un abonnement donne le droit <code>premium</code> au couple entier.</p>
      <div className="grid gap-3">
        {products.data?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.name} <span className="font-mono text-xs text-fg-muted">{p.code}</span></p>
              <p className="text-sm text-fg-muted">{(p.priceCents / 100).toLocaleString('fr', { style: 'currency', currency: p.currency })}{p.interval ? ` / ${p.interval === 'MONTH' ? 'mois' : 'an'}` : ''} · droit <code>{p.entitlementKey}</code></p>
            </div>
            <div className="flex gap-2"><Badge tone={p.type === 'SUBSCRIPTION' ? 'blush' : 'champagne'}>{p.type}</Badge><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'actif' : 'inactif'}</Badge></div>
          </Card>
        ))}
        {products.data?.length === 0 ? <Alert tone="info">Aucun produit. Créez « premium_monthly » (499) et « premium_yearly » (2999) pour démarrer.</Alert> : null}
      </div>
      <Card className="p-5">
        <h2 className="text-xl">Créer ou mettre à jour</h2>
        {upsert.isError ? <Alert tone="danger" className="mt-3">{errorMessage(upsert.error)}</Alert> : null}
        <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(form); }} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Code" htmlFor="code"><Input id="code" value={form.code} onChange={(e) => set('code', e.target.value)} pattern="[a-z0-9_-]+" required /></Field>
          <Field label="Nom" htmlFor="name"><Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required /></Field>
          <Field label="Type" htmlFor="type">
            <select id="type" className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={form.type} onChange={(e) => set('type', e.target.value as 'SUBSCRIPTION' | 'PACK')}><option value="SUBSCRIPTION">Abonnement</option><option value="PACK">Pack</option></select>
          </Field>
          <Field label="Prix (centimes)" htmlFor="price"><Input id="price" type="number" min={0} value={form.priceCents} onChange={(e) => set('priceCents', Number(e.target.value))} /></Field>
          {form.type === 'SUBSCRIPTION' ? (
            <Field label="Périodicité" htmlFor="interval">
              <select id="interval" className="h-12 rounded-md border border-border bg-bg-elevated px-3" value={form.interval ?? 'MONTH'} onChange={(e) => set('interval', e.target.value as 'MONTH' | 'YEAR')}><option value="MONTH">Mensuel</option><option value="YEAR">Annuel</option></select>
            </Field>
          ) : null}
          <Field label="Clé de droit" htmlFor="ent"><Input id="ent" value={form.entitlementKey} onChange={(e) => set('entitlementKey', e.target.value)} required /></Field>
          <Field label="Stripe price id" htmlFor="stripe"><Input id="stripe" value={form.stripePriceId} onChange={(e) => set('stripePriceId', e.target.value)} /></Field>
          <Field label="Apple product id" htmlFor="apple"><Input id="apple" value={form.appleProductId} onChange={(e) => set('appleProductId', e.target.value)} /></Field>
          <Field label="Google product id" htmlFor="google"><Input id="google" value={form.googleProductId} onChange={(e) => set('googleProductId', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Button type="submit" loading={upsert.isPending}>Enregistrer</Button></div>
        </form>
      </Card>
    </div>
  );
}

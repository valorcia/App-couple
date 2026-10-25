'use client';
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogContent, Field, Input, Textarea } from '@couple/ui';
import { api, errorMessage } from '@/lib/api';

export type ContentType = 'questions' | 'challenges' | 'desires' | 'activities' | 'categories' | 'packs';

/** Description des champs par type : le formulaire est généré, le serveur valide (zod). */
type FieldDef = { key: string; label: string; kind: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'list'; options?: string[]; help?: string };

const COMMON_STATUS: FieldDef = { key: 'status', label: 'Statut', kind: 'select', options: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] };
const TIER: FieldDef = { key: 'tier', label: 'Offre', kind: 'select', options: ['FREE', 'PREMIUM', 'PACK'] };
const LOCALE: FieldDef = { key: 'locale', label: 'Langue', kind: 'select', options: ['fr', 'en', 'es', 'de', 'it'] };

export const FIELDS: Record<ContentType, FieldDef[]> = {
  questions: [
    { key: 'gameType', label: 'Jeu', kind: 'select', options: ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CONFESSIONS', 'MEMORY_QUIZ'] },
    { key: 'text', label: 'Question', kind: 'textarea' },
    { key: 'options', label: 'Options (dilemme)', kind: 'list', help: 'Une par ligne, exactement deux pour un dilemme.' },
    { key: 'categoryCode', label: 'Catégorie (code)', kind: 'text' },
    { key: 'level', label: 'Niveau (1-4)', kind: 'number' },
    TIER, { key: 'packCode', label: 'Pack (code)', kind: 'text' }, LOCALE, COMMON_STATUS,
    { key: 'tags', label: 'Tags', kind: 'list' },
  ],
  challenges: [
    { key: 'title', label: 'Titre', kind: 'text' }, { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'instructions', label: 'Déroulé', kind: 'list', help: 'Une étape par ligne.' },
    { key: 'durationMinutes', label: 'Durée (min)', kind: 'number' },
    { key: 'difficulty', label: 'Difficulté', kind: 'select', options: ['EASY', 'MEDIUM', 'HARD'] },
    { key: 'budget', label: 'Budget', kind: 'select', options: ['FREE', 'LOW', 'MEDIUM', 'HIGH'] },
    { key: 'materials', label: 'Matériel', kind: 'list' }, { key: 'intimate', label: 'Intime (espace Intimité requis)', kind: 'boolean' },
    { key: 'categoryCode', label: 'Catégorie (code)', kind: 'text' }, TIER, { key: 'packCode', label: 'Pack (code)', kind: 'text' }, LOCALE, COMMON_STATUS, { key: 'tags', label: 'Tags', kind: 'list' },
  ],
  desires: [
    { key: 'text', label: 'Envie', kind: 'textarea' },
    { key: 'category', label: 'Catégorie', kind: 'select', options: ['tenderness', 'romance', 'seduction', 'complicity', 'desires', 'fantasies', 'experiences'] },
    { key: 'intensity', label: 'Intensité (1-4)', kind: 'number' }, TIER, { key: 'packCode', label: 'Pack (code)', kind: 'text' }, LOCALE, COMMON_STATUS,
  ],
  activities: [
    { key: 'title', label: 'Titre', kind: 'text' }, { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'moods', label: 'Ambiances', kind: 'list', help: 'ROMANTIC, FUNNY, RELAX, ADVENTURE, CULTURE, FOOD, SPICY' },
    { key: 'moments', label: 'Moments', kind: 'list', help: 'NOW, TONIGHT, WEEKEND, DATE' },
    { key: 'company', label: 'Compagnie', kind: 'list', help: 'COUPLE, FAMILY' },
    { key: 'budget', label: 'Budget', kind: 'select', options: ['FREE', 'LOW', 'MEDIUM', 'HIGH'] },
    { key: 'durationMinutes', label: 'Durée (min)', kind: 'number' }, { key: 'indoor', label: 'Intérieur', kind: 'boolean' }, { key: 'intimate', label: 'Intime', kind: 'boolean' },
    TIER, LOCALE, COMMON_STATUS, { key: 'tags', label: 'Tags', kind: 'list' },
  ],
  categories: [
    { key: 'code', label: 'Code', kind: 'text' }, { key: 'name', label: 'Nom', kind: 'text' }, { key: 'description', label: 'Description', kind: 'textarea' }, { key: 'icon', label: 'Icône', kind: 'text' },
    { key: 'gameTypes', label: 'Jeux', kind: 'list', help: 'SECRET_ANSWERS, WHO_KNOWS_BEST, DILEMMA, WHICH_OF_US, CHALLENGE, CONFESSIONS, MEMORY_QUIZ' },
    { key: 'sortOrder', label: 'Ordre', kind: 'number' }, COMMON_STATUS,
  ],
  packs: [
    { key: 'code', label: 'Code', kind: 'text' }, { key: 'name', label: 'Nom', kind: 'text' }, { key: 'description', label: 'Description', kind: 'textarea' }, { key: 'productCode', label: 'Produit (code)', kind: 'text' }, COMMON_STATUS,
  ],
};

const DEFAULTS: Record<ContentType, Record<string, unknown>> = {
  questions: { gameType: 'SECRET_ANSWERS', level: 1, tier: 'FREE', locale: 'fr', status: 'DRAFT', tags: [] },
  challenges: { difficulty: 'EASY', budget: 'FREE', tier: 'FREE', locale: 'fr', status: 'DRAFT', instructions: [], materials: [], tags: [], intimate: false },
  desires: { category: 'tenderness', intensity: 1, tier: 'FREE', locale: 'fr', status: 'DRAFT' },
  activities: { moods: ['RELAX'], moments: ['WEEKEND'], company: ['COUPLE'], budget: 'FREE', indoor: true, intimate: false, tier: 'FREE', locale: 'fr', status: 'DRAFT', tags: [] },
  categories: { gameTypes: [], sortOrder: 0, status: 'PUBLISHED' },
  packs: { status: 'DRAFT' },
};

function toForm(type: ContentType, item: Record<string, unknown> | null): Record<string, unknown> {
  if (!item) return { ...DEFAULTS[type] };
  const f: Record<string, unknown> = { ...DEFAULTS[type], ...item };
  if (type === 'questions') f.options = (item.payload as { options?: string[] } | undefined)?.options ?? [];
  if ('category' in item && item.category && typeof item.category === 'object') f.categoryCode = (item.category as { code: string }).code;
  if ('pack' in item && item.pack && typeof item.pack === 'object') f.packCode = (item.pack as { code: string }).code;
  if ('product' in item && item.product && typeof item.product === 'object') f.productCode = (item.product as { code: string }).code;
  return f;
}

export function ContentEditor({ type, item, onClose }: { type: ContentType; item: Record<string, unknown> | null | 'new'; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Record<string, unknown>>({});
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { setForm(toForm(type, item === 'new' ? null : item)); setError(null); }, [type, item]);
  const id = item && item !== 'new' ? (item.id as string) : null;
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      for (const f of FIELDS[type]) {
        const v = form[f.key];
        if (v === '' || v === undefined) continue;
        body[f.key] = f.kind === 'number' ? Number(v) : v;
      }
      if (type === 'questions' && Array.isArray(body.options) && (body.options as string[]).length === 0) delete body.options;
      return id ? api.put(`/admin/content/${type}/${id}`, body) : api.post(`/admin/content/${type}`, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content'] }); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  if (!item) return null;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={id ? 'Modifier' : 'Créer'} className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          {FIELDS[type].map((f) => {
            const v = form[f.key];
            const set = (val: unknown) => setForm((x) => ({ ...x, [f.key]: val }));
            const htmlId = `f-${f.key}`;
            if (f.kind === 'boolean') return <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} />{f.label}</label>;
            if (f.kind === 'select') return <Field key={f.key} label={f.label} htmlFor={htmlId}><select id={htmlId} className="h-11 w-full rounded-md border border-border bg-bg-elevated px-3" value={String(v ?? '')} onChange={(e) => set(e.target.value)}>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select></Field>;
            if (f.kind === 'list') return <Field key={f.key} label={f.label} htmlFor={htmlId} hint={f.help}><Textarea id={htmlId} rows={3} value={Array.isArray(v) ? (v as string[]).join('\n') : ''} onChange={(e) => set(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} /></Field>;
            if (f.kind === 'textarea') return <Field key={f.key} label={f.label} htmlFor={htmlId}><Textarea id={htmlId} rows={3} value={String(v ?? '')} onChange={(e) => set(e.target.value)} /></Field>;
            return <Field key={f.key} label={f.label} htmlFor={htmlId} hint={f.help}><Input id={htmlId} type={f.kind === 'number' ? 'number' : 'text'} value={v === null || v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value)} /></Field>;
          })}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" loading={save.isPending}>Enregistrer</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

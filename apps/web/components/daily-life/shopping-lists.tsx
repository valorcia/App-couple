'use client';
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react';
import type { ShoppingListDto } from '@couple/types';
import { Alert, Button, Checkbox, Dialog, DialogClose, DialogContent, EmptyState, Field, Input, Skeleton, cn } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';
import { useRealtimeInvalidation } from '@/lib/realtime';

const KEY = ['shopping-lists'] as const;

export function ShoppingLists() {
  const t = useTranslations('daily.shopping');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = React.useState(false);
  const lists = useQuery({ queryKey: [...KEY, showArchived], queryFn: () => api.get<ShoppingListDto[]>('/shopping-lists', { query: { archived: showArchived ? 'true' : undefined } }) });
  useRealtimeInvalidation('shopping.changed', [KEY]);
  const [creating, setCreating] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const data = lists.data ?? [];
  const selected = data.find((l) => l.id === selectedId) ?? data[0] ?? null;
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden />{t('newList')}</Button>
        <button type="button" className="text-sm text-fg-muted underline-offset-4 hover:underline" onClick={() => setShowArchived((v) => !v)}>{showArchived ? t('hideArchived') : t('showArchived')}</button>
      </div>

      {lists.isPending ? <div className="grid gap-4 md:grid-cols-[18rem_1fr]"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-72 rounded-lg" /></div> : data.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} action={<Button onClick={() => setCreating(true)}>{t('newList')}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
          <ul className="flex flex-col gap-2" aria-label={t('listsLabel')}>
            {data.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => setSelectedId(l.id)} aria-current={selected?.id === l.id ? 'true' : undefined} className={cn('flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors', selected?.id === l.id ? 'border-primary bg-primary/5' : 'border-border bg-bg-elevated hover:bg-bg-muted')}>
                  <span className="flex items-center justify-between gap-2 font-medium">{l.name}{l.archivedAt ? <span className="text-xs font-normal text-fg-subtle">{t('archived')}</span> : null}</span>
                  <span className="text-xs text-fg-muted">{t('items', { count: l.itemCount })}{l.checkedCount ? ` · ${t('checked', { count: l.checkedCount })}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? <ListPanel list={selected} onChanged={invalidate} /> : null}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title={t('newList')}>
          <CreateListForm onCreated={(l) => { setCreating(false); setSelectedId(l.id); void invalidate(); }} cancelLabel={tc('cancel')} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateListForm({ onCreated, cancelLabel }: { onCreated: (l: ShoppingListDto) => void; cancelLabel: string }) {
  const t = useTranslations('daily.shopping');
  const [name, setName] = React.useState('');
  const errorMessage = useApiErrorMessage();
  const create = useMutation({ mutationFn: () => api.post<ShoppingListDto>('/shopping-lists', { name: name.trim() }), onSuccess: onCreated });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}>
      <Field label={t('listName')} htmlFor="sl-name"><Input id="sl-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('listNamePlaceholder')} maxLength={60} /></Field>
      {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
      <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="ghost">{cancelLabel}</Button></DialogClose><Button type="submit" loading={create.isPending} disabled={!name.trim()}>{t('create')}</Button></div>
    </form>
  );
}

function ListPanel({ list, onChanged }: { list: ShoppingListDto; onChanged: () => void }) {
  const t = useTranslations('daily.shopping');
  const { user } = useAuth();
  const errorMessage = useApiErrorMessage();
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [category, setCategory] = React.useState('');
  const base = `/shopping-lists/${list.id}`;
  const add = useMutation({
    mutationFn: () => api.post<ShoppingListDto>(`${base}/items`, { name: name.trim(), quantity: quantity.trim() || null, category: category.trim() || null }),
    onSuccess: () => { setName(''); setQuantity(''); onChanged(); },
  });
  const toggle = useMutation({ mutationFn: ({ id, checked }: { id: string; checked: boolean }) => api.patch<ShoppingListDto>(`${base}/items/${id}`, { checked }), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: (id: string) => api.delete<ShoppingListDto>(`${base}/items/${id}`), onSuccess: onChanged });
  const clear = useMutation({ mutationFn: () => api.post<ShoppingListDto>(`${base}/clear-checked`), onSuccess: onChanged });
  const archive = useMutation({ mutationFn: (archived: boolean) => api.patch<ShoppingListDto>(base, { archived }), onSuccess: onChanged });
  const del = useMutation({ mutationFn: () => api.delete<void>(base), onSuccess: onChanged });
  const partnerName = user?.couple?.partner?.profile.displayName ?? '';
  const whoChecked = (id: string | null) => (id === user?.id ? user?.profile.displayName : partnerName) ?? '';

  return (
    <section className="rounded-lg border border-border bg-bg-elevated p-5" aria-labelledby={`list-${list.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`list-${list.id}`} className="text-2xl">{list.name}</h2>
          <p className="text-sm text-fg-muted">{t('items', { count: list.itemCount })}{list.checkedCount ? ` · ${t('checked', { count: list.checkedCount })}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.checkedCount > 0 ? <Button variant="outline" size="sm" onClick={() => clear.mutate()} loading={clear.isPending}>{t('clearChecked')}</Button> : null}
          <Button variant="ghost" size="sm" onClick={() => archive.mutate(!list.archivedAt)} loading={archive.isPending}>{list.archivedAt ? <><ArchiveRestore className="h-4 w-4" aria-hidden />{t('unarchive')}</> : <><Archive className="h-4 w-4" aria-hidden />{t('archive')}</>}</Button>
          <Button variant="ghost" size="sm" className="text-danger" onClick={() => { if (window.confirm(t('deleteConfirm'))) del.mutate(); }} loading={del.isPending}><Trash2 className="h-4 w-4" aria-hidden />{t('delete')}</Button>
        </div>
      </div>

      <form className="mt-5 grid gap-2 sm:grid-cols-[1fr_8rem_10rem_auto]" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add.mutate(); }} aria-label={t('addItem')}>
        <Input aria-label={t('itemName')} placeholder={t('itemNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Input aria-label={t('quantity')} placeholder={t('quantityPlaceholder')} value={quantity} onChange={(e) => setQuantity(e.target.value)} maxLength={20} />
        <Input aria-label={t('category')} placeholder={t('categoryPlaceholder')} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={30} list={`cats-${list.id}`} />
        <datalist id={`cats-${list.id}`}>{Array.from(new Set(list.items.map((i) => i.category).filter(Boolean))).map((c) => <option key={c!} value={c!} />)}</datalist>
        <Button type="submit" loading={add.isPending} disabled={!name.trim()}><Plus className="h-4 w-4" aria-hidden />{t('addItem')}</Button>
      </form>
      {add.isError ? <Alert tone="danger" className="mt-3">{errorMessage(add.error)}</Alert> : null}

      {list.items.length === 0 ? <p className="mt-6 text-sm text-fg-muted">{t('noItems')}</p> : (
        <ul className="mt-5 divide-y divide-border">
          {list.items.map((item) => (
            <li key={item.id} className={cn('flex items-center gap-3 py-3', item.checkedAt && 'text-fg-subtle')}>
              <Checkbox checked={!!item.checkedAt} onCheckedChange={(checked) => toggle.mutate({ id: item.id, checked })} label={t('toggle', { name: item.name })} />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate', item.checkedAt && 'line-through')}>{item.name}{item.quantity ? <span className="ml-2 text-sm text-fg-muted">{item.quantity}</span> : null}</p>
                <p className="text-xs text-fg-subtle">{[item.category, item.checkedAt ? t('checkedBy', { name: whoChecked(item.checkedByUserId) }) : null].filter(Boolean).join(' · ')}</p>
              </div>
              <button type="button" className="rounded-full p-2 text-fg-subtle hover:bg-bg-muted hover:text-danger" aria-label={`${t('delete')} ${item.name}`} onClick={() => remove.mutate(item.id)}><Trash2 className="h-4 w-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

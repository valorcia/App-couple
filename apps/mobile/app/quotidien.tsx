import * as React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import type { ProjectDto, ShoppingListDto, TaskDto } from '@couple/types';
import { Button, Card, ErrorBanner, Field, Muted, Screen } from '@/components/ui';
import { Checkbox } from '@/components/checkbox';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { fmtDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/lib/theme';

type Tab = 'shopping' | 'tasks' | 'projects';
const TABS: { key: Tab; label: string }[] = [{ key: 'shopping', label: 'Courses' }, { key: 'tasks', label: 'Tâches' }, { key: 'projects', label: 'Projets' }];

export default function DailyScreen() {
  const t = useTheme();
  const [tab, setTab] = React.useState<Tab>('shopping');
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Notre quotidien', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(4) }}>
        {TABS.map((x) => (
          <Pressable key={x.key} accessibilityRole="tab" accessibilityState={{ selected: tab === x.key }} onPress={() => setTab(x.key)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: tab === x.key ? t.primary : t.border, backgroundColor: tab === x.key ? `${t.primary}1A` : t.bgElevated }}>
            <Text style={{ color: tab === x.key ? t.primary : t.fg, fontWeight: '600' }}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'shopping' ? <Shopping /> : tab === 'tasks' ? <Tasks /> : <Projects />}
    </Screen>
  );
}

// ------------------------------------------------------------------ Courses
function Shopping() {
  const t = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const lists = useQuery({ queryKey: ['shopping-lists'], queryFn: () => api.get<ShoppingListDto[]>('/shopping-lists') });
  useRealtimeInvalidation('shopping.changed', [['shopping-lists']]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newList, setNewList] = React.useState('');
  const [item, setItem] = React.useState('');
  const [qty, setQty] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['shopping-lists'] });
  const onError = (e: unknown) => setError(tError(errorCode(e)));
  const create = useMutation({ mutationFn: () => api.post<ShoppingListDto>('/shopping-lists', { name: newList.trim() }), onSuccess: (l) => { setNewList(''); setSelectedId(l.id); void refresh(); }, onError });
  const add = useMutation({ mutationFn: (listId: string) => api.post<ShoppingListDto>(`/shopping-lists/${listId}/items`, { name: item.trim(), quantity: qty.trim() || null }), onSuccess: () => { setItem(''); setQty(''); void refresh(); }, onError });
  const toggle = useMutation({ mutationFn: ({ listId, id, checked }: { listId: string; id: string; checked: boolean }) => api.patch<ShoppingListDto>(`/shopping-lists/${listId}/items/${id}`, { checked }), onSuccess: refresh, onError });
  const clear = useMutation({ mutationFn: (listId: string) => api.post<ShoppingListDto>(`/shopping-lists/${listId}/clear-checked`, {}), onSuccess: refresh, onError });
  const data = lists.data ?? [];
  const selected = data.find((l) => l.id === selectedId) ?? null;
  const partner = user?.couple?.partner;
  const who = (id: string | null) => (id === user?.id ? user?.profile.displayName : partner?.profile.displayName) ?? '';

  if (selected) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} keyboardShouldPersistTaps="handled">
        <Button title="← Toutes les listes" variant="ghost" onPress={() => setSelectedId(null)} />
        <Text style={{ color: t.secondary, fontSize: 24, fontWeight: '600', marginVertical: spacing(2) }}>{selected.name}</Text>
        <ErrorBanner message={error} />
        <Card>
          <Field label="Article" placeholder="Tomates" value={item} onChangeText={setItem} maxLength={80} returnKeyType="done" onSubmitEditing={() => item.trim() && add.mutate(selected.id)} />
          <Field label="Quantité (facultatif)" placeholder="1 kg" value={qty} onChangeText={setQty} maxLength={20} />
          <Button title="Ajouter" onPress={() => add.mutate(selected.id)} loading={add.isPending} disabled={!item.trim()} />
        </Card>
        <View style={{ height: spacing(3) }} />
        {selected.items.length === 0 ? <Muted>Liste vide : ajoutez un premier article.</Muted> : selected.items.map((i) => (
          <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Checkbox checked={!!i.checkedAt} onChange={(checked) => toggle.mutate({ listId: selected.id, id: i.id, checked })} label={`Cocher ${i.name}`} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: i.checkedAt ? t.fgSubtle : t.fg, fontSize: 16, textDecorationLine: i.checkedAt ? 'line-through' : 'none' }}>{i.name}{i.quantity ? `  ${i.quantity}` : ''}</Text>
              {i.checkedAt ? <Muted>{`Coché par ${who(i.checkedByUserId)}`}</Muted> : i.category ? <Muted>{i.category}</Muted> : null}
            </View>
          </View>
        ))}
        {selected.checkedCount > 0 ? <View style={{ marginTop: spacing(4) }}><Button title="Retirer les articles cochés" variant="secondary" onPress={() => clear.mutate(selected.id)} loading={clear.isPending} /></View> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <Card>
        <Field label="Nouvelle liste" placeholder="Courses de la semaine" value={newList} onChangeText={setNewList} maxLength={60} />
        <Button title="Créer la liste" onPress={() => create.mutate()} loading={create.isPending} disabled={!newList.trim()} />
      </Card>
      <View style={{ height: spacing(3) }} />
      {lists.isPending ? <Muted>Chargement…</Muted> : data.length === 0 ? <Muted>Aucune liste pour l&apos;instant. Chaque article coché apparaît instantanément chez votre partenaire.</Muted> : data.map((l) => (
        <Pressable key={l.id} onPress={() => setSelectedId(l.id)} accessibilityRole="button">
          <Card style={{ marginBottom: spacing(2) }}>
            <Text style={{ color: t.fg, fontSize: 17, fontWeight: '600' }}>{l.name}</Text>
            <Muted>{`${l.itemCount} article(s)${l.checkedCount ? ` · ${l.checkedCount} coché(s)` : ''}`}</Muted>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ Tâches
export function Tasks({ projectId }: { projectId?: string }) {
  const t = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const partner = user?.couple?.partner ?? null;
  const [filter, setFilter] = React.useState<'OPEN' | 'DONE'>('OPEN');
  const tasks = useQuery({ queryKey: ['tasks', filter, projectId ?? null], queryFn: () => api.get<TaskDto[]>('/tasks', { query: { status: filter, projectId } }) });
  useRealtimeInvalidation('task.changed', [['tasks'], ['projects']]);
  const [title, setTitle] = React.useState('');
  const [assignee, setAssignee] = React.useState<'none' | 'me' | 'partner'>('none');
  const [error, setError] = React.useState<string | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['tasks'] }), qc.invalidateQueries({ queryKey: ['projects'] })]);
  const onError = (e: unknown) => setError(tError(errorCode(e)));
  const create = useMutation({
    mutationFn: () => api.post<TaskDto>('/tasks', { title: title.trim(), assigneeUserId: assignee === 'me' ? user?.id : assignee === 'partner' ? partner?.id : null, projectId: projectId ?? null, priority: 'MEDIUM' }),
    onSuccess: () => { setTitle(''); setAssignee('none'); void refresh(); }, onError,
  });
  const toggle = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<TaskDto>(`/tasks/${id}`, { status: done ? 'DONE' : 'OPEN' }), onSuccess: refresh, onError });
  const nameOf = (id: string | null) => (id === user?.id ? user?.profile.displayName : id === partner?.id ? partner?.profile.displayName : null) ?? null;
  const chip = (key: typeof assignee, label: string) => (
    <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: assignee === key }} onPress={() => setAssignee(key)} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radius.pill, borderWidth: 1, borderColor: assignee === key ? t.primary : t.border, backgroundColor: assignee === key ? `${t.primary}1A` : t.bgElevated }}>
      <Text style={{ color: assignee === key ? t.primary : t.fg, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
  const data = tasks.data ?? [];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} keyboardShouldPersistTaps="handled" scrollEnabled={!projectId}>
      <ErrorBanner message={error} />
      <Card>
        <Field label="Nouvelle tâche" placeholder="Appeler le plombier" value={title} onChangeText={setTitle} maxLength={120} />
        <Text style={{ color: t.fg, fontWeight: '500', marginBottom: spacing(1.5) }}>Qui s&apos;en occupe ?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(4) }}>
          {chip('none', 'On verra')}{chip('me', 'Moi')}{partner ? chip('partner', partner.profile.displayName) : null}
        </View>
        <Button title="Ajouter la tâche" onPress={() => create.mutate()} loading={create.isPending} disabled={!title.trim()} />
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing(2), marginVertical: spacing(3) }}>
        {(['OPEN', 'DONE'] as const).map((f) => (
          <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radius.pill, backgroundColor: filter === f ? t.secondary : t.bgMuted }}>
            <Text style={{ color: filter === f ? t.secondaryFg : t.fg, fontWeight: '500' }}>{f === 'OPEN' ? 'À faire' : 'Terminées'}</Text>
          </Pressable>
        ))}
      </View>
      {tasks.isPending ? <Muted>Chargement…</Muted> : data.length === 0 ? <Muted>{filter === 'OPEN' ? 'Rien à faire pour le moment. Pas de classement, pas de score.' : 'Aucune tâche terminée.'}</Muted> : data.map((task) => {
        const done = task.status === 'DONE';
        const overdue = !done && !!task.dueAt && new Date(task.dueAt).getTime() < Date.now();
        return (
          <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Checkbox checked={done} onChange={(d) => toggle.mutate({ id: task.id, done: d })} label={done ? `Rouvrir ${task.title}` : `Terminer ${task.title}`} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: done ? t.fgSubtle : t.fg, fontSize: 16, fontWeight: '500', textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</Text>
              <Text style={{ color: overdue ? t.danger : t.fgMuted, fontSize: 13 }}>{[nameOf(task.assigneeUserId) ?? 'Non attribuée', task.dueAt ? fmtDay(task.dueAt) : null, task.rrule ? 'récurrente' : null, task.priority === 'HIGH' ? 'priorité haute' : null, task.comments.length ? `${task.comments.length} commentaire(s)` : null].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ Projets
const TEMPLATES: { code: string; label: string }[] = [
  { code: 'custom', label: 'Projet libre' }, { code: 'trip', label: 'Voyage' }, { code: 'house', label: 'Acheter un logement' }, { code: 'wedding', label: 'Mariage / union' },
  { code: 'renovation', label: 'Travaux' }, { code: 'baby', label: 'Arrivée d’un enfant' }, { code: 'move', label: 'Déménagement' },
];
export const templateLabel = (code: string | null) => TEMPLATES.find((x) => x.code === code)?.label ?? 'Projet';

function Projects() {
  const t = useTheme();
  const qc = useQueryClient();
  const router = useRouter();
  const projects = useQuery({ queryKey: ['projects', 'list'], queryFn: () => api.get<ProjectDto[]>('/projects') });
  useRealtimeInvalidation('project.changed', [['projects']]);
  const [title, setTitle] = React.useState('');
  const [templateCode, setTemplate] = React.useState('custom');
  const [error, setError] = React.useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => api.post<ProjectDto>('/projects', { templateCode, title: title.trim() }),
    onSuccess: (p) => { setTitle(''); void qc.invalidateQueries({ queryKey: ['projects'] }); router.push({ pathname: '/projets/[id]', params: { id: p.id } }); },
    onError: (e) => setError(tError(errorCode(e))),
  });
  const data = projects.data ?? [];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <Card>
        <Text style={{ color: t.fg, fontWeight: '500', marginBottom: spacing(1.5) }}>Type de projet</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(4) }}>
          {TEMPLATES.map((x) => (
            <Pressable key={x.code} accessibilityRole="radio" accessibilityState={{ checked: templateCode === x.code }} onPress={() => setTemplate(x.code)} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radius.pill, borderWidth: 1, borderColor: templateCode === x.code ? t.primary : t.border, backgroundColor: templateCode === x.code ? `${t.primary}1A` : t.bgElevated }}>
              <Text style={{ color: templateCode === x.code ? t.primary : t.fg }}>{x.label}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Nom du projet" placeholder="Lisbonne au printemps" value={title} onChangeText={setTitle} maxLength={100} />
        <Button title="Créer le projet" onPress={() => create.mutate()} loading={create.isPending} disabled={!title.trim()} />
      </Card>
      <View style={{ height: spacing(3) }} />
      {projects.isPending ? <Muted>Chargement…</Muted> : data.length === 0 ? <Muted>Aucun projet en cours. Un voyage, un déménagement : avancez étape par étape, ensemble.</Muted> : data.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/projets/[id]', params: { id: p.id } })}>
          <Card style={{ marginBottom: spacing(2) }}>
            <Muted>{templateLabel(p.templateCode)}{p.status !== 'ACTIVE' ? ` · ${p.status === 'COMPLETED' ? 'Réalisé' : 'Archivé'}` : ''}</Muted>
            <Text style={{ color: t.fg, fontSize: 17, fontWeight: '600' }}>{p.title}</Text>
            <ProgressBar value={p.progress} />
            <Muted>{`${p.steps.filter((s) => s.completedAt).length}/${p.steps.length} étapes · ${p.openTasks} tâche(s) ouverte(s)`}</Muted>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }} style={{ height: 8, borderRadius: 4, backgroundColor: t.bgMuted, marginVertical: spacing(2), overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: t.primary }} />
    </View>
  );
}

/** Champ texte multi-lignes (notes). */
export function NoteInput({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (v: string) => void; placeholder: string; label: string }) {
  const t = useTheme();
  return <TextInput multiline accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={t.fgSubtle} value={value} onChangeText={onChangeText} style={{ minHeight: 80, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgElevated, color: t.fg, padding: spacing(3), fontSize: 16, textAlignVertical: 'top', marginBottom: spacing(2) }} />;
}

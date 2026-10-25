import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ProjectDto } from '@couple/types';
import { Button, Card, ErrorBanner, Field, Muted, Screen } from '@/components/ui';
import { Checkbox } from '@/components/checkbox';
import { api, errorCode } from '@/lib/api';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { fmtAgo } from '@/lib/format';
import { spacing, useTheme } from '@/lib/theme';
import { NoteInput, ProgressBar, Tasks, templateLabel } from '../quotidien';

export default function ProjectScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const base = `/projects/${id}`;
  const q = useQuery({ queryKey: ['projects', id], queryFn: () => api.get<ProjectDto>(base), enabled: !!id, retry: false });
  useRealtimeInvalidation('project.changed', [['projects']]);
  const [step, setStep] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['projects'] });
  const onError = (e: unknown) => setError(tError(errorCode(e)));
  const addStep = useMutation({ mutationFn: () => api.post<ProjectDto>(`${base}/steps`, { title: step.trim() }), onSuccess: () => { setStep(''); void refresh(); }, onError });
  const toggleStep = useMutation({ mutationFn: ({ stepId, completed }: { stepId: string; completed: boolean }) => api.patch<ProjectDto>(`${base}/steps/${stepId}`, { completed }), onSuccess: refresh, onError });
  const addNote = useMutation({ mutationFn: () => api.post<ProjectDto>(`${base}/notes`, { body: note.trim() }), onSuccess: () => { setNote(''); void refresh(); }, onError });
  const setStatus = useMutation({ mutationFn: (status: ProjectDto['status']) => api.patch<ProjectDto>(base, { status }), onSuccess: refresh, onError });
  const p = q.data;
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: p?.title ?? 'Projet', headerStyle: { backgroundColor: t.bg }, headerTintColor: t.secondary }} />
      {q.isPending ? <Muted>Chargement…</Muted> : q.isError || !p ? (
        <Card><Muted>{q.error && errorCode(q.error) === 'NOT_FOUND' ? 'Projet introuvable.' : tError(errorCode(q.error))}</Muted><View style={{ height: spacing(3) }} /><Button title="Retour" variant="ghost" onPress={() => router.back()} /></Card>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing(10) }} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />
          <Card>
            <Muted>{templateLabel(p.templateCode)}{p.status !== 'ACTIVE' ? ` · ${p.status === 'COMPLETED' ? 'Réalisé' : 'Archivé'}` : ''}</Muted>
            {p.goal ? <Text style={{ color: t.fg, marginTop: spacing(1) }}>{p.goal}</Text> : null}
            <ProgressBar value={p.progress} />
            <Muted>{`${p.progress} % réalisé · ${p.steps.filter((s) => s.completedAt).length}/${p.steps.length} étapes`}</Muted>
            {p.budgetCents !== null || p.targetAt ? <Muted>{[p.budgetCents !== null ? `Budget ${(p.budgetCents / 100).toLocaleString('fr-FR')} ${p.currency === 'EUR' ? '€' : p.currency}` : null, p.targetAt ? `Objectif ${p.targetAt}` : null].filter(Boolean).join(' · ')}</Muted> : null}
            <View style={{ height: spacing(3) }} />
            {p.status === 'ACTIVE' ? <Button title="Marquer comme réalisé" variant="secondary" onPress={() => setStatus.mutate('COMPLETED')} loading={setStatus.isPending} /> : <Button title="Reprendre" variant="secondary" onPress={() => setStatus.mutate('ACTIVE')} loading={setStatus.isPending} />}
          </Card>

          <Text style={{ color: t.secondary, fontSize: 20, fontWeight: '600', marginTop: spacing(5), marginBottom: spacing(2) }}>Étapes</Text>
          {p.steps.length === 0 ? <Muted>Aucune étape : ajoutez la première.</Muted> : p.steps.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Checkbox checked={!!s.completedAt} onChange={(completed) => toggleStep.mutate({ stepId: s.id, completed })} label={`Étape : ${s.title}`} />
              <Text style={{ flex: 1, color: s.completedAt ? t.fgSubtle : t.fg, fontSize: 16, textDecorationLine: s.completedAt ? 'line-through' : 'none' }}>{s.title}</Text>
            </View>
          ))}
          <View style={{ height: spacing(3) }} />
          <Field label="Ajouter une étape" placeholder="Nouvelle étape" value={step} onChangeText={setStep} maxLength={120} returnKeyType="done" onSubmitEditing={() => step.trim() && addStep.mutate()} />
          <Button title="Ajouter l'étape" variant="secondary" onPress={() => addStep.mutate()} loading={addStep.isPending} disabled={!step.trim()} />

          <Text style={{ color: t.secondary, fontSize: 20, fontWeight: '600', marginTop: spacing(6), marginBottom: spacing(2) }}>Notes partagées</Text>
          <NoteInput label="Nouvelle note" placeholder="Idée, lien, chose à ne pas oublier…" value={note} onChangeText={setNote} />
          <Button title="Ajouter la note" variant="secondary" onPress={() => addNote.mutate()} loading={addNote.isPending} disabled={!note.trim()} />
          <View style={{ height: spacing(2) }} />
          {p.notes.length === 0 ? <Muted>Aucune note pour l&apos;instant.</Muted> : p.notes.map((n) => (
            <Card key={n.id} style={{ marginTop: spacing(2) }}><Text style={{ color: t.fg }}>{n.body}</Text><Muted>{fmtAgo(n.createdAt)}</Muted></Card>
          ))}

          <Text style={{ color: t.secondary, fontSize: 20, fontWeight: '600', marginTop: spacing(6), marginBottom: spacing(2) }}>Tâches liées</Text>
          <Tasks projectId={p.id} />
          <Pressable onPress={() => router.push('/quotidien')}><Muted>Voir toutes les tâches →</Muted></Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

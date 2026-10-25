import * as React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import type { IdeaBudget, IdeaCompany, IdeaDto, IdeaMoment, IdeaMood, IdeaSuggestionsDto, ScheduledIdeaDto } from '@couple/types';
import { Button, Card, ErrorBanner, Muted, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { tError } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/lib/theme';

const MOMENTS: [IdeaMoment, string][] = [['NOW', 'Maintenant'], ['TONIGHT', 'Ce soir'], ['WEEKEND', 'Ce week-end']];
const COMPANIES: [IdeaCompany, string][] = [['COUPLE', 'À deux'], ['FAMILY', 'En famille']];
const BUDGETS: [IdeaBudget, string][] = [['FREE', 'Gratuit'], ['LOW', 'Petit budget'], ['MEDIUM', 'Budget moyen'], ['HIGH', 'Budget libre']];
const MOODS: [IdeaMood, string][] = [['ROMANTIC', 'Romantique'], ['FUNNY', 'Drôle'], ['RELAX', 'Détente'], ['ADVENTURE', 'Aventure'], ['CULTURE', 'Culture'], ['FOOD', 'Gastronomie'], ['SPICY', 'Coquine']];

function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T | null; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: spacing(4) }}>
      <Text style={{ color: t.fg, fontWeight: '600', marginBottom: spacing(2) }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
        {options.map(([v, l]) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: value === v }} onPress={() => onChange(v)} style={{ paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.pill, borderWidth: 1, borderColor: value === v ? t.primary : t.border, backgroundColor: value === v ? `${t.primary}22` : t.bgElevated }}>
            <Text style={{ color: value === v ? t.primary : t.fg, fontWeight: '500' }}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function WhatNowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const [moment, setMoment] = React.useState<IdeaMoment | null>(null);
  const [company, setCompany] = React.useState<IdeaCompany | null>(null);
  const [budget, setBudget] = React.useState<IdeaBudget | null>(null);
  const [mood, setMood] = React.useState<IdeaMood | null>(null);
  const [result, setResult] = React.useState<IdeaSuggestionsDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<ScheduledIdeaDto | null>(null);
  const suggest = useMutation({ mutationFn: () => api.post<IdeaSuggestionsDto>('/ideas/suggest', { moment, company, budget, mood, useAi: true }), onSuccess: setResult, onError: (e) => setError(tError(errorCode(e))) });
  const schedule = useMutation({
    mutationFn: (idea: IdeaDto) => api.post<ScheduledIdeaDto>('/ideas/schedule', { ideaId: idea.id, title: idea.title, description: idea.description, startAt: result!.suggestedStartAt, endAt: result!.suggestedEndAt, invitePartner: true }),
    onSuccess: setDone,
    onError: (e) => setError(tError(errorCode(e))),
  });
  const reset = () => { setMoment(null); setCompany(null); setBudget(null); setMood(null); setResult(null); setError(null); setDone(null); };
  const ready = moment && company && budget && mood;
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: spacing(5), paddingTop: spacing(8) }}>
        <Title>On fait quoi ?</Title>
        <ErrorBanner message={error} />
        {done ? (
          <Card><Text style={{ color: t.fg, fontSize: 16 }}>C&apos;est noté dans votre agenda, votre partenaire est invité(e).</Text><View style={{ height: 12 }} /><Button title="Fermer" onPress={() => { reset(); onClose(); }} /></Card>
        ) : !result ? (
          <>
            <Muted>Quatre choix, quelques idées, et un moment à l&apos;agenda si ça vous tente.</Muted>
            <View style={{ height: spacing(4) }} />
            <Choices label="Quand ?" options={MOMENTS} value={moment} onChange={setMoment} />
            <Choices label="Avec qui ?" options={COMPANIES} value={company} onChange={setCompany} />
            <Choices label="Quel budget ?" options={BUDGETS} value={budget} onChange={setBudget} />
            <Choices label="Quelle ambiance ?" options={MOODS} value={mood} onChange={setMood} />
            <Button title="Voir les idées" onPress={() => suggest.mutate()} loading={suggest.isPending} disabled={!ready} />
            <View style={{ height: 8 }} />
            <Button title="Fermer" variant="ghost" onPress={() => { reset(); onClose(); }} />
          </>
        ) : (
          <>
            <Muted>{result.ai.used ? 'Enrichi par Notre Complice' : 'Suggestions du catalogue'}</Muted>
            <View style={{ height: spacing(3) }} />
            {result.ideas.length === 0 ? <Muted>Rien ne correspond. Élargissez le budget ou changez d&apos;ambiance.</Muted> : null}
            {result.ideas.map((idea) => (
              <Card key={idea.id} style={{ marginBottom: spacing(3) }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: t.fg }}>{idea.title}</Text>
                <Muted>{idea.description}</Muted>
                <View style={{ height: spacing(3) }} />
                <Button title="Ajouter à l'agenda" variant="secondary" onPress={() => schedule.mutate(idea)} loading={schedule.isPending} />
              </Card>
            ))}
            <Button title="D'autres idées" variant="ghost" onPress={() => suggest.mutate()} loading={suggest.isPending} />
            <Button title="Modifier mes choix" variant="ghost" onPress={() => setResult(null)} />
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

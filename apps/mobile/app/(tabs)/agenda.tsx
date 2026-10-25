import * as React from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalendarEventDto, EventVisibility } from '@couple/types';
import { Button, Card, ErrorBanner, Field, Muted, Screen, Title } from '@/components/ui';
import { api, errorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDay, fmtTime } from '@/lib/format';
import { tError } from '@/lib/i18n';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { radius, spacing, useTheme } from '@/lib/theme';

const VIS: [EventVisibility, string, string][] = [['SHARED', 'Partagé', 'Visible et modifiable par vous deux.'], ['BUSY', 'Occupé uniquement', 'Créneau sans titre ni détail pour votre partenaire.'], ['PRIVATE', 'Privé', 'Invisible pour votre partenaire.']];

export default function AgendaScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [create, setCreate] = React.useState(false);
  const from = React.useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const to = new Date(from.getTime() + 30 * 86_400_000);
  const events = useQuery({ queryKey: ['calendar', from.toISOString(), to.toISOString()], queryFn: () => api.get<CalendarEventDto[]>('/calendar/events', { query: { from: from.toISOString(), to: to.toISOString() } }) });
  useRealtimeInvalidation('calendar.changed', [['calendar']]);
  const respond = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) => api.post(`/calendar/events/${id}/respond`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }) });

  const byDay = new Map<string, CalendarEventDto[]>();
  for (const e of events.data ?? []) { const k = e.startAt.slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), e]); }

  return (
    <Screen style={{ paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Title>Agenda</Title>
        <Pressable accessibilityRole="button" onPress={() => setCreate(true)} style={{ backgroundColor: t.primary, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.pill, marginBottom: spacing(2) }}><Text style={{ color: t.primaryFg, fontWeight: '600' }}>+ Nouveau</Text></Pressable>
      </View>
      <Muted>30 prochains jours. Le privé reste privé.</Muted>
      <ScrollView style={{ marginTop: spacing(4) }} contentContainerStyle={{ paddingBottom: spacing(10) }}>
        {events.isPending ? <Muted>Chargement…</Muted> : byDay.size === 0 ? <Card><Muted>Rien de prévu. Et si vous ajoutiez un moment à deux ?</Muted></Card> : [...byDay.entries()].map(([day, list]) => (
          <View key={day} style={{ marginBottom: spacing(4) }}>
            <Text style={{ color: t.secondary, fontWeight: '600', textTransform: 'capitalize', marginBottom: spacing(2) }}>{fmtDay(list[0]!.startAt)}</Text>
            {list.map((e) => {
              const mine = e.attendees.find((a) => a.userId === user?.id);
              return (
                <Card key={e.instanceId} style={{ marginBottom: spacing(2), padding: spacing(4) }}>
                  <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                    <Text style={{ color: t.fgMuted, width: 48 }}>{e.allDay ? 'Journée' : fmtTime(e.startAt)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.fg, fontWeight: '600' }}>{e.busy ? '🔒 Occupé' : e.title}</Text>
                      {e.location ? <Muted>{e.location}</Muted> : null}
                      {mine?.status === 'PENDING' ? (
                        <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
                          <Button title="J'accepte" onPress={() => respond.mutate({ id: e.id, status: 'ACCEPTED' })} />
                          <Button title="Je ne peux pas" variant="ghost" onPress={() => respond.mutate({ id: e.id, status: 'DECLINED' })} />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <CreateEventModal open={create} onClose={() => setCreate(false)} partner={user?.couple?.partner?.profile.displayName ?? ''} />
    </Screen>
  );
}

function CreateEventModal({ open, onClose, partner }: { open: boolean; onClose: () => void; partner: string }) {
  const t = useTheme();
  const qc = useQueryClient();
  const [title, setTitle] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [date, setDate] = React.useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [time, setTime] = React.useState('20:00');
  const [duration, setDuration] = React.useState('120');
  const [visibility, setVisibility] = React.useState<EventVisibility>('SHARED');
  const [invite, setInvite] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const start = new Date(`${date}T${time}:00`);
      if (Number.isNaN(start.getTime())) throw new Error('DATE');
      const end = new Date(start.getTime() + Number(duration || 60) * 60_000);
      return api.post<CalendarEventDto>('/calendar/events', { title: title.trim(), location: location.trim() || null, startAt: start.toISOString(), endAt: end.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, visibility, type: visibility === 'SHARED' ? 'SHARED' : 'PERSONAL', reminders: [{ minutesBefore: 30 }], invitePartner: visibility === 'SHARED' && invite });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar'] }); setTitle(''); onClose(); },
    onError: (e) => setError(e instanceof Error && e.message === 'DATE' ? 'Date ou heure invalide (AAAA-MM-JJ, HH:MM).' : tError(errorCode(e))),
  });
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: spacing(5), paddingTop: spacing(8) }} keyboardShouldPersistTaps="handled">
        <Title>Nouvel événement</Title>
        <ErrorBanner message={error} />
        <Field label="Titre" value={title} onChangeText={setTitle} />
        <View style={{ flexDirection: 'row', gap: spacing(3) }}>
          <View style={{ flex: 1 }}><Field label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} /></View>
          <View style={{ width: 110 }}><Field label="Heure" value={time} onChangeText={setTime} /></View>
        </View>
        <Field label="Durée (minutes)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        <Field label="Lieu" value={location} onChangeText={setLocation} />
        <Text style={{ color: t.fg, fontWeight: '500', marginBottom: spacing(2) }}>Visibilité</Text>
        {VIS.map(([v, label, hint]) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: visibility === v }} onPress={() => setVisibility(v)} style={{ borderWidth: 1, borderColor: visibility === v ? t.primary : t.border, borderRadius: radius.md, padding: spacing(3), marginBottom: spacing(2), backgroundColor: visibility === v ? `${t.primary}11` : t.bgElevated }}>
            <Text style={{ color: t.fg, fontWeight: '600' }}>{label}</Text><Muted>{hint}</Muted>
          </Pressable>
        ))}
        {visibility === 'SHARED' && partner ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing(3) }}><Text style={{ color: t.fg }}>{`Inviter ${partner}`}</Text><Switch value={invite} onValueChange={setInvite} /></View>
        ) : null}
        <Button title="Enregistrer" onPress={() => save.mutate()} loading={save.isPending} disabled={!title.trim()} />
        <View style={{ height: 8 }} />
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

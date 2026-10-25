'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { CalendarEventDto } from '@couple/types';
import { Button, Segmented, Skeleton } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useRealtimeInvalidation } from '@/lib/realtime';
import { type CalendarView, shift, visibleRange } from '@/lib/calendar-utils';
import { PageHeader } from '@/components/app/page-header';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { EventDialog } from './event-dialog';
import { EventDetails } from './event-details';

export function CalendarPage() {
  const t = useTranslations('calendar');
  const { user } = useAuth();
  const [view, setView] = React.useState<CalendarView>('week');
  const [cursor, setCursor] = React.useState(() => new Date());
  const [editing, setEditing] = React.useState<{ open: boolean; event?: CalendarEventDto; defaultStart?: Date }>({ open: false });
  const [selected, setSelected] = React.useState<CalendarEventDto | null>(null);

  const { from, to } = React.useMemo(() => visibleRange(view, cursor), [view, cursor]);
  const queryKey = ['calendar', from.toISOString(), to.toISOString()] as const;
  const events = useQuery({
    queryKey,
    queryFn: () => api.get<CalendarEventDto[]>('/calendar/events', { query: { from: from.toISOString(), to: to.toISOString() } }),
    enabled: !!user,
  });
  useRealtimeInvalidation('calendar.changed', [['calendar']]);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    if (mq.matches) setView('day');
  }, []);

  const title =
    view === 'month' ? format(cursor, 'LLLL yyyy', { locale: fr })
    : view === 'week' ? `${format(from, 'd MMM', { locale: fr })} – ${format(new Date(to.getTime() - 1), 'd MMM yyyy', { locale: fr })}`
    : format(cursor, 'EEEE d MMMM yyyy', { locale: fr });

  const openCreate = (start?: Date) => setEditing({ open: true, defaultStart: start });
  const openEdit = (e: CalendarEventDto) => {
    setSelected(null);
    setEditing({ open: true, event: e });
  };

  return (
    <div className="container-page space-y-6 py-8">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Button onClick={() => openCreate()}><Plus className="h-4 w-4" aria-hidden />{t('new')}</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Précédent" onClick={() => setCursor((c) => shift(view, c, -1))}><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="outline" size="icon" aria-label="Suivant" onClick={() => setCursor((c) => shift(view, c, 1))}><ChevronRight className="h-5 w-5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>{t('today')}</Button>
          <h2 className="ml-2 text-xl capitalize">{title}</h2>
        </div>
        <Segmented<CalendarView>
          ariaLabel="Vue"
          value={view}
          onChange={setView}
          className="sm:w-72"
          options={[{ value: 'day', label: t('views.day') }, { value: 'week', label: t('views.week') }, { value: 'month', label: t('views.month') }]}
        />
      </div>

      {events.isPending ? (
        <Skeleton className="h-[520px] w-full rounded-lg" />
      ) : view === 'month' ? (
        <MonthView cursor={cursor} from={from} events={events.data ?? []} onSelectEvent={setSelected} onSelectDay={(d) => { setCursor(d); setView('day'); }} onCreate={openCreate} />
      ) : view === 'week' ? (
        <WeekView from={from} events={events.data ?? []} onSelectEvent={setSelected} onCreate={openCreate} />
      ) : (
        <DayView day={cursor} events={events.data ?? []} onSelectEvent={setSelected} onCreate={openCreate} />
      )}

      <EventDialog open={editing.open} event={editing.event} defaultStart={editing.defaultStart} onClose={() => setEditing({ open: false })} />
      <EventDetails event={selected} onClose={() => setSelected(null)} onEdit={openEdit} />
    </div>
  );
}

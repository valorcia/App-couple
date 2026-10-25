'use client';
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Lock, MapPin, Pencil, Repeat, Trash2, X } from 'lucide-react';
import type { CalendarEventDto } from '@couple/types';
import { Alert, Badge, Button, Dialog, DialogContent } from '@couple/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';
import { useApiErrorMessage } from '@/lib/use-api-error';

export function EventDetails({ event, onClose, onEdit }: { event: CalendarEventDto | null; onClose: () => void; onEdit: (e: CalendarEventDto) => void }) {
  const t = useTranslations('calendar');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const partnerName = user?.couple?.partner?.profile.displayName ?? '';

  const invalidate = () => qc.invalidateQueries({ queryKey: ['calendar'] });
  const respond = useMutation({ mutationFn: (status: 'ACCEPTED' | 'DECLINED') => api.post(`/calendar/events/${event!.id}/respond`, { status }), onSuccess: async () => { await invalidate(); onClose(); }, onError: (e) => setError(toMessage(e)) });
  const remove = useMutation({ mutationFn: () => api.delete(`/calendar/events/${event!.id}`), onSuccess: async () => { await invalidate(); onClose(); }, onError: (e) => setError(toMessage(e)) });
  const exclude = useMutation({ mutationFn: () => api.post(`/calendar/events/${event!.id}/exclude`, { occurrenceStart: event!.startAt }), onSuccess: async () => { await invalidate(); onClose(); }, onError: (e) => setError(toMessage(e)) });

  React.useEffect(() => { setConfirmDelete(false); setError(null); }, [event?.instanceId]);
  if (!event) return null;

  const myAttendance = event.attendees.find((a) => a.userId === user?.id);
  const partnerAttendance = event.attendees.find((a) => a.userId !== user?.id);
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const when = event.allDay
    ? format(start, 'EEEE d MMMM yyyy', { locale: fr })
    : `${format(start, 'EEEE d MMMM yyyy, HH:mm', { locale: fr })} – ${format(end, 'HH:mm')}`;

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={event.busy ? t('busy') : event.title} description={when}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="flex flex-wrap gap-2">
          {event.busy ? <Badge tone="neutral"><Lock className="h-3 w-3" />{t('visibility.BUSY')}</Badge> : <Badge tone="blush">{t(`types.${event.type}`)}</Badge>}
          {!event.busy ? <Badge tone="neutral">{t(`visibility.${event.visibility}`)}</Badge> : null}
          {event.isRecurring ? <Badge tone="neutral"><Repeat className="h-3 w-3" />{t('fields.recurrence')}</Badge> : null}
          <Badge tone="champagne">{event.isMine ? t('owner.me') : t('owner.partner', { partner: partnerName })}</Badge>
        </div>
        {event.location ? <p className="flex items-center gap-2 text-sm text-fg-muted"><MapPin className="h-4 w-4" aria-hidden />{event.location}</p> : null}
        {event.description ? <p className="whitespace-pre-wrap text-sm">{event.description}</p> : null}

        {myAttendance ? (
          <div className="rounded-md border border-border p-3">
            {myAttendance.status === 'PENDING' ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">{t('attendance.pending')}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respond.mutate('ACCEPTED')} loading={respond.isPending}><Check className="h-4 w-4" />{t('attendance.accept')}</Button>
                  <Button size="sm" variant="outline" onClick={() => respond.mutate('DECLINED')} loading={respond.isPending}><X className="h-4 w-4" />{t('attendance.decline')}</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-fg-muted">{myAttendance.status === 'ACCEPTED' ? t('attendance.accepted') : t('attendance.youDeclined')}</p>
            )}
          </div>
        ) : partnerAttendance ? (
          <p className="text-sm text-fg-muted">
            {partnerAttendance.status === 'PENDING' ? t('attendance.partnerPending', { partner: partnerName }) : partnerAttendance.status === 'ACCEPTED' ? t('attendance.partnerAccepted', { partner: partnerName }) : t('attendance.partnerDeclined', { partner: partnerName })}
          </p>
        ) : null}

        {event.canEdit ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {confirmDelete ? (
              <>
                <span className="mr-auto self-center text-sm text-fg-muted">{t('deleteConfirm')}</span>
                {event.isRecurring ? <Button size="sm" variant="outline" onClick={() => exclude.mutate()} loading={exclude.isPending}>{t('deleteOccurrence')}</Button> : null}
                <Button size="sm" variant="danger" onClick={() => remove.mutate()} loading={remove.isPending}>{event.isRecurring ? t('deleteSeries') : t('delete')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{tc('cancel')}</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />{t('delete')}</Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(event)}><Pencil className="h-4 w-4" />{t('edit')}</Button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import type { CalendarEventDto, FreeSlotDto } from '@couple/types';
import type { CreateEventInput, UpdateEventInput } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { expandOccurrences, isValidRRule } from './recurrence';

const eventInclude = { reminders: true, attendees: true } satisfies Prisma.CalendarEventInclude;
type EventRow = Prisma.CalendarEventGetPayload<{ include: typeof eventInclude }>;

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

/**
 * Agenda partagé. Règles de confidentialité appliquées ici, jamais côté client :
 * - mes événements : toujours visibles en entier ;
 * - événements du partenaire : SHARED → entier ; BUSY → bloc « Occupé » sans titre, lieu ni
 *   description ; PRIVATE → jamais renvoyé.
 * - droits d'édition : propriétaire toujours ; partenaire si l'événement est SHARED (agenda commun).
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ lecture
  async list(viewer: Viewer, from: Date, to: Date): Promise<CalendarEventDto[]> {
    const rows = await this.prisma.calendarEvent.findMany({
      // AND explicite : la clause de visibilité et la fenêtre temporelle contiennent chacune un OR.
      where: { AND: [this.visibleWhere(viewer), { startAt: { lt: to } }, { OR: [{ rrule: null, endAt: { gt: from } }, { rrule: { not: null } }] }] },
      include: eventInclude,
      orderBy: { startAt: 'asc' },
    });
    const out: CalendarEventDto[] = [];
    for (const row of rows) {
      if (!row.rrule) {
        out.push(this.toDto(row, viewer));
        continue;
      }
      for (const occ of expandOccurrences({ rrule: row.rrule, startAt: row.startAt, endAt: row.endAt, timezone: row.timezone, exdates: row.exdates, from, to })) {
        out.push(this.toDto(row, viewer, occ.start, occ.end));
      }
    }
    out.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return out;
  }

  async getOne(viewer: Viewer, id: string): Promise<CalendarEventDto> {
    const row = await this.prisma.calendarEvent.findFirst({ where: { id, ...this.visibleWhere(viewer) }, include: eventInclude });
    if (!row) throw AppError.notFound('Événement introuvable.');
    return this.toDto(row, viewer);
  }

  // ------------------------------------------------------------------ écriture
  async create(viewer: Viewer, input: CreateEventInput): Promise<CalendarEventDto> {
    this.assertRRule(input.rrule);
    const invitePartner = input.invitePartner && input.visibility === 'SHARED' && !!viewer.couple.partnerUserId;
    const coupleCalendar = await this.prisma.calendar.findFirst({ where: { coupleId: viewer.couple.coupleId, kind: 'COUPLE' }, select: { id: true } });
    const row = await this.prisma.calendarEvent.create({
      data: {
        coupleId: viewer.couple.coupleId,
        ownerUserId: viewer.userId,
        calendarId: input.visibility === 'SHARED' ? (coupleCalendar?.id ?? null) : null,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        allDay: input.allDay,
        timezone: input.timezone,
        visibility: input.visibility,
        type: input.type,
        color: input.color ?? null,
        category: input.category ?? null,
        rrule: input.rrule ?? null,
        reminders: { create: input.reminders.map((r) => ({ minutesBefore: r.minutesBefore, channel: r.channel })) },
        attendees: invitePartner ? { create: { userId: viewer.couple.partnerUserId! } } : undefined,
      },
      include: eventInclude,
    });
    await this.broadcast(viewer, row, 'created');
    if (invitePartner) {
      await this.notifications.notify({
        userId: viewer.couple.partnerUserId!,
        category: 'INVITATION',
        type: 'calendar.invitation',
        title: 'Nouvelle invitation',
        body: 'Votre partenaire vous propose un moment à deux.',
        data: { eventId: row.id },
      });
    }
    return this.toDto(row, viewer);
  }

  async update(viewer: Viewer, id: string, input: UpdateEventInput): Promise<CalendarEventDto> {
    const existing = await this.requireEditable(viewer, id);
    if (input.rrule !== undefined) this.assertRRule(input.rrule);
    const startAt = input.startAt ? new Date(input.startAt) : existing.startAt;
    const endAt = input.endAt ? new Date(input.endAt) : existing.endAt;
    if (endAt < startAt) throw new AppError(ErrorCode.VALIDATION_FAILED, 'La fin doit être postérieure au début.', 400);

    const nextVisibility = input.visibility ?? existing.visibility;
    const partnerId = viewer.couple.partnerUserId;
    const shouldInvite = input.invitePartner === true && nextVisibility === 'SHARED' && !!partnerId && !existing.attendees.some((a) => a.userId === partnerId);

    const row = await this.prisma.$transaction(async (tx) => {
      if (input.reminders) {
        await tx.eventReminder.deleteMany({ where: { eventId: id } });
      }
      if (nextVisibility !== 'SHARED') {
        // Un événement qui redevient privé/occupé n'a plus d'invité.
        await tx.eventAttendee.deleteMany({ where: { eventId: id } });
      }
      return tx.calendarEvent.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          location: input.location,
          startAt,
          endAt,
          allDay: input.allDay,
          timezone: input.timezone,
          visibility: input.visibility,
          type: input.type,
          color: input.color,
          category: input.category,
          rrule: input.rrule,
          exdates: input.exdates ? input.exdates.map((d) => new Date(d)) : undefined,
          reminders: input.reminders ? { create: input.reminders.map((r) => ({ minutesBefore: r.minutesBefore, channel: r.channel })) } : undefined,
          attendees: shouldInvite ? { create: { userId: partnerId! } } : undefined,
        },
        include: eventInclude,
      });
    });
    await this.broadcast(viewer, row, 'updated');
    if (shouldInvite) {
      await this.notifications.notify({ userId: partnerId!, category: 'INVITATION', type: 'calendar.invitation', title: 'Nouvelle invitation', body: 'Votre partenaire vous propose un moment à deux.', data: { eventId: row.id } });
    } else if (row.visibility === 'SHARED' && partnerId && existing.ownerUserId === viewer.userId) {
      await this.notifications.notify({ userId: partnerId, category: 'CALENDAR', type: 'calendar.updated', title: 'Agenda mis à jour', body: 'Un événement partagé a été modifié.', data: { eventId: row.id } });
    }
    return this.toDto(row, viewer);
  }

  async remove(viewer: Viewer, id: string): Promise<void> {
    const existing = await this.requireEditable(viewer, id);
    await this.prisma.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.broadcast(viewer, existing, 'deleted');
  }

  /** Exclut une occurrence d'un événement récurrent. */
  async excludeOccurrence(viewer: Viewer, id: string, occurrenceStart: Date): Promise<CalendarEventDto> {
    const existing = await this.requireEditable(viewer, id);
    if (!existing.rrule) throw new AppError(ErrorCode.VALIDATION_FAILED, "Cet événement n'est pas récurrent.", 400);
    const row = await this.prisma.calendarEvent.update({
      where: { id },
      data: { exdates: Array.from(new Set([...existing.exdates.map((d) => d.toISOString()), occurrenceStart.toISOString()])).map((d) => new Date(d)) },
      include: eventInclude,
    });
    await this.broadcast(viewer, row, 'updated');
    return this.toDto(row, viewer);
  }

  async respond(viewer: Viewer, id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<CalendarEventDto> {
    const attendee = await this.prisma.eventAttendee.findUnique({ where: { eventId_userId: { eventId: id, userId: viewer.userId } }, include: { event: true } });
    if (!attendee || attendee.event.deletedAt) throw AppError.notFound('Invitation introuvable.');
    await this.prisma.eventAttendee.update({ where: { id: attendee.id }, data: { status, respondedAt: new Date() } });
    const row = await this.prisma.calendarEvent.findUniqueOrThrow({ where: { id }, include: eventInclude });
    await this.broadcast(viewer, row, 'updated');
    await this.notifications.notify({
      userId: row.ownerUserId,
      category: 'CALENDAR',
      type: status === 'ACCEPTED' ? 'calendar.accepted' : 'calendar.declined',
      title: status === 'ACCEPTED' ? 'Invitation acceptée' : 'Invitation déclinée',
      body: status === 'ACCEPTED' ? 'Votre partenaire a accepté.' : 'Votre partenaire ne pourra pas.',
      data: { eventId: row.id },
    });
    return this.toDto(row, viewer);
  }

  // ------------------------------------------------------------------ disponibilités
  /**
   * Créneaux libres communs. Côté partenaire, seuls les événements SHARED et BUSY comptent :
   * un événement PRIVATE ne révèle rien, pas même une indisponibilité.
   */
  async freeSlots(viewer: Viewer, from: Date, to: Date, minMinutes: number, dayStartHour: number, dayEndHour: number, timezone: string): Promise<FreeSlotDto[]> {
    const events = await this.list(viewer, from, to);
    const busy = events
      .map((e) => ({ s: new Date(e.startAt).getTime(), e: new Date(e.endAt).getTime() }))
      .filter((b) => b.e > b.s)
      .sort((a, b) => a.s - b.s);
    const slots: FreeSlotDto[] = [];
    // Découpe jour par jour dans le fuseau du demandeur.
    const dayMs = 86_400_000;
    for (let t = startOfDayInTz(from, timezone); t < to.getTime(); t += dayMs) {
      const dayStart = Math.max(from.getTime(), t + dayStartHour * 3_600_000);
      const dayEnd = Math.min(to.getTime(), t + dayEndHour * 3_600_000);
      let cursor = dayStart;
      for (const b of busy) {
        if (b.e <= cursor || b.s >= dayEnd) continue;
        if (b.s - cursor >= minMinutes * 60_000) slots.push(slot(cursor, b.s));
        cursor = Math.max(cursor, b.e);
      }
      if (dayEnd - cursor >= minMinutes * 60_000) slots.push(slot(cursor, dayEnd));
    }
    return slots.slice(0, 50);
  }

  // ------------------------------------------------------------------ internes
  private visibleWhere(viewer: Viewer): Prisma.CalendarEventWhereInput {
    const partner = viewer.couple.partnerUserId;
    return {
      deletedAt: null,
      OR: [
        { ownerUserId: viewer.userId },
        ...(partner ? [{ coupleId: viewer.couple.coupleId, ownerUserId: partner, visibility: { in: ['SHARED' as const, 'BUSY' as const] } }] : []),
      ],
    };
  }

  private async requireEditable(viewer: Viewer, id: string): Promise<EventRow> {
    const row = await this.prisma.calendarEvent.findFirst({ where: { id, deletedAt: null }, include: eventInclude });
    if (!row) throw AppError.notFound('Événement introuvable.');
    if (!this.canEdit(row, viewer)) {
      // Même réponse qu'un événement inexistant pour ne pas révéler l'existence d'un événement privé.
      throw AppError.notFound('Événement introuvable.');
    }
    return row;
  }

  private canEdit(row: EventRow, viewer: Viewer): boolean {
    if (row.ownerUserId === viewer.userId) return true;
    return row.coupleId === viewer.couple.coupleId && row.ownerUserId === viewer.couple.partnerUserId && row.visibility === 'SHARED' && !row.surpriseId;
  }

  private assertRRule(rrule: string | null | undefined) {
    if (rrule && !isValidRRule(rrule)) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Règle de récurrence invalide.', 400, [{ path: 'rrule' }]);
  }

  private async broadcast(viewer: Viewer, row: EventRow, action: 'created' | 'updated' | 'deleted') {
    // Un événement PRIVATE ne génère aucun signal côté partenaire.
    if (row.visibility === 'PRIVATE') this.realtime.emitToUser(viewer.userId, 'calendar.changed', { eventId: row.id, action });
    else this.realtime.emitToCouple(viewer.couple.coupleId, 'calendar.changed', { eventId: row.id, action });
  }

  private toDto(row: EventRow, viewer: Viewer, occStart?: Date, occEnd?: Date): CalendarEventDto {
    const isMine = row.ownerUserId === viewer.userId;
    const busy = !isMine && row.visibility === 'BUSY';
    const startAt = (occStart ?? row.startAt).toISOString();
    const endAt = (occEnd ?? row.endAt).toISOString();
    return {
      id: row.id,
      instanceId: row.rrule ? `${row.id}@${startAt}` : row.id,
      ownerUserId: row.ownerUserId,
      isMine,
      busy,
      title: busy ? '' : row.title,
      description: busy ? null : row.description,
      location: busy ? null : row.location,
      startAt,
      endAt,
      allDay: row.allDay,
      timezone: row.timezone,
      visibility: row.visibility,
      type: busy ? 'OTHER' : row.type,
      color: busy ? null : row.color,
      category: busy ? null : row.category,
      rrule: busy ? null : row.rrule,
      exdates: busy ? [] : row.exdates.map((d) => d.toISOString()),
      isRecurring: !!row.rrule,
      reminders: isMine ? row.reminders.map((r) => ({ id: r.id, minutesBefore: r.minutesBefore, channel: r.channel })) : [],
      attendees: busy ? [] : row.attendees.map((a) => ({ userId: a.userId, status: a.status, respondedAt: a.respondedAt?.toISOString() ?? null })),
      canEdit: this.canEdit(row, viewer),
      surpriseId: isMine ? row.surpriseId : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function slot(s: number, e: number): FreeSlotDto {
  return { startAt: new Date(s).toISOString(), endAt: new Date(e).toISOString(), minutes: Math.round((e - s) / 60_000) };
}

function startOfDayInTz(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const msIntoDay = (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)) * 1000 + date.getMilliseconds();
  return date.getTime() - msIntoDay;
}

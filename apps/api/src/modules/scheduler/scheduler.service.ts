import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { QUEUES, QueueService } from '@/common/queue/queue.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { localMinutes } from '@/modules/notifications/quiet-hours';
import { readDailySettings } from '@/modules/games/games.service';

/**
 * Tâches planifiées : rappels d'événements (toutes les minutes) et notification matinale de la
 * question du jour (toutes les heures, à l'heure réglée par le couple, 9 h par défaut, en heure locale de chaque utilisateur).
 * Limitation connue : les rappels portent sur la première occurrence des événements récurrents.
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    this.queue.register(QUEUES.reminders, async () => { await this.processReminders(); }, 1);
    this.queue.register(QUEUES.daily, async () => { await this.processDailyQuestionPrompts(); }, 1);
    if (process.env.NODE_ENV !== 'test') {
      await this.queue.scheduleRepeat(QUEUES.reminders, 'tick', 60_000).catch(() => undefined);
      await this.queue.scheduleRepeat(QUEUES.daily, 'tick', 3_600_000).catch(() => undefined);
    }
  }

  /** Envoie les rappels arrivés à échéance (idempotent via `sentAt`). */
  async processReminders(now = new Date()): Promise<number> {
    const windowStart = new Date(now.getTime() - 10 * 60_000);
    const due = await this.prisma.eventReminder.findMany({
      where: { sentAt: null, event: { deletedAt: null, startAt: { gt: windowStart, lt: new Date(now.getTime() + 31 * 86_400_000) } } },
      include: { event: { select: { id: true, ownerUserId: true, title: true, startAt: true, visibility: true, timezone: true } } },
      take: 500,
    });
    let sent = 0;
    for (const r of due) {
      const fireAt = r.event.startAt.getTime() - r.minutesBefore * 60_000;
      if (fireAt > now.getTime()) continue;
      const claimed = await this.prisma.eventReminder.updateMany({ where: { id: r.id, sentAt: null }, data: { sentAt: now } });
      if (claimed.count === 0) continue;
      const when = new Intl.DateTimeFormat('fr-FR', { timeZone: r.event.timezone, hour: '2-digit', minute: '2-digit' }).format(r.event.startAt);
      await this.notifications.notify({
        userId: r.event.ownerUserId,
        category: 'CALENDAR',
        type: 'calendar.reminder',
        title: 'Rappel',
        // Le titre d'un événement privé/occupé reste sur l'écran verrouillé de son propriétaire uniquement : c'est le sien.
        body: `${r.event.title} · ${when}`,
        data: { eventId: r.event.id },
      });
      sent += 1;
    }
    return sent;
  }

  /** À 9 h locale : « Votre question du jour vous attend » (une fois par jour et par utilisateur). */
  async processDailyQuestionPrompts(now = new Date(), targetHour?: number): Promise<number> {
    const members = await this.prisma.coupleMembership.findMany({ where: { leftAt: null, couple: { status: 'ACTIVE' } }, include: { user: { select: { id: true, timezone: true, status: true } }, couple: { select: { settings: true } } } });
    let sent = 0;
    for (const m of members) {
      if (m.user.status !== 'ACTIVE') continue;
      const minutes = localMinutes(now, m.user.timezone);
      // L'heure est celle réglée par le couple (9 h par défaut), en heure locale de chaque partenaire.
      const hour = targetHour ?? readDailySettings(m.couple.settings).hour;
      if (Math.floor(minutes / 60) !== hour) continue;
      const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: m.user.timezone }).format(now);
      const ok = await this.redis.client.set(`daily:prompted:${m.user.id}:${dayKey}`, '1', 'EX', 2 * 86_400, 'NX');
      if (!ok) continue;
      await this.notifications.notify({ userId: m.user.id, category: 'DAILY_QUESTION', type: 'daily.prompt', title: 'Question du jour', body: 'Une nouvelle question vous attend tous les deux.', data: {} });
      sent += 1;
    }
    return sent;
  }
}

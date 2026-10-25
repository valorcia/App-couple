import { Injectable, Logger as NestLogger, type OnModuleInit } from '@nestjs/common';
import type { NotificationCategory, Prisma } from '@couple/database';
import type { NotificationDto, NotificationPreferencesDto } from '@couple/types';
import type { z } from 'zod';
import type { updateNotificationPreferencesSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QUEUES, QueueService } from '@/common/queue/queue.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';
import { PushService } from '@/modules/push/push.service';
import { quietDelayMs } from './quiet-hours';

export interface NotifyInput {
  userId: string;
  category: NotificationCategory;
  type: string;
  /** Titre et corps non sensibles (affichés potentiellement sur écran verrouillé). */
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const ALL_CATEGORIES: NotificationCategory[] = ['CALENDAR', 'INVITATION', 'GAME', 'CHALLENGE', 'SURPRISE', 'ANNIVERSARY', 'SUGGESTION', 'DAILY_QUESTION', 'SYSTEM', 'MARKETING'];

/**
 * Notifications : in-app (persistées) + signal temps réel + push (file `push`), en respectant les
 * préférences par catégorie, les heures silencieuses (report) et le plafond quotidien.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new NestLogger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly queue: QueueService,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    this.queue.register(QUEUES.push, async (job) => {
      await this.push.sendNotification(String(job.data.notificationId));
    });
  }

  async notify(input: NotifyInput): Promise<void> {
    const [pref, user] = await Promise.all([
      this.prisma.notificationPreference.findUnique({ where: { userId_category: { userId: input.userId, category: input.category } } }),
      this.prisma.user.findUnique({ where: { id: input.userId }, select: { timezone: true, status: true } }),
    ]);
    if (!user || user.status !== 'ACTIVE') return;
    const inApp = pref?.inApp ?? true;
    const pushEnabled = pref?.push ?? input.category !== 'MARKETING';
    if (!inApp && !pushEnabled) return;

    const row = await this.prisma.notification.create({
      data: { userId: input.userId, category: input.category, type: input.type, title: input.title, body: input.body, data: (input.data ?? {}) as Prisma.InputJsonValue },
    });
    if (inApp) this.realtime.emitToUser(input.userId, 'notification.new', { id: row.id, category: row.category, type: row.type });

    if (!pushEnabled) return;
    if (pref?.maxPerDay) {
      const since = new Date(Date.now() - 86_400_000);
      const sentToday = await this.prisma.notification.count({ where: { userId: input.userId, category: input.category, pushedAt: { gt: since } } });
      if (sentToday >= pref.maxPerDay) return;
    }
    const delayMs = quietDelayMs(new Date(), user.timezone, pref?.quietStart ?? null, pref?.quietEnd ?? null);
    try {
      // BullMQ interdit « : » dans les identifiants personnalisés.
      await this.queue.add(QUEUES.push, 'send', { notificationId: row.id }, { delayMs: delayMs || undefined, jobId: `push-${row.id}` });
    } catch (e) {
      // File indisponible : la notification in-app existe ; le push est perdu mais tracé.
      this.logger.warn(`Push non planifié pour ${row.id} : ${(e as Error).message}`);
    }
  }

  // ------------------------------------------------------------------ préférences
  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const [rows, devices] = await Promise.all([
      this.prisma.notificationPreference.findMany({ where: { userId } }),
      this.prisma.pushDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: 'desc' } }),
    ]);
    const byCat = new Map(rows.map((r) => [r.category, r]));
    const any = rows[0];
    return {
      preferences: ALL_CATEGORIES.map((category) => {
        const r = byCat.get(category);
        return { category, push: r?.push ?? category !== 'MARKETING', inApp: r?.inApp ?? true, email: r?.email ?? false, maxPerDay: r?.maxPerDay ?? null };
      }),
      quietStart: any?.quietStart ?? null,
      quietEnd: any?.quietEnd ?? null,
      devices: devices.map((d) => ({ id: d.id, platform: d.platform, deviceName: d.deviceName, lastSeenAt: d.lastSeenAt.toISOString() })),
    };
  }

  async updatePreferences(userId: string, input: z.infer<typeof updateNotificationPreferencesSchema>): Promise<NotificationPreferencesDto> {
    const quiet = { quietStart: input.quietStart ?? null, quietEnd: input.quietEnd ?? null };
    await this.prisma.$transaction(async (tx) => {
      for (const p of input.preferences) {
        await tx.notificationPreference.upsert({
          where: { userId_category: { userId, category: p.category } },
          create: { userId, category: p.category, push: p.push, inApp: p.inApp, email: p.email, maxPerDay: p.maxPerDay ?? null, ...quiet },
          update: { push: p.push, inApp: p.inApp, email: p.email, maxPerDay: p.maxPerDay ?? null, ...quiet },
        });
      }
      // Les heures silencieuses sont globales : on les propage à toutes les lignes existantes.
      await tx.notificationPreference.updateMany({ where: { userId }, data: quiet });
    });
    return this.getPreferences(userId);
  }

  // ------------------------------------------------------------------ centre de notifications
  async list(userId: string, limit = 30, cursor?: string): Promise<{ items: NotificationDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.notification.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((n) => ({ id: n.id, category: n.category, type: n.type, title: n.title, body: n.body, data: n.data as Record<string, unknown>, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }));
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}

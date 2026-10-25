import { Injectable } from '@nestjs/common';
import type { NotificationCategory, Prisma } from '@couple/database';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';

export interface NotifyInput {
  userId: string;
  category: NotificationCategory;
  type: string;
  /** Titre et corps non sensibles (affichés potentiellement sur écran verrouillé). */
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Notifications in-app (persistées) + signal temps réel. L'envoi push (Expo) et les heures
 * silencieuses arrivent au jalon « Notifications » : le modèle et les préférences sont déjà prêts.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId_category: { userId: input.userId, category: input.category } } });
    if (pref && !pref.inApp) return;
    const row = await this.prisma.notification.create({
      data: { userId: input.userId, category: input.category, type: input.type, title: input.title, body: input.body, data: (input.data ?? {}) as Prisma.InputJsonValue },
    });
    this.realtime.emitToUser(input.userId, 'notification.new', { id: row.id, category: row.category, type: row.type });
  }

  async list(userId: string, limit = 30, cursor?: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((n) => ({
      id: n.id, category: n.category, type: n.type, title: n.title, body: n.body, data: n.data as Record<string, unknown>,
      readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString(),
    }));
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

import { Inject, Injectable, Logger as NestLogger } from '@nestjs/common';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  channelId?: string;
}
interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Envoi push via l'API Expo (APNs/FCM gérés par Expo). Les jetons invalides sont supprimés.
 * `fetchImpl` est injectable pour les tests.
 */
@Injectable()
export class PushService {
  private readonly logger = new NestLogger('Push');
  public fetchImpl: typeof fetch = (input, init) => fetch(input, init);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  /** Envoie une notification (déjà persistée) à tous les appareils de l'utilisateur. Retourne le nombre d'envois acceptés. */
  async sendNotification(notificationId: string): Promise<number> {
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n || n.pushedAt) return 0;
    const devices = await this.prisma.pushDevice.findMany({ where: { userId: n.userId } });
    if (devices.length === 0) return 0;
    const messages: ExpoMessage[] = devices.map((d) => ({ to: d.token, title: n.title, body: n.body, data: { ...(n.data as Record<string, unknown>), notificationId: n.id, category: n.category, type: n.type }, sound: 'default', channelId: 'default' }));
    let accepted = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const res = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json', ...(this.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${this.env.EXPO_ACCESS_TOKEN}` } : {}) },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          this.logger.warn(`Expo push ${res.status}`);
          continue;
        }
        const { data } = (await res.json()) as { data: ExpoTicket[] };
        for (let j = 0; j < data.length; j++) {
          const ticket = data[j]!;
          if (ticket.status === 'ok') accepted += 1;
          else if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.deleteMany({ where: { token: chunk[j]!.to } });
          }
        }
      } catch (e) {
        this.logger.warn(`Expo push indisponible : ${(e as Error).message}`);
      }
    }
    await this.prisma.notification.update({ where: { id: n.id }, data: { pushedAt: new Date() } });
    return accepted;
  }

  async registerDevice(userId: string, token: string, platform: string, deviceName?: string) {
    return this.prisma.pushDevice.upsert({
      where: { token },
      create: { userId, token, platform, deviceName: deviceName ?? null },
      update: { userId, platform, deviceName: deviceName ?? undefined, lastSeenAt: new Date() },
    });
  }

  async removeDevice(userId: string, token: string) {
    await this.prisma.pushDevice.deleteMany({ where: { userId, token } });
  }
}

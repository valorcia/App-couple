import { Injectable, Logger as NestLogger, type OnModuleInit } from '@nestjs/common';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { TokenService } from '@/modules/auth/token.service';

/**
 * Temps réel : un socket authentifié rejoint `user:<id>` et `couple:<id>`.
 * Les événements sont de simples signaux (`domain.changed` + ids) : les clients rechargent
 * via l'API, qui applique les règles de confidentialité. Aucune donnée sensible ne transite ici.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnModuleInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new NestLogger('Realtime');

  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    /* rien : l'adaptateur est posé dans afterInit */
  }

  afterInit(server: Server) {
    try {
      const pub = this.redis.client.duplicate();
      const sub = this.redis.client.duplicate();
      server.adapter(createAdapter(pub, sub));
    } catch (e) {
      this.logger.warn(`Adaptateur Redis indisponible, mode mono-instance (${(e as Error).message})`);
    }
  }

  async handleConnection(socket: Socket) {
    try {
      const token = (socket.handshake.auth as { token?: string })?.token ?? bearer(socket.handshake.headers.authorization);
      if (!token) throw new Error('no token');
      const payload = this.tokens.verifyAccessToken(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, status: true, sessionVersion: true } });
      if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== payload.sv) throw new Error('invalid user');
      const membership = await this.prisma.coupleMembership.findFirst({ where: { userId: user.id, leftAt: null }, select: { coupleId: true } });
      socket.data.userId = user.id;
      socket.data.coupleId = membership?.coupleId ?? null;
      await socket.join(`user:${user.id}`);
      if (membership) await socket.join(`couple:${membership.coupleId}`);
      socket.emit('ready', { coupleId: membership?.coupleId ?? null });
    } catch {
      socket.emit('error', { code: 'UNAUTHORIZED' });
      socket.disconnect(true);
    }
  }

  emitToCouple(coupleId: string, event: string, payload: Record<string, unknown>) {
    this.server?.to(`couple:${coupleId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}

function bearer(header?: string): string | undefined {
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

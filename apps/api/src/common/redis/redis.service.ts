import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV, type Env } from '@/config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor(@Inject(ENV) env: Env) {
    this.client = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: true });
    this.client.on('error', () => {
      /* journalisé par pino via l'intercepteur global ; évite un crash sur erreur transitoire */
    });
  }

  /** Incrémente un compteur à fenêtre fixe ; renvoie la valeur courante. */
  async incrWindow(key: string, windowSec: number): Promise<number> {
    const result = await this.client.multi().incr(key).expire(key, windowSec, 'NX').exec();
    const count = result?.[0]?.[1];
    return typeof count === 'number' ? count : Number(count ?? 0);
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}

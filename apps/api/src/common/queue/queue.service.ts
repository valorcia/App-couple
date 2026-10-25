import { Inject, Injectable, Logger as NestLogger, type OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job, type Processor } from 'bullmq';
import { ENV, type Env } from '@/config/env';

export const QUEUES = { push: 'push', reminders: 'reminders', daily: 'daily' } as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Files BullMQ (Redis). L'API produit des jobs ; les workers les consomment dans un processus dédié
 * (WORKER_MODE=true) ou en ligne en dev/test (WORKERS_INLINE).
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new NestLogger('Queue');
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];
  private readonly connection: { url: string };
  readonly processInline: boolean;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.connection = { url: env.REDIS_URL };
    this.processInline = env.WORKER_MODE || !!env.WORKERS_INLINE;
  }

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection, prefix: 'en', defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 5000, attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
      this.queues.set(name, q);
    }
    return q;
  }

  async add(name: QueueName, jobName: string, data: Record<string, unknown>, opts: { delayMs?: number; jobId?: string } = {}): Promise<void> {
    await this.queue(name).add(jobName, data, { delay: opts.delayMs, jobId: opts.jobId });
  }

  /** Enregistre un worker (uniquement si ce processus doit consommer). */
  register(name: QueueName, processor: Processor, concurrency = 5): void {
    if (!this.processInline) return;
    const worker = new Worker(name, processor, { connection: this.connection, prefix: 'en', concurrency });
    worker.on('failed', (job: Job | undefined, err: Error) => this.logger.warn(`Job ${name}/${job?.name} échoué : ${err.message}`));
    this.workers.push(worker);
  }

  /** Job récurrent (idempotent par clé). */
  async scheduleRepeat(name: QueueName, jobName: string, everyMs: number): Promise<void> {
    if (!this.processInline) return;
    await this.queue(name).upsertJobScheduler(`${jobName}-scheduler`, { every: everyMs }, { name: jobName, data: {} });
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close().catch(() => undefined)));
    await Promise.all([...this.queues.values()].map((q) => q.close().catch(() => undefined)));
  }
}

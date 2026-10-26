import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ENV, type Env } from '@/config/env';

/**
 * Amorçage de l'administration : les adresses listées dans `ADMIN_BOOTSTRAP_EMAILS` sont promues
 * ADMIN au démarrage si le compte existe déjà (créé normalement par l'inscription). Permet d'obtenir
 * un premier administrateur en production sans seed de comptes ni accès SQL.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.promote().catch((err: unknown) => this.logger.warn(`Amorçage admin ignoré : ${err instanceof Error ? err.message : String(err)}`));
  }

  /** Retourne le nombre de comptes promus. */
  async promote(): Promise<number> {
    const emails = this.env.ADMIN_BOOTSTRAP_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (emails.length === 0) return 0;
    const result = await this.prisma.user.updateMany({ where: { email: { in: emails }, role: { not: 'ADMIN' } }, data: { role: 'ADMIN' } });
    if (result.count > 0) this.logger.log(`${result.count} compte(s) promu(s) ADMIN (ADMIN_BOOTSTRAP_EMAILS)`);
    const missing = emails.length - (await this.prisma.user.count({ where: { email: { in: emails } } }));
    if (missing > 0) this.logger.log(`${missing} adresse(s) de ADMIN_BOOTSTRAP_EMAILS sans compte : elles seront promues au prochain démarrage après inscription`);
    return result.count;
  }
}

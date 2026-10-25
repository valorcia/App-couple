import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/decorators/auth.decorators';
import { MailService } from '@/common/mail/mail.service';

/**
 * Outils de développement : boîte mail mémoire (équivalent de Mailpit) pour les tests e2e.
 * Module chargé uniquement hors production avec MAIL_PROVIDER=console (voir DevModule).
 */
@ApiExcludeController()
@Controller('dev')
export class DevController {
  constructor(private readonly mail: MailService) {}

  @Public()
  @Get('mailbox')
  mailbox(@Query('to') to?: string) {
    const items = this.mail.outbox.filter((m) => !to || m.to.toLowerCase() === to.toLowerCase());
    return { items: items.slice(-20).reverse() };
  }
}

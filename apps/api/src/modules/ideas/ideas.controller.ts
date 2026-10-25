import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { scheduleIdeaSchema, suggestIdeasSchema } from '@couple/validation';
import type { IdeaSuggestionsDto, ScheduledIdeaDto } from '@couple/types';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IdeasService } from './ideas.service';

@ApiTags('ideas')
@ApiBearerAuth()
@RequireCouple()
@Controller('ideas')
export class IdeasController {
  constructor(
    private readonly ideas: IdeasService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('suggest')
  @HttpCode(200)
  @RateLimit({ name: 'ideas.suggest', limit: 30, windowSec: 600, by: 'user' })
  @ApiOperation({ summary: '« On fait quoi ? » : propositions (catalogue + IA facultative)' })
  async suggest(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(suggestIdeasSchema) body: typeof suggestIdeasSchema._output): Promise<IdeaSuggestionsDto> {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { locale: true, timezone: true } });
    return this.ideas.suggest({ userId: user.id, couple }, body, me.locale, me.timezone);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Ajoute l’idée choisie à l’agenda partagé (confirmation explicite)' })
  async schedule(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(scheduleIdeaSchema) body: typeof scheduleIdeaSchema._output): Promise<ScheduledIdeaDto> {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } });
    return this.ideas.schedule({ userId: user.id, couple }, body, me.timezone);
  }
}

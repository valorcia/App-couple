import { Controller, Delete, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { desireResponseSchema, drawCardSchema, listDesireItemsSchema, tonightSchema, updateIntimacySettingsSchema, uuidSchema } from '@couple/validation';
import type { CardTableDto, DesireItemDto, DesireMatchesDto, IntimacySettingsDto, TonightDto } from '@couple/types';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IntimacyService } from './intimacy.service';

@ApiTags('intimacy')
@ApiBearerAuth()
@RequireCouple()
@Controller('intimacy')
export class IntimacyController {
  constructor(
    private readonly intimacy: IntimacyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('settings')
  settings(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<IntimacySettingsDto> {
    return this.intimacy.getSettings({ userId: user.id, couple });
  }

  @Put('settings')
  update(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(updateIntimacySettingsSchema) body: typeof updateIntimacySettingsSchema._output, @Req() req: Request): Promise<IntimacySettingsDto> {
    return this.intimacy.updateSettings({ userId: user.id, couple }, body, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get('items')
  async items(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodQuery(listDesireItemsSchema) q: typeof listDesireItemsSchema._output): Promise<DesireItemDto[]> {
    const { locale } = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { locale: true } });
    return this.intimacy.listItems({ userId: user.id, couple }, locale, q.category);
  }

  @Put('items/:id/response')
  respond(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(desireResponseSchema) body: typeof desireResponseSchema._output): Promise<DesireItemDto> {
    return this.intimacy.respond({ userId: user.id, couple }, id, body.choice);
  }

  @Delete('responses')
  @HttpCode(204)
  async deleteResponses(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @Req() req: Request): Promise<void> {
    await this.intimacy.deleteMyResponses({ userId: user.id, couple }, { ip: req.ip });
  }

  @Get('matches')
  matches(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<DesireMatchesDto> {
    return this.intimacy.matches({ userId: user.id, couple });
  }

  @Post('matches/reveal')
  @HttpCode(200)
  reveal(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @Req() req: Request): Promise<DesireMatchesDto> {
    return this.intimacy.requestReveal({ userId: user.id, couple }, { ip: req.ip });
  }

  @Get('tonight')
  tonight(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<TonightDto> {
    return this.intimacy.tonight({ userId: user.id, couple });
  }

  @Put('tonight')
  setTonight(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(tonightSchema) body: typeof tonightSchema._output): Promise<TonightDto> {
    return this.intimacy.setTonight({ userId: user.id, couple }, body.on);
  }

  @Get('cards')
  cards(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<CardTableDto> {
    return this.intimacy.cardsTable({ userId: user.id, couple });
  }

  @Post('cards/draw')
  @HttpCode(200)
  draw(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(drawCardSchema) body: typeof drawCardSchema._output): Promise<CardTableDto> {
    return this.intimacy.drawCard({ userId: user.id, couple }, body.level);
  }

  @Post('cards/done')
  @HttpCode(200)
  done(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<CardTableDto> {
    return this.intimacy.cardDone({ userId: user.id, couple });
  }

  @Delete('cards')
  @HttpCode(200)
  resetCards(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<CardTableDto> {
    return this.intimacy.resetCards({ userId: user.id, couple });
  }
}

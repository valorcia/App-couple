import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { createGameSessionSchema, dailyAnswerSchema, listGameSessionsSchema, submitAnswerSchema, uuidSchema, verdictSchema } from '@couple/validation';
import type { DailyQuestionDto, GameCatalogDto, GameSessionDto } from '@couple/types';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GamesService } from './games.service';

const indexParam = z.coerce.number().int().min(0).max(99);

@ApiTags('games')
@ApiBearerAuth()
@RequireCouple()
@Controller('games')
export class GamesController {
  constructor(
    private readonly games: GamesService,
    private readonly prisma: PrismaService,
  ) {}

  private async locale(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { locale: true } });
    return u.locale;
  }

  @Get('catalog')
  async catalog(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<GameCatalogDto> {
    return this.games.catalog({ userId: user.id, couple }, await this.locale(user.id));
  }

  @Get('daily')
  @ApiOperation({ summary: 'Question du jour du couple (créée à la première consultation)' })
  async daily(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<DailyQuestionDto | { daily: null }> {
    return (await this.games.daily({ userId: user.id, couple }, await this.locale(user.id))) ?? { daily: null };
  }

  @Post('daily/answer')
  @HttpCode(200)
  async answerDaily(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(dailyAnswerSchema) body: typeof dailyAnswerSchema._output): Promise<DailyQuestionDto> {
    return this.games.answerDaily({ userId: user.id, couple }, body.text, await this.locale(user.id));
  }

  @Get('sessions')
  list(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodQuery(listGameSessionsSchema) q: typeof listGameSessionsSchema._output) {
    return this.games.listSessions({ userId: user.id, couple }, q.status, q.limit, q.cursor);
  }

  @Post('sessions')
  async create(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(createGameSessionSchema) body: typeof createGameSessionSchema._output): Promise<GameSessionDto> {
    return this.games.createSession({ userId: user.id, couple }, body, await this.locale(user.id));
  }

  @Get('sessions/:id')
  get(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<GameSessionDto> {
    return this.games.getSession({ userId: user.id, couple }, id);
  }

  @Post('sessions/:id/rounds/:index/answer')
  @HttpCode(200)
  answer(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('index', indexParam) index: number, @ZodBody(submitAnswerSchema) body: typeof submitAnswerSchema._output): Promise<GameSessionDto> {
    return this.games.answer({ userId: user.id, couple }, id, index, body.answer);
  }

  @Post('sessions/:id/rounds/:index/skip')
  @HttpCode(200)
  skip(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('index', indexParam) index: number): Promise<GameSessionDto> {
    return this.games.skip({ userId: user.id, couple }, id, index);
  }

  @Post('sessions/:id/rounds/:index/verdict')
  @HttpCode(200)
  verdict(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('index', indexParam) index: number, @ZodBody(verdictSchema) body: typeof verdictSchema._output): Promise<GameSessionDto> {
    return this.games.verdict({ userId: user.id, couple }, id, index, body.verdict);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async abandon(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<void> {
    await this.games.abandon({ userId: user.id, couple }, id);
  }
}

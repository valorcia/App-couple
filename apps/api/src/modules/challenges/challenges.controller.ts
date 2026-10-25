import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { completeChallengeSchema, listChallengesSchema, uuidSchema } from '@couple/validation';
import type { ChallengeDto, ChallengeFeaturedDto } from '@couple/types';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ChallengesService } from './challenges.service';

@ApiTags('challenges')
@ApiBearerAuth()
@RequireCouple()
@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly challenges: ChallengesService,
    private readonly prisma: PrismaService,
  ) {}

  private async locale(userId: string) {
    return (await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { locale: true } })).locale;
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodQuery(listChallengesSchema) q: typeof listChallengesSchema._output): Promise<ChallengeDto[]> {
    return this.challenges.list({ userId: user.id, couple }, await this.locale(user.id), q);
  }

  @Get('progress')
  progress(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<ChallengeDto[]> {
    return this.challenges.progressList({ userId: user.id, couple });
  }

  @Get('featured')
  async featured(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext): Promise<ChallengeFeaturedDto> {
    return this.challenges.featured({ userId: user.id, couple }, await this.locale(user.id));
  }

  @Post(':id/propose')
  @HttpCode(200)
  async propose(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<ChallengeDto> {
    return this.challenges.propose({ userId: user.id, couple }, id, await this.locale(user.id));
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<ChallengeDto> {
    return this.challenges.accept({ userId: user.id, couple }, id);
  }

  @Post(':id/skip')
  @HttpCode(200)
  skip(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<ChallengeDto> {
    return this.challenges.skip({ userId: user.id, couple }, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(completeChallengeSchema) body: typeof completeChallengeSchema._output): Promise<ChallengeDto> {
    return this.challenges.complete({ userId: user.id, couple }, id, body.note);
  }
}

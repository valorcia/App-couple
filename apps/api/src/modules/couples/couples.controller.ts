import { Controller, Delete, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { acceptInvitationSchema, createInvitationSchema, leaveCoupleSchema, updateCoupleSchema } from '@couple/validation';
import type { CoupleDto, InvitationDto } from '@couple/types';
import { AppError, ErrorCode } from '@couple/shared';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentCoupleOptional, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { CouplesService } from './couples.service';

@ApiTags('couples')
@ApiBearerAuth()
@Controller('couples')
export class CouplesController {
  constructor(private readonly couples: CouplesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon couple (ou null)' })
  async me(@CurrentUser() user: AuthUser): Promise<{ couple: CoupleDto | null }> {
    return { couple: await this.couples.getForUser(user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Créer mon espace couple et obtenir un code d\'invitation' })
  create(@CurrentUser() user: AuthUser, @ZodBody(createInvitationSchema) body: typeof createInvitationSchema._output, @Req() req: Request): Promise<CoupleDto> {
    return this.couples.createWithInvitation(user.id, body.targetEmail, { ip: req.ip });
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Régénérer un code d\'invitation (couple en attente)' })
  renew(@CurrentUser() user: AuthUser, @CurrentCoupleOptional() couple: CoupleContext | null, @ZodBody(createInvitationSchema) body: typeof createInvitationSchema._output): Promise<InvitationDto> {
    if (!couple) throw new AppError(ErrorCode.NOT_FOUND, "Créez d'abord votre espace couple.", 404);
    return this.couples.renewInvitation(user.id, couple.coupleId, body.targetEmail);
  }

  @Post('join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rejoindre un couple avec un code' })
  join(@CurrentUser() user: AuthUser, @ZodBody(acceptInvitationSchema) body: typeof acceptInvitationSchema._output, @Req() req: Request): Promise<CoupleDto> {
    return this.couples.acceptInvitation(user.id, body.code, { ip: req.ip });
  }

  @RequireCouple()
  @Patch('me')
  update(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(updateCoupleSchema) body: typeof updateCoupleSchema._output): Promise<CoupleDto> {
    return this.couples.update(couple.coupleId, body, user.id);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Quitter le couple (immédiat, unilatéral)' })
  async leave(@CurrentUser() user: AuthUser, @CurrentCoupleOptional() couple: CoupleContext | null, @ZodBody(leaveCoupleSchema) _body: unknown, @Req() req: Request): Promise<void> {
    if (!couple) throw new AppError(ErrorCode.NOT_FOUND, "Vous n'avez pas d'espace couple.", 404);
    await this.couples.leave(user.id, couple.coupleId, { ip: req.ip });
  }
}

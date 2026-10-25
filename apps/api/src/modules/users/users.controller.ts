import { Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { confirmAdultSchema, updateProfileSchema } from '@couple/validation';
import type { MeDto } from '@couple/types';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { AllowUnverified, CurrentUser, type AuthUser } from '@/common/decorators/auth.decorators';
import { UsersService } from './users.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @AllowUnverified()
  @Get()
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.users.getMe(user.id);
  }

  @AllowUnverified()
  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @ZodBody(updateProfileSchema) body: typeof updateProfileSchema._output): Promise<MeDto> {
    return this.users.updateProfile(user.id, body);
  }

  @Post('confirm-adult')
  confirmAdult(@CurrentUser() user: AuthUser, @ZodBody(confirmAdultSchema) _body: unknown, @Req() req: Request): Promise<MeDto> {
    return this.users.confirmAdult(user.id, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}

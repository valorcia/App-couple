import { Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { updateNotificationPreferencesSchema, uuidSchema } from '@couple/validation';
import type { NotificationPreferencesDto } from '@couple/types';
import { ZodBody, ZodParam } from '@/common/decorators/zod.decorators';
import { AllowUnverified, type AuthUser, CurrentUser } from '@/common/decorators/auth.decorators';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('cursor') cursor?: string) {
    return this.notifications.list(user.id, 30, cursor);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @AllowUnverified()
  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser): Promise<NotificationPreferencesDto> {
    return this.notifications.getPreferences(user.id);
  }

  @AllowUnverified()
  @Put('preferences')
  update(@CurrentUser() user: AuthUser, @ZodBody(updateNotificationPreferencesSchema) body: typeof updateNotificationPreferencesSchema._output): Promise<NotificationPreferencesDto> {
    return this.notifications.updatePreferences(user.id, body);
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentUser() user: AuthUser, @ZodParam('id', uuidSchema) id: string) {
    await this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user.id);
  }
}

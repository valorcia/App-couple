import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { registerPushDeviceSchema } from '@couple/validation';
import { ZodBody } from '@/common/decorators/zod.decorators';
import { AllowUnverified, type AuthUser, CurrentUser } from '@/common/decorators/auth.decorators';
import { PushService } from './push.service';

@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @AllowUnverified()
  @Post('devices')
  @HttpCode(200)
  async register(@CurrentUser() user: AuthUser, @ZodBody(registerPushDeviceSchema) body: typeof registerPushDeviceSchema._output) {
    const d = await this.push.registerDevice(user.id, body.token, body.platform, body.deviceName);
    return { id: d.id, platform: d.platform };
  }

  @AllowUnverified()
  @Delete('devices')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z.object({ token: z.string().min(1).max(200) }).safeParse(body);
    if (parsed.success) await this.push.removeDevice(user.id, parsed.data.token);
  }
}

import { Controller, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { adminSuspendUserSchema, adminUserSearchSchema, upsertAppSettingSchema, upsertFeatureFlagSchema, upsertProductSchema, uuidSchema } from '@couple/validation';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, CurrentUser, Roles } from '@/common/decorators/auth.decorators';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SettingsService } from '@/common/settings/settings.service';
import { AuditService } from '@/common/audit/audit.service';
import { AdminService } from './admin.service';

const auditQuery = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPPORT')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users(@ZodQuery(adminUserSearchSchema) query: typeof adminUserSearchSchema._output) {
    return this.admin.searchUsers(query);
  }

  @Post('users/:id/suspend')
  @HttpCode(204)
  @Roles('ADMIN')
  async suspend(@CurrentUser() actor: AuthUser, @ZodParam('id', uuidSchema) id: string, @ZodBody(adminSuspendUserSchema) body: typeof adminSuspendUserSchema._output, @Req() req: Request) {
    await this.admin.suspendUser({ id: actor.id, role: actor.role, ip: req.ip }, id, body.reason);
  }

  @Post('users/:id/unsuspend')
  @HttpCode(204)
  @Roles('ADMIN')
  async unsuspend(@CurrentUser() actor: AuthUser, @ZodParam('id', uuidSchema) id: string, @Req() req: Request) {
    await this.admin.unsuspendUser({ id: actor.id, role: actor.role, ip: req.ip }, id);
  }

  @Get('audit')
  auditLogs(@ZodQuery(auditQuery) q: z.infer<typeof auditQuery>) {
    return this.admin.listAudit(q.limit, q.cursor);
  }

  @Get('flags')
  flags() {
    return this.admin.listFlags();
  }

  @Put('flags')
  @Roles('ADMIN')
  upsertFlag(@CurrentUser() actor: AuthUser, @ZodBody(upsertFeatureFlagSchema) body: typeof upsertFeatureFlagSchema._output, @Req() req: Request) {
    return this.admin.upsertFlag({ id: actor.id, role: actor.role, ip: req.ip }, body);
  }

  @Get('settings')
  listSettings() {
    return this.settings.list();
  }

  @Put('settings')
  @Roles('ADMIN')
  async upsertSetting(@CurrentUser() actor: AuthUser, @ZodBody(upsertAppSettingSchema) body: typeof upsertAppSettingSchema._output, @Req() req: Request) {
    const row = await this.settings.set(body.key, body.value, body.description);
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.setting.upsert', targetType: 'AppSetting', targetId: body.key, metadata: { value: body.value }, ip: req.ip });
    return { key: row.key, value: row.value, description: row.description };
  }

  @Get('products')
  products() {
    return this.admin.listProducts();
  }

  @Put('products')
  @Roles('ADMIN')
  upsertProduct(@CurrentUser() actor: AuthUser, @ZodBody(upsertProductSchema) body: typeof upsertProductSchema._output, @Req() req: Request) {
    return this.admin.upsertProduct({ id: actor.id, role: actor.role, ip: req.ip }, body);
  }
}

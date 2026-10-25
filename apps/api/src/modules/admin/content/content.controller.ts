import { Body, Controller, Delete, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { adminContentListSchema, adminContentStatusSchema, adminImportSchema, contentTypeSchema, uuidSchema } from '@couple/validation';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, CurrentUser, Roles } from '@/common/decorators/auth.decorators';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ContentAdminService } from './content.service';

@ApiTags('admin-content')
@ApiBearerAuth()
@Controller('admin/content')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPPORT')
export class ContentAdminController {
  constructor(private readonly content: ContentAdminService) {}

  // Routes fixes déclarées avant « :type » pour éviter la capture par le paramètre.
  @Post('import')
  @Roles('ADMIN')
  @HttpCode(200)
  import(@CurrentUser() actor: AuthUser, @ZodBody(adminImportSchema) body: typeof adminImportSchema._output, @Req() req: Request) {
    return this.content.import({ id: actor.id, role: actor.role, ip: req.ip }, body.type, body.items);
  }

  @Get('counts')
  counts() {
    return this.content.counts();
  }

  @Get(':type')
  list(@ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @ZodQuery(adminContentListSchema) q: typeof adminContentListSchema._output) {
    return this.content.list(type, q);
  }

  @Get(':type/:id')
  one(@ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @ZodParam('id', uuidSchema) id: string) {
    return this.content.getOne(type, id);
  }

  @Post(':type')
  @Roles('ADMIN')
  create(@CurrentUser() actor: AuthUser, @ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @Body() body: unknown, @Req() req: Request) {
    return this.content.upsert({ id: actor.id, role: actor.role, ip: req.ip }, type, null, body);
  }

  @Put(':type/:id')
  @Roles('ADMIN')
  update(@CurrentUser() actor: AuthUser, @ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @ZodParam('id', uuidSchema) id: string, @Body() body: unknown, @Req() req: Request) {
    return this.content.upsert({ id: actor.id, role: actor.role, ip: req.ip }, type, id, body);
  }

  @Post(':type/:id/status')
  @Roles('ADMIN')
  @HttpCode(200)
  status(@CurrentUser() actor: AuthUser, @ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @ZodParam('id', uuidSchema) id: string, @ZodBody(adminContentStatusSchema) body: typeof adminContentStatusSchema._output, @Req() req: Request) {
    return this.content.setStatus({ id: actor.id, role: actor.role, ip: req.ip }, type, id, body.status);
  }

  @Delete(':type/:id')
  @Roles('ADMIN')
  @HttpCode(200)
  remove(@CurrentUser() actor: AuthUser, @ZodParam('type', contentTypeSchema) type: typeof contentTypeSchema._output, @ZodParam('id', uuidSchema) id: string, @Req() req: Request) {
    return this.content.remove({ id: actor.id, role: actor.role, ip: req.ip }, type, id);
  }

}

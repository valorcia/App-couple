import { Controller, Delete, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createProjectSchema, createProjectStepSchema, projectNoteSchema, updateProjectSchema, updateProjectStepSchema, uuidSchema } from '@couple/validation';
import type { ProjectDto } from '@couple/types';
import { ZodBody, ZodParam } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { ProjectsService, TEMPLATE_STEPS } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@RequireCouple()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}
  private v(user: AuthUser, couple: CoupleContext) {
    return { userId: user.id, couple };
  }

  @Get('templates')
  templates() {
    return Object.entries(TEMPLATE_STEPS).map(([code, steps]) => ({ code, steps }));
  }
  @Get()
  list(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @Query('archived') archived?: string): Promise<ProjectDto[]> {
    return this.svc.list(this.v(u, c), archived === 'true');
  }
  @Post()
  create(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodBody(createProjectSchema) b: typeof createProjectSchema._output) {
    return this.svc.create(this.v(u, c), b);
  }
  @Get(':id')
  get(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string) {
    return this.svc.get(this.v(u, c), id);
  }
  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(updateProjectSchema) b: typeof updateProjectSchema._output) {
    return this.svc.update(this.v(u, c), id, b);
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string) {
    await this.svc.remove(this.v(u, c), id);
  }
  @Post(':id/steps')
  addStep(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(createProjectStepSchema) b: typeof createProjectStepSchema._output) {
    return this.svc.addStep(this.v(u, c), id, b);
  }
  @Patch(':id/steps/:stepId')
  updateStep(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('stepId', uuidSchema) stepId: string, @ZodBody(updateProjectStepSchema) b: typeof updateProjectStepSchema._output) {
    return this.svc.updateStep(this.v(u, c), id, stepId, b);
  }
  @Delete(':id/steps/:stepId')
  removeStep(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('stepId', uuidSchema) stepId: string) {
    return this.svc.removeStep(this.v(u, c), id, stepId);
  }
  @Post(':id/notes')
  addNote(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(projectNoteSchema) b: typeof projectNoteSchema._output) {
    return this.svc.addNote(this.v(u, c), id, b.body);
  }
  @Delete(':id/notes/:noteId')
  removeNote(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('noteId', uuidSchema) noteId: string) {
    return this.svc.removeNote(this.v(u, c), id, noteId);
  }
}

import { Controller, Delete, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createShoppingItemSchema, createShoppingListSchema, createTaskSchema, listTasksSchema, taskCommentSchema, updateShoppingItemSchema, updateShoppingListSchema, updateTaskSchema, uuidSchema } from '@couple/validation';
import type { ShoppingListDto, TaskDto } from '@couple/types';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { DailyLifeService } from './daily-life.service';

@ApiTags('daily-life')
@ApiBearerAuth()
@RequireCouple()
@Controller()
export class DailyLifeController {
  constructor(private readonly svc: DailyLifeService) {}
  private v(user: AuthUser, couple: CoupleContext) {
    return { userId: user.id, couple };
  }

  @Get('shopping-lists')
  lists(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @Query('archived') archived?: string): Promise<ShoppingListDto[]> {
    return this.svc.lists(this.v(u, c), archived === 'true');
  }
  @Post('shopping-lists')
  createList(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodBody(createShoppingListSchema) b: typeof createShoppingListSchema._output) {
    return this.svc.createList(this.v(u, c), b);
  }
  @Patch('shopping-lists/:id')
  updateList(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(updateShoppingListSchema) b: typeof updateShoppingListSchema._output) {
    return this.svc.updateList(this.v(u, c), id, b);
  }
  @Delete('shopping-lists/:id')
  @HttpCode(204)
  async deleteList(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string) {
    await this.svc.deleteList(this.v(u, c), id);
  }
  @Post('shopping-lists/:id/items')
  addItem(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(createShoppingItemSchema) b: typeof createShoppingItemSchema._output) {
    return this.svc.addItem(this.v(u, c), id, b);
  }
  @Patch('shopping-lists/:id/items/:itemId')
  updateItem(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('itemId', uuidSchema) itemId: string, @ZodBody(updateShoppingItemSchema) b: typeof updateShoppingItemSchema._output) {
    return this.svc.updateItem(this.v(u, c), id, itemId, b);
  }
  @Delete('shopping-lists/:id/items/:itemId')
  deleteItem(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodParam('itemId', uuidSchema) itemId: string) {
    return this.svc.deleteItem(this.v(u, c), id, itemId);
  }
  @Post('shopping-lists/:id/clear-checked')
  @HttpCode(200)
  clearChecked(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string) {
    return this.svc.clearChecked(this.v(u, c), id);
  }

  @Get('tasks')
  tasks(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodQuery(listTasksSchema) q: typeof listTasksSchema._output): Promise<TaskDto[]> {
    return this.svc.tasks(this.v(u, c), q);
  }
  @Post('tasks')
  createTask(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodBody(createTaskSchema) b: typeof createTaskSchema._output) {
    return this.svc.createTask(this.v(u, c), b);
  }
  @Patch('tasks/:id')
  updateTask(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(updateTaskSchema) b: typeof updateTaskSchema._output) {
    return this.svc.updateTask(this.v(u, c), id, b);
  }
  @Delete('tasks/:id')
  @HttpCode(204)
  async deleteTask(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string) {
    await this.svc.deleteTask(this.v(u, c), id);
  }
  @Post('tasks/:id/comments')
  comment(@CurrentUser() u: AuthUser, @CurrentCouple() c: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(taskCommentSchema) b: typeof taskCommentSchema._output) {
    return this.svc.comment(this.v(u, c), id, b.body);
  }
}

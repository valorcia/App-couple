import { Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createEventSchema, excludeOccurrenceSchema, freeSlotsQuerySchema, listEventsQuerySchema, respondAttendeeSchema, updateEventSchema, uuidSchema } from '@couple/validation';
import type { CalendarEventDto, FreeSlotDto } from '@couple/types';
import { ZodBody, ZodParam, ZodQuery } from '@/common/decorators/zod.decorators';
import { type AuthUser, type CoupleContext, CurrentCouple, CurrentUser, RequireCouple } from '@/common/decorators/auth.decorators';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@RequireCouple()
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'Événements visibles dans une fenêtre (occurrences récurrentes développées)' })
  list(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodQuery(listEventsQuerySchema) q: typeof listEventsQuerySchema._output): Promise<CalendarEventDto[]> {
    return this.calendar.list({ userId: user.id, couple }, new Date(q.from), new Date(q.to));
  }

  @Get('free-slots')
  @ApiOperation({ summary: 'Créneaux libres communs (événements privés du partenaire exclus)' })
  async freeSlots(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodQuery(freeSlotsQuerySchema) q: typeof freeSlotsQuerySchema._output): Promise<FreeSlotDto[]> {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timezone: true } });
    return this.calendar.freeSlots({ userId: user.id, couple }, new Date(q.from), new Date(q.to), q.minMinutes, q.dayStartHour, q.dayEndHour, me.timezone);
  }

  @Get('events/:id')
  getOne(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<CalendarEventDto> {
    return this.calendar.getOne({ userId: user.id, couple }, id);
  }

  @Post('events')
  create(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodBody(createEventSchema) body: typeof createEventSchema._output): Promise<CalendarEventDto> {
    return this.calendar.create({ userId: user.id, couple }, body);
  }

  @Patch('events/:id')
  update(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(updateEventSchema) body: typeof updateEventSchema._output): Promise<CalendarEventDto> {
    return this.calendar.update({ userId: user.id, couple }, id, body);
  }

  @Delete('events/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string): Promise<void> {
    await this.calendar.remove({ userId: user.id, couple }, id);
  }

  @Post('events/:id/exclude')
  @HttpCode(200)
  exclude(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(excludeOccurrenceSchema) body: typeof excludeOccurrenceSchema._output): Promise<CalendarEventDto> {
    return this.calendar.excludeOccurrence({ userId: user.id, couple }, id, new Date(body.occurrenceStart));
  }

  @Post('events/:id/respond')
  @HttpCode(200)
  respond(@CurrentUser() user: AuthUser, @CurrentCouple() couple: CoupleContext, @ZodParam('id', uuidSchema) id: string, @ZodBody(respondAttendeeSchema) body: typeof respondAttendeeSchema._output): Promise<CalendarEventDto> {
    return this.calendar.respond({ userId: user.id, couple }, id, body.status);
  }
}

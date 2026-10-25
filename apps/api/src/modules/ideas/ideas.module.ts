import { Module } from '@nestjs/common';
import { CalendarModule } from '@/modules/calendar/calendar.module';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';

@Module({ imports: [CalendarModule, EntitlementsModule], controllers: [IdeasController], providers: [IdeasService] })
export class IdeasModule {}

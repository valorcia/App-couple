import { Module } from '@nestjs/common';
import { DailyLifeController } from './daily-life.controller';
import { DailyLifeService } from './daily-life.service';

@Module({ controllers: [DailyLifeController], providers: [DailyLifeService], exports: [DailyLifeService] })
export class DailyLifeModule {}

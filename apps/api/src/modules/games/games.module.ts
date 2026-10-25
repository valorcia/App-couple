import { Module } from '@nestjs/common';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({ imports: [EntitlementsModule], controllers: [GamesController], providers: [GamesService], exports: [GamesService] })
export class GamesModule {}

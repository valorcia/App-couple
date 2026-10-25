import { Module } from '@nestjs/common';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { RedisModule } from '@/common/redis/redis.module';
import { IntimacyController } from './intimacy.controller';
import { IntimacyService } from './intimacy.service';

@Module({ imports: [EntitlementsModule, RedisModule], controllers: [IntimacyController], providers: [IntimacyService], exports: [IntimacyService] })
export class IntimacyModule {}

import { Module } from '@nestjs/common';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { IntimacyController } from './intimacy.controller';
import { IntimacyService } from './intimacy.service';

@Module({ imports: [EntitlementsModule], controllers: [IntimacyController], providers: [IntimacyService], exports: [IntimacyService] })
export class IntimacyModule {}

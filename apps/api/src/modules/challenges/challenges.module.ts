import { Module } from '@nestjs/common';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { IntimacyModule } from '@/modules/intimacy/intimacy.module';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';

@Module({ imports: [EntitlementsModule, IntimacyModule], controllers: [ChallengesController], providers: [ChallengesService] })
export class ChallengesModule {}

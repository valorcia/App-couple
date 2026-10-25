import { Global, Module } from '@nestjs/common';
import { EntitlementsModule } from '@/modules/entitlements/entitlements.module';
import { AiService } from './ai.service';

@Global()
@Module({ imports: [EntitlementsModule], providers: [AiService], exports: [AiService] })
export class AiModule {}

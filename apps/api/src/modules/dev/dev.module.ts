import { type DynamicModule, Module } from '@nestjs/common';
import { loadEnv } from '@/config/env';
import { DevController } from './dev.controller';

@Module({})
export class DevModule {
  static register(): DynamicModule {
    const env = loadEnv();
    const enabled = env.NODE_ENV !== 'production' && env.MAIL_PROVIDER === 'console';
    return { module: DevModule, controllers: enabled ? [DevController] : [] };
  }
}

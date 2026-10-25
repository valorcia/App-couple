import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './common/mail/mail.module';
import { AuditModule } from './common/audit/audit.module';
import { SettingsModule } from './common/settings/settings.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CoupleGuard } from './common/guards/couple.guard';
import { fieldCipherProvider } from './common/crypto/cipher.provider';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CouplesModule } from './modules/couples/couples.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { DevModule } from './modules/dev/dev.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GamesModule } from './modules/games/games.module';
import { IntimacyModule } from './modules/intimacy/intimacy.module';
import { ChallengesModule } from './modules/challenges/challenges.module';

const SENSITIVE_PATHS = ['/auth', '/me/confirm-adult'];

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
          genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
          transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
          redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'], remove: true },
          serializers: {
            req: (req: { id: string; method: string; url: string; remoteAddress?: string }) => ({
              id: req.id,
              method: req.method,
              url: SENSITIVE_PATHS.some((p) => req.url.startsWith(p)) ? req.url.split('?')[0] : req.url,
              remoteAddress: req.remoteAddress,
            }),
          },
          autoLogging: { ignore: (req) => (req.url ?? '').startsWith('/health') },
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    AuditModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    CouplesModule,
    EntitlementsModule,
    AdminModule,
    RealtimeModule,
    NotificationsModule,
    CalendarModule,
    GamesModule,
    IntimacyModule,
    ChallengesModule,
    HealthModule,
    DevModule.register(),
  ],
  providers: [
    fieldCipherProvider,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CoupleGuard },
  ],
})
export class AppModule {}

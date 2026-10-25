import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ENV, type Env } from './config/env';

/** Construit l'application Nest avec la même configuration en dev, prod et tests. */
export async function createApp(): Promise<NestExpressApplication> {
  // abortOnError:false → une erreur d'initialisation est levée (lisible dans les tests) au lieu de process.exit.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, abortOnError: false });
  const env = app.get<Env>(ENV);
  app.useLogger(app.get(Logger));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Platform', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Entre Nous API')
      .setDescription('API du compagnon intelligent du couple')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), { jsonDocumentUrl: 'docs/openapi.json' });
  }
  return app;
}

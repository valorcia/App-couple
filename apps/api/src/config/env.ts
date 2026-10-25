import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_MODE: z.coerce.boolean().default(false),
  APP_NAME: z.string().default('Entre Nous'),
  API_PORT: z.coerce.number().int().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_PUBLIC_URL: z.string().url().default('http://localhost:3100'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3100'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'DATA_ENCRYPTION_KEY : 32 octets encodés en base64 attendus (openssl rand -base64 32)'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  MAIL_PROVIDER: z.enum(['console', 'smtp', 'resend']).default('console'),
  MAIL_FROM: z.string().default('Entre Nous <no-reply@localhost>'),
  SMTP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  AI_PROVIDER: z.enum(['anthropic', 'openai-compatible', 'disabled']).default('disabled'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_BASE_URL: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  EXPO_ACCESS_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Désactive le rate limiting (tests e2e locaux uniquement ; ignoré en production). */
  RATE_LIMIT_DISABLED: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Configuration invalide :\n  ${issues}`);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.RATE_LIMIT_DISABLED) {
    throw new Error('RATE_LIMIT_DISABLED est interdit en production');
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');

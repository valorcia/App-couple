import { createHash } from 'node:crypto';
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
  /** 32 octets en base64 (`openssl rand -base64 32`), ou n'importe quel secret d'au moins 32 caractères : il est alors dérivé en clé de 32 octets (SHA-256). */
  DATA_ENCRYPTION_KEY: z.string().min(32, 'DATA_ENCRYPTION_KEY : au moins 32 caractères (idéalement openssl rand -base64 32)'),
  /** Adresses (séparées par des virgules) promues ADMIN au démarrage si le compte existe : amorçage de l'administration en production. */
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(''),
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
  /** Traite les files BullMQ dans le même processus (dev/test). En production : worker dédié (WORKER_MODE). */
  WORKERS_INLINE: z.coerce.boolean().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Configuration invalide :\n  ${issues}`);
  }
  if (parsed.data.WORKERS_INLINE === undefined) parsed.data.WORKERS_INLINE = parsed.data.NODE_ENV !== 'production';
  parsed.data.DATA_ENCRYPTION_KEY = normalizeEncryptionKey(parsed.data.DATA_ENCRYPTION_KEY);
  if (parsed.data.NODE_ENV === 'production' && parsed.data.RATE_LIMIT_DISABLED) {
    throw new Error('RATE_LIMIT_DISABLED est interdit en production');
  }
  return parsed.data;
}

/**
 * Clé de chiffrement des champs : si la valeur est déjà 32 octets en base64, elle est gardée telle
 * quelle ; sinon (secret généré par l'hébergeur, p. ex. Render `generateValue`), on dérive une clé de
 * 32 octets par SHA-256. La dérivation est déterministe : la même valeur donne toujours la même clé.
 */
export function normalizeEncryptionKey(value: string): string {
  const raw = Buffer.from(value, 'base64');
  if (raw.length === 32 && raw.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')) return value;
  return createHash('sha256').update(value, 'utf8').digest('base64');
}

export const ENV = Symbol('ENV');

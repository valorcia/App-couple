import { randomBytes } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/appcouple_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-test-secret';
process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY ?? randomBytes(32).toString('base64');
process.env.MAIL_PROVIDER = 'console';
process.env.JWT_ACCESS_TTL = '15m';
process.env.LOG_LEVEL = 'silent';

import { describe, expect, it } from 'vitest';
import { loadEnv, normalizeEncryptionKey } from '../src/config/env';

const base = { JWT_SECRET: 'x'.repeat(40), DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

describe('Configuration', () => {
  it('garde une clé de chiffrement déjà en base64 (32 octets) et dérive les autres secrets', () => {
    const b64 = Buffer.alloc(32, 7).toString('base64');
    expect(normalizeEncryptionKey(b64)).toBe(b64);
    const derived = normalizeEncryptionKey('un-secret-genere-par-l-hebergeur-assez-long-123456');
    expect(Buffer.from(derived, 'base64')).toHaveLength(32);
    expect(derived).toBe(normalizeEncryptionKey('un-secret-genere-par-l-hebergeur-assez-long-123456')); // déterministe
    expect(() => loadEnv({ ...base, DATA_ENCRYPTION_KEY: 'court' })).toThrow(/32 caractères/);
    expect(Buffer.from(loadEnv({ ...base, DATA_ENCRYPTION_KEY: 'a'.repeat(48) }).DATA_ENCRYPTION_KEY, 'base64')).toHaveLength(32);
  });

  it('refuse RATE_LIMIT_DISABLED en production', () => {
    expect(() => loadEnv({ ...base, DATA_ENCRYPTION_KEY: 'a'.repeat(48), NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' })).toThrow(/interdit en production/);
  });
});

describe('Amorçage admin (ADMIN_BOOTSTRAP_EMAILS)', () => {
  it('promeut ADMIN les comptes listés, une fois inscrits, et ignore les adresses inconnues', async () => {
    const { bootTestApp, registerVerifiedUser, resetDb } = await import('./helpers');
    const { AdminBootstrapService } = await import('../src/modules/admin/admin-bootstrap.service');
    const { ENV } = await import('../src/config/env');
    const ctx = await bootTestApp();
    try {
      await resetDb(ctx.prisma);
      const owner = await registerVerifiedUser(ctx, { email: 'proprietaire@example.com' });
      const other = await registerVerifiedUser(ctx);
      const env = ctx.app.get(ENV) as { ADMIN_BOOTSTRAP_EMAILS: string };
      env.ADMIN_BOOTSTRAP_EMAILS = ' Proprietaire@Example.com , inconnue@example.com '; // casse ignorée (citext)
      const service = ctx.app.get(AdminBootstrapService);
      expect(await service.promote()).toBe(1);
      expect(await service.promote()).toBe(0); // idempotent
      expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: owner.userId } })).role).toBe('ADMIN');
      expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: other.userId } })).role).toBe('USER');
      env.ADMIN_BOOTSTRAP_EMAILS = '';
    } finally {
      await ctx.close();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();
  it('hache et vérifie avec argon2id', async () => {
    const hash = await svc.hash('UnMotDePasse!Solide');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await svc.verify(hash, 'UnMotDePasse!Solide')).toBe(true);
    expect(await svc.verify(hash, 'autre')).toBe(false);
    expect(await svc.verify(null, 'x')).toBe(false);
  });
  it('refuse les mots de passe faibles ou contenant le nom', () => {
    expect(() => svc.assertStrong('motdepasse123')).toThrow();
    expect(() => svc.assertStrong('aaaaaaaaaaaa')).toThrow();
    expect(() => svc.assertStrong('camille-2026!', ['camille'])).toThrow();
    expect(() => svc.assertStrong('UnMotDePasse!Solide', ['camille'])).not.toThrow();
  });
});

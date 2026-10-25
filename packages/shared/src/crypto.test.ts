import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { FieldCipher, invitationCode, normalizeInvitationCode, randomToken, sha256 } from './crypto';

describe('crypto', () => {
  it('chiffre et déchiffre un champ', () => {
    const cipher = new FieldCipher(randomBytes(32).toString('base64'));
    const enc = cipher.encrypt('secret intime');
    expect(enc).not.toContain('secret');
    expect(cipher.decrypt(enc)).toBe('secret intime');
    expect(cipher.decryptJson(cipher.encryptJson({ a: 1 }))).toEqual({ a: 1 });
  });
  it('refuse une clé de mauvaise taille', () => {
    expect(() => new FieldCipher('abc')).toThrow();
  });
  it('détecte une altération', () => {
    const cipher = new FieldCipher(randomBytes(32).toString('base64'));
    const enc = cipher.encrypt('x');
    const parts = enc.split('.');
    parts[4] = 'AAAA' + parts[4]!.slice(4);
    expect(() => cipher.decrypt(parts.join('.'))).toThrow();
  });
  it('génère des codes d\'invitation normalisables', () => {
    const code = invitationCode();
    expect(code).toHaveLength(8);
    expect(normalizeInvitationCode(code.toLowerCase().split('').join(' '))).toBe(code);
    expect(normalizeInvitationCode('abcd-01io')).toBe('ABCD0110');
  });
  it('hache et génère des jetons', () => {
    expect(sha256('a')).toHaveLength(64);
    expect(randomToken()).toHaveLength(43);
  });
});

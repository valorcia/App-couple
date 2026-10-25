import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth';
import { normalizeOk } from './test-utils';

describe('registerSchema', () => {
  it('normalise l\'e-mail et exige l\'acceptation des CGU', () => {
    const r = registerSchema.safeParse({
      email: '  Camille@Example.COM ',
      password: 'motdepasse-long',
      displayName: 'Camille',
      acceptTerms: true,
    });
    expect(normalizeOk(r)).toMatchObject({ email: 'camille@example.com', locale: 'fr' });
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'short', displayName: 'x', acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'motdepasse-long', displayName: 'x', acceptTerms: false }).success).toBe(false);
  });
});

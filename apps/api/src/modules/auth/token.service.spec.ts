import { describe, expect, it } from 'vitest';
import { parseTtl } from './token.service';

describe('parseTtl', () => {
  it('convertit les durées', () => {
    expect(parseTtl('15m')).toBe(900);
    expect(parseTtl('2h')).toBe(7200);
    expect(parseTtl('30')).toBe(30);
    expect(() => parseTtl('abc')).toThrow();
  });
});

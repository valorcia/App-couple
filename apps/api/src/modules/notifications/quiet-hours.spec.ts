import { describe, expect, it } from 'vitest';
import { quietDelayMs } from './quiet-hours';

describe('heures silencieuses', () => {
  const paris = 'Europe/Paris';
  it('détecte une plage simple et calcule le délai jusqu\'à la fin', () => {
    // 23:30 Paris en hiver = 22:30Z
    expect(quietDelayMs(new Date('2026-01-10T22:30:00Z'), paris, '22:00', '08:00')).toBe(8.5 * 3_600_000);
    // 03:00 Paris
    expect(quietDelayMs(new Date('2026-01-10T02:00:00Z'), paris, '22:00', '08:00')).toBe(5 * 3_600_000);
    // 12:00 Paris → pas silencieux
    expect(quietDelayMs(new Date('2026-01-10T11:00:00Z'), paris, '22:00', '08:00')).toBe(0);
  });
  it('gère une plage diurne et l\'absence de réglage', () => {
    expect(quietDelayMs(new Date('2026-06-10T12:00:00Z'), paris, '13:00', '15:00')).toBe(60 * 60_000); // 14:00 Paris en été
    expect(quietDelayMs(new Date('2026-06-10T09:00:00Z'), paris, '13:00', '15:00')).toBe(0);
    expect(quietDelayMs(new Date(), paris, null, null)).toBe(0);
  });
});

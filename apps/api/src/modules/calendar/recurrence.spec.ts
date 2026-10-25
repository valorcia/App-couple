import { describe, expect, it } from 'vitest';
import { expandOccurrences, isValidRRule, tzOffsetMinutes } from './recurrence';

describe('recurrence', () => {
  it('valide les règles', () => {
    expect(isValidRRule('FREQ=WEEKLY;BYDAY=MO,WE')).toBe(true);
    expect(isValidRRule('RRULE:FREQ=MONTHLY;BYMONTHDAY=15')).toBe(true);
    expect(isValidRRule('FREQ=NOPE')).toBe(false);
  });

  it('calcule le décalage horaire', () => {
    expect(tzOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'Europe/Paris')).toBe(120);
    expect(tzOffsetMinutes(new Date('2026-12-01T12:00:00Z'), 'Europe/Paris')).toBe(60);
  });

  it('préserve l\'heure locale à travers le changement d\'heure', () => {
    // Mardi 20 octobre 2026 18:00 Paris (UTC+2) ; le passage à l'heure d'hiver a lieu le 25 octobre.
    const occ = expandOccurrences({
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      startAt: new Date('2026-10-20T16:00:00Z'),
      endAt: new Date('2026-10-20T17:30:00Z'),
      timezone: 'Europe/Paris',
      exdates: [],
      from: new Date('2026-10-19T00:00:00Z'),
      to: new Date('2026-11-05T00:00:00Z'),
    });
    expect(occ.map((o) => o.start.toISOString())).toEqual(['2026-10-20T16:00:00.000Z', '2026-10-27T17:00:00.000Z', '2026-11-03T17:00:00.000Z']);
    expect(occ[1]!.end.toISOString()).toBe('2026-10-27T18:30:00.000Z');
  });

  it('retire les occurrences exclues et respecte la fenêtre', () => {
    const occ = expandOccurrences({
      rrule: 'FREQ=DAILY;COUNT=10',
      startAt: new Date('2026-03-01T09:00:00Z'),
      endAt: new Date('2026-03-01T10:00:00Z'),
      timezone: 'UTC',
      exdates: [new Date('2026-03-03T09:00:00Z')],
      from: new Date('2026-03-02T00:00:00Z'),
      to: new Date('2026-03-05T00:00:00Z'),
    });
    expect(occ.map((o) => o.start.toISOString())).toEqual(['2026-03-02T09:00:00.000Z', '2026-03-04T09:00:00.000Z']);
  });
});

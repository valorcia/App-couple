import { RRule } from 'rrule';

/** Décalage (minutes) d'un fuseau IANA à un instant donné. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function parseRRule(rule: string, dtstart: Date): RRule {
  const clean = rule.replace(/^RRULE:/i, '');
  const options = RRule.parseString(clean);
  return new RRule({ ...options, dtstart });
}

export function isValidRRule(rule: string): boolean {
  try {
    parseRRule(rule, new Date());
    return true;
  } catch {
    return false;
  }
}

export interface Occurrence {
  start: Date;
  end: Date;
}

/**
 * Occurrences d'un événement récurrent dans [from, to), en préservant l'heure locale du fuseau
 * de l'événement à travers les changements d'heure. Les occurrences exclues (exdates) sont retirées.
 */
export function expandOccurrences(params: {
  rrule: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  exdates: Date[];
  from: Date;
  to: Date;
  limit?: number;
}): Occurrence[] {
  const { rrule, startAt, endAt, timezone, exdates, from, to, limit = 500 } = params;
  const durationMs = endAt.getTime() - startAt.getTime();
  const rule = parseRRule(rrule, startAt);
  const baseOffset = tzOffsetMinutes(startAt, timezone);
  // Marge d'une journée pour couvrir le décalage DST et les événements à cheval.
  const windowFrom = new Date(from.getTime() - durationMs - 86_400_000);
  const windowTo = new Date(to.getTime() + 86_400_000);
  const raw = rule.between(windowFrom, windowTo, true);
  const excluded = new Set(exdates.map((d) => d.getTime()));
  const out: Occurrence[] = [];
  for (const d of raw) {
    const occOffset = tzOffsetMinutes(d, timezone);
    const start = new Date(d.getTime() + (baseOffset - occOffset) * 60_000);
    const end = new Date(start.getTime() + durationMs);
    if (excluded.has(start.getTime())) continue;
    if (end <= from || start >= to) continue;
    out.push({ start, end });
    if (out.length >= limit) break;
  }
  return out;
}

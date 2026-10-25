/** Minutes depuis minuit en heure locale d'un fuseau. */
export function localMinutes(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(date).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Délai (ms) avant la fin de la plage silencieuse, ou 0 si l'instant n'est pas silencieux. Gère les plages qui passent minuit. */
export function quietDelayMs(now: Date, timeZone: string, quietStart: string | null, quietEnd: string | null): number {
  if (!quietStart || !quietEnd || quietStart === quietEnd) return 0;
  const cur = localMinutes(now, timeZone);
  const start = toMin(quietStart);
  const end = toMin(quietEnd);
  const inRange = start < end ? cur >= start && cur < end : cur >= start || cur < end;
  if (!inRange) return 0;
  const untilEnd = cur < end ? end - cur : 24 * 60 - cur + end;
  return untilEnd * 60_000;
}

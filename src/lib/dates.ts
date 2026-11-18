// Time-zone helpers built on Intl only (no date library).

/** Calendar date (YYYY-MM-DD) for an instant in a given IANA time zone. */
export function dateInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function weekdayInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(instant);
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date + time in `timeZone` to the UTC instant.
 * For a time skipped by a DST jump the result moves forward; for a repeated hour the first occurrence is used.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let offset = zoneOffsetMs(new Date(guess), timeZone);
  let result = guess - offset;
  const offset2 = zoneOffsetMs(new Date(result), timeZone);
  if (offset2 !== offset) {
    offset = offset2;
    result = guess - offset;
  }
  return new Date(result);
}

/** Wall-clock parts (date, HH:MM) of an instant in a time zone — for edit forms. */
export function utcToZonedParts(instant: Date, timeZone: string): { date: string; time: string } {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant);
  return { date: dateInZone(instant, timeZone), time };
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Next occurrence for a recurring reminder, in the reminder's own time zone (keeps wall-clock time across DST). */
export function nextOccurrence(remindAt: Date, recurrence: 'none' | 'daily' | 'weekly' | 'monthly', timeZone: string): Date | null {
  if (recurrence === 'none') return null;
  const { date, time } = utcToZonedParts(remindAt, timeZone);
  if (recurrence === 'daily') return zonedTimeToUtc(addDays(date, 1), time, timeZone);
  if (recurrence === 'weekly') return zonedTimeToUtc(addDays(date, 7), time, timeZone);
  const [y, m, d] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // last day of next month
  const next = new Date(Date.UTC(y, m, Math.min(d, lastDay)));
  return zonedTimeToUtc(next.toISOString().slice(0, 10), time, timeZone);
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

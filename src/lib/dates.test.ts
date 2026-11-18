import { describe, expect, it } from 'vitest';
import { addDays, dateInZone, nextOccurrence, utcToZonedParts, zonedTimeToUtc } from './dates';

describe('time-zone helpers', () => {
  it('converts Kigali wall-clock time (UTC+2, no DST) to UTC', () => {
    expect(zonedTimeToUtc('2026-11-19', '09:00', 'Africa/Kigali').toISOString()).toBe('2026-11-19T07:00:00.000Z');
  });
  it('handles Paris winter and summer offsets', () => {
    expect(zonedTimeToUtc('2026-01-15', '09:00', 'Europe/Paris').toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(zonedTimeToUtc('2026-07-15', '09:00', 'Europe/Paris').toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });
  it('round-trips through utcToZonedParts', () => {
    const at = zonedTimeToUtc('2026-03-29', '14:30', 'America/Toronto');
    expect(utcToZonedParts(at, 'America/Toronto')).toEqual({ date: '2026-03-29', time: '14:30' });
  });
  it('computes the local calendar date, not the UTC one', () => {
    // 23:30 UTC is already the next day in Kigali
    expect(dateInZone(new Date('2026-11-18T23:30:00Z'), 'Africa/Kigali')).toBe('2026-11-19');
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('keeps wall-clock time for weekly recurrence across a DST change', () => {
    const before = zonedTimeToUtc('2026-03-26', '08:00', 'Europe/Paris'); // CET
    const next = nextOccurrence(before, 'weekly', 'Europe/Paris')!;          // CEST
    expect(utcToZonedParts(next, 'Europe/Paris')).toEqual({ date: '2026-04-02', time: '08:00' });
  });
  it('clamps monthly recurrence to the end of shorter months', () => {
    const jan31 = zonedTimeToUtc('2026-01-31', '10:00', 'UTC');
    expect(nextOccurrence(jan31, 'monthly', 'UTC')!.toISOString()).toBe('2026-02-28T10:00:00.000Z');
  });
  it('returns null for non-recurring reminders', () => {
    expect(nextOccurrence(new Date(), 'none', 'UTC')).toBeNull();
  });
});

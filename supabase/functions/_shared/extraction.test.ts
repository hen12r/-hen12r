import { describe, expect, it } from 'vitest';
import { buildExtractionPrompt, isValidDate, validateExtraction, MAX_ITEMS } from './extraction.ts';

const ctx = { today: '2026-11-18', categories: ['School', 'Work', 'Personal', 'Ideas'] };

describe('validateExtraction', () => {
  it('keeps the four actions from the reference sentence', () => {
    const raw = {
      items: [
        { type: 'task', title: 'Call my school', category: 'school', priority: 'normal', date: '2026-11-19', date_confidence: 'explicit', date_text: 'tomorrow' },
        { type: 'task', title: 'Prepare my CV', category: 'Work', priority: 'normal', date: '2026-11-19', date_confidence: 'explicit' },
        { type: 'task', title: 'Buy a notebook', category: null, priority: 'normal', date: '2026-11-19', date_confidence: 'explicit' },
        { type: 'task', title: 'Practise piano', category: 'Personal', priority: 'normal', date: '2026-11-19', date_confidence: 'explicit' },
      ],
    };
    const res = validateExtraction(raw, ctx);
    expect(res.items).toHaveLength(4);
    expect(res.items[0].category).toBe('School'); // case-insensitive match to the user's own category
    expect(res.items.every((i) => i.date === '2026-11-19' && i.warnings.length === 0)).toBe(true);
  });

  it('clears ambiguous dates instead of guessing, and warns', () => {
    const res = validateExtraction({ items: [
      { type: 'task', title: 'Finish essay', priority: 'normal', date: '2026-11-21', date_confidence: 'ambiguous', date_text: 'this weekend' },
    ] }, ctx);
    expect(res.items[0].date).toBeNull();
    expect(res.items[0].date_confidence).toBe('ambiguous');
    expect(res.items[0].warnings.join(' ')).toContain('this weekend');
  });

  it('flags reminders and events that have no date as needing one', () => {
    const res = validateExtraction({ items: [
      { type: 'reminder', title: 'Take medicine', priority: 'normal', date_confidence: 'none' },
      { type: 'event', title: 'Meeting with Jean', priority: 'normal', date_confidence: 'none' },
      { type: 'note', title: 'Wifi password is on the router', priority: 'normal', date_confidence: 'none' },
    ] }, ctx);
    expect(res.items.map((i) => i.needs_date)).toEqual([true, true, false]);
  });

  it('rejects impossible dates and times', () => {
    const res = validateExtraction({ items: [
      { type: 'event', title: 'Exam', priority: 'normal', date: '2026-02-30', time: '25:00', date_confidence: 'explicit' },
    ] }, ctx);
    expect(res.items[0].date).toBeNull();
    expect(res.items[0].time).toBeNull();
    expect(res.items[0].needs_date).toBe(true);
  });

  it('drops a time that has no day', () => {
    const res = validateExtraction({ items: [
      { type: 'reminder', title: 'Call mum', priority: 'normal', time: '18:00', date_confidence: 'explicit' },
    ] }, ctx);
    expect(res.items[0].time).toBeNull();
    expect(res.items[0].needs_date).toBe(true);
  });

  it('drops unknown types, empty titles and unknown categories', () => {
    const res = validateExtraction({ items: [
      { type: 'hack', title: 'x', priority: 'normal', date_confidence: 'none' },
      { type: 'task', title: '   ', priority: 'normal', date_confidence: 'none' },
      { type: 'idea', title: 'Solar kiosks', category: 'Made Up', priority: 'urgent!!', date_confidence: 'none' },
      'garbage',
    ] }, ctx);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].category).toBeNull();
    expect(res.items[0].priority).toBe('normal');
  });

  it('warns about dates in the past', () => {
    const res = validateExtraction({ items: [
      { type: 'task', title: 'Old', priority: 'normal', date: '2025-01-01', date_confidence: 'explicit' },
    ] }, ctx);
    expect(res.items[0].warnings.join(' ')).toMatch(/past/);
  });

  it('caps the number of items and bounds text length', () => {
    const many = Array.from({ length: MAX_ITEMS + 5 }, () => ({ type: 'note', title: 'a'.repeat(1000), priority: 'normal', date_confidence: 'none' }));
    const res = validateExtraction({ items: many }, ctx);
    expect(res.items).toHaveLength(MAX_ITEMS);
    expect(res.items[0].title.length).toBeLessThanOrEqual(300);
    expect(res.warnings[0]).toMatch(/first/);
  });

  it('handles non-object model output', () => {
    expect(validateExtraction(null, ctx).items).toEqual([]);
    expect(validateExtraction('oops', ctx).warnings.length).toBe(1);
  });
});

describe('helpers', () => {
  it('validates real calendar dates', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('19/11/2026')).toBe(false);
  });
  it('builds a prompt that pins the date context and forbids invention', () => {
    const p = buildExtractionPrompt({ transcript: 'Ejo nzahamagara ishuri', today: '2026-11-18', weekday: 'Wednesday', timezone: 'Africa/Kigali', categories: ['School'] });
    expect(p).toContain('Wednesday 2026-11-18');
    expect(p).toContain('Africa/Kigali');
    expect(p).toContain('Never invent');
    expect(p).toContain('Ejo nzahamagara ishuri');
  });
});

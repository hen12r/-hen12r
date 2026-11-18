import { describe, expect, it } from 'vitest';
import { planInsert, rankPriorities } from './api';
import type { ProposedItem } from '../../supabase/functions/_shared/extraction.ts';
import type { Task } from './types';

const base: ProposedItem = { type: 'task', title: 'Call my school', body: null, category: 'School', priority: 'normal', date: '2026-11-19', time: null, date_text: 'tomorrow', date_confidence: 'explicit', needs_date: false, warnings: [] };
const ctx = { timezone: 'Africa/Kigali', sessionId: 's1', language: 'en', categoryIds: new Map([['school', 'cat-school']]) };

describe('planInsert', () => {
  it('maps a dated task to tasks with the local due date and the category id', () => {
    const p = planInsert(base, ctx);
    expect(p.table).toBe('tasks');
    expect(p.row).toMatchObject({ title: 'Call my school', due_date: '2026-11-19', due_at: null, category_id: 'cat-school', voice_session_id: 's1' });
  });
  it('stores due_at in UTC when a time was given', () => {
    expect(planInsert({ ...base, time: '14:00' }, ctx).row.due_at).toBe('2026-11-19T12:00:00.000Z');
  });
  it('converts a reminder to a UTC instant in the user time zone', () => {
    const p = planInsert({ ...base, type: 'reminder', time: '08:30' }, ctx);
    expect(p).toMatchObject({ table: 'reminders', row: { remind_at: '2026-11-19T06:30:00.000Z', timezone: 'Africa/Kigali' } });
  });
  it('refuses to save a reminder or event without a date', () => {
    expect(() => planInsert({ ...base, type: 'reminder', date: null }, ctx)).toThrow(/needs a date/);
    expect(() => planInsert({ ...base, type: 'event', date: null }, ctx)).toThrow(/needs a date/);
  });
  it('marks an event without a time as all-day', () => {
    expect(planInsert({ ...base, type: 'event' }, ctx).row).toMatchObject({ all_day: true });
  });
  it('saves ideas and personal info as notes with the right kind', () => {
    expect(planInsert({ ...base, type: 'idea', body: 'Solar kiosks' }, ctx)).toMatchObject({ table: 'notes', row: { kind: 'idea', body: 'Solar kiosks' } });
    expect(planInsert({ ...base, type: 'personal_info' }, ctx)).toMatchObject({ table: 'notes', row: { kind: 'personal_info', body: 'Call my school' } });
  });
  it('drops categories the user does not own', () => {
    expect(planInsert({ ...base, category: 'Unknown' }, ctx).row.category_id).toBeNull();
  });
});

const task = (p: Partial<Task>): Task => ({ id: Math.random().toString(), title: 't', details: null, status: 'open', priority: 'normal', due_date: null, due_at: null, completed_at: null, category_id: null, created_at: '', ...p });

describe('rankPriorities', () => {
  it('orders overdue, then today, then high priority, and ignores done/undated normal tasks', () => {
    const today = '2026-11-18';
    const ranked = rankPriorities([
      task({ title: 'high', priority: 'high' }),
      task({ title: 'today', due_date: today }),
      task({ title: 'overdue', due_date: '2026-11-10' }),
      task({ title: 'plain' }),
      task({ title: 'done overdue', due_date: '2026-11-01', status: 'done' }),
    ], today);
    expect(ranked.map((r) => [r.task.title, r.reason])).toEqual([['overdue', 'overdue'], ['today', 'today'], ['high', 'high']]);
  });
});

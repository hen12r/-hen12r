import { functionsUrl, supabase } from './supabase';
import type { ProposedItem } from '../../supabase/functions/_shared/extraction.ts';
import type { CalendarEvent, Category, MemoryHit, Note, Profile, Reminder, Subscription, Task, Usage } from './types';
import { zonedTimeToUtc } from './dates';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status?: number) { super(message); }
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (res.error) throw new ApiError(res.error.code ?? 'db_error', res.error.message);
  return res.data as NonNullable<T>;
}

function checkMaybe<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T | null {
  if (res.error) throw new ApiError(res.error.code ?? 'db_error', res.error.message);
  return res.data;
}

// ---------------- Profile & settings ----------------
export const getProfile = async (): Promise<Profile> =>
  check(await supabase.from('profiles').select('id, display_name, ui_language, speech_language, timezone, daily_briefing_enabled').single());

export const updateProfile = async (id: string, patch: Partial<Omit<Profile, 'id'>>) =>
  check(await supabase.from('profiles').update(patch).eq('id', id).select().single());

export const getSubscription = async (): Promise<Subscription | null> =>
  checkMaybe(await supabase.from('subscriptions').select('plan, status, billing_interval, current_period_end').maybeSingle());

export const getCurrentUsage = async (): Promise<Usage | null> => {
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return checkMaybe(await supabase.from('usage_counters').select('period_start, notes_created, voice_sessions').eq('period_start', period).maybeSingle());
};

// ---------------- Categories ----------------
export const listCategories = async (): Promise<Category[]> =>
  check(await supabase.from('categories').select('id, name, color, is_default').order('is_default', { ascending: false }).order('name'));
export const createCategory = async (name: string) =>
  check(await supabase.from('categories').insert({ name: name.trim() }).select().single());
export const deleteCategory = async (id: string) => check(await supabase.from('categories').delete().eq('id', id));

// ---------------- Notes ----------------
const NOTE_COLS = 'id, title, body, kind, category_id, language, is_pinned, voice_session_id, created_at, updated_at';
export const listNotes = async (limit = 200): Promise<Note[]> =>
  check(await supabase.from('notes').select(NOTE_COLS).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit));
export const createNote = async (n: Partial<Note> & { body: string }) => check(await supabase.from('notes').insert(n).select(NOTE_COLS).single()) as Note;
export const updateNote = async (id: string, patch: Partial<Note>) => check(await supabase.from('notes').update(patch).eq('id', id).select(NOTE_COLS).single()) as Note;
export const deleteNote = async (id: string) => check(await supabase.from('notes').delete().eq('id', id));

// ---------------- Tasks ----------------
const TASK_COLS = 'id, title, details, status, priority, due_date, due_at, completed_at, category_id, created_at';
export const listTasks = async (): Promise<Task[]> =>
  check(await supabase.from('tasks').select(TASK_COLS).order('status').order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(500));
export const createTask = async (t: Partial<Task> & { title: string }) => check(await supabase.from('tasks').insert(t).select(TASK_COLS).single()) as Task;
export const updateTask = async (id: string, patch: Partial<Task>) => check(await supabase.from('tasks').update(patch).eq('id', id).select(TASK_COLS).single()) as Task;
export const deleteTask = async (id: string) => check(await supabase.from('tasks').delete().eq('id', id));

// ---------------- Reminders ----------------
const REM_COLS = 'id, title, notes, remind_at, timezone, recurrence, status, category_id, created_at';
export const listReminders = async (): Promise<Reminder[]> =>
  check(await supabase.from('reminders').select(REM_COLS).order('remind_at').limit(500));
export const createReminder = async (r: Partial<Reminder> & { title: string; remind_at: string; timezone: string }) =>
  check(await supabase.from('reminders').insert(r).select(REM_COLS).single()) as Reminder;
export const updateReminder = async (id: string, patch: Partial<Reminder>) =>
  check(await supabase.from('reminders').update(patch).eq('id', id).select(REM_COLS).single()) as Reminder;
export const deleteReminder = async (id: string) => check(await supabase.from('reminders').delete().eq('id', id));

// ---------------- Events ----------------
const EV_COLS = 'id, title, notes, location, starts_at, ends_at, all_day, category_id, created_at';
export const listEvents = async (): Promise<CalendarEvent[]> =>
  check(await supabase.from('events').select(EV_COLS).order('starts_at').limit(500));
export const createEvent = async (e: Partial<CalendarEvent> & { title: string; starts_at: string }) =>
  check(await supabase.from('events').insert(e).select(EV_COLS).single()) as CalendarEvent;
export const updateEvent = async (id: string, patch: Partial<CalendarEvent>) =>
  check(await supabase.from('events').update(patch).eq('id', id).select(EV_COLS).single()) as CalendarEvent;
export const deleteEvent = async (id: string) => check(await supabase.from('events').delete().eq('id', id));

// ---------------- Memory ----------------
export const searchMemory = async (q: string): Promise<MemoryHit[]> =>
  check(await supabase.rpc('search_memory', { q, max_results: 40 }));

// ---------------- Edge Functions ----------------
export interface ProcessResult {
  session_id: string;
  transcript: string;
  language: string;
  today: string;
  timezone: string;
  items: ProposedItem[];
  warnings: string[];
}

async function callFunction<T>(name: string, body: BodyInit, json: boolean): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('unauthorized', 'Not signed in', 401);
  let res: Response;
  try {
    res = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
    });
  } catch {
    throw new ApiError('network', 'Network error');
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(payload?.error?.code ?? `http_${res.status}`, payload?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return payload as T;
}

export function processAudio(blob: Blob, durationMs: number, timezone: string, languageHint: string) {
  const form = new FormData();
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', blob, `capture.${ext}`);
  form.append('duration_ms', String(Math.round(durationMs)));
  form.append('timezone', timezone);
  form.append('language_hint', languageHint);
  return callFunction<ProcessResult>('process-voice', form, false);
}

export function processText(text: string, timezone: string, languageHint: string) {
  return callFunction<ProcessResult>('process-voice', JSON.stringify({ text, timezone, language_hint: languageHint }), true);
}

export function deleteAccount() {
  return callFunction<{ deleted: boolean }>('delete-account', JSON.stringify({ confirm: 'DELETE' }), true);
}

// ---------------- Committing reviewed proposals ----------------
export interface ReviewedItem extends ProposedItem { include: boolean }

export type InsertPlan =
  | { table: 'notes'; row: Record<string, unknown> }
  | { table: 'tasks'; row: Record<string, unknown> }
  | { table: 'reminders'; row: Record<string, unknown> }
  | { table: 'events'; row: Record<string, unknown> };

/** Default time for a reminder when the user picked a day but no time. Shown to the user before saving. */
export const DEFAULT_REMINDER_TIME = '09:00';

/** Pure mapping from a reviewed proposal to a database insert. Throws if a required date is missing. */
export function planInsert(item: ProposedItem, ctx: { timezone: string; sessionId: string | null; language: string | null; categoryIds: Map<string, string> }): InsertPlan {
  const category_id = item.category ? ctx.categoryIds.get(item.category.toLowerCase()) ?? null : null;
  const base = { category_id, voice_session_id: ctx.sessionId };
  switch (item.type) {
    case 'task':
      return {
        table: 'tasks',
        row: {
          ...base, title: item.title, details: item.body, priority: item.priority, due_date: item.date,
          due_at: item.date && item.time ? zonedTimeToUtc(item.date, item.time, ctx.timezone).toISOString() : null,
        },
      };
    case 'reminder':
      if (!item.date) throw new ApiError('needs_date', `"${item.title}" needs a date`);
      return {
        table: 'reminders',
        row: {
          ...base, title: item.title, notes: item.body, timezone: ctx.timezone,
          remind_at: zonedTimeToUtc(item.date, item.time ?? DEFAULT_REMINDER_TIME, ctx.timezone).toISOString(),
        },
      };
    case 'event':
      if (!item.date) throw new ApiError('needs_date', `"${item.title}" needs a date`);
      return {
        table: 'events',
        row: {
          ...base, title: item.title, notes: item.body, all_day: !item.time,
          starts_at: zonedTimeToUtc(item.date, item.time ?? '00:00', ctx.timezone).toISOString(),
        },
      };
    default:
      return {
        table: 'notes',
        row: { ...base, title: item.title, body: item.body ?? item.title, kind: item.type, language: ctx.language },
      };
  }
}

export interface CommitOutcome { index: number; ok: boolean; error?: unknown }

/** Saves each included item independently so one failure (e.g. plan limit) doesn't lose the others. */
export async function commitItems(items: ReviewedItem[], ctx: { timezone: string; sessionId: string | null; language: string | null; categories: Category[] }): Promise<CommitOutcome[]> {
  const categoryIds = new Map(ctx.categories.map((c) => [c.name.toLowerCase(), c.id]));
  const outcomes: CommitOutcome[] = [];
  for (const [index, item] of items.entries()) {
    if (!item.include) continue;
    try {
      const plan = planInsert(item, { ...ctx, categoryIds });
      check(await supabase.from(plan.table).insert(plan.row));
      outcomes.push({ index, ok: true });
    } catch (error) {
      outcomes.push({ index, ok: false, error });
    }
  }
  if (ctx.sessionId && outcomes.some((o) => o.ok)) {
    await supabase.from('voice_sessions').update({ status: 'committed' }).eq('id', ctx.sessionId);
  }
  return outcomes;
}

// ---------------- Daily priorities (deterministic, explainable) ----------------
export interface PriorityEntry { task: Task; reason: 'overdue' | 'today' | 'high' }

export function rankPriorities(tasks: Task[], today: string, limit = 5): PriorityEntry[] {
  const open = tasks.filter((t) => t.status === 'open');
  const REASONS = ['overdue', 'today', 'high'] as const;
  const score = (t: Task): 0 | 1 | 2 | 3 => {
    if (t.due_date && t.due_date < today) return 0;
    if (t.due_date === today) return 1;
    if (t.priority === 'high') return 2;
    return 3;
  };
  return open
    .filter((t) => score(t) < 3)
    .sort((a, b) => score(a) - score(b) || (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
    .slice(0, limit)
    .map((task) => ({ task, reason: REASONS[score(task) as 0 | 1 | 2] }));
}

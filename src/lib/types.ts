export type UiLanguage = 'en' | 'fr' | 'rw';
export type SpeechLanguage = 'auto' | 'en' | 'fr' | 'rw';

export interface Profile {
  id: string;
  display_name: string | null;
  ui_language: UiLanguage;
  speech_language: SpeechLanguage;
  timezone: string;
  daily_briefing_enabled: boolean;
}

export interface Category { id: string; name: string; color: string | null; is_default: boolean }

export type NoteKind = 'note' | 'idea' | 'personal_info';
export interface Note {
  id: string; title: string | null; body: string; kind: NoteKind; category_id: string | null;
  language: string | null; is_pinned: boolean; voice_session_id: string | null; created_at: string; updated_at: string;
}

export type Priority = 'low' | 'normal' | 'high';
export interface Task {
  id: string; title: string; details: string | null; status: 'open' | 'done'; priority: Priority;
  due_date: string | null; due_at: string | null; completed_at: string | null; category_id: string | null; created_at: string;
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export interface Reminder {
  id: string; title: string; notes: string | null; remind_at: string; timezone: string; recurrence: Recurrence;
  status: 'scheduled' | 'done' | 'cancelled'; category_id: string | null; created_at: string;
}

export interface CalendarEvent {
  id: string; title: string; notes: string | null; location: string | null; starts_at: string; ends_at: string | null;
  all_day: boolean; category_id: string | null; created_at: string;
}

export interface Subscription { plan: 'free' | 'premium'; status: string; billing_interval: string | null; current_period_end: string | null }
export interface Usage { period_start: string; notes_created: number; voice_sessions: number }

export interface MemoryHit {
  record_type: 'note' | 'task' | 'reminder' | 'event'; id: string; title: string; snippet: string | null;
  occurred_at: string | null; created_at: string; rank: number;
}

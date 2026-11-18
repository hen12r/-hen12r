// Pure, dependency-free logic shared by the `process-voice` Edge Function (Deno)
// and the web client / unit tests (Vite + Vitest). Do not import Deno or browser APIs here.

export const ITEM_TYPES = ['task', 'reminder', 'event', 'note', 'idea', 'personal_info'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'rw'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_CATEGORIES = ['School', 'Work', 'Personal', 'Family', 'Projects', 'Ideas', 'Business'];

export type DateConfidence = 'explicit' | 'ambiguous' | 'none';

/** One action the assistant proposes. Nothing is saved until the user confirms it. */
export interface ProposedItem {
  type: ItemType;
  title: string;
  body: string | null;
  category: string | null;
  priority: 'low' | 'normal' | 'high';
  /** User-local calendar date, YYYY-MM-DD. Only set when the speaker stated it clearly. */
  date: string | null;
  /** User-local time, HH:MM (24h). Only set when the speaker stated it clearly. */
  time: string | null;
  /** The exact words the speaker used for the date/time, e.g. "next Friday morning". */
  date_text: string | null;
  date_confidence: DateConfidence;
  /** True when the item cannot be saved until the user supplies a date/time. */
  needs_date: boolean;
  /** Short human-readable issues the user should look at before saving. */
  warnings: string[];
}

export interface ExtractionContext {
  /** The user's local date (YYYY-MM-DD) at capture time — used only to sanity-check output. */
  today: string;
  /** Category names the user owns. Unknown categories proposed by the model are dropped. */
  categories: string[];
}

export interface ExtractionResult {
  items: ProposedItem[];
  warnings: string[];
}

export const MAX_ITEMS = 20;
const MAX_TITLE = 300;
const MAX_BODY = 5000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function daysBetween(a: string, b: string): number {
  const pa = DATE_RE.exec(a)!;
  const pb = DATE_RE.exec(b)!;
  const ua = Date.UTC(+pa[1], +pa[2] - 1, +pa[3]);
  const ub = Date.UTC(+pb[1], +pb[2] - 1, +pb[3]);
  return Math.round((ub - ua) / 86_400_000);
}

/**
 * Validates and normalises raw model output. Never trusts the model:
 * unknown types are dropped, text is bounded, impossible dates are removed,
 * and dates that were not clearly stated are cleared rather than guessed.
 */
export function validateExtraction(raw: unknown, ctx: ExtractionContext): ExtractionResult {
  const warnings: string[] = [];
  const rawItems = (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items))
    ? (raw as { items: unknown[] }).items
    : null;

  if (!rawItems) {
    return { items: [], warnings: ['The assistant returned no usable items.'] };
  }
  if (rawItems.length > MAX_ITEMS) {
    warnings.push(`Only the first ${MAX_ITEMS} items were kept.`);
  }

  const categoryLookup = new Map(ctx.categories.map((c) => [c.toLowerCase(), c]));
  const todayValid = isValidDate(ctx.today);
  const items: ProposedItem[] = [];

  for (const entry of rawItems.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;

    const type = r.type as ItemType;
    if (!ITEM_TYPES.includes(type)) continue;

    const title = cleanText(r.title, MAX_TITLE);
    if (!title) continue;

    const itemWarnings: string[] = [];
    const body = cleanText(r.body, MAX_BODY);

    let category: string | null = null;
    if (typeof r.category === 'string') {
      category = categoryLookup.get(r.category.trim().toLowerCase()) ?? null;
    }

    const priority = r.priority === 'high' || r.priority === 'low' ? r.priority : 'normal';

    let confidence: DateConfidence =
      r.date_confidence === 'explicit' || r.date_confidence === 'ambiguous' ? r.date_confidence : 'none';
    let date = isValidDate(r.date) ? r.date : null;
    let time = isValidTime(r.time) ? r.time : null;
    const dateText = cleanText(r.date_text, 120);

    if (r.date != null && r.date !== '' && !date) itemWarnings.push('The suggested date was invalid and was removed.');
    if (r.time != null && r.time !== '' && !time) itemWarnings.push('The suggested time was invalid and was removed.');

    if (confidence !== 'explicit') {
      // Never silently assume an ambiguous date.
      if (date || time) itemWarnings.push(`Unclear when this is${dateText ? ` ("${dateText}")` : ''} — please choose a date.`);
      date = null;
      time = null;
    }
    if (time && !date) {
      itemWarnings.push('A time was given without a day — please choose a date.');
      time = null;
      confidence = 'ambiguous';
    }
    if (date && todayValid) {
      const diff = daysBetween(ctx.today, date);
      if (diff < -1) itemWarnings.push('This date is in the past — please check it.');
      if (diff > 366 * 3) itemWarnings.push('This date is more than three years away — please check it.');
    }

    const needsDate = (type === 'reminder' || type === 'event') && !date;
    if (needsDate && !itemWarnings.some((w) => w.includes('choose a date'))) {
      itemWarnings.push(type === 'reminder' ? 'A reminder needs a date and time.' : 'An event needs a date.');
    }

    items.push({
      type,
      title,
      body,
      category,
      priority,
      date,
      time,
      date_text: dateText,
      date_confidence: date ? confidence : (confidence === 'explicit' ? 'none' : confidence),
      needs_date: needsDate,
      warnings: itemWarnings,
    });
  }

  if (items.length === 0 && rawItems.length > 0) {
    warnings.push('The assistant output could not be validated.');
  }
  return { items, warnings };
}

/** JSON schema handed to the model for structured output (Gemini `responseSchema` subset). */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: [...ITEM_TYPES] },
          title: { type: 'STRING' },
          body: { type: 'STRING', nullable: true },
          category: { type: 'STRING', nullable: true },
          priority: { type: 'STRING', enum: ['low', 'normal', 'high'] },
          date: { type: 'STRING', nullable: true, description: 'YYYY-MM-DD in the user time zone' },
          time: { type: 'STRING', nullable: true, description: 'HH:MM 24h in the user time zone' },
          date_text: { type: 'STRING', nullable: true },
          date_confidence: { type: 'STRING', enum: ['explicit', 'ambiguous', 'none'] },
        },
        required: ['type', 'title', 'priority', 'date_confidence'],
      },
    },
  },
  required: ['items'],
} as const;

export function buildExtractionPrompt(args: {
  transcript: string;
  today: string;
  weekday: string;
  timezone: string;
  categories: string[];
}): string {
  return [
    'You turn what a person said into separate, actionable records for their personal organiser.',
    'The transcript may be in English, French or Kinyarwanda, or a mix. Write titles in the SAME language the person used.',
    '',
    `Today is ${args.weekday} ${args.today} in the user's time zone (${args.timezone}).`,
    `Allowed categories: ${args.categories.join(', ')}. Use null if none clearly fits.`,
    '',
    'Rules:',
    '- Split the speech into separate items. "call my school, prepare my CV and buy a notebook" is three tasks.',
    '- type: task (something to do), reminder (the person asked to be reminded at a time), event (an appointment/meeting at a time),',
    '  note (information to keep), idea (a new idea), personal_info (a fact about themselves or people they know, e.g. a birthday).',
    '- Only use information present in the transcript. Never invent people, places, times or details.',
    '- Resolve relative dates ("tomorrow", "next Monday", "demain", "ejo") against today ONLY when unambiguous; set date_confidence "explicit".',
    '- If a date or time is vague ("soon", "later", "this weekend", "in the evening" without a day) set date_confidence "ambiguous",',
    '  put the exact words in date_text, and leave date/time null.',
    '- If no date was mentioned, date_confidence "none" and date/time null.',
    '- Keep titles short (under 12 words). Put any extra detail in body; otherwise body is null.',
    '- priority "high" only if the person said it is urgent or important.',
    '- If nothing actionable or worth keeping was said, return an empty items array.',
    '',
    'Transcript:',
    '"""',
    args.transcript,
    '"""',
  ].join('\n');
}

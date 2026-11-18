// POST /functions/v1/process-voice
//   multipart/form-data: audio (File), duration_ms, timezone, language_hint (auto|en|fr|rw)
//   application/json:    { text, timezone, language_hint }   — typed input or an edited transcript
// Returns proposals only. Nothing is saved as a note/task/etc. until the client confirms.
// Audio is processed in memory and never written to storage.
import { createClient } from 'npm:@supabase/supabase-js@2.48.1';
import { buildExtractionPrompt, EXTRACTION_RESPONSE_SCHEMA, validateExtraction } from '../_shared/extraction.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // ~10+ minutes of opus audio
const MAX_TEXT_CHARS = 10_000;
const HOURLY_LIMIT = Number(Deno.env.get('VOICE_HOURLY_LIMIT') ?? '30');
const ALLOWED_AUDIO = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'];
const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda' };

class UpstreamError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function gemini(parts: unknown[], schema: unknown): Promise<unknown> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new UpstreamError(res.status, `Gemini ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new UpstreamError(502, `Gemini returned no content (finishReason: ${data?.candidates?.[0]?.finishReason ?? 'unknown'})`);
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError(502, 'Gemini returned malformed JSON');
  }
}

const TRANSCRIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    language: { type: 'STRING', enum: ['en', 'fr', 'rw', 'other', 'none'] },
  },
  required: ['transcript', 'language'],
};

async function transcribe(audio: Uint8Array, mimeType: string, hint: string) {
  let b64 = '';
  const chunk = 0x8000;
  for (let i = 0; i < audio.length; i += chunk) b64 += String.fromCharCode(...audio.subarray(i, i + chunk));
  b64 = btoa(b64);
  const hintText = LANGUAGE_NAMES[hint] ? `The speaker selected ${LANGUAGE_NAMES[hint]} as their language.` : 'The language may be English, French or Kinyarwanda.';
  const out = await gemini([
    { inline_data: { mime_type: mimeType, data: b64 } },
    { text: `Transcribe this recording verbatim in the language that was spoken. Do not translate, summarise or add anything. ${hintText} If there is no intelligible speech, return an empty transcript and language "none". language must be the ISO code of the main spoken language: en, fr, rw, or "other".` },
  ], TRANSCRIPT_SCHEMA) as { transcript?: unknown; language?: unknown };
  return {
    transcript: typeof out.transcript === 'string' ? out.transcript.trim().slice(0, MAX_TEXT_CHARS) : '',
    language: typeof out.language === 'string' ? out.language : 'other',
  };
}

function localToday(tz: string) {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
  return { date, weekday };
}

function validTz(tz: unknown): string {
  if (typeof tz !== 'string' || tz.length > 64) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'POST only');
  if (!GEMINI_API_KEY) return fail(req, 503, 'ai_not_configured', 'GEMINI_API_KEY secret is not set on this project');

  // Act as the calling user so every query below goes through RLS.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) return fail(req, 401, 'unauthorized', 'Sign in required');

  // Basic abuse protection: cap AI calls per user per hour.
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from('voice_sessions').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if ((count ?? 0) >= HOURLY_LIMIT) return fail(req, 429, 'rate_limited', `Limit of ${HOURLY_LIMIT} captures per hour reached`);

  let source: 'voice' | 'text';
  let transcript = '';
  let language = 'other';
  let timezone = 'UTC';
  let durationMs: number | null = null;
  let hint = 'auto';

  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.startsWith('multipart/form-data')) {
      source = 'voice';
      const form = await req.formData();
      const audio = form.get('audio');
      timezone = validTz(form.get('timezone'));
      hint = String(form.get('language_hint') ?? 'auto');
      durationMs = Math.max(0, Math.min(3_600_000, Number(form.get('duration_ms')) || 0));
      if (!(audio instanceof File)) return fail(req, 400, 'no_audio', 'Missing audio file');
      if (audio.size === 0) return fail(req, 400, 'empty_audio', 'The recording is empty');
      if (audio.size > MAX_AUDIO_BYTES) return fail(req, 413, 'audio_too_large', 'Recording is too long');
      const mime = (audio.type || 'audio/webm').split(';')[0];
      if (!ALLOWED_AUDIO.includes(mime)) return fail(req, 415, 'unsupported_audio', `Unsupported audio type ${mime}`);
      const t = await transcribe(new Uint8Array(await audio.arrayBuffer()), mime, hint);
      transcript = t.transcript;
      language = t.language;
    } else {
      source = 'text';
      const body = await req.json().catch(() => null);
      if (!body || typeof body.text !== 'string') return fail(req, 400, 'no_text', 'Missing text');
      transcript = body.text.trim().slice(0, MAX_TEXT_CHARS);
      timezone = validTz(body.timezone);
      hint = typeof body.language_hint === 'string' ? body.language_hint : 'auto';
      language = LANGUAGE_NAMES[hint] ? hint : 'other';
    }

    if (!transcript) {
      await supabase.from('voice_sessions').insert({ source, status: 'failed', error: 'no_speech', duration_ms: durationMs, provider: GEMINI_MODEL });
      return fail(req, 422, 'no_speech', 'No speech was detected');
    }

    const { data: cats } = await supabase.from('categories').select('name');
    const categories = (cats ?? []).map((c: { name: string }) => c.name);
    const { date, weekday } = localToday(timezone);

    const raw = await gemini([{ text: buildExtractionPrompt({ transcript, today: date, weekday, timezone, categories }) }], EXTRACTION_RESPONSE_SCHEMA);
    const result = validateExtraction(raw, { today: date, categories });

    const { data: session, error: insertError } = await supabase.from('voice_sessions').insert({
      source, transcript, detected_language: language, duration_ms: durationMs, provider: GEMINI_MODEL, status: 'extracted',
    }).select('id').single();
    if (insertError) throw new Error(`Could not record session: ${insertError.message}`);

    return json(req, 200, { session_id: session.id, transcript, language, today: date, timezone, ...result });
  } catch (err) {
    console.error('process-voice failed', err);
    if (err instanceof UpstreamError) {
      if (err.status === 429) return fail(req, 503, 'ai_busy', 'The AI provider is rate limiting requests. Try again shortly.');
      if (err.status === 400) return fail(req, 422, 'ai_rejected_input', 'The AI provider could not process this recording.');
      return fail(req, 502, 'ai_unavailable', 'The AI provider is unavailable.');
    }
    if (err instanceof DOMException && err.name === 'TimeoutError') return fail(req, 504, 'ai_timeout', 'The AI provider timed out.');
    return fail(req, 500, 'internal', 'Unexpected error');
  }
});

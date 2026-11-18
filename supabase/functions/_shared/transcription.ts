// Pure transcription prompt/schema shared by the process-voice Edge Function and the
// offline evaluation tool (scripts/eval/transcribe.mjs), so evaluation measures exactly
// what production does. No Deno/browser APIs here.

export const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda' };

export const TRANSCRIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    language: { type: 'STRING', enum: ['en', 'fr', 'rw', 'other', 'none'] },
  },
  required: ['transcript', 'language'],
} as const;

export function buildTranscriptionPrompt(hint: string): string {
  const hintText = LANGUAGE_NAMES[hint]
    ? `The speaker selected ${LANGUAGE_NAMES[hint]} as their language.`
    : 'The language may be English, French or Kinyarwanda.';
  return `Transcribe this recording verbatim in the language that was spoken. Do not translate, summarise or add anything. ${hintText} If there is no intelligible speech, return an empty transcript and language "none". language must be the ISO code of the main spoken language: en, fr, rw, or "other".`;
}

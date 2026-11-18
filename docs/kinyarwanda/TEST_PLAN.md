# Kinyarwanda speech-recognition test plan

**Goal:** decide, with evidence, whether My Voice Life can claim Kinyarwanda support, and with which provider.
**Status:** not started. No Kinyarwanda result exists yet. Until this plan has been run, the app labels Kinyarwanda "experimental".

## 1. What we measure
| Question | Metric | Tool |
|---|---|---|
| Does the transcript match what was said? | **WER** (word error rate) and **CER** (character error rate) against a human reference transcript | `scripts/eval/score.mjs` |
| Is the language detected correctly? | % of clips where `detected_language` matches `spoken_language` | sheet column |
| Do the right actions come out? | % of task/reminder/event clips where the extracted items are correct (right count, titles, dates) | `extraction_correct` column (manual, in the app) |

**Normalisation before scoring:** lower-case, punctuation removed (Google's `rw-RW` model has no punctuation, so punctuation must not count as an error), apostrophes kept (`n'ishuri`).

**Proposed pass bar (agree on it *before* testing):**
- median WER ≤ 20% on Kinyarwanda clips, across **≥ 30 clips from ≥ 5 speakers**;
- ≥ 80% of task/reminder clips produce correct actions after review;
- no condition (e.g. street noise) above 50% median WER without a visible warning in the app.

Below that bar, Kinyarwanda stays "experimental" or is hidden, and we test Google Cloud Speech-to-Text `rw-RW` with the same sheet.

## 2. Speakers and consent
- **At least 5 speakers**, varied by gender, age (18–25, 26–40, 40+) and home region. Accents differ, and a model that only works for one voice doesn't pass.
- Use **pseudonymous IDs** (`S01`…`S05`) in the sheet, never names.
- Get **written consent before recording**. The consent must say that:
  1. the recording is used only to test speech recognition for My Voice Life;
  2. it is sent to Google (Gemini API) for transcription, and possibly to Google Cloud Speech-to-Text for comparison;
  3. it is stored on the project owner's computer only, never published and never committed to GitHub;
  4. it is deleted after testing (state a date), and the speaker can withdraw at any time.
- Record a consent reference in `consent_ref` (for example `C-2026-11-S01`). Keep the signed forms offline.

> ⚠️ **Gemini free tier:** check Google's current Gemini API terms before sending recordings. As far as I know, content sent on the unpaid tier may be used by Google to improve its products, and the paid tier is excluded. If that's still the case, use a paid key (billing enabled), or say so explicitly in the consent form. Enabling billing costs money and is your decision.

## 3. What to record
Script: `docs/kinyarwanda/prompts.csv` (18 prompts in English, French and **draft** Kinyarwanda).
**The Kinyarwanda column is a draft written by an AI and must be corrected by a native speaker before recording.** Pay special attention to time expressions (for example *saa tatu*, *saa munani*). They are both a translation risk and the most important thing for the app to get right.

| Category | Prompts | Why |
|---|---|---|
| everyday (short) | P01–P04 | baseline accuracy |
| task | P05–P07 | the core feature; P07 is the reference sentence |
| reminder | P08–P10 | dates and times; P10 is deliberately vague ("later") |
| event | P11–P12 | days and times; P12 is long |
| note / personal info | P13–P14 | long natural speech; dates in words |
| code-switching | P15–P16 | Kinyarwanda mixed with French/English, how people actually speak |
| numbers & names | P17 | phone numbers, amounts, proper names |
| free speech | P18 | unscripted, the most realistic case |

### Recording matrix (per speaker)
| Block | Prompts | Speed | Condition | Clips |
|---|---|---|---|---|
| A | all 18 | normal | quiet room, phone ~20 cm | 18 |
| B | P04, P07, P08, P11 | slow | quiet | 4 |
| C | P04, P07, P08, P11 | fast | quiet | 4 |
| D | P07, P08 | normal | street / outdoor noise | 2 |
| E | P07, P08 | normal | TV or music in the background | 2 |
| F | P07, P08 | normal | phone at arm's length | 2 |

That's 32 clips per speaker, so **160 for 5 speakers**. The minimum useful set is block A for 2 speakers plus block D for one (~38 clips).

**Recording tips:** use the device people will actually use (a phone). Record in the My Voice Life app if possible, or any voice recorder app (m4a, webm, ogg, mp3 and wav are all accepted). One prompt per file. Name files after `recording_id`, for example `RW-P07-S01-A.m4a`.

**Speakers may deviate from the script, and that's fine.** The reference transcript is what they *actually said*, typed by a native speaker who listens to the recording. **Never** copy the script into `expected_transcription` without listening.

## 4. The sheet
Copy `docs/kinyarwanda/test-sheet-template.csv` to `eval-data/test-sheet.csv` (the `eval-data/` folder is git-ignored, so recordings and transcripts never reach GitHub). It opens in Excel or Google Sheets.

| Column | Filled by | Example |
|---|---|---|
| recording_id | you | `RW-P07-S01-A` |
| prompt_id / category | you | `P07` / `task` |
| speaker_id | you | `S01` |
| spoken_language | you | `rw`, `fr`, `en` or `mixed` |
| speed / condition / device | you | `normal` / `quiet` / `phone` |
| audio_file | you | `RW-P07-S01-A.m4a` |
| duration_s, consent_ref | you | `9`, `C-2026-11-S01` |
| **expected_transcription** | **native speaker, by listening** | |
| actual_transcription, detected_language, provider_model | `transcribe.mjs` | |
| wer, cer, accuracy_assessment, identified_errors | `score.mjs` | |
| extraction_correct | you, after trying the clip in the app | `yes`, `partial` or `no` |
| notes | anyone | |

Accuracy assessment (from WER): ≤ 10% **good** · ≤ 25% **usable-with-review** · ≤ 50% **poor** · above 50% **unusable**.

## 5. Running it
Needs Node 22.18 or newer. Recordings go in `eval-data/audio/`.
```bash
# 1. Check the sheet and files without sending anything
node scripts/eval/transcribe.mjs eval-data/test-sheet.csv --audio-dir eval-data/audio --dry-run
```
```bash
# 2. Transcribe. The key comes only from your shell session, never from a file in the repo.
#    Windows PowerShell:  $env:GEMINI_API_KEY = Read-Host -MaskInput "Gemini key"
#    macOS/Linux:         read -rs GEMINI_API_KEY && export GEMINI_API_KEY
node scripts/eval/transcribe.mjs eval-data/test-sheet.csv --audio-dir eval-data/audio
```
```bash
# 3. After a native speaker has filled expected_transcription:
node scripts/eval/score.mjs eval-data/test-sheet.csv --write
```
The transcriber uses **the same prompt as production** (`supabase/functions/_shared/transcription.ts`), so the numbers describe the real app. Send me the summary that `score.mjs` prints (it contains no audio and no names), and I'll analyse it and propose next steps.

## 6. After the results
- **Pass:** keep Gemini for Kinyarwanda, remove the "experimental" label, and record the evidence (n, speakers, median WER) in `docs/ROADMAP.md`.
- **Fail on Gemini:** run the same clips through Google Cloud Speech-to-Text `rw-RW` (I'll add it behind the existing `transcribe()` interface) and compare on the same sheet.
- **Fail on both:** keep Kinyarwanda hidden or experimental and say so publicly. Don't market it.
- Delete the recordings on the date promised in the consent form.

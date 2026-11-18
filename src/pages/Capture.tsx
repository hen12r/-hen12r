import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertTriangle, Check, Keyboard, Mic, RotateCcw, Square, Trash2, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage, useI18n, type TranslationKey } from '../lib/i18n';
import { commitItems, createNote, DEFAULT_REMINDER_TIME, listCategories, processAudio, processText, type ProcessResult, type ReviewedItem } from '../lib/api';
import { ITEM_TYPES, type ItemType } from '../../supabase/functions/_shared/extraction.ts';
import type { Category } from '../lib/types';
import { browserTimeZone } from '../lib/dates';
import { formatDuration, MAX_RECORDING_MS, useRecorder, type Recording } from '../voice/useRecorder';
import { Alert, Badge, Button, Card, cx, Field, Input, PageHeader, Select, Textarea } from '../components/ui';

type Phase = 'input' | 'processing' | 'review' | 'saving' | 'done';

const LANG_LABEL: Record<string, string> = { en: 'English', fr: 'Français', rw: 'Kinyarwanda', other: '—' };

export default function Capture() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const recorder = useRecorder();
  const [phase, setPhase] = useState<Phase>('input');
  const [typed, setTyped] = useState('');
  const [showTyping, setShowTyping] = useState(params.get('mode') === 'text');
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [transcript, setTranscript] = useState('');
  const [items, setItems] = useState<ReviewedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});
  const [savedCount, setSavedCount] = useState(0);

  const timezone = profile?.timezone ?? browserTimeZone();
  const hint = profile?.speech_language ?? 'auto';

  useEffect(() => { listCategories().then(setCategories).catch(() => undefined); }, []);

  const adopt = (res: ProcessResult) => {
    setResult(res);
    setTranscript(res.transcript);
    setItems(res.items.map((i) => ({
      ...i,
      include: true,
      // A reminder needs a time; make the default visible instead of silently applying it.
      time: i.type === 'reminder' && i.date && !i.time ? DEFAULT_REMINDER_TIME : i.time,
    })));
    setSaveErrors({});
    setPhase('review');
  };

  const run = async (fn: () => Promise<ProcessResult>) => {
    setError(null);
    setPhase('processing');
    try { adopt(await fn()); } catch (e) { setError(errorMessage(t, e)); setPhase(result ? 'review' : 'input'); }
  };

  const handleRecording = (rec: Recording | null) => { if (rec) void run(() => processAudio(rec.blob, rec.durationMs, timezone, hint)); };

  const startRecording = async () => {
    setError(null);
    await recorder.start();
    recorder.waitForAutoStop().then(handleRecording);
  };

  const recorderError = useMemo(() => {
    const map: Record<string, TranslationKey> = { denied: 'capture.micDenied', no_device: 'capture.micMissing', unsupported: 'capture.micUnsupported', too_short: 'capture.tooShort', failed: 'errors.generic' };
    return recorder.error ? t(map[recorder.error]) : null;
  }, [recorder.error, t]);

  const update = (idx: number, patch: Partial<ReviewedItem>) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const blocked = (it: ReviewedItem) => it.include && ((it.type === 'reminder' || it.type === 'event') && !it.date || !it.title.trim());
  const selected = items.filter((i) => i.include);
  const canSave = selected.length > 0 && !items.some(blocked);

  const save = async () => {
    if (!result) return;
    setPhase('saving');
    const outcomes = await commitItems(items, { timezone, sessionId: result.session_id, language: result.language, categories });
    const errs: Record<number, string> = {};
    outcomes.filter((o) => !o.ok).forEach((o) => { errs[o.index] = errorMessage(t, o.error); });
    const ok = outcomes.filter((o) => o.ok).length;
    setSavedCount((c) => c + ok);
    // Keep only failed items on screen so nothing is lost or double-saved.
    const failed = new Set(Object.keys(errs).map(Number));
    if (failed.size === 0) { setPhase('done'); return; }
    const remaining = items.map((it, i) => ({ it, i })).filter(({ i }) => failed.has(i));
    setItems(remaining.map(({ it }) => it));
    setSaveErrors(Object.fromEntries(remaining.map(({ i }, n) => [n, errs[i]])));
    setPhase('review');
  };

  const saveTranscriptAsNote = async () => {
    setError(null);
    try {
      await createNote({ body: transcript, title: transcript.slice(0, 60), language: result?.language ?? null, voice_session_id: result?.session_id ?? null });
      setSavedCount((c) => c + 1);
      setPhase('done');
    } catch (e) { setError(errorMessage(t, e)); }
  };

  const reset = () => { setPhase('input'); setResult(null); setItems([]); setTranscript(''); setTyped(''); setError(null); setSaveErrors({}); setSavedCount(0); recorder.reset(); };

  // ---------------- Render ----------------
  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-6" /></div>
          <h1 className="text-lg font-semibold">{t('capture.saved')} · {savedCount}</h1>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={reset} icon={<Mic className="size-4" />}>{t('capture.startOver')}</Button>
            <Link to="/app"><Button variant="secondary">{t('nav.dashboard')}</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'review' || phase === 'saving') {
    return (
      <div className="animate-fade-up">
        <PageHeader title={t('capture.review')} action={<Button variant="ghost" onClick={reset} icon={<RotateCcw className="size-4" />}>{t('capture.startOver')}</Button>} />
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card className="h-fit p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t('capture.transcript')}</h2>
              {result && <Badge tone="accent">{t('capture.detected')}: {LANG_LABEL[result.language] ?? result.language}</Badge>}
            </div>
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} aria-label={t('capture.transcript')} />
            {result?.language === 'rw' && <p className="mt-2 text-xs text-amber-700">{t('capture.rwExperimental')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={!transcript.trim() || transcript === result?.transcript || phase === 'saving'}
                onClick={() => run(() => processText(transcript, timezone, result?.language ?? hint))}>{t('capture.reprocess')}</Button>
              <Button variant="ghost" size="sm" disabled={!transcript.trim() || phase === 'saving'} onClick={saveTranscriptAsNote}>{t('capture.saveAsNote')}</Button>
            </div>
            {result?.warnings.map((w) => <p key={w} className="mt-2 text-xs text-muted">{w}</p>)}
          </Card>

          <div className="space-y-3">
            {items.length === 0 && <Card className="p-6 text-sm text-muted">{t('capture.nothingFound')}</Card>}
            {items.map((it, idx) => (
              <ReviewCard key={idx} item={it} categories={categories} error={saveErrors[idx]} blocked={blocked(it)} onChange={(p) => update(idx, p)} />
            ))}
            {items.length > 0 && (
              <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur lg:bottom-4">
                <span className="text-sm text-muted">{selected.length} / {items.length}</span>
                <Button onClick={save} disabled={!canSave} loading={phase === 'saving'} icon={<Check className="size-4" />}>{t('capture.saveSelected')}</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const recording = recorder.state === 'recording';
  const processing = phase === 'processing';
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('capture.title')} subtitle={t('capture.subtitle')} />
      <Card className="flex flex-col items-center px-6 py-10">
        <div className="relative flex size-40 items-center justify-center">
          {recording && <span className="animate-pulse-ring absolute inset-4 rounded-full bg-accent-400" aria-hidden />}
          {recording && <span className="absolute inset-2 rounded-full bg-accent-100 transition-transform duration-75" style={{ transform: `scale(${0.85 + recorder.level * 0.25})` }} aria-hidden />}
          <button
            onClick={() => (recording ? recorder.stop().then(handleRecording) : startRecording())}
            disabled={processing || recorder.state === 'requesting'}
            aria-label={recording ? t('capture.stop') : t('capture.start')}
            className={cx('relative flex size-28 items-center justify-center rounded-full text-white shadow-xl transition-colors disabled:opacity-60',
              recording ? 'bg-accent-600 hover:bg-accent-700' : 'bg-navy-900 hover:bg-navy-800')}>
            {recording ? <Square className="size-9 fill-current" /> : <Mic className="size-11" />}
          </button>
        </div>

        <div className="mt-4 h-6 text-sm" aria-live="polite">
          {recording && <span className="font-medium tabular-nums text-accent-700">● {t('capture.recording')} {formatDuration(recorder.elapsedMs)} / {formatDuration(MAX_RECORDING_MS)}</span>}
          {processing && <span className="text-muted">{t('capture.processing')}</span>}
          {!recording && !processing && <span className="text-muted">{t('capture.start')}</span>}
        </div>

        {recording && (
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={recorder.cancel} icon={<X className="size-4" />}>{t('capture.cancel')}</Button>
            <Button onClick={() => recorder.stop().then(handleRecording)} icon={<Square className="size-4" />}>{t('capture.stop')}</Button>
          </div>
        )}

        <div className="mt-6 w-full space-y-3">
          {recorderError && <Alert>{recorderError}</Alert>}
          {recorder.hitLimit && <Alert kind="info">{t('capture.maxReached')}</Alert>}
          {error && <Alert>{error}</Alert>}
        </div>
        <p className="mt-4 max-w-md text-center text-xs text-muted">{t('capture.privacy')}</p>
        {hint === 'rw' && <p className="mt-1 text-center text-xs text-amber-700">{t('capture.rwExperimental')}</p>}
      </Card>

      <div className="mt-6">
        {!showTyping ? (
          <Button variant="ghost" onClick={() => setShowTyping(true)} icon={<Keyboard className="size-4" />}>{t('capture.typeInstead')}</Button>
        ) : (
          <Card className="p-5">
            <Textarea value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('capture.typePlaceholder')} rows={4} maxLength={10000} aria-label={t('capture.typeInstead')} autoFocus />
            <div className="mt-3 flex justify-end">
              <Button disabled={!typed.trim() || processing || recording} loading={processing} onClick={() => run(() => processText(typed, timezone, hint))}>{t('capture.process')}</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item, categories, error, blocked, onChange }: {
  item: ReviewedItem; categories: Category[]; error?: string; blocked: boolean; onChange: (p: Partial<ReviewedItem>) => void;
}) {
  const { t } = useI18n();
  const dated = item.type === 'task' || item.type === 'reminder' || item.type === 'event';
  return (
    <Card as="article" className={cx('p-4 transition-opacity', !item.include && 'opacity-50')}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={item.include} onChange={(e) => onChange({ include: e.target.checked })}
          className="mt-3 size-4 accent-accent-600" aria-label={t('capture.include')} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="w-32 shrink-0 sm:w-40">
              <Select value={item.type} onChange={(e) => onChange({ type: e.target.value as ItemType })} aria-label="Type">
                {ITEM_TYPES.map((ty) => <option key={ty} value={ty}>{t(`type.${ty}` as TranslationKey)}</option>)}
              </Select>
            </div>
            <div className="min-w-0 flex-1">
              <Input value={item.title} onChange={(e) => onChange({ title: e.target.value })} aria-label={t('common.title')} maxLength={300} />
            </div>
          </div>
          {item.include && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('common.category')}>
                <Select value={item.category ?? ''} onChange={(e) => onChange({ category: e.target.value || null })}>
                  <option value="">{t('common.none')}</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </Field>
              {dated && (
                <>
                  <Field label={t('common.date')}>
                    <Input type="date" value={item.date ?? ''} onChange={(e) => onChange({ date: e.target.value || null, date_confidence: 'explicit' })} />
                  </Field>
                  <Field label={t('common.time')}>
                    <Input type="time" value={item.time ?? ''} onChange={(e) => onChange({ time: e.target.value || null })} />
                  </Field>
                </>
              )}
            </div>
          )}
          {item.include && item.body && (
            <Textarea value={item.body} onChange={(e) => onChange({ body: e.target.value })} rows={2} aria-label={t('common.details')} />
          )}
          {item.include && item.date_text && <p className="text-xs text-muted">“{item.date_text}”</p>}
          {item.include && item.warnings.filter((w) => !(item.date && /choose a date|needs a date/.test(w))).map((w) => (
            <p key={w} className="flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle className="size-3.5" />{w}</p>
          ))}
          {blocked && <p className="text-xs font-medium text-red-700">{t('capture.needsDate')}</p>}
          {error && <Alert>{error}</Alert>}
        </div>
        <button onClick={() => onChange({ include: !item.include })} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label={item.include ? t('common.delete') : t('capture.include')}>
          {item.include ? <Trash2 className="size-4" /> : <RotateCcw className="size-4" />}
        </button>
      </div>
    </Card>
  );
}

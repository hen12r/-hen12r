import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';
export type RecorderError = 'denied' | 'no_device' | 'unsupported' | 'too_short' | 'failed';

export const MAX_RECORDING_MS = 5 * 60 * 1000;
const MIN_RECORDING_MS = 700;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  // Opus in WebM (Chrome/Firefox/Edge) or MP4/AAC (Safari).
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

export interface Recording { blob: Blob; durationMs: number }

/**
 * Microphone recorder. Audio stays in memory; nothing is persisted on the device.
 * `stop()` resolves with the recording, `cancel()` discards it.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [hitLimit, setHitLimit] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => { cancelledRef.current = true; recorderRef.current?.state === 'recording' && recorderRef.current.stop(); cleanup(); }, [cleanup]);

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const start = useCallback(async () => {
    setError(null);
    setHitLimit(false);
    if (!supported) { setError('unsupported'); setState('error'); return; }
    setState('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'no_device' : 'failed');
      setState('error');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    cancelledRef.current = false;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
    recorder.onstop = () => {
      const durationMs = Date.now() - startRef.current;
      cleanup();
      const resolve = resolveRef.current;
      resolveRef.current = null;
      if (cancelledRef.current) { chunksRef.current = []; setState('idle'); resolve?.(null); return; }
      if (durationMs < MIN_RECORDING_MS) { chunksRef.current = []; setError('too_short'); setState('error'); resolve?.(null); return; }
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
      chunksRef.current = [];
      setState('stopped');
      resolve?.({ blob, durationMs });
    };

    // Input level meter (visual feedback that the mic is picking up sound).
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        const elapsed = Date.now() - startRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS && recorder.state === 'recording') { setHitLimit(true); recorder.stop(); return; }
        timerRef.current = requestAnimationFrame(tick);
      };
      timerRef.current = requestAnimationFrame(tick);
    } catch {
      // Level meter is optional; fall back to a plain timer.
      const tick = () => { setElapsedMs(Date.now() - startRef.current); timerRef.current = requestAnimationFrame(tick); };
      timerRef.current = requestAnimationFrame(tick);
    }

    startRef.current = Date.now();
    setElapsedMs(0);
    recorder.start(1000);
    setState('recording');
  }, [cleanup, supported]);

  const stop = useCallback((): Promise<Recording | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return Promise.resolve(null);
    return new Promise((resolve) => { resolveRef.current = resolve; cancelledRef.current = false; rec.stop(); });
  }, []);

  /** Resolves with the auto-stopped recording when the max length is hit. */
  const waitForAutoStop = useCallback((): Promise<Recording | null> => new Promise((resolve) => { resolveRef.current = resolve; }), []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') rec.stop(); else { cleanup(); setState('idle'); }
  }, [cleanup]);

  const reset = useCallback(() => { setState('idle'); setError(null); setElapsedMs(0); }, []);

  return { state, error, elapsedMs, level, hitLimit, supported, start, stop, cancel, reset, waitForAutoStop };
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

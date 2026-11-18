import { describe, expect, it } from 'vitest';
import { assess, cer, median, normalize, wer } from './metrics.mjs';
import { parseCsv, toCsv } from './csv.mjs';

describe('normalize', () => {
  it('ignores case and punctuation but keeps Kinyarwanda apostrophes', () => {
    expect(normalize('Ejo, nzajya N’ishuri!')).toBe("ejo nzajya n'ishuri");
    expect(normalize("  Saa  tatu.  ")).toBe('saa tatu');
  });
});

describe('wer / cer', () => {
  it('is 0 for identical text after normalisation', () => {
    expect(wer('Ndashaka kugura ikaye.', 'ndashaka kugura ikaye').rate).toBe(0);
  });
  it('counts substitutions, deletions and insertions', () => {
    const r = wer('ejo nzajya ku ishuri', 'ejo najya ishuri cyane');
    expect([r.sub, r.del, r.ins]).toEqual([1, 1, 1]);
    expect(r.rate).toBe(0.75);
    expect(r.errors).toContain('nzajya→najya');
  });
  it('CER is lower than WER for near-miss spellings', () => {
    expect(cer('nzajya', 'najya')).toBeCloseTo(1 / 6);
    expect(wer('nzajya', 'najya').rate).toBe(1);
  });
  it('handles empty references', () => {
    expect(wer('', '').rate).toBe(0);
    expect(wer('', 'noise').rate).toBe(1);
  });
});

describe('rubric and stats', () => {
  it('maps WER to an assessment', () => {
    expect([0.05, 0.2, 0.4, 0.8].map(assess)).toEqual(['good', 'usable-with-review', 'poor', 'unusable']);
  });
  it('computes medians', () => {
    expect(median([0.3, 0.1, 0.2])).toBe(0.2);
    expect(median([0.1, 0.2, 0.3, 0.4])).toBeCloseTo(0.25);
  });
});

describe('csv', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [{ id: 'RW-1', text: 'Muraho, "amakuru"?\nNi meza' }];
    expect(parseCsv(toCsv(['id', 'text'], rows))).toEqual(rows);
  });
});

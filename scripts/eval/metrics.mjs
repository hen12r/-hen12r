// Speech-recognition metrics. Pure functions, no dependencies.

/**
 * Normalises text before scoring so we measure recognition, not formatting:
 * Unicode NFC, lower-case, unify apostrophes (Kinyarwanda contractions such as n'ishuri
 * keep their apostrophe), drop other punctuation (Google's rw-RW model has no punctuation),
 * collapse whitespace.
 * @param {string} text
 */
export function normalize(text) {
  return (text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein alignment returning counts of substitutions, deletions, insertions. */
function align(ref, hyp) {
  const n = ref.length, m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  // Backtrack to classify the edits.
  let i = n, j = m, sub = 0, del = 0, ins = 0;
  const errors = [];
  // On ties prefer: match > deletion > insertion > substitution (like NIST sclite),
  // so error lists read "word dropped / word added" rather than chains of substitutions.
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1] && d[i][j] === d[i - 1][j - 1]) { i--; j--; }
    else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { del++; errors.unshift(`-${ref[i - 1]}`); i--; }
    else if (j > 0 && d[i][j] === d[i][j - 1] + 1) { ins++; errors.unshift(`+${hyp[j - 1]}`); j--; }
    else { sub++; errors.unshift(`${ref[i - 1]}→${hyp[j - 1]}`); i--; j--; }
  }
  return { sub, del, ins, distance: d[n][m], errors };
}

/**
 * Word error rate: (S + D + I) / words in reference. Can exceed 1.0.
 * @param {string} reference human transcript of what was actually said
 * @param {string} hypothesis machine transcript
 */
export function wer(reference, hypothesis) {
  const ref = normalize(reference).split(' ').filter(Boolean);
  const hyp = normalize(hypothesis).split(' ').filter(Boolean);
  if (ref.length === 0) return { rate: hyp.length ? 1 : 0, ...align(ref, hyp), words: 0 };
  const a = align(ref, hyp);
  return { rate: a.distance / ref.length, ...a, words: ref.length };
}

/** Character error rate on normalised text without spaces (robust to word-splitting differences). */
export function cer(reference, hypothesis) {
  const ref = [...normalize(reference).replace(/ /g, '')];
  const hyp = [...normalize(hypothesis).replace(/ /g, '')];
  if (ref.length === 0) return hyp.length ? 1 : 0;
  return align(ref, hyp).distance / ref.length;
}

/** Proposed rubric — agree it with the team before testing, not after seeing results. */
export function assess(werRate) {
  if (werRate <= 0.10) return 'good';
  if (werRate <= 0.25) return 'usable-with-review';
  if (werRate <= 0.50) return 'poor';
  return 'unusable';
}

export function median(values) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

import { readFile } from 'node:fs/promises';
import { platformOf, isMarketplace } from './platforms.mjs';

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

/** Builds the Vision `image` field from a local path or an http(s) URL. */
export async function toVisionImage(input) {
  if (/^https?:\/\//i.test(input)) return { source: { imageUri: input } };
  return { content: (await readFile(input)).toString('base64') };
}

/**
 * Calls Vision WEB_DETECTION for one image. The API key is read from
 * GOOGLE_VISION_API_KEY; when unset the request goes out without one, which
 * works only where a proxy injects the x-goog-api-key header.
 */
export async function webDetect(input, { apiKey = process.env.GOOGLE_VISION_API_KEY, fetchImpl = fetch } = {}) {
  const body = {
    requests: [{ image: await toVisionImage(input), features: [{ type: 'WEB_DETECTION', maxResults: 50 }] }],
  };
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-goog-api-key'] = apiKey;
  const res = await fetchImpl(VISION_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Vision API ${res.status}: ${json.error?.message ?? res.statusText}`);
  }
  const result = json.responses?.[0] ?? {};
  if (result.error) throw new Error(`Vision API: ${result.error.message}`);
  return result.webDetection ?? {};
}

/** Extracts the 10-character ASIN from an Amazon product URL, if present. */
export function asinOf(url) {
  const m = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i.exec(url ?? '');
  return m ? m[1].toUpperCase() : null;
}

const stripTags = s => (s ?? '').replace(/<[^>]*>/g, '').trim();

/**
 * Turns a Vision webDetection result into a ranked list of suspected copies.
 * `own` excludes the seller's own listings: { asins: [...], domains: [...] }.
 */
export function findCopies(web, own = {}) {
  const ownAsins = new Set((own.asins ?? []).map(a => a.toUpperCase()));
  const ownDomains = (own.domains ?? []).map(d => d.toLowerCase());
  const isOwn = url => {
    if (!url) return false;
    const asin = asinOf(url);
    if (asin && ownAsins.has(asin)) return true;
    try {
      const host = new URL(url).hostname.toLowerCase();
      return ownDomains.some(d => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  };

  const findings = [];
  const seenImages = new Set();

  for (const page of web.pagesWithMatchingImages ?? []) {
    if (isOwn(page.url)) {
      for (const img of [...(page.fullMatchingImages ?? []), ...(page.partialMatchingImages ?? [])]) seenImages.add(img.url);
      continue;
    }
    const full = page.fullMatchingImages ?? [];
    const partial = page.partialMatchingImages ?? [];
    const match = full.length ? 'full' : 'partial';
    const imageUrl = (full[0] ?? partial[0])?.url ?? null;
    for (const img of [...full, ...partial]) seenImages.add(img.url);
    findings.push({
      match,
      platform: platformOf(page.url),
      pageUrl: page.url,
      title: stripTags(page.pageTitle),
      asin: asinOf(page.url),
      imageUrl,
    });
  }

  // Matching images Vision found without a page attached (e.g. CDN files).
  for (const [match, list] of [['full', web.fullMatchingImages], ['partial', web.partialMatchingImages]]) {
    for (const img of list ?? []) {
      if (seenImages.has(img.url) || isOwn(img.url)) continue;
      seenImages.add(img.url);
      findings.push({ match, platform: platformOf(img.url), pageUrl: null, title: '', asin: null, imageUrl: img.url });
    }
  }

  const rank = f => (f.match === 'full' ? 0 : 2) + (isMarketplace(f.platform) ? 0 : 1);
  findings.sort((a, b) => rank(a) - rank(b));

  return {
    findings,
    similarCount: (web.visuallySimilarImages ?? []).length,
    bestGuess: (web.bestGuessLabels ?? []).map(l => l.label).filter(Boolean),
  };
}

// Copy-detection logic shared with poc/detect.mjs (kept identical; see scan.test.mjs).
import { platformOf, isMarketplace } from './platforms.js';

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
    // Also catch other URL shapes that carry the ASIN (e.g. ?asin=..., /product-reviews/ASIN).
    const upper = url.toUpperCase();
    for (const a of ownAsins) if (upper.includes(a)) return true;
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

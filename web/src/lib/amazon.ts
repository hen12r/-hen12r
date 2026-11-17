/** Reads what a seller pastes in the "ASIN" field: a bare ASIN or a full Amazon product link. */
export type AmazonInput =
  | { kind: 'asin'; asin: string; marketplace: string | null }
  /** Short share links (amzn.eu/…, a.co/…) only reveal the product after a redirect we can't follow from the browser. */
  | { kind: 'short' }
  | { kind: 'invalid' };

const SHORT_HOSTS = /^(amzn\.(eu|to|com|asia)|a\.co)$/;
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?=[/?#]|$)/i;

export function parseAmazonInput(raw: string): AmazonInput {
  const s = raw.trim();
  if (/^[A-Z0-9]{10}$/i.test(s)) return { kind: 'asin', asin: s.toUpperCase(), marketplace: null };
  if (!/[./]/.test(s)) return { kind: 'invalid' };

  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return { kind: 'invalid' }; }
  const host = url.hostname.toLowerCase().replace(/^(www|smile|m)\./, '');
  if (SHORT_HOSTS.test(host)) return { kind: 'short' };
  if (!/^amazon\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return { kind: 'invalid' };

  const match = url.pathname.match(PRODUCT_PATH);
  return match ? { kind: 'asin', asin: match[1].toUpperCase(), marketplace: host } : { kind: 'invalid' };
}

/** True when the text looks like the start of a link rather than an ASIN being typed. */
export const looksLikeLink = (s: string) => /[./:]/.test(s.trim());

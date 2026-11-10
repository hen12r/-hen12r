// POST /scan/run  — runs the caller's requested scans (user token).
// POST /scan/cron — runs everyone's queued scans; called hourly by pg_cron with the Vault secret in x-cron-secret.
// Secret: GOOGLE_VISION_API_KEY (Supabase → Edge Functions → Secrets). Without it, scans stay "requested".
import { findCopies } from './findcopies.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const SITE_URL = env('SITE_URL') || 'https://photosentry.vercel.app';
const ALLOWED_ORIGINS = new Set([SITE_URL, 'http://localhost:5173', 'http://localhost:4174']);
const MAX_PER_CALL = 5;
const MAX_PER_CRON = 25;

const cors = (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
};
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });

/** Service-role call to the database REST API (server only). */
async function db(path: string, init: RequestInit = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function currentUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth } });
  return res.ok ? await res.json() : null;
}

async function webDetect(imageUrl: string) {
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GOOGLE_VISION_API_KEY') },
    body: JSON.stringify({ requests: [{ image: { source: { imageUri: imageUrl } }, features: [{ type: 'WEB_DETECTION', maxResults: 50 }] }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Vision ${res.status}: ${data?.error?.message ?? res.statusText}`);
  const r = data.responses?.[0] ?? {};
  if (r.error) throw new Error(`Vision: ${r.error.message}`);
  return r.webDetection ?? {};
}

type Job = { id: string; user_id: string; product: { asin: string; image_url: string | null } };

async function runOne(job: Job) {
  // Claim the scan atomically so two calls never process it twice.
  const claimed = await db(`scans?id=eq.${job.id}&status=eq.requested`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'scanning' }),
  });
  if (!claimed?.length) return 'skipped';
  try {
    const { findings, similarCount } = findCopies(await webDetect(job.product.image_url!), { asins: [job.product.asin] });
    await db(`scan_findings?scan_id=eq.${job.id}`, { method: 'DELETE' });
    if (findings.length) {
      await db('scan_findings', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(findings.map((f: Record<string, unknown>) => ({
          scan_id: job.id, user_id: job.user_id, match: f.match, platform: f.platform,
          page_url: f.pageUrl, title: f.title || null, image_url: f.imageUrl, asin: f.asin,
        }))),
      });
    }
    await db(`scans?id=eq.${job.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString(), similar_count: similarCount, error: null }),
    });
    return 'done';
  } catch (e) {
    console.error('scan failed', job.id, e);
    await db(`scans?id=eq.${job.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'failed', completed_at: new Date().toISOString(), error: String(e).slice(0, 500) }),
    });
    return 'failed';
  }
}

/** True only if the header matches the secret stored in Vault (checked in the database, never exposed). */
async function cronAuthorized(req: Request): Promise<boolean> {
  const candidate = req.headers.get('x-cron-secret');
  if (!candidate || candidate.length < 32) return false;
  return (await db('rpc/check_cron_secret', { method: 'POST', body: JSON.stringify({ candidate }) })) === true;
}

async function processJobs(filter: string, limit: number) {
  const jobs: Job[] = await db(
    `scans?${filter}status=eq.requested&select=id,user_id,product:products(asin,image_url)&order=requested_at.asc&limit=${limit}`,
  );
  const result = { status: 'ok', done: 0, failed: 0, waitingForImage: 0 };
  for (const job of jobs) {
    if (!job.product?.image_url) { result.waitingForImage++; continue; }
    const r = await runOne(job);
    if (r === 'done') result.done++;
    if (r === 'failed') result.failed++;
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });
  const route = new URL(req.url).pathname.split('/').pop();
  try {
    if (route === 'cron') {
      if (!(await cronAuthorized(req))) return json(req, 401, { error: 'unauthorized' });
      if (!env('GOOGLE_VISION_API_KEY')) return json(req, 200, { status: 'not_configured' });
      return json(req, 200, await processJobs('', MAX_PER_CRON));
    }
    if (route !== 'run') return json(req, 404, { error: 'not_found' });
    const user = await currentUser(req);
    if (!user) return json(req, 401, { error: 'not_signed_in' });
    if (!env('GOOGLE_VISION_API_KEY')) return json(req, 200, { status: 'not_configured' });
    return json(req, 200, await processJobs(`user_id=eq.${encodeURIComponent(user.id)}&`, MAX_PER_CALL));
  } catch (e) {
    console.error('scan worker', route, e);
    return json(req, 500, { error: 'server_error' });
  }
});

// Deno-only helpers for Edge Functions.
import { isOriginAllowed, parseAllowedOrigins } from './cors.ts';

const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  // Disallowed origins get the first configured origin, so the browser blocks the response.
  const allow = isOriginAllowed(origin, ALLOWED_ORIGINS) ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

/** Error codes are stable strings the client translates; `message` is for logs/debugging. */
export function fail(req: Request, status: number, code: string, message: string): Response {
  return json(req, status, { error: { code, message } });
}

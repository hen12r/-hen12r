import type { SupabaseClient } from '@supabase/supabase-js';
import type { Marketplace } from './supabase';

export type ScanStatus = 'requested' | 'scanning' | 'done' | 'failed';

export interface ScanSummary {
  id: string;
  status: ScanStatus;
  requested_at: string;
  completed_at: string | null;
  findings: number;
}

export interface Product {
  id: string;
  asin: string;
  marketplace: Marketplace;
  label: string | null;
  image_url: string | null;
  created_at: string;
  latestScan: ScanSummary | null;
  hasOpenScan: boolean;
}

export interface Finding {
  id: string;
  match: 'full' | 'partial';
  platform: string;
  page_url: string | null;
  title: string | null;
  image_url: string | null;
  asin: string | null;
}

export interface ScanReport {
  id: string;
  status: ScanStatus;
  requested_at: string;
  completed_at: string | null;
  similar_count: number | null;
  product: { asin: string; marketplace: Marketplace; label: string | null; image_url: string | null };
  findings: Finding[];
}

interface ProductRow {
  id: string; asin: string; marketplace: Marketplace; label: string | null; image_url: string | null; created_at: string;
  scans: { id: string; status: ScanStatus; requested_at: string; completed_at: string | null; scan_findings: { count: number }[] }[];
}

export async function listProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, asin, marketplace, label, image_url, created_at, scans(id, status, requested_at, completed_at, scan_findings(count))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(p => {
    const scans = [...p.scans].sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    const latest = scans[0];
    return {
      id: p.id, asin: p.asin, marketplace: p.marketplace, label: p.label, image_url: p.image_url, created_at: p.created_at,
      latestScan: latest ? {
        id: latest.id, status: latest.status, requested_at: latest.requested_at, completed_at: latest.completed_at,
        findings: latest.scan_findings[0]?.count ?? 0,
      } : null,
      hasOpenScan: scans.some(s => s.status === 'requested' || s.status === 'scanning'),
    };
  });
}

export async function addProduct(supabase: SupabaseClient, p: { asin: string; marketplace: Marketplace; label: string | null; image_url: string | null }) {
  const { error } = await supabase.from('products').insert(p);
  if (error) throw error;
}

export async function deleteProduct(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function requestScan(supabase: SupabaseClient, productId: string) {
  const { error } = await supabase.from('scans').insert({ product_id: productId });
  if (error) throw error;
}

export async function getReport(supabase: SupabaseClient, scanId: string): Promise<ScanReport | null> {
  const { data, error } = await supabase
    .from('scans')
    .select('id, status, requested_at, completed_at, similar_count, product:products(asin, marketplace, label, image_url), findings:scan_findings(id, match, platform, page_url, title, image_url, asin)')
    .eq('id', scanId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const report = data as unknown as ScanReport;
  const rank = (f: Finding) => (f.match === 'full' ? 0 : 1);
  report.findings = [...report.findings].sort((a, b) => rank(a) - rank(b) || a.platform.localeCompare(b.platform));
  return report;
}

/** Postgres error codes surfaced to the UI. */
export const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === '23505';

export interface Subscription {
  plan: 'starter' | 'pro';
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** The caller's subscription row, or null on the free trial. */
export async function getSubscription(supabase: SupabaseClient): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .maybeSingle();
  if (error) throw error;
  return data as Subscription | null;
}

/** How many products the caller's plan allows (1 on the trial). */
export async function getProductLimit(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('my_product_limit');
  if (error) throw error;
  return typeof data === 'number' ? data : 1;
}

export const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** True when the database refused an insert because the plan's product limit is reached. */
export const isPlanLimit = (e: unknown) => (e as { message?: string } | null)?.message?.includes('plan_limit_reached') ?? false;

export async function setProductImage(supabase: SupabaseClient, id: string, imageUrl: string) {
  const { error } = await supabase.from('products').update({ image_url: imageUrl }).eq('id', id);
  if (error) throw error;
}

/** Days between two scans of the same product on the caller's plan. */
export async function getScanInterval(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('my_scan_interval_days');
  if (error) throw error;
  return typeof data === 'number' ? data : 30;
}

/** When a scan was refused because the plan's frequency was reached: the date it becomes possible again. */
export function scanTooSoonUntil(e: unknown): Date | null {
  const err = e as { message?: string; details?: string } | null;
  if (!err?.message?.includes('scan_too_soon')) return null;
  const d = err.details ? new Date(err.details) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date(Date.now() + 86400000);
}

/** Starts the caller's requested scans on the server. Resolves quietly when scanning isn't configured yet. */
export async function runScans(supabase: SupabaseClient): Promise<{ status: string; done?: number; failed?: number; waitingForImage?: number }> {
  const { data, error } = await supabase.functions.invoke('scan/run', { body: {} });
  if (error) throw error;
  return data ?? { status: 'unknown' };
}

/** Only direct https image links are accepted (Google fetches them; our servers never download from Amazon). */
export const isImageUrl = (u: string) => /^https:\/\/\S+$/i.test(u) && u.length <= 1000;

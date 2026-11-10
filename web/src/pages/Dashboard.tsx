import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { AppShell, Card, Spinner } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { Icon, type IconName } from '../components/Icon';
import { MARKETPLACES, type Marketplace } from '../lib/supabase';
import { useTitle } from '../lib/useTitle';
import { addProduct, deleteProduct, getProductLimit, getScanInterval, getSubscription, isDuplicate, isImageUrl, isPlanLimit, listProducts, LIVE_STATUSES, requestScan, runScans, scanTooSoonUntil, setProductImage, type Product, type Subscription } from '../lib/db';
import { BillingError, openPortal } from '../lib/billing';

const ASIN_RE = /^[A-Z0-9]{10}$/;
const inputClass = 'mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 aria-[invalid=true]:border-red-500';

export default function Dashboard() {
  return <AppShell>{ctx => <Products supabase={ctx.supabase} />}</AppShell>;
}

function Stat({ icon, label, value, hint, tone }: { icon: IconName; label: string; value: number | string; hint?: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="truncate text-xs text-neutral-400">{hint}</p>}
      </div>
    </Card>
  );
}

function Products({ supabase }: { supabase: SupabaseClient }) {
  const { t, lang } = useLang();
  useTitle(t.app.title);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [asin, setAsin] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace>(lang === 'fr' ? 'amazon.fr' : 'amazon.com');
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageDrafts, setImageDrafts] = useState<Record<string, string>>({});
  const [scanInterval, setScanInterval] = useState(30);
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [limit, setLimit] = useState(1);
  const [limitHit, setLimitHit] = useState(false);
  const [params, setParams] = useSearchParams();
  const [justPaid] = useState(params.get('checkout') === 'success');

  const refresh = useCallback(async () => {
    try {
      const [list, subscription, max, interval] = await Promise.all([listProducts(supabase), getSubscription(supabase), getProductLimit(supabase), getScanInterval(supabase)]);
      setProducts(list);
      setSub(subscription);
      setLimit(max);
      setScanInterval(interval);
      setLoadError(false);
    } catch (e) {
      console.error('Load products failed', e);
      setLoadError(true);
    }
  }, [supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

  // After Stripe Checkout the webhook may land a few seconds later: drop the query flag and poll briefly.
  useEffect(() => {
    if (!justPaid) return;
    setParams({}, { replace: true });
    let tries = 0;
    const id = window.setInterval(() => { tries += 1; void refresh(); if (tries >= 5) window.clearInterval(id); }, 3000);
    return () => window.clearInterval(id);
  }, [justPaid, refresh, setParams]);

  const requestAndRun = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await requestScan(supabase, id);
      await refresh();
      // Runs immediately when scanning is configured; otherwise the scan stays "requested".
      await runScans(supabase).catch(e => console.warn('Scan run deferred', e));
      await refresh();
    } catch (e) {
      const until = scanTooSoonUntil(e);
      console.error('Scan request failed', e);
      setActionError(until ? t.scanUi.tooSoon(dateFmt.format(until)) : t.app.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const saveImage = (id: string) => {
    const url = (imageDrafts[id] ?? '').trim();
    if (!isImageUrl(url)) { setActionError(t.scanUi.imageError); return; }
    void run(id, () => setProductImage(supabase, id, url)).then(() => setImageDrafts(d => { const { [id]: _, ...rest } = d; return rest; }));
  };

  const manage = async () => {
    setActionError(null);
    try { await openPortal(supabase); }
    catch (e) { console.error('Portal failed', e); setActionError(e instanceof BillingError && e.code === 'billing_not_configured' ? t.pricing.notConfigured : t.pricing.error); }
  };

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      console.error('Action failed', e);
      setActionError(t.app.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanAsin = asin.trim().toUpperCase();
    if (!ASIN_RE.test(cleanAsin)) { setFormError(t.form.errorAsin); return; }
    const cleanImage = imageUrl.trim();
    if (cleanImage && !isImageUrl(cleanImage)) { setFormError(t.scanUi.imageError); return; }
    setFormError(null);
    setLimitHit(false);
    setAdding(true);
    try {
      await addProduct(supabase, { asin: cleanAsin, marketplace, label: label.trim() || null, image_url: cleanImage || null });
      setAsin('');
      setLabel('');
      setImageUrl('');
      await refresh();
    } catch (err) {
      console.error('Add product failed', err);
      if (isPlanLimit(err)) setLimitHit(true);
      else setFormError(isDuplicate(err) ? t.app.duplicate : t.app.actionError);
    } finally {
      setAdding(false);
    }
  };

  const dateFmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium' });
  const pending = products?.filter(p => p.hasOpenScan).length ?? 0;
  const copies = products?.reduce((sum, p) => sum + (p.latestScan?.status === 'done' ? p.latestScan.findings : 0), 0) ?? 0;
  const paying = !!sub && LIVE_STATUSES.has(sub.status);
  const atLimit = (products?.length ?? 0) >= limit;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t.app.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.app.betaNote}</p>
      </div>

      {justPaid && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-ink p-4 text-sm text-white">
          <Icon name="check" className="h-4 w-4 shrink-0 text-signal" />{t.plan.success}
        </p>
      )}

      {products && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-neutral-500">{t.plan.title}</p>
            <p className="mt-0.5 text-lg font-semibold">
              {paying ? t.pricing.plans[sub!.plan].name : t.plan.free}
              <span className="ml-2 text-sm font-normal text-neutral-500">{t.plan.usage(products.length, limit)}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-500">{t.scanUi.interval(scanInterval)}</p>
            {paying && sub!.status === 'past_due' && <p className="mt-1 text-sm text-signal">{t.plan.pastDue}</p>}
            {paying && sub!.current_period_end && sub!.status !== 'past_due' && (
              <p className="mt-1 text-sm text-neutral-500">
                {sub!.cancel_at_period_end ? t.plan.endsOn : t.plan.renews} {dateFmt.format(new Date(sub!.current_period_end))}
              </p>
            )}
            <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-neutral-100">
              <div className="h-1.5 rounded-full bg-ink" style={{ width: `${Math.min(100, (products.length / limit) * 100)}%` }} />
            </div>
          </div>
          {paying ? (
            <button type="button" onClick={manage} className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:border-ink">{t.plan.manage}</button>
          ) : (
            <Link to="/pricing" className="rounded-full bg-ink px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-800">{t.plan.upgrade}</Link>
          )}
        </Card>
      )}

      {products && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon="box" label={t.ui.statProducts} value={products.length} tone="bg-neutral-100 text-neutral-700" />
          <Stat icon="clock" label={t.ui.statPending} value={pending} tone="bg-neutral-100 text-ink" />
          <Stat icon={copies ? "alert" : "check"} label={t.ui.statCopies} value={copies} hint={t.ui.statCopiesHint} tone={copies ? 'bg-signal/10 text-signal' : 'bg-neutral-100 text-ink'} />
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} noValidate>
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="plus" className="h-4 w-4" />{t.app.addTitle}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
            <div>
              <label htmlFor="p-asin" className="text-sm font-semibold">{t.app.asin}</label>
              <input id="p-asin" type="text" autoCapitalize="characters" spellCheck={false} maxLength={10} placeholder="B09NNLSTGQ"
                value={asin} onChange={e => setAsin(e.target.value.toUpperCase())}
                aria-invalid={!!formError} aria-describedby={formError ? 'p-error' : undefined}
                className={`${inputClass} font-mono tracking-wider`} />
            </div>
            <div>
              <label htmlFor="p-market" className="text-sm font-semibold">{t.app.marketplace}</label>
              <select id="p-market" value={marketplace} onChange={e => setMarketplace(e.target.value as Marketplace)} className={inputClass}>
                {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="p-label" className="text-sm font-semibold">{t.app.label}</label>
              <input id="p-label" type="text" maxLength={120} placeholder={t.app.labelPlaceholder}
                value={label} onChange={e => setLabel(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={adding || atLimit}
              className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
              {adding ? t.app.adding : t.app.add}
            </button>
          </div>
          <div className="mt-4">
            <label htmlFor="p-image" className="text-sm font-semibold">{t.scanUi.imageLabel}</label>
            <input id="p-image" type="url" inputMode="url" spellCheck={false} placeholder="https://m.media-amazon.com/images/I/…jpg"
              value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={inputClass} />
            <p className="mt-1.5 text-xs text-neutral-500">{t.scanUi.imageHelp}</p>
          </div>
          {formError && <p id="p-error" role="alert" className="mt-3 text-sm text-red-600">{formError}</p>}
          {(limitHit || atLimit) && (
            <p role={limitHit ? 'alert' : undefined} className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-neutral-600">
              {t.plan.limitReached}
              <Link to={paying ? '#' : '/pricing'} onClick={paying ? (e => { e.preventDefault(); void manage(); }) : undefined} className="font-medium text-ink underline underline-offset-4">{t.plan.limitCta}</Link>
            </p>
          )}
        </form>
      </Card>

      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      {loadError && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
      {!loadError && products === null && <Spinner label={t.app.loading} />}

      {products?.length === 0 && (
        <Card className="p-8 text-center sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-ink"><Icon name="search" className="h-7 w-7" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">{t.ui.emptyTitle}</h2>
          <p className="mt-1 text-neutral-500">{t.app.empty}</p>
          <ol className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            {t.ui.emptySteps.map((step, i) => (
              <li key={step} className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {products && products.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">{t.ui.listTitle}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-neutral-100">
              {products.map(p => (
                <li key={p.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"><Icon name="box" className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.label || p.asin}</p>
                      <p className="text-sm text-neutral-500"><span className="font-mono">{p.asin}</span> · {p.marketplace}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                        {p.latestScan ? (
                          <>
                            <StatusBadge status={p.latestScan.status} t={t} />
                            <span className="text-neutral-500">{t.ui.lastScan} · {dateFmt.format(new Date(p.latestScan.completed_at ?? p.latestScan.requested_at))}</span>
                            {p.latestScan.status === 'done' && (
                              <span className={`font-semibold ${p.latestScan.findings ? 'text-signal' : 'text-neutral-500'}`}>· {t.app.copies(p.latestScan.findings)}</span>
                            )}
                          </>
                        ) : <span className="text-neutral-400">{t.app.neverScanned}</span>}
                      </div>
                      {!p.image_url && (
                        <form onSubmit={e => { e.preventDefault(); saveImage(p.id); }} className="mt-3 flex max-w-md gap-2">
                          <input type="url" aria-label={t.scanUi.imageLabel} placeholder={t.scanUi.addImage}
                            value={imageDrafts[p.id] ?? ''} onChange={e => setImageDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-ink" />
                          <button type="submit" disabled={busyId === p.id || !(imageDrafts[p.id] ?? '').trim()}
                            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:border-ink disabled:opacity-50">{t.scanUi.save}</button>
                        </form>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:shrink-0">
                    {p.latestScan?.status === 'done' && (
                      <Link to={`/app/scans/${p.latestScan.id}`} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-semibold hover:bg-neutral-50">
                        {t.app.viewReport}
                      </Link>
                    )}
                    <button type="button" disabled={p.hasOpenScan || busyId === p.id}
                      onClick={() => requestAndRun(p.id)}
                      className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
                      {busyId === p.id ? t.scanUi.running : p.hasOpenScan ? t.app.scanPending : t.app.requestScan}
                    </button>
                    <button type="button" disabled={busyId === p.id} aria-label={`${t.app.delete} ${p.label || p.asin}`}
                      onClick={() => { if (window.confirm(t.app.confirmDelete)) void run(p.id, () => deleteProduct(supabase, p.id)); }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-ink disabled:opacity-50">
                      <Icon name="trash" className="h-4 w-4" /><span>{t.app.delete}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

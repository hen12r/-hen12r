import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { AppShell, Card, Spinner } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { Icon, type IconName } from '../components/Icon';
import { MARKETPLACES, type Marketplace } from '../lib/supabase';
import { useTitle } from '../lib/useTitle';
import { addProduct, deleteProduct, isDuplicate, listProducts, requestScan, type Product } from '../lib/db';

const ASIN_RE = /^[A-Z0-9]{10}$/;
const inputClass = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink shadow-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 aria-[invalid=true]:border-red-500';

export default function Dashboard() {
  return <AppShell>{ctx => <Products supabase={ctx.supabase} />}</AppShell>;
}

function Stat({ icon, label, value, hint, tone }: { icon: IconName; label: string; value: number | string; hint?: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
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
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProducts(await listProducts(supabase));
      setLoadError(false);
    } catch (e) {
      console.error('Load products failed', e);
      setLoadError(true);
    }
  }, [supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

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
    setFormError(null);
    setAdding(true);
    try {
      await addProduct(supabase, { asin: cleanAsin, marketplace, label: label.trim() || null });
      setAsin('');
      setLabel('');
      await refresh();
    } catch (err) {
      console.error('Add product failed', err);
      setFormError(isDuplicate(err) ? t.app.duplicate : t.app.actionError);
    } finally {
      setAdding(false);
    }
  };

  const dateFmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium' });
  const pending = products?.filter(p => p.hasOpenScan).length ?? 0;
  const copies = products?.reduce((sum, p) => sum + (p.latestScan?.status === 'done' ? p.latestScan.findings : 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.app.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.app.betaNote}</p>
      </div>

      {products && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon="box" label={t.ui.statProducts} value={products.length} tone="bg-slate-100 text-slate-700" />
          <Stat icon="clock" label={t.ui.statPending} value={pending} tone="bg-blue-50 text-blue-700" />
          <Stat icon={copies ? "alert" : "check"} label={t.ui.statCopies} value={copies} hint={t.ui.statCopiesHint} tone={copies ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'} />
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
            <button type="submit" disabled={adding}
              className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {adding ? t.app.adding : t.app.add}
            </button>
          </div>
          {formError && <p id="p-error" role="alert" className="mt-3 text-sm text-red-600">{formError}</p>}
        </form>
      </Card>

      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      {loadError && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
      {!loadError && products === null && <Spinner label={t.app.loading} />}

      {products?.length === 0 && (
        <Card className="p-8 text-center sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Icon name="search" className="h-7 w-7" /></span>
          <h2 className="mt-5 text-xl font-bold tracking-tight">{t.ui.emptyTitle}</h2>
          <p className="mt-1 text-slate-500">{t.app.empty}</p>
          <ol className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            {t.ui.emptySteps.map((step, i) => (
              <li key={step} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {products && products.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{t.ui.listTitle}</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {products.map(p => (
                <li key={p.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon name="box" className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.label || p.asin}</p>
                      <p className="text-sm text-slate-500"><span className="font-mono">{p.asin}</span> · {p.marketplace}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        {p.latestScan ? (
                          <>
                            <StatusBadge status={p.latestScan.status} t={t} />
                            <span className="text-slate-500">{t.ui.lastScan} · {dateFmt.format(new Date(p.latestScan.completed_at ?? p.latestScan.requested_at))}</span>
                            {p.latestScan.status === 'done' && (
                              <span className={`font-semibold ${p.latestScan.findings ? 'text-red-700' : 'text-emerald-700'}`}>· {t.app.copies(p.latestScan.findings)}</span>
                            )}
                          </>
                        ) : <span className="text-slate-400">{t.app.neverScanned}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:shrink-0">
                    {p.latestScan?.status === 'done' && (
                      <Link to={`/app/scans/${p.latestScan.id}`} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50">
                        {t.app.viewReport}
                      </Link>
                    )}
                    <button type="button" disabled={p.hasOpenScan || busyId === p.id}
                      onClick={() => run(p.id, () => requestScan(supabase, p.id))}
                      className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                      {p.hasOpenScan ? t.app.scanPending : t.app.requestScan}
                    </button>
                    <button type="button" disabled={busyId === p.id} aria-label={`${t.app.delete} ${p.label || p.asin}`}
                      onClick={() => { if (window.confirm(t.app.confirmDelete)) void run(p.id, () => deleteProduct(supabase, p.id)); }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
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

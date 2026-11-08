import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { AppShell, Spinner } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { MARKETPLACES, type Marketplace } from '../lib/supabase';
import { useTitle } from '../lib/useTitle';
import { addProduct, deleteProduct, isDuplicate, listProducts, requestScan, type Product } from '../lib/db';

const ASIN_RE = /^[A-Z0-9]{10}$/;
const inputClass = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink shadow-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 aria-[invalid=true]:border-red-500';

export default function Dashboard() {
  return <AppShell>{ctx => <Products {...ctx} />}</AppShell>;
}

function Products({ supabase, session }: { supabase: SupabaseClient; session: Session }) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.app.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.app.signedInAs} <span className="font-medium text-ink">{session.user.email}</span></p>
      </div>

      <form onSubmit={submit} noValidate className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h2 className="font-semibold">{t.app.addTitle}</h2>
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

      <p className="text-sm text-slate-500">{t.app.betaNote}</p>
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

      {loadError && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
      {!loadError && products === null && <Spinner label={t.app.loading} />}
      {products?.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">{t.app.empty}</p>
      )}

      {products && products.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {products.map(p => (
            <li key={p.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.label || p.asin}</p>
                <p className="text-sm text-slate-500"><span className="font-mono">{p.asin}</span> · {p.marketplace}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  {p.latestScan ? (
                    <>
                      <StatusBadge status={p.latestScan.status} t={t} />
                      <span>{dateFmt.format(new Date(p.latestScan.completed_at ?? p.latestScan.requested_at))}</span>
                      {p.latestScan.status === 'done' && <span>· {t.app.copies(p.latestScan.findings)}</span>}
                    </>
                  ) : <span className="text-slate-400">{t.app.neverScanned}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
                <button type="button" disabled={busyId === p.id}
                  onClick={() => { if (window.confirm(t.app.confirmDelete)) void run(p.id, () => deleteProduct(supabase, p.id)); }}
                  className="rounded-lg px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  {t.app.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

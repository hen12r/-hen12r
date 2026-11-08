import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { AppShell, Spinner } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { getReport, type ScanReport } from '../lib/db';
import { useTitle } from '../lib/useTitle';

export default function Report() {
  return <AppShell>{ctx => <ReportView supabase={ctx.supabase} />}</AppShell>;
}

/** Only http(s) links are rendered as links; anything else from the database is shown as text. */
const safeHref = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);
const hostOf = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

function ReportView({ supabase }: { supabase: SupabaseClient }) {
  const { t, lang } = useLang();
  useTitle(t.report.title);
  const { id } = useParams();
  const [report, setReport] = useState<ScanReport | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReport(supabase, id).then(setReport).catch(e => { console.error('Load report failed', e); setError(true); });
  }, [supabase, id]);

  const dateFmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <Link to="/app" className="text-sm font-medium text-slate-600 hover:text-ink">{t.report.back}</Link>
      {error && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
      {!error && report === undefined && <Spinner label={t.app.loading} />}
      {report === null && <p>{t.report.notFound}</p>}
      {report && renderBody(report)}
    </div>
  );

  function renderBody(report: ScanReport) {
    const platforms = new Set(report.findings.map(f => f.platform)).size;
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.report.title}</h1>
            <p className="mt-1 text-slate-600">
              {report.product.label ? `${report.product.label} · ` : ''}<span className="font-mono">{report.product.asin}</span> · {report.product.marketplace}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t.report.requested} {dateFmt.format(new Date(report.requested_at))}
              {report.completed_at && <> · {t.report.completed} {dateFmt.format(new Date(report.completed_at))}</>}
            </p>
          </div>
          <StatusBadge status={report.status} t={t} />
        </div>

        {(report.status === 'requested' || report.status === 'scanning') && <p className="rounded-lg bg-blue-50 p-4 text-blue-900">{t.report.pending}</p>}
        {report.status === 'failed' && <p className="rounded-lg bg-red-50 p-4 text-red-800">{t.report.failed}</p>}

        {report.status === 'done' && (
          <>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-lg font-semibold">{t.report.summary(report.findings.length, platforms)}</p>
              {report.findings.length === 0 && <p className="mt-2 text-slate-600">{t.report.noneBody}</p>}
            </div>

            {report.findings.length > 0 && (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                {report.findings.map(f => {
                  const page = safeHref(f.page_url);
                  const image = safeHref(f.image_url);
                  return (
                    <li key={f.id} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                      <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold sm:w-40 ${f.match === 'full' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {f.match === 'full' ? t.report.exact : t.report.edited}
                      </span>
                      <span className="w-28 shrink-0 text-sm font-semibold">{f.platform}</span>
                      <span className="min-w-0 flex-1">
                        {page ? (
                          <a href={page} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm font-medium text-blue-700 hover:underline">
                            {f.title || hostOf(page)}
                          </a>
                        ) : <span className="block text-sm italic text-slate-500">{t.report.imageOnly}</span>}
                        <span className="block truncate text-xs text-slate-500">
                          {page ? hostOf(page) : ''}{f.asin ? ` · ASIN ${f.asin}` : ''}
                          {image && <> · <a href={image} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{t.report.image}</a></>}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {report.similar_count ? <p className="text-sm text-slate-500">{t.report.similar(report.similar_count)}</p> : null}

            {report.findings.some(f => f.match === 'full') && (
              <div className="rounded-xl border-l-4 border-signal bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="font-semibold">{t.report.nextTitle}</h2>
                <p className="mt-1 text-slate-600">{t.report.next}</p>
              </div>
            )}
          </>
        )}
      </>
    );
  }
}

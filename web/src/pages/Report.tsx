import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { AppShell, Card, Spinner } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { Icon } from '../components/Icon';
import { getReport, type ScanReport } from '../lib/db';
import { useTitle } from '../lib/useTitle';
import { buildTakedown, downloadText, findingsCsv } from '../lib/takedown';

type Finding = ScanReport['findings'][number];

export default function Report() {
  return <AppShell>{ctx => <ReportView supabase={ctx.supabase} />}</AppShell>;
}

/** Only http(s) links are rendered as links; anything else from the database is shown as text. */
const safeHref = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);
const hostOf = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

type Filter = 'all' | 'full' | 'partial';

function ReportView({ supabase }: { supabase: SupabaseClient }) {
  const { t } = useLang();
  useTitle(t.report.title);
  const { id } = useParams();
  const [report, setReport] = useState<ScanReport | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReport(supabase, id).then(setReport).catch(e => { console.error('Load report failed', e); setError(true); });
  }, [supabase, id]);

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-ink">{t.report.back}</Link>
      {error && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
      {!error && report === undefined && <Spinner label={t.app.loading} />}
      {report === null && <Card className="p-8 text-center text-neutral-600">{t.report.notFound}</Card>}
      {report && <ReportBody report={report} />}
    </div>
  );
}

function ReportBody({ report }: { report: ScanReport }) {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>('all');
  const [takedownFor, setTakedownFor] = useState<Finding | null>(null);
  const foundAt = new Date(report.completed_at ?? report.requested_at);
  const dateFmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const exact = report.findings.filter(f => f.match === 'full').length;
  const byPlatform = Object.entries(
    report.findings.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.platform]: (acc[f.platform] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const max = byPlatform[0]?.[1] ?? 1;
  const shown = report.findings.filter(f => filter === 'all' || f.match === filter);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t.ui.filterAll, count: report.findings.length },
    { key: 'full', label: t.ui.filterExact, count: exact },
    { key: 'partial', label: t.ui.filterEdited, count: report.findings.length - exact },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{t.report.title}</h1>
          <p className="mt-1 text-neutral-600">
            {report.product.label ? `${report.product.label} · ` : ''}<span className="font-mono">{report.product.asin}</span> · {report.product.marketplace}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {t.report.requested} {dateFmt.format(new Date(report.requested_at))}
            {report.completed_at && <> · {t.report.completed} {dateFmt.format(new Date(report.completed_at))}</>}
          </p>
        </div>
        <StatusBadge status={report.status} t={t} />
      </div>

      {(report.status === 'requested' || report.status === 'scanning') && (
        <Card className="flex items-start gap-3 p-5 text-neutral-700"><Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0" />{t.report.pending}</Card>
      )}
      {report.status === 'failed' && (
        <Card className="flex items-start gap-3 p-5 text-red-800"><Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />{t.report.failed}</Card>
      )}

      {report.status === 'done' && report.findings.length === 0 && (
        <Card className="p-8 text-center sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-ink"><Icon name="check" className="h-7 w-7" /></span>
          <p className="mt-5 text-xl font-semibold tracking-tight">{t.report.summary(0, 0)}</p>
          <p className="mx-auto mt-2 max-w-lg text-neutral-600">{t.report.noneBody}</p>
        </Card>
      )}

      {report.status === 'done' && report.findings.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: t.ui.reportCopies, value: report.findings.length, tone: 'text-ink' },
              { label: t.ui.reportExact, value: exact, tone: exact ? 'text-signal' : 'text-ink' },
              { label: t.ui.reportPlatforms, value: byPlatform.length, tone: 'text-ink' },
            ].map(s => (
              <Card key={s.label} className="p-4 sm:p-5">
                <p className="text-xs text-neutral-500 sm:text-sm">{s.label}</p>
                <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${s.tone}`}>{s.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr] [&>*]:min-w-0">
            <Card className="h-fit p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">{t.ui.byPlatform}</h2>
              <ul className="mt-4 space-y-3">
                {byPlatform.map(([platform, count]) => (
                  <li key={platform}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{platform}</span><span className="text-neutral-500">{count}</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100">
                      <div className="h-1.5 rounded-full bg-ink" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">{t.ui.findings}</h2>
                <button type="button" onClick={() => downloadText(`photosentry-${report.product.asin}-evidence.csv`, findingsCsv(report.findings, foundAt), 'text/csv;charset=utf-8')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:border-ink">
                  {t.takedown.csv}
                </button>
                <div role="tablist" className="flex rounded-lg bg-neutral-100 p-1">
                  {filters.map(f => (
                    <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold ${filter === f.key ? 'bg-white text-ink' : 'text-neutral-600 hover:text-ink'}`}>
                      {f.label} <span className="text-neutral-400">{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-neutral-100">
                  {shown.map(f => {
                    const page = safeHref(f.page_url);
                    const image = safeHref(f.image_url);
                    return (
                      <li key={f.id} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                        <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold sm:w-40 ${f.match === 'full' ? 'bg-ink text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                          {f.match === 'full' ? t.report.exact : t.report.edited}
                        </span>
                        <span className="w-24 shrink-0 text-sm font-semibold">{f.platform}</span>
                        <span className="min-w-0 flex-1">
                          {page ? (
                            <a href={page} target="_blank" rel="noopener noreferrer nofollow" className="group flex items-center gap-1 text-sm font-medium text-ink underline decoration-neutral-300 underline-offset-4 hover:decoration-ink">
                              <span className="truncate">{f.title || hostOf(page)}</span>
                              <Icon name="external" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            </a>
                          ) : <span className="block text-sm italic text-neutral-500">{t.report.imageOnly}</span>}
                          <span className="block truncate text-xs text-neutral-500">
                            {page ? hostOf(page) : ''}{f.asin ? ` · ASIN ${f.asin}` : ''}
                            {image && <> · <a href={image} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{t.report.image}</a></>}
                          </span>
                        </span>
                        {page && (
                          <button type="button" onClick={() => setTakedownFor(f)}
                            className="w-fit shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:border-ink">
                            {t.takedown.open}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
              {report.similar_count ? <p className="text-sm text-neutral-500">{t.report.similar(report.similar_count)}</p> : null}
            </div>
          </div>

          {exact > 0 && (
            <Card className="flex gap-4 border-l-4 border-l-signal p-5">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
              <div>
                <h2 className="font-semibold">{t.report.nextTitle}</h2>
                <p className="mt-1 text-neutral-600">{t.report.next}</p>
              </div>
            </Card>
          )}
        </>
      )}
      {takedownFor && <TakedownPanel report={report} finding={takedownFor} foundAt={foundAt} onClose={() => setTakedownFor(null)} />}
    </>
  );
}

function TakedownPanel({ report, finding, foundAt, onClose }: { report: ScanReport; finding: Finding; foundAt: Date; onClose: () => void }) {
  const { t, lang } = useLang();
  const td = t.takedown;
  const [sellerName, setSellerName] = useState('');
  const [copied, setCopied] = useState(false);
  const { subject, body, formUrl } = buildTakedown({ lang, platform: finding.platform, finding, product: report.product, sellerName, foundAt });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error('Copy failed', e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="takedown-title" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
          <div className="min-w-0">
            <h2 id="takedown-title" className="text-lg font-semibold">{td.title} · {finding.platform}</h2>
            <p className="mt-1 text-sm text-neutral-600">{td.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={td.close} className="shrink-0 rounded-full px-2 text-2xl leading-none text-neutral-500 hover:text-ink">×</button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <label className="block text-sm font-medium">
            {td.name}
            <input value={sellerName} onChange={e => setSellerName(e.target.value)} maxLength={120}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal focus:border-ink focus:outline-none" />
          </label>
          <div>
            <p className="text-sm font-medium">{td.subject}</p>
            <p className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm">{subject}</p>
          </div>
          <textarea readOnly value={body} rows={14} aria-label={td.title}
            className="w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed" />
          {formUrl
            ? <a href={formUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">{td.amazonForm}<Icon name="external" className="h-3.5 w-3.5" /></a>
            : <p className="text-sm text-neutral-600">{td.otherForm(finding.platform)}</p>}
          <p className="text-xs text-neutral-500">{td.disclaimer}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 p-4">
          <button type="button" onClick={() => downloadText(`takedown-${report.product.asin}-${finding.platform.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`, `${subject}\n\n${body}\n`)}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-ink">{td.download}</button>
          <button type="button" onClick={copy} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">{copied ? td.copied : td.copy}</button>
        </div>
      </div>
    </div>
  );
}

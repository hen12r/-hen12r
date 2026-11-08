import type { Dict } from '../i18n';
import type { ScanStatus } from '../lib/db';

const STYLES: Record<ScanStatus, string> = {
  requested: 'bg-slate-100 text-slate-700',
  scanning: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status, t }: { status: ScanStatus; t: Dict }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>{t.status[status]}</span>;
}

import type { Dict } from '../i18n';
import type { ScanStatus } from '../lib/db';

const STYLES: Record<ScanStatus, string> = {
  requested: 'border border-neutral-300 text-neutral-600',
  scanning: 'bg-neutral-100 text-ink',
  done: 'bg-ink text-white',
  failed: 'bg-ink text-white',
};

export function StatusBadge({ status, t }: { status: ScanStatus; t: Dict }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>{t.status[status]}</span>;
}

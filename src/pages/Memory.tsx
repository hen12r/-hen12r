import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Bell, Brain, CalendarDays, CheckSquare, NotebookPen, Search } from 'lucide-react';
import { searchMemory } from '../lib/api';
import { errorMessage, useI18n, type TranslationKey } from '../lib/i18n';
import type { MemoryHit } from '../lib/types';
import { useAuth } from '../auth/AuthProvider';
import { browserTimeZone } from '../lib/dates';
import { formatDateTime } from '../lib/format';
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader } from '../components/ui';

const ICON = { note: NotebookPen, task: CheckSquare, reminder: Bell, event: CalendarDays };
const LINK = { note: '/app/notes', task: '/app/tasks', reminder: '/app/schedule', event: '/app/schedule' };

export default function Memory() {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<MemoryHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true); setError(null);
    try { setHits(await searchMemory(q.trim())); } catch (err) { setError(errorMessage(t, err)); } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('memory.title')} subtitle={t('memory.subtitle')} />
      <form onSubmit={submit} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('memory.placeholder')} maxLength={200} aria-label={t('memory.search')} autoFocus />
        <Button type="submit" loading={loading} icon={<Search className="size-4" />}>{t('memory.search')}</Button>
      </form>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {hits && (
        <Card className="mt-6">
          {hits.length === 0 ? <EmptyState icon={<Brain className="size-6" />} text={t('memory.noResults')} /> : (
            <>
              <p className="px-5 pt-4 text-xs font-medium text-muted">{t('memory.fromRecords')} · {hits.length}</p>
              <ul className="divide-y divide-line">
                {hits.map((h) => {
                  const Icon = ICON[h.record_type];
                  return (
                    <li key={`${h.record_type}-${h.id}`}>
                      <Link to={LINK[h.record_type]} className="flex gap-3 px-5 py-3 hover:bg-canvas">
                        <Icon className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{h.title}</p>
                            <Badge>{t(`type.${h.record_type}` as TranslationKey)}</Badge>
                          </div>
                          {h.snippet && h.snippet !== h.title && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{h.snippet}</p>}
                          <p className="mt-1 text-[11px] text-muted">{formatDateTime(h.created_at, locale, profile?.timezone ?? browserTimeZone(), { dateStyle: 'medium' })}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

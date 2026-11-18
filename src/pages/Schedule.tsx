import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { AlertTriangle, Bell, CalendarDays, Check, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { createEvent, createReminder, deleteEvent, deleteReminder, listEvents, listReminders, updateEvent, updateReminder } from '../lib/api';
import { errorMessage, useI18n, type TranslationKey } from '../lib/i18n';
import type { CalendarEvent, Recurrence, Reminder } from '../lib/types';
import { useAuth } from '../auth/AuthProvider';
import { browserTimeZone, nextOccurrence, utcToZonedParts, zonedTimeToUtc } from '../lib/dates';
import { formatDateTime } from '../lib/format';
import { Alert, Badge, Button, Card, CardHeader, cx, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui';

const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly'];

export default function Schedule() {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const tz = profile?.timezone ?? browserTimeZone();
  const [params, setParams] = useSearchParams();
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editReminder, setEditReminder] = useState<Partial<Reminder> | null>(params.get('new') === 'reminder' ? {} : null);
  const [editEvent, setEditEvent] = useState<Partial<CalendarEvent> | null>(params.get('new') === 'event' ? {} : null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    Promise.all([listReminders(), listEvents()]).then(([r, e]) => { setReminders(r); setEvents(e); }).catch((e) => setError(errorMessage(t, e)));
  }, [t]);

  const clearParam = () => params.get('new') && setParams({}, { replace: true });
  const now = new Date();
  const scheduled = (reminders ?? []).filter((r) => r.status === 'scheduled');
  const overdue = scheduled.filter((r) => new Date(r.remind_at) < now);
  const upcoming = scheduled.filter((r) => new Date(r.remind_at) >= now);
  const done = (reminders ?? []).filter((r) => r.status !== 'scheduled');
  const futureEvents = (events ?? []).filter((e) => new Date(e.ends_at ?? e.starts_at) >= new Date(now.getTime() - 86_400_000));

  const replaceR = (u: Reminder) => setReminders((p) => p!.map((x) => (x.id === u.id ? u : x)));
  const complete = async (r: Reminder) => {
    try {
      const next = nextOccurrence(new Date(r.remind_at), r.recurrence, r.timezone);
      // Recurring: move to the next occurrence after now, keeping the same wall-clock time.
      if (next) {
        let n = next;
        while (n < now) n = nextOccurrence(n, r.recurrence, r.timezone)!;
        replaceR(await updateReminder(r.id, { remind_at: n.toISOString() }));
      } else {
        replaceR(await updateReminder(r.id, { status: 'done' }));
      }
    } catch (e) { setError(errorMessage(t, e)); }
  };
  const removeR = async (r: Reminder) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try { await deleteReminder(r.id); setReminders((p) => p!.filter((x) => x.id !== r.id)); } catch (e) { setError(errorMessage(t, e)); }
  };
  const removeE = async (ev: CalendarEvent) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try { await deleteEvent(ev.id); setEvents((p) => p!.filter((x) => x.id !== ev.id)); } catch (e) { setError(errorMessage(t, e)); }
  };

  const ReminderRow = ({ r, late }: { r: Reminder; late?: boolean }) => (
    <li className="flex items-center gap-3 px-4 py-3">
      {late ? <AlertTriangle className="size-4 shrink-0 text-red-600" aria-label={t('schedule.overdue')} /> : <Bell className="size-4 shrink-0 text-muted" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className={cx('text-sm', r.status !== 'scheduled' && 'text-muted line-through')}>{r.title}</p>
        <p className="text-xs text-muted">{formatDateTime(r.remind_at, locale, r.timezone)}{r.timezone !== tz ? ` (${r.timezone})` : ''}</p>
      </div>
      {r.recurrence !== 'none' && <Badge tone="accent"><Repeat className="mr-1 size-3" />{t(`schedule.rec.${r.recurrence}` as TranslationKey)}</Badge>}
      {r.status === 'scheduled' && (
        <Button size="sm" variant="secondary" onClick={() => complete(r)} icon={<Check className="size-3.5" />}>
          <span className="hidden sm:inline">{r.recurrence === 'none' ? t('schedule.complete') : t('schedule.completeNext')}</span>
        </Button>
      )}
      <button onClick={() => setEditReminder(r)} className="rounded p-1 text-muted hover:text-ink" aria-label={t('common.edit')}><Pencil className="size-4" /></button>
      <button onClick={() => removeR(r)} className="rounded p-1 text-muted hover:text-red-600" aria-label={t('common.delete')}><Trash2 className="size-4" /></button>
    </li>
  );

  return (
    <div>
      <PageHeader title={t('schedule.title')} action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditEvent({})} icon={<CalendarDays className="size-4" />}>{t('schedule.newEvent')}</Button>
          <Button onClick={() => setEditReminder({})} icon={<Plus className="size-4" />}>{t('schedule.newReminder')}</Button>
        </div>} />
      <div className="mb-4"><Alert kind="info">{t('schedule.deliveryNote')}</Alert></div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {!reminders || !events ? <Spinner label={t('common.loading')} /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('schedule.reminders')} icon={<Bell className="size-4 text-accent-600" />} action={done.length > 0 && <button className="text-xs text-accent-700 hover:underline" onClick={() => setShowDone((s) => !s)}>{t('schedule.completed')} · {done.length}</button>} />
            {overdue.length + upcoming.length === 0 && !showDone ? <EmptyState text={t('schedule.empty')} /> : (
              <ul className="divide-y divide-line">
                {overdue.map((r) => <ReminderRow key={r.id} r={r} late />)}
                {upcoming.map((r) => <ReminderRow key={r.id} r={r} />)}
                {showDone && done.map((r) => <ReminderRow key={r.id} r={r} />)}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={t('schedule.events')} icon={<CalendarDays className="size-4 text-accent-600" />} />
            {futureEvents.length === 0 ? <EmptyState text={t('schedule.empty')} /> : (
              <ul className="divide-y divide-line">
                {futureEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                    <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{ev.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(ev.starts_at, locale, tz, ev.all_day ? { dateStyle: 'full' } : undefined)}{ev.location ? ` · ${ev.location}` : ''}</p>
                    </div>
                    <button onClick={() => setEditEvent(ev)} className="rounded p-1 text-muted hover:text-ink" aria-label={t('common.edit')}><Pencil className="size-4" /></button>
                    <button onClick={() => removeE(ev)} className="rounded p-1 text-muted hover:text-red-600" aria-label={t('common.delete')}><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
      {editReminder && (
        <ReminderEditor reminder={editReminder} defaultTz={tz} onClose={() => { setEditReminder(null); clearParam(); }}
          onSaved={(s) => { setReminders((p) => (editReminder.id ? p!.map((x) => (x.id === s.id ? s : x)) : [...(p ?? []), s].sort((a, b) => a.remind_at.localeCompare(b.remind_at)))); setEditReminder(null); clearParam(); }} />
      )}
      {editEvent && (
        <EventEditor event={editEvent} tz={tz} onClose={() => { setEditEvent(null); clearParam(); }}
          onSaved={(s) => { setEvents((p) => (editEvent.id ? p!.map((x) => (x.id === s.id ? s : x)) : [...(p ?? []), s].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))); setEditEvent(null); clearParam(); }} />
      )}
    </div>
  );
}

function ReminderEditor({ reminder, defaultTz, onClose, onSaved }: { reminder: Partial<Reminder>; defaultTz: string; onClose: () => void; onSaved: (r: Reminder) => void }) {
  const { t } = useI18n();
  const tz = reminder.timezone ?? defaultTz;
  const initial = reminder.remind_at ? utcToZonedParts(new Date(reminder.remind_at), tz) : { date: '', time: '09:00' };
  const [title, setTitle] = useState(reminder.title ?? '');
  const [notes, setNotes] = useState(reminder.notes ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [recurrence, setRecurrence] = useState<Recurrence>(reminder.recurrence ?? 'none');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const patch = { title: title.trim(), notes: notes.trim() || null, remind_at: zonedTimeToUtc(date, time, tz).toISOString(), timezone: tz, recurrence, status: 'scheduled' as const };
    try { onSaved(reminder.id ? await updateReminder(reminder.id, patch) : await createReminder(patch)); } catch (err) { setError(errorMessage(t, err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={reminder.id ? t('common.edit') : t('schedule.newReminder')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('common.title')}><Input required value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.date')}><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('common.time')} hint={tz}><Input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label={t('schedule.recurrence')}><Select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>{RECURRENCES.map((r) => <option key={r} value={r}>{t(`schedule.rec.${r}` as TranslationKey)}</option>)}</Select></Field>
        <Field label={t('common.details')}><Textarea value={notes} rows={2} maxLength={5000} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={saving} disabled={!title.trim() || !date || !time}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EventEditor({ event, tz, onClose, onSaved }: { event: Partial<CalendarEvent>; tz: string; onClose: () => void; onSaved: (e: CalendarEvent) => void }) {
  const { t } = useI18n();
  const initial = event.starts_at ? utcToZonedParts(new Date(event.starts_at), tz) : { date: '', time: '' };
  const [title, setTitle] = useState(event.title ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(event.all_day ? '' : initial.time);
  const [location, setLocation] = useState(event.location ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const patch = { title: title.trim(), location: location.trim() || null, notes: notes.trim() || null, all_day: !time, starts_at: zonedTimeToUtc(date, time || '00:00', tz).toISOString() };
    try { onSaved(event.id ? await updateEvent(event.id, patch) : await createEvent(patch)); } catch (err) { setError(errorMessage(t, err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={event.id ? t('common.edit') : t('schedule.newEvent')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('common.title')}><Input required value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.date')}><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('common.time')} hint={tz}><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label={t('schedule.location')}><Input value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} /></Field>
        <Field label={t('common.details')}><Textarea value={notes} rows={2} maxLength={5000} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={saving} disabled={!title.trim() || !date}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, Circle, FileText, Keyboard, ListPlus, Mic, Search, Target } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage, useI18n } from '../lib/i18n';
import { listEvents, listNotes, listReminders, listTasks, rankPriorities, updateTask } from '../lib/api';
import type { CalendarEvent, Note, Reminder, Task } from '../lib/types';
import { browserTimeZone, dateInZone } from '../lib/dates';
import { formatDateTime, formatDay } from '../lib/format';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Spinner } from '../components/ui';

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const tz = profile?.timezone ?? browserTimeZone();
  const [data, setData] = useState<{ tasks: Task[]; reminders: Reminder[]; notes: Note[]; events: CalendarEvent[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tasks, reminders, notes, events] = await Promise.all([listTasks(), listReminders(), listNotes(5), listEvents()]);
      setData({ tasks, reminders, notes, events });
    } catch (e) { setError(errorMessage(t, e)); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const today = dateInZone(now, tz);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now));
  const greeting = t(hour < 12 ? 'dash.greeting.morning' : hour < 18 ? 'dash.greeting.afternoon' : 'dash.greeting.evening');
  const name = profile?.display_name?.split(' ')[0];

  const toggle = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, { status: task.status === 'open' ? 'done' : 'open' });
      setData((d) => d && { ...d, tasks: d.tasks.map((x) => (x.id === task.id ? updated : x)) });
    } catch (e) { setError(errorMessage(t, e)); }
  };

  const openTasks = data?.tasks.filter((x) => x.status === 'open') ?? [];
  const overdueTasks = openTasks.filter((x) => x.due_date && x.due_date < today);
  const todaysTasks = openTasks.filter((x) => x.due_date === today);
  const scheduled = data?.reminders.filter((r) => r.status === 'scheduled') ?? [];
  const overdueReminders = scheduled.filter((r) => new Date(r.remind_at) < now);
  const upcoming = scheduled.filter((r) => new Date(r.remind_at) >= now).slice(0, 5);
  const todaysEvents = data?.events.filter((e) => dateInZone(new Date(e.starts_at), tz) === today) ?? [];
  const priorities = rankPriorities(data?.tasks ?? [], today);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-navy-900 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/60">{new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: tz }).format(now)}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting}{name ? `, ${name}` : ''}</h1>
          </div>
          <Link to="/app/capture" className="group flex items-center gap-4 self-start rounded-2xl bg-white/5 p-2 pr-5 transition-colors hover:bg-white/10 sm:self-auto">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent-500 shadow-lg shadow-accent-500/30 transition-transform group-hover:scale-105"><Mic className="size-6" /></span>
            <span className="text-sm font-medium">{t('dash.tapToSpeak')}</span>
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { to: '/app/capture?mode=text', icon: Keyboard, label: t('dash.quick.note') },
            { to: '/app/tasks?new=1', icon: ListPlus, label: t('dash.quick.task') },
            { to: '/app/schedule?new=reminder', icon: Bell, label: t('dash.quick.reminder') },
            { to: '/app/memory', icon: Search, label: t('dash.quick.search') },
          ].map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </section>

      {error && <Alert>{error} <button className="ml-2 underline" onClick={load}>{t('common.retry')}</button></Alert>}
      {!data && !error && <Spinner label={t('common.loading')} />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={t('dash.priorities')} icon={<Target className="size-4 text-accent-600" />} />
            <p className="px-5 text-xs text-muted">{t('dash.prioritiesHint')}</p>
            {priorities.length === 0 ? <EmptyState text={t('tasks.empty')} /> : (
              <ul className="divide-y divide-line px-2 py-2">
                {priorities.map(({ task, reason }) => (
                  <TaskRow key={task.id} task={task} onToggle={toggle} badge={<Badge tone={reason === 'overdue' ? 'danger' : reason === 'today' ? 'accent' : 'warn'}>{reason === 'overdue' ? t('dash.overdue') : reason === 'today' ? t('dash.today') : t('priority.high')}</Badge>} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t('dash.today')} icon={<CalendarDays className="size-4 text-accent-600" />} action={<Link to="/app/schedule" className="text-xs text-accent-700 hover:underline">{t('nav.schedule')}</Link>} />
            {todaysEvents.length + todaysTasks.length === 0 ? <EmptyState text={t('dash.nothingToday')} /> : (
              <ul className="divide-y divide-line px-2 py-2">
                {todaysEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <CalendarDays className="size-4 text-muted" aria-hidden />
                    <span className="flex-1">{e.title}</span>
                    <span className="text-xs text-muted">{e.all_day ? '—' : formatDateTime(e.starts_at, locale, tz, { timeStyle: 'short' })}</span>
                  </li>
                ))}
                {todaysTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggle} />)}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t('dash.upcoming')} icon={<Bell className="size-4 text-accent-600" />} />
            {overdueReminders.length + upcoming.length === 0 ? <EmptyState text={t('schedule.empty')} /> : (
              <ul className="divide-y divide-line px-2 py-2">
                {[...overdueReminders, ...upcoming].map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    {new Date(r.remind_at) < now ? <AlertTriangle className="size-4 text-red-600" aria-label={t('dash.overdue')} /> : <Bell className="size-4 text-muted" aria-hidden />}
                    <span className="flex-1">{r.title}</span>
                    <span className="text-xs text-muted">{formatDateTime(r.remind_at, locale, r.timezone)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t('dash.recentNotes')} icon={<FileText className="size-4 text-accent-600" />} action={<Link to="/app/notes" className="text-xs text-accent-700 hover:underline">{t('nav.notes')}</Link>} />
            {data.notes.length === 0 ? <EmptyState text={t('notes.empty')} action={<Link to="/app/capture"><Button size="sm" icon={<Mic className="size-4" />}>{t('nav.capture')}</Button></Link>} /> : (
              <ul className="divide-y divide-line px-2 py-2">
                {data.notes.map((n) => (
                  <li key={n.id} className="px-3 py-2.5">
                    <p className="truncate text-sm font-medium">{n.title || n.body}</p>
                    <p className="text-xs text-muted">{formatDateTime(n.created_at, locale, tz, { dateStyle: 'medium' })}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {overdueTasks.length > 0 && (
            <p className="text-sm text-red-700 lg:col-span-2"><AlertTriangle className="mr-1 inline size-4" />{overdueTasks.length} {t('dash.overdue').toLowerCase()} · <Link to="/app/tasks" className="underline">{t('nav.tasks')}</Link></p>
          )}
        </div>
      )}
    </div>
  );

  function TaskRow({ task, onToggle, badge }: { task: Task; onToggle: (t: Task) => void; badge?: ReactNode }) {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5 text-sm">
        <button onClick={() => onToggle(task)} aria-label={task.status === 'open' ? t('tasks.markDone') : t('tasks.reopen')} className="text-muted hover:text-accent-600">
          {task.status === 'done' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5" />}
        </button>
        <span className={task.status === 'done' ? 'flex-1 text-muted line-through' : 'flex-1'}>{task.title}</span>
        {task.due_date && <span className="text-xs text-muted">{formatDay(task.due_date, locale)}</span>}
        {badge}
      </li>
    );
  }
}

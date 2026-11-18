import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { CheckCircle2, Circle, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';
import { createTask, deleteTask, listTasks, updateTask } from '../lib/api';
import { errorMessage, useI18n, type TranslationKey } from '../lib/i18n';
import type { Priority, Task } from '../lib/types';
import { useCategories } from '../lib/useCategories';
import { useAuth } from '../auth/AuthProvider';
import { browserTimeZone, dateInZone } from '../lib/dates';
import { formatDay } from '../lib/format';
import { Alert, Badge, Button, Card, cx, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui';

export default function Tasks() {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const { categories, byId } = useCategories();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [editing, setEditing] = useState<Partial<Task> | null>(params.get('new') ? { priority: 'normal' } : null);
  const today = dateInZone(new Date(), profile?.timezone ?? browserTimeZone());

  useEffect(() => { listTasks().then(setTasks).catch((e) => setError(errorMessage(t, e))); }, [t]);

  const replace = (u: Task) => setTasks((prev) => prev!.map((x) => (x.id === u.id ? u : x)));
  const toggle = async (task: Task) => {
    try { replace(await updateTask(task.id, { status: task.status === 'open' ? 'done' : 'open' })); } catch (e) { setError(errorMessage(t, e)); }
  };
  const remove = async (task: Task) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try { await deleteTask(task.id); setTasks((prev) => prev!.filter((x) => x.id !== task.id)); } catch (e) { setError(errorMessage(t, e)); }
  };

  const shown = (tasks ?? []).filter((x) => x.status === tab);
  const closeEditor = () => { setEditing(null); if (params.get('new')) setParams({}, { replace: true }); };
  return (
    <div>
      <PageHeader title={t('tasks.title')} action={<Button onClick={() => setEditing({ priority: 'normal' })} icon={<Plus className="size-4" />}>{t('tasks.new')}</Button>} />
      <div className="mb-4 flex gap-2" role="tablist">
        {(['open', 'done'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx('rounded-full px-3 py-1.5 text-sm', tab === k ? 'bg-navy-900 text-white' : 'border border-line bg-white text-muted hover:text-ink')}>
            {t(k === 'open' ? 'tasks.open' : 'tasks.done')} {tasks && <span className="opacity-60">· {tasks.filter((x) => x.status === k).length}</span>}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {!tasks ? <Spinner label={t('common.loading')} /> : (
        <Card>
          {shown.length === 0 ? <EmptyState icon={<ListTodo className="size-6" />} text={t('tasks.empty')} /> : (
            <ul className="divide-y divide-line">
              {shown.map((task) => {
                const overdue = task.status === 'open' && task.due_date && task.due_date < today;
                const cat = task.category_id ? byId.get(task.category_id) : null;
                return (
                  <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <button onClick={() => toggle(task)} className="mt-0.5 text-muted hover:text-accent-600" aria-label={task.status === 'open' ? t('tasks.markDone') : t('tasks.reopen')}>
                      {task.status === 'done' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm', task.status === 'done' && 'text-muted line-through')}>{task.title}</p>
                      {task.details && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{task.details}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {task.due_date && <Badge tone={overdue ? 'danger' : task.due_date === today ? 'accent' : 'neutral'}>{overdue ? `${t('dash.overdue')} · ` : ''}{formatDay(task.due_date, locale)}</Badge>}
                        {task.priority !== 'normal' && <Badge tone={task.priority === 'high' ? 'warn' : 'neutral'}>{t(`priority.${task.priority}` as TranslationKey)}</Badge>}
                        {cat && <Badge>{cat.name}</Badge>}
                      </div>
                    </div>
                    <button onClick={() => setEditing(task)} className="rounded p-1 text-muted hover:text-ink" aria-label={t('common.edit')}><Pencil className="size-4" /></button>
                    <button onClick={() => remove(task)} className="rounded p-1 text-muted hover:text-red-600" aria-label={t('common.delete')}><Trash2 className="size-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
      {editing && (
        <TaskEditor task={editing} categories={categories} onClose={closeEditor}
          onSaved={(saved) => { setTasks((prev) => (editing.id ? prev!.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...(prev ?? [])])); closeEditor(); }} />
      )}
    </div>
  );
}

function TaskEditor({ task, categories, onClose, onSaved }: { task: Partial<Task>; categories: { id: string; name: string }[]; onClose: () => void; onSaved: (t: Task) => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(task.title ?? '');
  const [details, setDetails] = useState(task.details ?? '');
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority ?? 'normal');
  const [categoryId, setCategoryId] = useState(task.category_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const patch = { title: title.trim(), details: details.trim() || null, due_date: dueDate || null, priority, category_id: categoryId || null, ...(dueDate !== task.due_date ? { due_at: null } : {}) };
    try { onSaved(task.id ? await updateTask(task.id, patch) : await createTask(patch)); } catch (err) { setError(errorMessage(t, err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={task.id ? t('common.edit') : t('tasks.new')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('common.title')}><Input required value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <Field label={t('common.details')}><Textarea value={details} rows={3} maxLength={5000} onChange={(e) => setDetails(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('tasks.due')}><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label={t('tasks.priority')}><Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(['low', 'normal', 'high'] as const).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}</Select></Field>
          <Field label={t('common.category')}><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">{t('common.none')}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={saving} disabled={!title.trim()}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Lightbulb, NotebookPen, Pencil, Pin, PinOff, Plus, Trash2, UserRound } from 'lucide-react';
import { createNote, deleteNote, listNotes, updateNote } from '../lib/api';
import { errorMessage, useI18n, type TranslationKey } from '../lib/i18n';
import type { Note, NoteKind } from '../lib/types';
import { useCategories } from '../lib/useCategories';
import { useAuth } from '../auth/AuthProvider';
import { formatDateTime } from '../lib/format';
import { browserTimeZone } from '../lib/dates';
import { Alert, Badge, Button, Card, cx, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../components/ui';

const KINDS: NoteKind[] = ['note', 'idea', 'personal_info'];
const KIND_ICON = { note: NotebookPen, idea: Lightbulb, personal_info: UserRound };

export default function Notes() {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const { categories, byId } = useCategories();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoteKind | 'all'>('all');
  const [editing, setEditing] = useState<Partial<Note> | null>(null);

  useEffect(() => { listNotes().then(setNotes).catch((e) => setError(errorMessage(t, e))); }, [t]);

  const remove = async (n: Note) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try { await deleteNote(n.id); setNotes((prev) => prev!.filter((x) => x.id !== n.id)); } catch (e) { setError(errorMessage(t, e)); }
  };
  const togglePin = async (n: Note) => {
    try { const u = await updateNote(n.id, { is_pinned: !n.is_pinned }); setNotes((prev) => prev!.map((x) => (x.id === n.id ? u : x))); } catch (e) { setError(errorMessage(t, e)); }
  };

  const shown = (notes ?? []).filter((n) => filter === 'all' || n.kind === filter);
  return (
    <div>
      <PageHeader title={t('notes.title')} action={<Button onClick={() => setEditing({ kind: 'note', body: '' })} icon={<Plus className="size-4" />}>{t('notes.new')}</Button>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {(['all', ...KINDS] as const).map((k) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={cx('rounded-full px-3 py-1.5 text-sm', filter === k ? 'bg-navy-900 text-white' : 'bg-white text-muted border border-line hover:text-ink')}>
            {k === 'all' ? t('notes.filterAll') : t(`type.${k}` as TranslationKey)}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {!notes ? <Spinner label={t('common.loading')} /> : shown.length === 0 ? <Card><EmptyState icon={<NotebookPen className="size-6" />} text={t('notes.empty')} /></Card> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((n) => {
            const Icon = KIND_ICON[n.kind];
            const cat = n.category_id ? byId.get(n.category_id) : null;
            return (
              <Card as="li" key={n.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 text-accent-600" aria-hidden />
                  <span className="flex-1 truncate text-sm font-semibold">{n.title || t(`type.${n.kind}` as TranslationKey)}</span>
                  {n.is_pinned && <Pin className="size-3.5 text-accent-600" aria-label={t('notes.pin')} />}
                </div>
                <p className="line-clamp-5 flex-1 whitespace-pre-wrap text-sm text-ink/80">{n.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  {cat && <Badge>{cat.name}</Badge>}
                  <span className="flex-1 text-xs text-muted">{formatDateTime(n.created_at, locale, profile?.timezone ?? browserTimeZone(), { dateStyle: 'medium' })}</span>
                  <button onClick={() => togglePin(n)} className="rounded p-1 text-muted hover:text-ink" aria-label={n.is_pinned ? t('notes.unpin') : t('notes.pin')}>{n.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}</button>
                  <button onClick={() => setEditing(n)} className="rounded p-1 text-muted hover:text-ink" aria-label={t('common.edit')}><Pencil className="size-4" /></button>
                  <button onClick={() => remove(n)} className="rounded p-1 text-muted hover:text-red-600" aria-label={t('common.delete')}><Trash2 className="size-4" /></button>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
      {editing && (
        <NoteEditor note={editing} categories={categories} onClose={() => setEditing(null)}
          onSaved={(saved) => { setNotes((prev) => (editing.id ? prev!.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...(prev ?? [])])); setEditing(null); }} />
      )}
    </div>
  );
}

function NoteEditor({ note, categories, onClose, onSaved }: { note: Partial<Note>; categories: { id: string; name: string }[]; onClose: () => void; onSaved: (n: Note) => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState(note.title ?? '');
  const [body, setBody] = useState(note.body ?? '');
  const [kind, setKind] = useState<NoteKind>(note.kind ?? 'note');
  const [categoryId, setCategoryId] = useState(note.category_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const patch = { title: title.trim() || null, body: body.trim(), kind, category_id: categoryId || null };
    try { onSaved(note.id ? await updateNote(note.id, patch) : await createNote(patch)); } catch (err) { setError(errorMessage(t, err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={note.id ? t('common.edit') : t('notes.new')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('common.title')}><Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t('notes.body')}><Textarea required value={body} rows={6} maxLength={20000} onChange={(e) => setBody(e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('notes.kind')}><Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>{KINDS.map((k) => <option key={k} value={k}>{t(`type.${k}` as TranslationKey)}</option>)}</Select></Field>
          <Field label={t('common.category')}><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">{t('common.none')}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={saving} disabled={!body.trim()}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage, useI18n } from '../lib/i18n';
import { createCategory, deleteAccount, deleteCategory, getCurrentUsage, getSubscription, updateProfile } from '../lib/api';
import { useCategories } from '../lib/useCategories';
import type { Profile, SpeechLanguage, Subscription, UiLanguage, Usage } from '../lib/types';
import { browserTimeZone, isValidTimeZone } from '../lib/dates';
import { supabase } from '../lib/supabase';
import { Alert, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Select } from '../components/ui';

const FREE_NOTES_LIMIT = 7; // mirrors public.plan_limits() — the database is the enforcer

export default function Settings() {
  const { t } = useI18n();
  const { profile, setProfile, session } = useAuth();
  const navigate = useNavigate();
  const { categories, setCategories } = useCategories();
  const [form, setForm] = useState<Profile | null>(profile);
  const [status, setStatus] = useState<{ kind: 'error' | 'success'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setForm(profile); }, [profile]);
  useEffect(() => { getSubscription().then(setSub).catch(() => undefined); getCurrentUsage().then(setUsage).catch(() => undefined); }, []);

  if (!form) return null;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm({ ...form, [k]: v });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidTimeZone(form.timezone)) { setStatus({ kind: 'error', msg: `${t('settings.timezone')}: ${form.timezone}` }); return; }
    setSaving(true); setStatus(null);
    try {
      const updated = await updateProfile(form.id, {
        display_name: form.display_name?.trim() || null, ui_language: form.ui_language, speech_language: form.speech_language, timezone: form.timezone,
      });
      setProfile(updated as Profile);
      setStatus({ kind: 'success', msg: t('settings.saved') });
    } catch (err) { setStatus({ kind: 'error', msg: errorMessage(t, err) }); } finally { setSaving(false); }
  };

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setCatError(null);
    try { const c = await createCategory(newCat); setCategories([...categories, c]); setNewCat(''); } catch (err) { setCatError(errorMessage(t, err)); }
  };
  const removeCategory = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try { await deleteCategory(id); setCategories(categories.filter((c) => c.id !== id)); } catch (err) { setCatError(errorMessage(t, err)); }
  };

  const premium = sub?.plan === 'premium' && (sub.status === 'active' || sub.status === 'trialing');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t('settings.title')} subtitle={session?.user.email} />

      <Card>
        <CardHeader title={t('settings.profile')} />
        <form onSubmit={save} className="space-y-4 px-5 pb-5">
          <Field label={t('auth.name')}><Input value={form.display_name ?? ''} maxLength={80} onChange={(e) => set('display_name', e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('settings.language')}>
              <Select value={form.ui_language} onChange={(e) => set('ui_language', e.target.value as UiLanguage)}>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </Select>
            </Field>
            <Field label={t('settings.speech')}>
              <Select value={form.speech_language} onChange={(e) => set('speech_language', e.target.value as SpeechLanguage)}>
                <option value="auto">{t('settings.speechAuto')}</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="rw">Kinyarwanda (experimental)</option>
              </Select>
            </Field>
          </div>
          <Field label={t('settings.timezone')}>
            <div className="flex gap-2">
              <Input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} placeholder="Africa/Kigali" />
              <Button type="button" variant="secondary" onClick={() => set('timezone', browserTimeZone())} className="shrink-0">{t('settings.useBrowserTz')}</Button>
            </div>
          </Field>
          {status && <Alert kind={status.kind}>{status.msg}</Alert>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>{t('common.save')}</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.categories')} />
        <div className="px-5 pb-5">
          <ul className="mb-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pr-1.5 pl-3 text-sm">
                <span className="size-2 rounded-full" style={{ background: c.color ?? '#8b6cff' }} aria-hidden />{c.name}
                <button onClick={() => removeCategory(c.id)} className="rounded-full p-0.5 text-muted hover:bg-canvas hover:text-red-600" aria-label={`${t('common.delete')} ${c.name}`}><X className="size-3.5" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCategory} className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('settings.newCategory')} maxLength={40} aria-label={t('settings.newCategory')} />
            <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} disabled={!newCat.trim()}>{t('common.add')}</Button>
          </form>
          {catError && <div className="mt-3"><Alert>{catError}</Alert></div>}
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.plan')} icon={<Sparkles className="size-4 text-accent-600" />} />
        <div className="space-y-3 px-5 pb-5 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={premium ? 'accent' : 'neutral'}>{premium ? t('settings.planPremium') : t('settings.planFree')}</Badge>
            {!premium && <span className="text-muted">{usage?.notes_created ?? 0} / {FREE_NOTES_LIMIT} {t('settings.notesUsed')}</span>}
          </div>
          {!premium && (
            <div className="h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_NOTES_LIMIT} aria-valuenow={usage?.notes_created ?? 0}>
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, ((usage?.notes_created ?? 0) / FREE_NOTES_LIMIT) * 100)}%` }} />
            </div>
          )}
          <p className="text-xs text-muted">{t('settings.billingSoon')}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.privacy')} icon={<ShieldCheck className="size-4 text-accent-600" />} />
        <div className="space-y-4 px-5 pb-5 text-sm">
          <p className="text-muted">{t('settings.audioPolicy')}</p>
          <Button variant="secondary" className="text-red-700" onClick={() => setDeleting(true)} icon={<Trash2 className="size-4" />}>{t('settings.deleteAccount')}</Button>
        </div>
      </Card>

      {deleting && <DeleteAccount onClose={() => setDeleting(false)} onDeleted={async () => { await supabase.auth.signOut(); navigate('/'); }} />}
    </div>
  );
}

function DeleteAccount({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true); setError(null);
    try { await deleteAccount(); onDeleted(); } catch (e) { setError(errorMessage(t, e)); setLoading(false); }
  };
  return (
    <Modal open onClose={onClose} title={t('settings.deleteAccount')}>
      <p className="mb-4 text-sm text-muted">{t('settings.deleteConfirm')}</p>
      <Input value={text} onChange={(e) => setText(e.target.value)} aria-label="DELETE" autoFocus />
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" disabled={text !== 'DELETE'} loading={loading} onClick={go}>{t('common.delete')}</Button>
      </div>
    </Modal>
  );
}

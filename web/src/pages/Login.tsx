import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useLang } from '../lang';
import { useAuth } from '../lib/auth';
import { GOOGLE_AUTH_ENABLED } from '../lib/supabase';
import { Logo } from '../components/Sections';
import { Spinner } from '../components/AppShell';
import { useTitle } from '../lib/useTitle';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const inputClass = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink shadow-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 aria-[invalid=true]:border-red-500';

export default function Login() {
  const { t, lang, toggle } = useLang();
  const auth = useAuth();
  useTitle(t.auth.login);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'signed-in') return <Navigate to="/app" replace />;

  const redirectTo = `${window.location.origin}/app`;

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) { setError(t.auth.errorEmail); return; }
    if (auth.status !== 'signed-out') return;
    setError(null);
    setStatus('sending');
    const { error: err } = await auth.supabase.auth.signInWithOtp({ email: clean, options: { emailRedirectTo: redirectTo } });
    if (err) {
      console.error('Magic link failed', err);
      setError(t.auth.errorGeneric);
      setStatus('idle');
    } else {
      setStatus('sent');
    }
  };

  const google = async () => {
    if (auth.status !== 'signed-out') return;
    const { error: err } = await auth.supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (err) { console.error('Google sign-in failed', err); setError(t.auth.errorGoogle); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="text-sm font-medium text-slate-600 hover:text-ink">{t.auth.back}</Link>
        <button type="button" onClick={toggle} aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
          className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink">
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-16">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">{t.auth.title}</h1>
          <p className="mt-2 text-slate-600">{t.auth.subtitle}</p>

          {auth.status === 'loading' && <Spinner label={t.app.loading} />}
          {auth.status === 'error' && <p role="alert" className="mt-6 text-red-700">{t.auth.errorGeneric}</p>}

          {auth.status === 'signed-out' && status === 'sent' && (
            <div role="status" className="mt-6 space-y-3">
              <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{t.auth.sent}</p>
              <button type="button" onClick={() => setStatus('idle')} className="text-sm font-semibold text-ink underline underline-offset-2">
                {t.auth.useAnother}
              </button>
            </div>
          )}

          {auth.status === 'signed-out' && status !== 'sent' && (
            <div className="mt-6 space-y-5">
              {GOOGLE_AUTH_ENABLED && (
                <>
                  <button type="button" onClick={google}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold hover:bg-slate-50">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                    </svg>
                    {t.auth.google}
                  </button>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />{t.auth.or}<span className="h-px flex-1 bg-slate-200" />
                  </div>
                </>
              )}
              <form onSubmit={sendLink} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="text-sm font-semibold">{t.auth.email}</label>
                  <input id="login-email" type="email" autoComplete="email" inputMode="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined}
                    className={inputClass} />
                </div>
                {error && <p id="login-error" role="alert" className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={status === 'sending'}
                  className="w-full rounded-lg bg-ink px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  {status === 'sending' ? t.auth.sending : t.auth.send}
                </button>
              </form>
              <p className="text-xs leading-relaxed text-slate-500">{t.auth.terms}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

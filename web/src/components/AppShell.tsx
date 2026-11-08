import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { useAuth } from '../lib/auth';
import { Logo, container } from './Sections';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-ink" />
      {label}
    </div>
  );
}

/** Logged-in frame: redirects to /login when there is no session, then renders children with the client. */
export function AppShell({ children }: { children: (ctx: { supabase: SupabaseClient; session: Session }) => ReactNode }) {
  const { t, lang, toggle } = useLang();
  const auth = useAuth();

  if (auth.status === 'signed-out') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <Link to="/app" aria-label="PhotoSentry"><Logo /></Link>
          <div className="flex items-center gap-2">
            <button
              type="button" onClick={toggle} aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
              className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            {auth.status === 'signed-in' && (
              <button
                type="button" onClick={() => auth.supabase.auth.signOut()}
                className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
              >
                {t.auth.logout}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className={`${container} py-8 sm:py-12`}>
        {auth.status === 'loading' && <Spinner label={t.app.loading} />}
        {auth.status === 'error' && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
        {auth.status === 'signed-in' && children({ supabase: auth.supabase, session: auth.session })}
      </main>
    </div>
  );
}

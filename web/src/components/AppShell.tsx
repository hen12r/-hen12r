import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate } from 'react-router-dom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useLang } from '../lang';
import { useAuth } from '../lib/auth';
import { Logo, container } from './Sections';
import { Icon } from './Icon';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-neutral-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-ink" />
      {label}
    </div>
  );
}

/** White rounded panel used across the app. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white border border-neutral-200 ${className}`}>{children}</div>;
}

function UserMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={t.ui.menu}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-neutral-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-signal">
          {email.charAt(0) || '?'}
        </span>
        <Icon name="chevron" className={`h-4 w-4 text-neutral-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-lg border border-neutral-200">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-xs text-neutral-500">{t.app.signedInAs}</p>
            <p className="truncate text-sm font-semibold">{email}</p>
          </div>
          <button
            type="button" role="menuitem" onClick={onLogout}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Icon name="logout" className="h-4 w-4" />{t.auth.logout}
          </button>
        </div>
      )}
    </div>
  );
}

/** Logged-in frame: redirects to /login when there is no session, then renders children with the client. */
export function AppShell({ children }: { children: (ctx: { supabase: SupabaseClient; session: Session }) => ReactNode }) {
  const { t, lang, toggle } = useLang();
  const auth = useAuth();

  if (auth.status === 'signed-out') return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <div className="flex items-center gap-8">
            <Link to="/app" aria-label="PhotoSentry"><Logo /></Link>
            <nav className="hidden sm:block">
              <NavLink
                to="/app"
                className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-neutral-100 text-ink' : 'text-neutral-600 hover:text-ink'}`}
              >
                {t.ui.nav}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button" onClick={toggle} aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
              className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-ink"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            {auth.status === 'signed-in' && (
              <UserMenu email={auth.session.user.email ?? ''} onLogout={() => auth.supabase.auth.signOut()} />
            )}
          </div>
        </div>
      </header>
      <main className={`${container} py-8 sm:py-10`}>
        {auth.status === 'loading' && <Spinner label={t.app.loading} />}
        {auth.status === 'error' && <p role="alert" className="text-red-700">{t.app.loadError}</p>}
        {auth.status === 'signed-in' && children({ supabase: auth.supabase, session: auth.session })}
      </main>
    </div>
  );
}

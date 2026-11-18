import { NavLink, Outlet, useNavigate } from 'react-router';
import { Brain, CalendarClock, CheckSquare, Home, LogOut, Mic, NotebookPen, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { cx } from './ui';

const NAV: { to: string; key: TranslationKey; icon: typeof Home }[] = [
  { to: '/app', key: 'nav.dashboard', icon: Home },
  { to: '/app/notes', key: 'nav.notes', icon: NotebookPen },
  { to: '/app/tasks', key: 'nav.tasks', icon: CheckSquare },
  { to: '/app/schedule', key: 'nav.schedule', icon: CalendarClock },
  { to: '/app/memory', key: 'nav.memory', icon: Brain },
  { to: '/app/settings', key: 'nav.settings', icon: Settings },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={cx('flex items-center gap-2 font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>
      <img src="/icon.svg" alt="" className="size-7" /> My Voice Life
    </span>
  );
}

export function AppShell() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-navy-900 px-4 py-6 lg:flex">
        <div className="px-2"><Logo light /></div>
        <NavLink to="/app/capture" className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-colors hover:bg-accent-600">
          <Mic className="size-4" aria-hidden /> {t('nav.capture')}
        </NavLink>
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white')}>
              <Icon className="size-4" aria-hidden /> {t(key)}
            </NavLink>
          ))}
        </nav>
        <button onClick={async () => { await signOut(); navigate('/'); }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" aria-hidden /> {t('nav.signout')}
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <NavLink to="/app/settings" aria-label={t('nav.settings')} className="rounded-lg p-2 text-muted hover:bg-canvas"><Settings className="size-5" /></NavLink>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:pb-10 lg:pt-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav with central microphone */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[NAV[0], NAV[2]].map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'text-accent-600' : 'text-muted')}>
            <Icon className="size-5" aria-hidden />{t(key)}
          </NavLink>
        ))}
        <NavLink to="/app/capture" aria-label={t('nav.capture')} className="-mt-6 flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg ring-4 ring-white"><Mic className="size-6" /></span>
        </NavLink>
        {[NAV[3], NAV[4]].map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'text-accent-600' : 'text-muted')}>
            <Icon className="size-5" aria-hidden />{t(key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

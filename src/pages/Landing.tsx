import { Link, Navigate } from 'react-router';
import { Brain, ListChecks, Lock, Mic, ShieldCheck } from 'lucide-react';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from '../components/AppShell';

const FEATURES: { icon: typeof Mic; t: TranslationKey; d: TranslationKey }[] = [
  { icon: ListChecks, t: 'landing.f1.t', d: 'landing.f1.d' },
  { icon: ShieldCheck, t: 'landing.f2.t', d: 'landing.f2.d' },
  { icon: Brain, t: 'landing.f3.t', d: 'landing.f3.d' },
  { icon: Lock, t: 'landing.f4.t', d: 'landing.f4.d' },
];

export default function Landing() {
  const { t } = useI18n();
  const { session } = useAuth();
  if (session) return <Navigate to="/app" replace />;
  return (
    <div className="min-h-dvh bg-navy-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo light />
        <Link to="/login" className="rounded-xl px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">{t('landing.signin')}</Link>
      </header>
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-20 text-center sm:pt-20">
        <p className="mb-5 text-xs font-medium tracking-[0.2em] text-accent-400 uppercase">{t('app.tagline')}</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{t('landing.h1')}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">{t('landing.sub')}</p>
        <div className="mt-10 flex flex-col items-center gap-6">
          <Link to="/register" aria-label={t('landing.cta')} className="group relative flex size-24 items-center justify-center rounded-full bg-accent-500 shadow-2xl shadow-accent-500/30 transition-transform hover:scale-105">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-accent-500" aria-hidden />
            <Mic className="relative size-10" />
          </Link>
          <Link to="/register" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-white/90">{t('landing.cta')}</Link>
        </div>
      </section>
      <section className="border-t border-white/10 bg-navy-900">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, t: title, d }) => (
            <div key={title} className="p-5">
              <Icon className="mb-4 size-5 text-accent-400" aria-hidden />
              <h2 className="font-semibold">{t(title)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{t(d)}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="px-5 py-8 text-center text-xs text-white/40">© {new Date().getFullYear()} My Voice Life</footer>
    </div>
  );
}

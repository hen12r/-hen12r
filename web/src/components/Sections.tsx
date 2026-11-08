import { Link } from 'react-router-dom';
import { BRAND_NAME, CONTACT_EMAIL } from '../brand';
import type { Dict, Lang } from '../i18n';
import { Icon, type IconName } from './Icon';

export const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={inverted ? '#ffffff' : '#0f172a'} />
        <circle cx="14" cy="14" r="7" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <path d="M19 19l6 6" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {BRAND_NAME}
    </span>
  );
}

/** Cheap check for a stored Supabase session, without loading supabase-js on the landing page. */
function hasSession(): boolean {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

const sectionTitle = 'text-3xl font-bold tracking-tight text-balance sm:text-4xl';
const eyebrow = 'text-sm font-semibold uppercase tracking-wider text-amber-600';

export function Header({ t, lang, onToggleLang }: { t: Dict; lang: Lang; onToggleLang: () => void }) {
  const signedIn = hasSession();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <Link to="/" aria-label={BRAND_NAME}><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a href="/#how" className="hover:text-ink">{t.nav.how}</a>
          <a href="/#example" className="hover:text-ink">{t.nav.example}</a>
          <a href="/#faq" className="hover:text-ink">{t.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button" onClick={onToggleLang} aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
            className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <Link to={signedIn ? '/app' : '/login'} className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink">
            {signedIn ? t.auth.account : t.auth.login}
          </Link>
          <a href="/#scan" className="hidden rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 sm:inline-block">
            {t.nav.cta}
          </a>
        </div>
      </div>
    </header>
  );
}

const EXAMPLE_ROWS = [
  { match: 'exact', platform: 'Amazon', page: 'amazon.example/dp/B0COPYCAT1', title: 'Lampe LED coucher de soleil – GlowMax' },
  { match: 'exact', platform: 'Temu', page: 'temu.example/lampe-led-g-6010000001', title: 'Sunset projector lamp 16 colors' },
  { match: 'edited', platform: 'AliExpress', page: 'aliexpress.example/item/1005000000001', title: 'Rainbow sunset lamp USB' },
  { match: 'edited', platform: 'Shopify', page: 'cozy-lights.example/products/sunset', title: 'Cozy Sunset Lamp' },
] as const;

function MatchBadge({ exact, t, fixed = true }: { exact: boolean; t: Dict; fixed?: boolean }) {
  return (
    <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold ${fixed ? 'sm:w-40' : ''} ${exact ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
      {exact ? t.example.exact : t.example.edited}
    </span>
  );
}

/** App-window style preview of a report, shown next to the hero headline. Fictional data. */
function HeroPreview({ t }: { t: Dict }) {
  const stats = [
    { value: '4', label: t.hero.previewCopies },
    { value: '3', label: t.hero.previewPlatforms },
    { value: '2', label: t.hero.previewExact },
  ];
  return (
    <div className="relative min-w-0" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-amber-200/50 via-white to-sky-200/50 blur-2xl" />
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 truncate text-xs text-slate-400">photosentry · {t.example.badge}</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.hero.previewProduct}</p>
              <p className="font-mono text-xs text-slate-500">B0EXAMPLE1 · amazon.fr</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <Icon name="check" className="h-3.5 w-3.5" />{t.hero.previewTitle}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(s => (
              <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {EXAMPLE_ROWS.slice(0, 3).map(row => (
              <li key={row.page} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <MatchBadge exact={row.match === 'exact'} t={t} fixed={false} />
                <span className="w-20 shrink-0 text-xs font-semibold">{row.platform}</span>
                <span className="min-w-0 truncate text-xs text-slate-500">{row.page}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Hero({ t }: { t: Dict }) {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.35] [background-image:linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
        aria-hidden="true"
      />
      <div className={`${container} relative grid grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24`}>
        <div className="min-w-0">
          <p className={eyebrow}>{t.hero.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">{t.hero.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#scan" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3.5 font-semibold text-white shadow-sm hover:bg-slate-800">
              {t.hero.cta}<Icon name="arrow" className="h-4 w-4" />
            </a>
            <a href="#example" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3.5 font-semibold text-ink hover:bg-slate-50">
              {t.hero.secondary}
            </a>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {t.hero.trust.map(item => (
              <li key={item} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-emerald-600" />{item}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview t={t} />
      </div>
    </section>
  );
}

const STRIP_PLATFORMS = ['Amazon', 'Temu', 'AliExpress', 'eBay', 'Walmart', 'Etsy', 'Shein', 'Shopify', 'Cdiscount'];

export function PlatformStrip({ t }: { t: Dict }) {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className={`${container} flex flex-col items-center gap-4 py-6 md:flex-row md:gap-8`}>
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">{t.hero.stripLabel}</p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
          {STRIP_PLATFORMS.map(p => <li key={p} className="text-base font-bold tracking-tight text-slate-400">{p}</li>)}
        </ul>
      </div>
    </section>
  );
}

const PROBLEM_ICONS: IconName[] = ['camera', 'badge', 'eyeOff'];

export function Problem({ t }: { t: Dict }) {
  return (
    <section className={`${container} py-16 sm:py-24`}>
      <h2 className={`${sectionTitle} max-w-2xl`}>{t.problem.title}</h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {t.problem.items.map((item, i) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-signal">
              <Icon name={PROBLEM_ICONS[i]} className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEP_ICONS: IconName[] = ['tag', 'search', 'report'];

export function HowItWorks({ t }: { t: Dict }) {
  return (
    <section id="how" className="scroll-mt-16 bg-slate-50">
      <div className={`${container} py-16 sm:py-24`}>
        <h2 className={sectionTitle}>{t.how.title}</h2>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
          <span className="absolute left-0 right-0 top-[2.1rem] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block" aria-hidden="true" />
          {t.how.steps.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Icon name={STEP_ICONS[i]} className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-400">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ExampleReport({ t }: { t: Dict }) {
  return (
    <section id="example" className={`${container} scroll-mt-16 py-16 sm:py-24`}>
      <h2 className={sectionTitle}>{t.example.title}</h2>
      <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="font-semibold">{t.example.product}</p>
            <p className="text-sm text-slate-600">{t.example.summary}</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{t.example.badge}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {EXAMPLE_ROWS.map(row => (
            <li key={row.page} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
              <MatchBadge exact={row.match === 'exact'} t={t} />
              <span className="w-24 shrink-0 text-sm font-semibold">{row.platform}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{row.title}</span>
                <span className="block truncate text-xs text-slate-500">{row.page}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-sm text-slate-500">{t.example.disclaimer}</p>
    </section>
  );
}

export function Platforms({ t }: { t: Dict }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true" />
      <div className={`${container} relative grid grid-cols-1 gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center [&>*]:min-w-0`}>
        <div>
          <h2 className={sectionTitle}>{t.platforms.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{t.platforms.body}</p>
        </div>
        <div className="flex gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          <p className="leading-relaxed text-slate-300">{t.platforms.caveat}</p>
        </div>
      </div>
    </section>
  );
}

export function Faq({ t }: { t: Dict }) {
  return (
    <section id="faq" className={`${container} scroll-mt-16 py-16 sm:py-24`}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] [&>*]:min-w-0">
        <h2 className={sectionTitle}>{t.faq.title}</h2>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {t.faq.items.map(item => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {item.q}
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dict }) {
  const linkClass = 'text-slate-400 hover:text-white';
  return (
    <footer className="bg-ink text-sm text-slate-400">
      <div className={`${container} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]`}>
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs leading-relaxed">{t.footer.tagline}</p>
        </div>
        <div>
          <h2 className="font-semibold text-white">{t.footer.product}</h2>
          <ul className="mt-4 space-y-2.5">
            <li><a href="/#how" className={linkClass}>{t.nav.how}</a></li>
            <li><a href="/#example" className={linkClass}>{t.nav.example}</a></li>
            <li><a href="/#faq" className={linkClass}>{t.nav.faq}</a></li>
            <li><a href="/#scan" className={linkClass}>{t.nav.cta}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-white">{t.footer.account}</h2>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/login" className={linkClass}>{t.auth.login}</Link></li>
            <li><Link to="/app" className={linkClass}>{t.app.title}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-white">{t.footer.legal}</h2>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/privacy" className={linkClass}>{t.footer.privacyPolicy}</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{t.footer.contact}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`${container} flex flex-col gap-2 py-6 text-xs text-slate-500 md:flex-row md:justify-between`}>
          <p>© {new Date().getFullYear()} {BRAND_NAME}. {t.footer.rights}</p>
          <p>{t.footer.notAffiliated}</p>
        </div>
      </div>
    </footer>
  );
}

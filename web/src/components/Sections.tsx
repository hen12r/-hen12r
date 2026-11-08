import { BRAND_NAME, CONTACT_EMAIL } from '../brand';
import type { Dict, Lang } from '../i18n';

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

function Logo() {
  return (
    <span className="flex items-center gap-2 font-extrabold tracking-tight text-ink">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f172a" />
        <circle cx="14" cy="14" r="7" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <path d="M19 19l6 6" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {BRAND_NAME}
    </span>
  );
}

export function Header({ t, lang, onToggleLang }: { t: Dict; lang: Lang; onToggleLang: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <a href="#top" aria-label={BRAND_NAME}><Logo /></a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#how" className="hover:text-ink">{t.nav.how}</a>
          <a href="#example" className="hover:text-ink">{t.nav.example}</a>
          <a href="#faq" className="hover:text-ink">{t.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            aria-label={`${t.lang.label}: ${t.lang.switchTo}`}
            className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
          >
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <a href="#scan" className="rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            {t.nav.cta}
          </a>
        </div>
      </div>
    </header>
  );
}

export function Hero({ t }: { t: Dict }) {
  return (
    <section id="top" className="bg-gradient-to-b from-slate-50 to-white">
      <div className={`${container} py-16 sm:py-24`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">{t.hero.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">{t.hero.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">{t.hero.subtitle}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#scan" className="rounded-lg bg-ink px-6 py-3.5 text-center font-semibold text-white shadow-sm hover:bg-slate-800">
            {t.hero.cta}
          </a>
          <a href="#example" className="rounded-lg border border-slate-300 px-6 py-3.5 text-center font-semibold text-ink hover:bg-slate-50">
            {t.hero.secondary}
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">{t.hero.note}</p>
      </div>
    </section>
  );
}

export function Problem({ t }: { t: Dict }) {
  return (
    <section className={`${container} py-16 sm:py-20`}>
      <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{t.problem.title}</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {t.problem.items.map(item => (
          <div key={item.title} className="rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-2 leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks({ t }: { t: Dict }) {
  return (
    <section id="how" className="scroll-mt-16 bg-slate-50">
      <div className={`${container} py-16 sm:py-20`}>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.how.title}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {t.how.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const EXAMPLE_ROWS = [
  { match: 'exact', platform: 'Amazon', page: 'amazon.example/dp/B0COPYCAT1', title: 'Lampe LED coucher de soleil – GlowMax' },
  { match: 'exact', platform: 'Temu', page: 'temu.example/lampe-led-g-6010000001', title: 'Sunset projector lamp 16 colors' },
  { match: 'edited', platform: 'AliExpress', page: 'aliexpress.example/item/1005000000001', title: 'Rainbow sunset lamp USB' },
  { match: 'edited', platform: 'Shopify', page: 'cozy-lights.example/products/sunset', title: 'Cozy Sunset Lamp' },
] as const;

export function ExampleReport({ t }: { t: Dict }) {
  return (
    <section id="example" className={`${container} scroll-mt-16 py-16 sm:py-20`}>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.example.title}</h2>
      <div className="mt-10 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
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
              <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold sm:w-40 ${row.match === 'exact' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                {row.match === 'exact' ? t.example.exact : t.example.edited}
              </span>
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
    <section className="bg-ink text-white">
      <div className={`${container} py-16 sm:py-20`}>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.platforms.title}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">{t.platforms.body}</p>
        <p className="mt-6 max-w-3xl border-l-4 border-signal pl-4 text-slate-300">{t.platforms.caveat}</p>
      </div>
    </section>
  );
}

export function Faq({ t }: { t: Dict }) {
  return (
    <section id="faq" className={`${container} scroll-mt-16 py-16 sm:py-20`}>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.faq.title}</h2>
      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        {t.faq.items.map(item => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {item.q}
              <span aria-hidden="true" className="text-xl text-slate-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dict }) {
  return (
    <footer id="privacy" className="scroll-mt-16 border-t border-slate-200 bg-slate-50">
      <div className={`${container} space-y-6 py-12 text-sm text-slate-600`}>
        <Logo />
        <div className="max-w-3xl">
          <h2 className="font-semibold text-ink">{t.footer.privacyTitle}</h2>
          <p className="mt-2 leading-relaxed">
            {t.footer.privacy}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline underline-offset-2">{CONTACT_EMAIL}</a>
          </p>
        </div>
        <p className="text-slate-500">{t.footer.notAffiliated}</p>
        <p className="text-slate-500">© {new Date().getFullYear()} {BRAND_NAME}</p>
      </div>
    </footer>
  );
}

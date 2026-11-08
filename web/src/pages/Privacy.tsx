import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { CONTACT_EMAIL } from '../brand';
import { useTitle } from '../lib/useTitle';
import { Header, Footer, container } from '../components/Sections';

export default function Privacy() {
  const { t, lang, toggle } = useLang();
  const pp = t.privacyPage;
  useTitle(pp.title);
  return (
    <>
      <Header t={t} lang={lang} onToggleLang={toggle} />
      <main className={`${container} max-w-3xl py-12 sm:py-16`}>
        <Link to="/" className="text-sm font-medium text-slate-600 hover:text-ink">{pp.back}</Link>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">{pp.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{pp.updated}</p>
        <p className="mt-6 text-lg leading-relaxed text-slate-700">{pp.intro}</p>
        <div className="mt-10 space-y-10">
          {pp.sections.map(section => (
            <section key={section.h}>
              <h2 className="text-xl font-bold tracking-tight">{section.h}</h2>
              {section.p.length > 1 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-700">
                  {section.p.map(line => <li key={line}>{line}</li>)}
                </ul>
              ) : (
                <p className="mt-3 leading-relaxed text-slate-700">{section.p[0]}</p>
              )}
            </section>
          ))}
          <p className="rounded-xl bg-slate-50 p-5 text-slate-700 ring-1 ring-slate-200">
            {pp.contactLead}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink underline underline-offset-2">{CONTACT_EMAIL}</a>
          </p>
        </div>
      </main>
      <Footer t={t} />
    </>
  );
}

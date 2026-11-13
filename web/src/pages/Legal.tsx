import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { CONTACT_EMAIL, LEGAL } from '../brand';
import { useTitle } from '../lib/useTitle';
import { Header, Footer, container } from '../components/Sections';

export default function Legal() {
  const { t, lang, toggle } = useLang();
  const lp = t.legalPage;
  useTitle(lp.title);
  const pending = <span className="italic text-neutral-500">{lp.pending}</span>;
  const rows: [string, ReactNode][] = [
    [lp.publisher, LEGAL.publisher ?? pending],
    [lp.address, LEGAL.address ?? pending],
    [lp.registration, LEGAL.registration ?? pending],
    [lp.director, LEGAL.director ?? LEGAL.publisher ?? pending],
    [lp.contact, <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink underline underline-offset-2">{CONTACT_EMAIL}</a>],
  ];
  return (
    <>
      <Header t={t} lang={lang} onToggleLang={toggle} />
      <main className={`${container} max-w-3xl py-12 sm:py-16`}>
        <Link to="/" className="text-sm font-medium text-neutral-600 hover:text-ink">{lp.back}</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{lp.title}</h1>
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{lp.publisherTitle}</h2>
          <dl className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[14rem_1fr]">
                <dt className="text-sm text-neutral-500">{k}</dt>
                <dd className="min-w-0 break-words text-neutral-800">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{lp.hostingTitle}</h2>
          <ul className="mt-4 space-y-4">
            {LEGAL.hosts.map(h => (
              <li key={h.name} className="rounded-xl border border-neutral-200 p-4">
                <p className="font-semibold">{h.name} <span className="font-normal text-neutral-500">· {lp.hostRole[h.role as 'site' | 'data']}</span></p>
                <p className="mt-1 text-sm text-neutral-600">{h.address}</p>
                <a href={h.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm underline underline-offset-2">{h.url.replace('https://', '')}</a>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{lp.ipTitle}</h2>
          <p className="mt-3 leading-relaxed text-neutral-700">{lp.ip}</p>
        </section>
      </main>
      <Footer t={t} />
    </>
  );
}

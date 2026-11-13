import { useLocation } from 'react-router-dom';
import { useLang } from '../lang';
import { Header, Hero, PlatformStrip, Problem, HowItWorks, ExampleReport, Platforms, StartCta, Faq, Footer } from '../components/Sections';
import { useTitle } from '../lib/useTitle';

export default function Landing() {
  const { t, lang, toggle } = useLang();
  useTitle(t.hero.title.replace(/\.$/, ""));
  const accountDeleted = (useLocation().state as { accountDeleted?: boolean } | null)?.accountDeleted === true;
  return (
    <>
      <Header t={t} lang={lang} onToggleLang={toggle} />
      <main>
        {accountDeleted && (
          <p role="status" className="mx-auto mt-6 w-fit max-w-[calc(100%-2rem)] rounded-full bg-ink px-5 py-2 text-center text-sm text-white">{t.account.done}</p>
        )}
        <Hero t={t} />
        <PlatformStrip t={t} />
        <Problem t={t} />
        <HowItWorks t={t} />
        <ExampleReport t={t} />
        <Platforms t={t} />
        <StartCta t={t} />
        <Faq t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}

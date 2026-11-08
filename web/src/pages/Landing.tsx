import { useLang } from '../lang';
import { Header, Hero, PlatformStrip, Problem, HowItWorks, ExampleReport, Platforms, Faq, Footer } from '../components/Sections';
import { useTitle } from '../lib/useTitle';
import { ScanForm } from '../components/ScanForm';

export default function Landing() {
  const { t, lang, toggle } = useLang();
  useTitle(t.hero.title.replace(/\.$/, ""));
  return (
    <>
      <Header t={t} lang={lang} onToggleLang={toggle} />
      <main>
        <Hero t={t} />
        <PlatformStrip t={t} />
        <Problem t={t} />
        <HowItWorks t={t} />
        <ExampleReport t={t} />
        <Platforms t={t} />
        {/* key resets the form's default marketplace when the language changes */}
        <ScanForm key={lang} t={t} lang={lang} />
        <Faq t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}

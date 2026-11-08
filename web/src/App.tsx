import { useEffect, useState } from 'react';
import { DICTS, initialLang, saveLang, type Lang } from './i18n';
import { Header, Hero, Problem, HowItWorks, ExampleReport, Platforms, Faq, Footer } from './components/Sections';
import { ScanForm } from './components/ScanForm';

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = DICTS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    saveLang(lang);
  }, [lang]);

  return (
    <>
      <Header t={t} lang={lang} onToggleLang={() => setLang(l => (l === 'fr' ? 'en' : 'fr'))} />
      <main>
        <Hero t={t} />
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

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DICTS, initialLang, saveLang, type Dict, type Lang } from './i18n';

interface LangValue { lang: Lang; t: Dict; toggle: () => void }

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    saveLang(lang);
  }, [lang]);
  return (
    <LangContext.Provider value={{ lang, t: DICTS[lang], toggle: () => setLang(l => (l === 'fr' ? 'en' : 'fr')) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangValue {
  const v = useContext(LangContext);
  if (!v) throw new Error('useLang must be used inside LangProvider');
  return v;
}

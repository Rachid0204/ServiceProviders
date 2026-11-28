import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TRANSLATIONS, type Translations } from '../../i18n/translations';
import type { LanguageCode } from '../../utils/marketplace';

export interface LocaleContextValue {
  lang: LanguageCode;
  t: Translations;
  isAr: boolean;
  setLang: (next: LanguageCode) => void;
  toggleLanguage: () => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside LocaleProvider');
  }
  return ctx;
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LanguageCode>('fr');
  const t = TRANSLATIONS[lang];
  const isAr = lang === 'ar';

  // Synchronize document direction and lang attribute for FR (LTR) / AR (RTL)
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ lang, t, isAr, setLang, toggleLanguage }),
    [lang, t, isAr, toggleLanguage]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

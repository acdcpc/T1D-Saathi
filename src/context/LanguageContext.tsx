import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';
import type { Language } from '../types';

type TranslationDict = typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDict, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: keyof TranslationDict, params?: Record<string, string | number>) => {
    const dict = translations[language] as TranslationDict;
    let text: string = (dict[key] as string) || (translations.en[key] as string) || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

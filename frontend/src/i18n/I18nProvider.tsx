import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setFormatterLocale } from '../utils/formatters';
import { en } from './locales/en';
import { ur } from './locales/ur';

const dictionaries = { en, ur } as const;
export type Locale = keyof typeof dictionaries;

interface I18nContextValue {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(dictionary: any, key: string): any {
  if (!dictionary) return undefined;
  return key.split('.').reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), dictionary);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('qavlio_locale');
    return (stored === 'ur' || stored === 'en' ? stored : 'en') as Locale;
  });
  useEffect(() => {
    // Keep price/date formatting in sync with the active language.
    setFormatterLocale(locale);
    if (typeof document === 'undefined') return;
    const isUrdu = locale === 'ur';
    document.documentElement.lang = isUrdu ? 'ur' : 'en';
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ur', isUrdu);
    document.body.classList.toggle('lang-en', !isUrdu);
    try { localStorage.setItem('qavlio_locale', locale); } catch { /* ignore */ }
  }, [locale]);
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    direction: locale === 'ur' ? 'rtl' : 'ltr',
    setLocale(next) {
      if (dictionaries[next]) setLocaleState(next);
    },
    toggleLocale() {
      setLocaleState((current) => (current === 'ur' ? 'en' : 'ur'));
    },
    t(key, variables = {}) {
      const template = resolve(dictionaries[locale], key) ?? resolve(en, key) ?? key;
      return Object.entries(variables).reduce(
        (text, [name, replacement]) => String(text).replaceAll(`{${name}}`, String(replacement)),
        String(template),
      );
    },
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used inside I18nProvider');
  return context;
}

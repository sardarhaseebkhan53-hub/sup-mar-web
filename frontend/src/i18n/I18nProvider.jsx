import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './locales/en';
import { ur } from './locales/ur';

const dictionaries = { en, ur };
const I18nContext = createContext(null);

function resolve(dictionary, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], dictionary);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => localStorage.getItem('dealhub_locale') || 'en');
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem('dealhub_locale', locale);
  }, [locale]);
  const value = useMemo(() => ({
    locale,
    direction: locale === 'ur' ? 'rtl' : 'ltr',
    setLocale(next) { if (dictionaries[next]) setLocaleState(next); },
    t(key, variables = {}) {
      const template = resolve(dictionaries[locale], key) ?? resolve(en, key) ?? key;
      return Object.entries(variables).reduce((text, [name, replacement]) => String(text).replaceAll(`{${name}}`, replacement), String(template));
    },
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used inside I18nProvider');
  return context;
}

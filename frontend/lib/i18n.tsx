"use client"

import { createContext, useContext, useMemo, useState } from 'react'
import en from '../i18n/en.json'
import fr from '../i18n/fr.json'

type Dict = Record<string, string>
const langs: Record<'en'|'fr', Dict> = { en, fr }

const I18nCtx = createContext<{ t: (k: string) => string; lang: 'en'|'fr'; setLang: (l: 'en'|'fr') => void }>({ t: (k) => k, lang: 'en', setLang: () => {} })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<'en'|'fr'>('en')
  const t = useMemo(() => (key: string) => (langs[lang] && langs[lang][key]) || key, [lang])
  return <I18nCtx.Provider value={{ t, lang, setLang }}>{children}</I18nCtx.Provider>
}

export function useI18n() { return useContext(I18nCtx) }

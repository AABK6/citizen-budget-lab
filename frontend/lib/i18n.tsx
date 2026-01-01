"use client"

import { createContext, useContext, useMemo } from 'react'
import en from '../i18n/en.json'
import fr from '../i18n/fr.json'

type Dict = Record<string, string>
const langs: Record<'en'|'fr', Dict> = { en, fr }

const I18nCtx = createContext<{ t: (k: string) => string; lang: 'fr' }>({ t: (k) => k, lang: 'fr' })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang: 'fr' = 'fr'
  const t = useMemo(() => (key: string) => (langs[lang] && langs[lang][key]) || key, [lang])
  return <I18nCtx.Provider value={{ t, lang }}>{children}</I18nCtx.Provider>
}

export function useI18n() { return useContext(I18nCtx) }

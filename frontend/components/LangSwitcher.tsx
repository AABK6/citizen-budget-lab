"use client"

import { useI18n } from '@/lib/i18n'

export function LangSwitcher() {
  const { lang, setLang } = useI18n()

  function toggle() {
    const next = lang === 'fr' ? 'en' : 'fr'
    setLang(next)
  }

  return (
    <button className="fr-btn fr-btn--tertiary-no-outline fr-icon-translate-fill fr-btn--icon-left" onClick={toggle} aria-label="Switch language">
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  )
}
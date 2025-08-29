"use client"

import { useI18n } from '@/lib/i18n'

export function LangSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <label className="field" style={{ marginLeft: 'auto' }}>
      <span>Lang</span>
      <select value={lang} onChange={e => setLang(e.target.value as 'en'|'fr')}>
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </select>
    </label>
  )
}


"use client"

import { useI18n } from '@/lib/i18n'

export function LangSwitcher() {
  const { lang, setLang } = useI18n()
  const id = 'lang_switcher'
  return (
    <div className="fr-select-group" style={{ marginLeft: 'auto' }}>
      <label className="fr-label" htmlFor={id}>Langue</label>
      <select className="fr-select" id={id} value={lang} onChange={e => setLang(e.target.value as 'en'|'fr')}>
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </select>
    </div>
  )
}

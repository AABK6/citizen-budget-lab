"use client"

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function Home() {
  const { t } = useI18n()
  return (
    <div className="stack">
      <h2 className="fr-h2">{t('home.welcome')}</h2>
      <p>{t('home.pick_section')}</p>
      <ul className="fr-links-group">
        <li><Link className="fr-link" href="/explore">{t('nav.explore')}</Link></li>
        <li><Link className="fr-link" href="/procurement">{t('nav.procurement')}</Link></li>
        <li><Link className="fr-link" href="/what-if">{t('nav.whatif')}</Link></li>
        <li><Link className="fr-link" href="/compare-eu">{t('nav.compare_eu')}</Link></li>
        <li><Link className="fr-link" href="/sources">{t('nav.sources')}</Link></li>
      </ul>
    </div>
  )
}

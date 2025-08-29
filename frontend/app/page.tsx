"use client"

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function Home() {
  const { t } = useI18n()
  return (
    <div className="stack">
      <h2>{t('home.welcome')}</h2>
      <p>{t('home.pick_section')}</p>
      <ul>
        <li><Link href="/explore">{t('nav.explore')}</Link></li>
        <li><Link href="/procurement">{t('nav.procurement')}</Link></li>
        <li><Link href="/what-if">{t('nav.whatif')}</Link></li>
        <li><Link href="/compare-eu">{t('nav.compare_eu')}</Link></li>
        <li><Link href="/sources">{t('nav.sources')}</Link></li>
      </ul>
    </div>
  )
}

"use client"

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export function NavTabs() {
  const pathname = usePathname()
  const { t } = useI18n()
  const tabs: { href: Route; label: string }[] = [
    { href: '/build' as Route, label: t('nav.build') },
    { href: '/explore' as Route, label: t('nav.explore') },
    { href: '/procurement' as Route, label: t('nav.procurement') },
    { href: '/what-if' as Route, label: t('nav.whatif') },
    { href: '/compare-eu' as Route, label: t('nav.compare_eu') },
    { href: '/sources' as Route, label: t('nav.sources') }
  ]
  return (
    <nav className="tabs">
      {tabs.map(t => (
        <Link key={t.href} href={t.href} className={pathname?.startsWith(t.href) ? 'tab active' : 'tab'}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

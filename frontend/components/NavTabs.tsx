"use client"

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export function NavTabs() {
  const pathname = usePathname()
  const { t } = useI18n()
  // Keep secondary routes available but hide them from the primary nav while the UI is simplified.
  const tabs: { href: Route; label: string }[] = [
    { href: '/build' as Route, label: t('nav.build') },
  ]
  return (
    <nav className="fr-nav" role="navigation" aria-label="Navigation principale">
      <ul className="fr-nav__list">
        {tabs.map(t => (
          <li key={t.href} className="fr-nav__item">
            <Link href={t.href} className={pathname?.startsWith(t.href) ? 'fr-nav__link fr-link--active' : 'fr-nav__link'}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/explore', label: 'Explore €1' },
  { href: '/procurement', label: 'Who gets paid?' },
  { href: '/what-if', label: 'What‑if?' },
  { href: '/compare-eu', label: 'Compare EU' },
  { href: '/sources', label: 'Sources' }
]

export function NavTabs() {
  const pathname = usePathname()
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


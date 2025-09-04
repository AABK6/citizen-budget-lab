"use client"

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('cbl_theme') as Theme) || null
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
        document.documentElement.setAttribute('data-fr-theme', saved)
      }
    } catch {}
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { localStorage.setItem('cbl_theme', next) } catch {}
    document.documentElement.setAttribute('data-fr-theme', next)
  }

  return (
    <button className="fr-btn fr-btn--tertiary-no-outline fr-icon-theme-fill fr-btn--icon-left" onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? 'Thème sombre' : 'Thème clair'}
    </button>
  )
}


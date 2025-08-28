import type { Metadata } from 'next'
import './globals.css'
import { NavTabs } from '@/components/NavTabs'
import { I18nProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Citizen Budget Lab',
  description: 'Explore, analyze, and simulate the public budget.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <header className="site-header">
            <div className="container">
              <h1 className="brand">Citizen Budget Lab</h1>
              <NavTabs />
            </div>
          </header>
          <main className="container">
            {children}
          </main>
          <footer className="footer container">
            <small>Demo UI • MVP scaffold</small>
          </footer>
        </I18nProvider>
      </body>
    </html>
  )
}


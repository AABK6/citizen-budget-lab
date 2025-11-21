import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'
import { Dsfr } from '@/components/Dsfr';

export const metadata: Metadata = {
  title: 'Citizen Budget Lab',
  description: 'Explore, analyze, and simulate the public budget.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-fr-theme="light">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* DSFR — French Government Design System (style + icons) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@1.12.0/dist/dsfr.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@1.12.0/dist/utility/icons/icons.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </head>
      <body>
        <I18nProvider>
          <main id="main-content" className="w-full h-screen overflow-hidden bg-gray-50">
            {children}
          </main>
        </I18nProvider>
        <Dsfr />
      </body>
    </html>
  )
}

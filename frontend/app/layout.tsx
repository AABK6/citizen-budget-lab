import type { Metadata } from 'next'
import Script from 'next/script'
import Image from 'next/image'
import './globals.css'
import { NavTabs } from '@/components/NavTabs'
import { LangSwitcher } from '@/components/LangSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { I18nProvider } from '@/lib/i18n'
import { HealthBadge } from '@/components/HealthBadge'
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
      </head>
      <body>
        {/* Skip links for accessibility */}
        <div className="fr-skiplinks">
          <nav className="fr-container" role="navigation" aria-label="Accès rapide">
            <ul className="fr-skiplinks__list">
              <li><a className="fr-link" href="#main-content">Aller au contenu</a></li>
              <li><a className="fr-link" href="#main-navigation">Aller au menu</a></li>
            </ul>
          </nav>
        </div>
        <I18nProvider>
          <header className="fr-header">
            <div className="fr-header__body">
              <div className="fr-container">
                <div className="fr-header__body-row">
                  <div className="fr-header__brand fr-enlarge-link">
                    <div className="fr-header__brand-top">
                      <div className="fr-header__logo" aria-hidden="true">
                        <Image
                          src="/citizenbudgetlogo.png"
                          alt="Citizen Budget Lab"
                          className="brand-logo brand-logo-light"
                          width={277}
                          height={419}
                          priority
                        />
                        <Image
                          src="/citizenbudgetlogo_dark.png"
                          alt="Citizen Budget Lab"
                          className="brand-logo brand-logo-dark"
                          width={277}
                          height={419}
                        />
                      </div>
                    </div>
                    <div className="fr-header__service">
                      <a href="/" title="Accueil">Budget citoyen</a>
                      <p className="fr-header__service-tagline">Explorer et simuler le budget public</p>
                    </div>
                  </div>
                  <div className="fr-header__tools">
                    <div className="fr-header__tools-links">
                      <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--right fr-btns-group--icon-left">
                        <li><HealthBadge /></li>
                        <li><ThemeToggle /></li>
                        <li><LangSwitcher /></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="fr-header__menu" id="main-navigation">
              <div className="fr-container">
                <NavTabs />
              </div>
            </div>
          </header>
          <main id="main-content" className="fr-container">
            {children}
          </main>
          <footer className="fr-footer fr-footer--short" role="contentinfo">
            <div className="fr-container">
              <div className="fr-footer__body" style={{ padding: '.5rem 0' }}>
                <div className="fr-footer__brand fr-enlarge-link">
                  <a className="fr-footer__brand-link" href="/" title="Retour à l’accueil" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                    <Image
                      src="/citizenbudgetlogo.png"
                      alt="Citizen Budget Lab"
                      className="brand-logo brand-logo-light"
                      width={277}
                      height={419}
                    />
                    <Image
                      src="/citizenbudgetlogo_dark.png"
                      alt="Citizen Budget Lab"
                      className="brand-logo brand-logo-dark"
                      width={277}
                      height={419}
                    />
                    <span className="fr-footer__brand-title">Budget citoyen</span>
                  </a>
                </div>
                <div className="fr-footer__content">
                  <p className="fr-footer__content-desc" style={{ margin: 0 }}>Prototype — démonstration uniquement.</p>
                </div>
              </div>
              <div className="fr-footer__bottom">
                <ul className="fr-footer__bottom-list">
                  <li className="fr-footer__bottom-item"><a className="fr-footer__bottom-link" href="/sources">Sources</a></li>
                  <li className="fr-footer__bottom-item"><a className="fr-footer__bottom-link" href="/">Accessibilité</a></li>
                </ul>
                <div className="fr-footer__bottom-copy">© République française</div>
              </div>
            </div>
          </footer>
        </I18nProvider>
        <Dsfr />
      </body>
    </html>
  )
}

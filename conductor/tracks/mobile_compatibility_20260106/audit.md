# Mobile Responsiveness Audit

## Landing Page
- frontend/app/page.tsx: two-column hero stays visible on small viewports; the right-column chart should be hidden on mobile to reduce visual load.
- frontend/app/page.tsx: text sizes (text-5xl/text-7xl) and spacing (gap-16, px-8) feel oversized for small screens; needs mobile-specific scaling.

## Build Page Layout
- frontend/app/build/BuildPageClient.tsx: main grid uses fixed columns (grid-cols-[380px_1fr_350px]) with no responsive fallbacks.
- frontend/app/build/BuildPageClient.tsx: left/right panels are always rendered; mobile needs on-demand access instead of sidebars.
- frontend/app/build/BuildPageClient.tsx: treemap container is constrained by side panels; needs full-width layout on mobile.

## Summary + Drawers
- frontend/app/build/components/Scoreboard.tsx: summary bar is large and dense; ScenarioDashboard likely too wide for mobile.
- frontend/app/build/components/ReformDetailDrawer.tsx: fixed width and offset positioning will overflow small screens.
- frontend/app/build/components/MassCategoryPanel.tsx: panel assumes sidebar context; mobile needs overlay or bottom sheet.
- frontend/app/build/components/RevenueCategoryPanel.tsx: same sidebar assumption as MassCategoryPanel.

## Navigation/Triggers
- frontend/app/build/BuildPageClient.tsx: no mobile trigger for Revenue controls; requires dedicated button and full-screen modal.

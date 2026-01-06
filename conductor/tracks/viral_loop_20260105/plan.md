# Track Plan: Post-Vote Viral Loop & Engagement Overhaul

This plan follows the Conductor methodology: TDD, high test coverage, and phase-level verification.

## Direction Update (2026-01-06)
Per product direction, replace the dedicated `/share` page with a floating summary card on `/build`. Scenario permalinks should route to `/build?scenarioId=...`.

## Phase 1: Floating Post-Vote Summary on /build
Goal: Surface the post-vote summary in-context on the build page.

- [x] **Task: Floating Summary Card**
    - [x] Sub-task: Create a floating summary card that reuses the build scoreboard pipeline (deficit + ratio, spending/revenue totals, top levers).
    - [x] Sub-task: Include the full deficit value (not just deltas).
- [x] **Task: Vote Trigger & Dismiss**
    - [x] Sub-task: Show the card after a successful vote submission.
    - [x] Sub-task: Allow the user to dismiss the card.
- [x] **Task: Permalink Redirect**
    - [x] Sub-task: Redirect `/share/[scenario_id]` to `/build?scenarioId=...`.
    - [x] Sub-task: Remove obsolete share page tests.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Floating Post-Vote Summary on /build' (Protocol in workflow.md)**

## Phase 2: Dynamic OpenGraph Image Generation
Goal: Generate high-quality visual cards on-the-fly for social media sharing.

- [x] **Task: Setup Image Generation Endpoint**
    - [x] Sub-task: Create `frontend/app/api/og/[id]/route.ts` using a server-rendered SVG response.
    - [x] Sub-task: Design a visual layout that pulls the scenario's deficit delta, growth impact, and top 2 reforms.
    - [x] Sub-task: Add branding (Citizen Budget Lab logo/colors).
- [x] **Task: Integration Test for OG Images**
    - [x] Sub-task: Write a test to ensure the API returns a valid image/svg response for a known scenario ID.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: Dynamic OpenGraph Image Generation' (Protocol in workflow.md)**

## Phase 3: Sharing UI & Viral Messaging
Goal: Encourage users to share their results and explain the collective impact.

- [x] **Task: Implement Sharing Buttons**
    - [x] Sub-task: Create `frontend/components/ShareButtons.tsx` with X, LinkedIn, and WhatsApp integration.
    - [x] Sub-task: Add a "Copy Link" utility with visual feedback (Confetti/Toast).
- [x] **Task: Add Viral Messaging & Milestone Tease**
    - [x] Sub-task: Implement the "Political Weight" callout emphasizing collective power.
    - [x] Sub-task: Add a locked "Consensus comparison" card with the "Unlocks at 10,000 votes" message.
- [x] **Task: UI/Snapshot Testing**
    - [x] Sub-task: Verify the buttons generate correct sharing URLs.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Sharing UI & Viral Messaging' (Protocol in workflow.md)**

## Phase 4: SEO & SEO Integration
Goal: Ensure the shared links look great on social media platforms.

- [ ] **Task: Metadata Integration**
    - [ ] Sub-task: Implement `generateMetadata` on the share page to point to the `/api/og/[id]` endpoint.
    - [ ] Sub-task: Set appropriate social titles and descriptions.
- [ ] **Task: Final Polish & Accessibility**
    - [ ] Sub-task: Run `axe` tests on the new page.
    - [ ] Sub-task: Verify responsive behavior on mobile.
- [ ] **Task: Conductor - User Manual Verification 'Phase 4: SEO & SEO Integration' (Protocol in workflow.md)**

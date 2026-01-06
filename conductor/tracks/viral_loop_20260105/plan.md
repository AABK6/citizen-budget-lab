# Track Plan: Post-Vote Viral Loop & Engagement Overhaul

This plan follows the Conductor methodology: TDD, high test coverage, and phase-level verification.

## Phase 1: Share Page Infrastructure & Routing
Goal: Create the destination page for shared scenarios and fetch the necessary data.

- [~] **Task: Create Share Page Route**
    - [ ] Sub-task: Create `frontend/app/share/[id]/page.tsx` as a dynamic route.
    - [ ] Sub-task: Implement a layout using `@codegouvfr/react-dsfr` components.
    - [ ] Sub-task: Fetch scenario data using the existing `scenario` GraphQL query.
- [ ] **Task: Unit Test Share Page Logic**
    - [ ] Sub-task: Write Vitest tests in `frontend/app/share/[id]/page.test.tsx` to verify fetching and data display.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Share Page Infrastructure & Routing' (Protocol in workflow.md)**

## Phase 2: Dynamic OpenGraph Image Generation
Goal: Generate high-quality visual cards on-the-fly for social media sharing.

- [ ] **Task: Setup Image Generation Endpoint**
    - [ ] Sub-task: Create `frontend/app/api/og/[id]/route.tsx` using `ImageResponse`.
    - [ ] Sub-task: Design a visual layout that pulls the scenario's deficit delta, growth impact, and top 2 reforms.
    - [ ] Sub-task: Add branding (Citizen Budget Lab logo/colors).
- [ ] **Task: Integration Test for OG Images**
    - [ ] Sub-task: Write a test to ensure the API returns a valid image/png response for a known scenario ID.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: Dynamic OpenGraph Image Generation' (Protocol in workflow.md)**

## Phase 3: Sharing UI & Viral Messaging
Goal: Encourage users to share their results and explain the collective impact.

- [ ] **Task: Implement Sharing Buttons**
    - [ ] Sub-task: Create `frontend/components/ShareButtons.tsx` with X, LinkedIn, and WhatsApp integration.
    - [ ] Sub-task: Add a "Copy Link" utility with visual feedback (Confetti/Toast).
- [ ] **Task: Add Viral Messaging & Milestone Tease**
    - [ ] Sub-task: Implement the "Political Weight" callout emphasizing collective power.
    - [ ] Sub-task: Add a locked "Consensus comparison" card with the "Unlocks at 10,000 votes" message.
- [ ] **Task: UI/Snapshot Testing**
    - [ ] Sub-task: Verify the buttons generate correct sharing URLs.
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

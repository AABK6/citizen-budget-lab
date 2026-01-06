# Specification: Post-Vote Viral Loop & Engagement Overhaul

## 1. Overview
The current post-vote experience is basic and unengaging. This track transforms it into a viral engine designed to maximize sharing and political impact. The goal is to provide immediate gratification (a visual summary) and a clear motive for sharing (collective weight).

**Direction update:** The post-vote experience will live as a floating share card on `/build` (no dedicated `/share` page). Scenario permalinks should point back to `/build?scenarioId=...` so the summary is shown in-context.

## 2. Functional Requirements
*   **Engagement Surface:** A floating, polished "Post-Vote" card on `/build` that appears after a vote is submitted.
*   **Scoreboard Summary:** Reuse the existing build scoreboard pipeline (deficit + ratio, spending/revenue totals, top levers). Include the full deficit value.
*   **Viral Messaging:** Explicitly state: "The more people take this simulation, the more political weight it will have."
*   **Social Integration:** One-click sharing for X, LinkedIn, and WhatsApp, including the unique scenario permalink (now `/build?scenarioId=...`).
*   **Milestone Tease:** Include a "Collective Consensus" placeholder that says: "Collective comparison will unlock once we reach 10,000 votes."
*   **Call to Action:** Primary focus on inviting friends to join the "Session Extraordinaire Citoyenne."

## 3. Non-Functional Requirements
*   **Visual Polish:** Use DSFR components and consistent styling with the main "Build" page.
*   **SEO/Social Prep:** Ensure every shared link has proper metadata so the "Share Card" image appears correctly on social media feeds.

## 4. Acceptance Criteria
*   [ ] **Post-Vote Card:** A fully functional and styled floating summary card on `/build`.
*   [ ] **Permalink Routing:** `/share/[scenario_id]` redirects to `/build?scenarioId=...`.
*   [ ] **Server-Side Image Generator:** An API endpoint that generates a dynamic image for a given scenario ID.
*   [ ] **Sharing UI:** Working buttons that open sharing dialogs with pre-filled text and the correct URL.
*   [ ] **Copywriting:** Compelling text explaining the power of collective numbers.

## 5. Out of Scope
*   Actual collective data visualization (deferred until 10k votes reached).
*   Email notification system.

# Specification: Post-Vote Viral Loop & Engagement Overhaul

## 1. Overview
The current "Success" page after a user casts a vote is basic and unengaging. This track transforms it into a viral engine designed to maximize sharing and political impact. The goal is to provide immediate gratification (a visual summary) and a clear motive for sharing (collective weight).

## 2. Functional Requirements
*   **Engagement Page:** A new, polished "Post-Vote" page that replaces the current placeholder.
*   **Visual Share Card:** Generate a server-side image (OpenGraph) that captures the user's final budget state (Deficit delta, key reforms, growth impact).
*   **Viral Messaging:** Explicitly state: "The more people take this simulation, the more political weight it will have."
*   **Social Integration:** One-click sharing for X, LinkedIn, and WhatsApp, including the unique scenario permalink.
*   **Milestone Tease:** Include a "Collective Consensus" placeholder that says: "Collective comparison will unlock once we reach 10,000 votes."
*   **Call to Action:** Primary focus on inviting friends to join the "Session Extraordinaire Citoyenne."

## 3. Non-Functional Requirements
*   **Visual Polish:** Use DSFR components and consistent styling with the main "Build" page.
*   **SEO/Social Prep:** Ensure every shared link has proper metadata so the "Share Card" image appears correctly on social media feeds.

## 4. Acceptance Criteria
*   [ ] **Post-Vote Page:** A fully functional and styled React page at `/share/[scenario_id]`.
*   [ ] **Server-Side Image Generator:** An API endpoint that generates a dynamic image for a given scenario ID.
*   [ ] **Sharing UI:** Working buttons that open sharing dialogs with pre-filled text and the correct URL.
*   [ ] **Copywriting:** Compelling text explaining the power of collective numbers.

## 5. Out of Scope
*   Actual collective data visualization (deferred until 10k votes reached).
*   Email notification system.

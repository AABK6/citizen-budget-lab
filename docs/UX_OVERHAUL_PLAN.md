# Citizen Budget Lab — UX/UI Overhaul Implementation Plan

**Vision**: Transform the application into *"L'Atelier du Budget"* — a high-stakes, serious game where the user plays a French MP negotiating the 2026 Budget. The experience must be immersive, rigorous, and visually premium ("Glassmorphism").

---

## 📅 Epic 1: The "Mission Briefing" (Landing Experience)
**Goal**: Immerse the user immediately in the role. Establish the stakes (Deficit crisis).

### Steps
1.  **Visual Foundation (Styles)** (✅ *Done*)
    *   [x] Verify `globals.css` implements the "Premium Glass" token set (Navy/Emerald/Violet).
    *   [x] Verify `Inter` and `Outfit` fonts are loading correctly.
2.  **Landing Page Implementation** (✅ *Done*)
    *   [x] **Crisis Visualization**: Add a simplified sparkline/chart showing the deficit/debt trajectory exploding in 2024-2026. "Show, don't just tell."
    *   [x] **Narrative context**: "Vous êtes député. Le déficit dérape..."
    *   [x] **Party/Difficulty Selection** (Optional V2): "Choose your difficulty" (Majority MP vs Opposition). For now, standard "Budget Minister" role.
    *   [x] **CTA**: "Entrer dans l'Hémicycle" triggers a "Door Opening" transition/sound effect.

### Checks & Validation
*   [x] User landing on `localhost:3000` sees the briefing, not a redirect.
*   [x] The "Crisis Graph" is immediately visible and alarming.

---

## 📅 Epic 2: The "Cockpit" (Simulation Dashboard)
**Goal**: Create a unified, single-screen "Command Center" that places the Deficit at the heart of the experience.

### Steps
1.  **Global HUD (Scoreboard)** (✅ *Done*)
    *   [x] **Refactor**: Remove old `HUD` and `StatCards` components from the top of the Build page.
    *   [x] **Implement `Scoreboard.tsx`**:
        *   **Center**: Absolute Deficit (€) and Deficit % GDP. Large, legible font.
        *   **Left**: Total Spending (Dépenses) with sparkline/trend.
        *   **Right**: Total Revenue (Recettes) with sparkline/trend.
        *   **Feedback**: Animated counters that tick up/down when values change.
    *   [x] **Check**: Ensure `computeDeficitTotals` is correctly imported and values match the baseline on load.
2.  **Layout Structure (Three-Pane)** (✅ *Done*)
    *   [x] **Left Panel (Dépenses)**:
        *   Sticky Header: "Catalogue des Réformes" button (Prominent, Violet).
        *   List: Missions (Admin Lens). Remove filters for "Family" or "Lens".
    *   [x] **Center Panel (Visualization)**:
        *   **Treemap**: Maximize height. Remove "Budget Allocation" titles.
        *   **News Ticker Area**: Reserve bottom 40px for the "Newsfeed" scrolling text.
        *   **Overlay**: Simple toggle for `€` vs `%` at bottom-left.
    *   [x] **Right Panel (Recettes)**:
        *   List: Revenue Sources (Taxes).
3.  **Visual Polish**:
    *   [ ] Update Panel backgrounds to white with subtle border/shadow (`shadow-sm`).
    *   [ ] Ensure scrolling works independently in Left/Right panels.

### Checks & Validation
*   [ ] Dashboard loads without scrollbars on standard 1080p screens (responsive fit).
*   [ ] Deficit is the focal point.
*   [ ] UI explicitly reserves space for future mechanics (News, Political Capital).

---

## 📅 Epic 3: The "Reform Catalog" (Primary Interaction)
**Goal**: Users shouldn't have to hunt for savings. Give them a menu of "Popular Reforms" to apply directly.

### Steps
1.  **Catalog Modal (`ReformCatalogModal`)** (✅ *Started*)
    *   [ ] **Trigger**: Opens when clicking the button in Left Panel.
    *   [ ] **Content**: List of all available `PolicyLevers`.
    *   [ ] **Cards**: Each reform as a card showing:
        *   Title & Description.
        *   **Impact Badge**: Green for Savings (positive impact), Red for Cost.
        *   **Action**: "Adopt" / "Repeal" toggle button.
    *   [ ] **Stats**: Show "Cost in Political Capital" (e.g., -10 pts) on the card (even if mechanic is fake for now).
    *   [ ] **Filtering**: Tabs for "Retraites", "Fiscalité", "Education".
2.  **Interaction Design**:
    *   [x] **Hover Preview (The Ghost)**: When hovering a reform card *before* clicking, specific bars in the Treemap and the HUD Deficit Bar should "ghost" to show the potential impact. This teaches the user the consequence before the commitment.
    *   [ ] **Batch Selection**: Allow selecting multiple reforms, then "Sign Budget Bill" to apply all at once.
    *   [ ] **Impact Engine Metrics**: Show placeholders for "Growth" and "Purchasing Power" on cards.

### Checks & Validation
*   [ ] Can open/close modal.
*   [ ] Hovering a reform shows where it hits in the budget (Educational).
*   [ ] Selecting a reform updates the Deficit in the HUD immediately.

---

## 📅 Epic 4: "Game Juice" & Feedback Loops
**Goal**: Make budget cuts feel significant and satisfying.

### Steps
1.  **Resolution Meter**:
    *   [ ] Visual bar in the HUD showing progress towards a "balanced budget" or "target".
    *   [ ] Animate fill width on change.
2.  **Notification Snacks**:
    *   [ ] When a reform is applied: Show a toast at the bottom center.
        *   *Example*: "✅ Réforme des Retraites appliquée : +12 Md€ d'économies".
3.  **Positive Reinforcement**:
    *   [ ] If Deficit drops below key thresholds (3%, 0%), trigger a subtle confetti or "Success" glow on the HUD.

### Checks & Validation
*   [ ] Animations are smooth (60fps).
*   [ ] Feedback is instant (optimistic UI), not waiting for backend if possible.

---

## 📅 Epic 5: Simplification & Cleanup
**Goal**: Remove "Explorer" baggage. Focus on the game.

### Steps
1.  **Remove Navigation**:
    *   [ ] Hide/Remove links to `/explore`, `/procurement` from the main UI (though verify routes still exist for advanced users).
2.  **Lens Lockdown**:
    *   [ ] Hardcode lens to `ADMIN` (Missions).
    *   [ ] Remove `LensSwitcher` logic from `BuildPageClient` to simplify state.
3.  **Code Cleanup**:
    *   [ ] Remove unused imports in `BuildPageClient`.
    *   [ ] Fix duplicate imports (e.g. `computeDeficitTotals`).

---

## � Epic 6: Advanced Game Mechanics (Phase 4)
**Goal**: Deepen the simulation with political consequences, narrative feedback, and viral hooks.

### Idea 1: The "Objective Impact" Engine (Replacing Political Capital)
**Goal**: Replace subjective "Political Capital" with rigorous, modeled economic impacts.
*   **Concept**: Every reform has concrete consequences on:
    *   **Purchasing Power (Pouvoir d'Achat)**: Impact on household disposable income (Decile 1 vs Decile 10).
    *   **Growth (Croissance)**: Short-term shock vs Long-term potential.
    *   **Inequality (Gini)**: How the budget shifts the curve.
*   **UI**: A "Dashboard of Consequences" that updates alongside the Deficit.
*   **Data Strategy**: We need to ingest coefficients from authoritative models (e.g., Institut des Politiques Publiques, OFCE, Trésor).

### Idea 2: The "Newsfeed" (Narrative)
*   **Concept**: Immediate qualitative feedback on quantitative decisions.
*   **Mechanic**:
    *   Triggered on specific budget moves.
    *   *Cut Education* -> "Breaking: Teachers' Union announces general strike! 📉"
    *   *Raises Taxes* -> "Economy: MEDEF warns of investment freeze. 📉"
*   **UI**: A scrolling ticker at the bottom or a "Notification Feed" drawer.

### Idea 3: "Budget Wrapped" (Virality)
*   **Concept**: A shareable "receipt" of your simulation.
*   **Content**:
    *   "My 2026 Budget":
    *   ✅ Deficit Fixed (+€20B)
    *   🔥 Biggest Winner: [Decile 1 or 10]
    *   🛡️ Top Priority: [Mission Name]
*   **Tech**: Generate an image on the client side (using `html2canvas` or similar) for easy Twitter/LinkedIn sharing.

### Idea 4: Challenge Scenarios
*   **Concept**: Pre-configured starting states with specific win conditions.
2.  **UI**: A "Dashboard of Consequences" that updates alongside the Deficit.
3.  **Data Strategy**: We need to ingest coefficients from authoritative models (e.g., Institut des Politiques Publiques, OFCE, Trésor).

### Checks & Validation
*   [ ] The "Dashboard of Consequences" is visible and updates dynamically.
*   [ ] Impact metrics are clearly attributed to specific reforms.

---

## 📅 Epic 7: Data & Modeling (Deep Research)
**Goal**: Ground the simulation in reality. Avoid "fake numbers".

### Steps
1.  **Redistribution Coefficients**:
    *   [ ] Research/Ingest impact tables for major tax reforms (VAT, Income Tax, CSG) by decile.
    *   [ ] *Source*: IPP (Institut des Politiques Publiques) annual assessments.
2.  **Detailed Employment/Growth Multipliers**:
    *   [ ] Find fiscal multipliers for specific types of spending (Investment vs Transfer).
    *   [ ] *Source*: OFCE / IMF papers on French fiscal multipliers.
3.  **Reform Catalog Update**:
    *   [ ] Populate the `incidence` field in `PolicyLever` with these real-world coefficients.

---

## � Epic 8: Onboarding (The Guided Tour)
**Goal**: Explain the complex UI mechanics to a first-time user without overwhelming them.

### Steps
1.  **Tutorial State**:
    *   [ ] Check `localStorage` for `hasSeenTutorial`. If false, trigger the tour on `/build` load.
2.  **Step-by-Step Flow**:
    *   **Step 1: The Objective (HUD)**. "Voici votre mission : Ramener le déficit sous 3%." (Highlight Scoreboard).
    *   **Step 2: The Map (Treemap)**. "Ceci est le budget de l'État. Chaque carré est une mission." (Highlight Treemap).
    *   **Step 3: The Tools (Catalog)**. "Utilisez le catalogue pour activer des réformes majeures." (Highlight Button).
    *   **Step 4: The Details (Panels)**. "Ou cliquez sur une mission pour ajuster manuellement."
3.  **Reset Mechanism**:
    *   [ ] Add a "Revoir le Tutoriel" option in a Help menu or footer.

---

## 🚀 Execution Strategy
1.  **Validate Phases 1 & 2** (✅ Done): Landing and Cockpit are live.
2.  **Implement Tutorial (Epic 8)**: Create the onboarding overlay to guide the user.
3.  **Enhance Catalog (Epic 3)**: Add the "Ghost Preview" and "Objective Impacts".
4.  **Polish**: Add the "Game Juice" animations.
5.  **Research**: Launch parallel task to source IPP/OFCE coefficients for Epic 6.

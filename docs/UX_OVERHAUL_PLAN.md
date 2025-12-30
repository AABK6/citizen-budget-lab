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
2.  **Layout Structure (Three-Pane)** (✅ *In Progress*)
    *   [x] **Unified Left Panel (Multimodal)**:
        *   **Tabs**: "Missions" vs "Réformes". Switch views instantly.
        *   **Consistency**: Both views use identical list/card styling.
        *   **Drill-down**: Clicking a mission opens details; clicking a reform behaves like a toggle (or opens details if needed).
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
    *   [x] **Stats**: Show "Cost in Political Capital" (e.g., -10 pts) on the card (even if mechanic is fake for now).
    *   [ ] **Filtering**: Tabs for "Retraites", "Fiscalité", "Education".
2.  **Interaction Design**:
    *   [x] **Hover Preview (The Ghost)**: When hovering a reform card *before* clicking, specific bars in the Treemap and the HUD Deficit Bar should "ghost" to show the potential impact. This teaches the user the consequence before the commitment.
    *   [ ] **Batch Selection**: Allow selecting multiple reforms, then "Sign Budget Bill" to apply all at once.
    *   [x] **Impact Engine Metrics**: Show placeholders for "Growth" and "Purchasing Power" on cards.

### Checks & Validation
*   [x] Can open/close modal.
*   [x] Hovering a reform shows where it hits in the budget (Educational).
*   [x] Selecting a reform updates the Deficit in the HUD immediately.

---

## 📅 Epic 4: "Game Juice" & Feedback Loops
**Goal**: Make budget cuts feel significant and satisfying.

### Steps
1.  **Resolution Meter**:
    *   [x] Visual bar in the HUD showing progress towards a "balanced budget" or "target".
    *   [x] Animate fill width on change.
2.  **Notification Snacks**:
    *   [x] When a reform is applied: Show a toast at the bottom center.
        *   *Example*: "✅ Réforme des Retraites appliquée : +12 Md€ d'économies".
3.  **Positive Reinforcement**:
    *   [x] If Deficit drops below key thresholds (3%, 0%), trigger a subtle confetti or "Success" glow on the HUD.

### Checks & Validation
*   [ ] Animations are smooth (60fps).
*   [ ] Feedback is instant (optimistic UI), not waiting for backend if possible.

---

## 📅 Epic 5: Simplification & Cleanup (✅ Done)
**Goal**: Remove "Explorer" baggage. Focus on the game.

### Steps
1.  **Remove Navigation**:
    *   [x] Hide/Remove links to `/explore`, `/procurement` from the main UI.
2.  **Lens Lockdown**:
    *   [x] Hardcode lens to `ADMIN` (Missions).
    *   [x] Remove `LensSwitcher` logic from `BuildPageClient` to simplify state.
3.  **Code Cleanup**:
    *   [x] Remove unused imports in `BuildPageClient`.
    *   [x] Fix duplicate imports.

---

## 🧠 Epic 6: Objective Impact Engine
**Goal**: COMPLETELY REMOVE "Political Capital". Replace with objective, modeled trade-offs to show WHO is impacted and HOW.

### Data Requirements (Deep Research)
1.  **Direct Impact Metrics**:
    *   **Population**: Number of households/businesses impacted.
    *   **Redistribution**: Vertical equity (Decile 1 vs Decile 10 impacts).
    *   **Macro**: GDP multiplier (short term) and employment count.
    *   **Sustainability**: CO2 emissions impact (optional, if available).
2.  **Implementation**:
    *   **Research**: Deep dive for coefficients from IPP, OFCE, Trésor for key reforms (Retraites, TVA, ISF, CICE).
    *   [x] **Schema Update**: `PolicyLever` extended to include `impactStruct`.
    *   **Backend**: Populate `_LEVER_CATALOG` with estimated coefficients.
    *   **UI Update**: Update `ReformCatalogModal` to show these "Real Impacts" cards.

### Tasks
1.  [x] **Schema**: Verify `ImpactStructType` exists in API.
2.  [x] **Data Population**: Add plausible estimates to top 20 reforms in `policy_catalog.py`.
3.  [x] **UI Components**: Create `ImpactBadge` and `DistributionChart` components for the Reform Card.
4.  [x] **Frontend**: Swap "Political Capital" points for these rich metrics in the Catalog.

---

## 🗳️ Epic 7: The "End Game" & Onboarding
**Goal**: Wrap the simulation with a meaningful conclusion and a guided start.

### The Vote (End Game)
*   **No "Game Over"**: Even if the deficit is 4%, the user can "Submit".
*   **Tasks**:
    *   [x] **Vote Checkpoint**: Replace "Share" with "Signer le Budget".
    *   [x] **Debrief Screen**: Modal summary before submission.
    *   [x] **Persistence**: Backend stores final state.

### The Guided Tour (Onboarding)
*   **Goal**: Explain mechanics to first-time users.
*   **Tasks**:
    *   [x] **Tutorial State**: Check `localStorage` for `hasSeenTutorial`.
    *   [x] **Step-by-Step Flow**: HUD -> Treemap -> Catalog -> Details.
    *   [x] **Reset Mechanism**: Add "Revoir le Tutoriel" option.

---

## 🚀 Execution Strategy
1.  **Validate Phases 1 & 2** (✅ Done): Landing and Cockpit are live.
2.  **Simplify & Cleanup** (✅ Done): Epic 5 complete.
3.  **Vote Mechanics** (✅ Done): Epic 7 (Part 1) complete.
4.  **Implement Objective Impacts (Epic 6)** (✅ Done): Impact Engine is live with real data.
5.  **Final Polish** (✅ Done): Animations, Reform Toasts, and Tutorial Reset implemented.

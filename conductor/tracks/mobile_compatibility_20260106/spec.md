# Specification: Mobile Compatibility Overhaul

## 1. Overview
This feature track aims to make the **Landing Page** and the **Core Simulation Page** fully responsive and user-friendly on mobile devices. The goal is to provide a seamless experience on small screens without compromising the depth of the budget simulation, specifically adapting the complex Treemap visualization and Revenue controls for touch interactions and limited screen real estate.

## 2. Functional Requirements

### 2.1 Core Simulation Page
*   **Treemap Visualization:**
    *   The Treemap must occupy the full width of the mobile screen.
    *   **Interaction:** Tapping a "Mission" (block) within the Treemap should open a detail view (e.g., bottom sheet or overlay drawer) instead of a sidebar, allowing users to adjust sliders/inputs for that mission.
*   **Revenue Controls:**
    *   **Desktop/Tablet:** Retain the existing side-drawer behavior.
    *   **Mobile:** Introduce a dedicated trigger (e.g., an icon or button in the top navigation bar). Tapping this trigger opens the Revenue controls in a **Full-Screen Modal** or dedicated view overlay.
*   **Summary Bar (Top):**
    *   Retain the sticky summary bar showing key metrics (Deficit, etc.).
    *   Refactor the layout to be compact and legible on mobile (e.g., stack values, reduce font size, or hide secondary metrics behind a toggle).

### 2.2 Landing Page
*   **Layout Adaptation:** Implement a custom mobile layout strategy (moving beyond simple stacking where necessary) to ensure a logical content flow.
*   **Content optimization:** Hide the complex hero graph or heavy visualizations on mobile viewports to improve readability and performance ("Scrap the graph").

## 3. Non-Functional Requirements
*   **Responsiveness:** UI must adapt fluidly to standard mobile breakpoints (e.g., iPhone SE, Pixel, iPhone Pro Max) up to tablets.
*   **Performance:** Ensure smooth scrolling and transitions (drawer opening/closing) on mobile devices.
*   **Code Quality:** Utilize existing Tailwind utility classes for responsive design (`md:`, `lg:`) rather than duplicating components unless absolutely necessary for the custom layouts.

## 4. Out of Scope
*   Admin/Back-office interface mobile optimization.
*   Native mobile app development (PWA or Wrapper).

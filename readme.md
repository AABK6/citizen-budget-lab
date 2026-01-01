# Citizen Budget Lab (France)

*A public, transparent, and interactive app to explore French public spending and test “what‑if” scenarios—with credible macro and distributional impacts.*

---

## 1. Overview

**Problem:** Public debate on budgets is polarized and opaque. Citizens rarely see who spends what, for what outcomes, and what trade‑offs reforms imply.

**Solution:** Citizen Budget Lab is a web app that aggregates open French public‑finance data, allowing users to explore the budget, build their own scenarios, and see the potential impacts of their choices.

**Impact:** Improve understanding and trust by making trade‑offs tangible and sourced. Enable better media coverage and civic education; give policymakers a neutral, auditable sandbox.

## 2. Key Documentation

This repository contains extensive documentation to help users and developers understand the project.

*   **For Users & Product Managers:**
    *   [**Product Specification**](./docs/PRODUCT_SPEC.md): A detailed description of the product vision, features, and user journeys.
    *   [**Data Manifest**](./docs/DATA_MANIFEST.md): An inventory of all data sources, schemas, and pipelines.
    *   [**LEGO Methodology**](./docs/LEGO_METHOD.md): An explanation of the methodology used to create the simplified "LEGO piece" budget components.

*   **For Developers:**
    *   [**Developer Guide**](./docs/DEVELOPER_GUIDE.md): A comprehensive guide for setting up the development environment, running the application, and understanding the technical architecture.
    *   [**Current Development Plan**](./current_dev_plan.md): The authoritative roadmap describing open architectural work.
    *   [**Backlog**](./BACKLOG.md): Task-by-task tracking aligned with the current plan.

## 3. Quick Start

For detailed instructions on how to set up and run this project locally, please see the [**Developer Guide**](./docs/DEVELOPER_GUIDE.md).

## 4. Deployment (Cloud Run)

Production runs on Google Cloud Run as two services (API + frontend). The default service URLs include both `run.app` and legacy `a.run.app` domains that point to the same service. Deployment steps and current production notes live in [**docs/DEVELOPER_GUIDE.md**](./docs/DEVELOPER_GUIDE.md).

## 5. Baseline & Scenario Outputs

-   The simulation engine now returns both the **absolute fiscal path** (baseline + scenario deltas) and the **separate baseline/delta components** for deficit and debt. Frontend views such as `/build`, `/compare`, and `/what-if` add these together so the default cards show the Treasury’s starting deficit (≈ €150 bn in 2026) instead of a zero delta.
-   API consumers can still inspect pure deltas via the new `deficitDeltaPath` / `debtDeltaPath` fields, which mirror previous behaviour for backwards-compatible analytics.

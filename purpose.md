Citizen Budget Lab — Purpose & Scope

Summary

Citizen Budget Lab is an open, neutral, and interactive web app to understand how public money is used in France and to experiment with building a balanced, realistic budget. It aggregates transparent, sourced data; lets users adjust spending and taxes; and shows the accounting, rule‑of‑thumb macro, and (V1) distributional impacts with clear assumptions and uncertainty.

Why

- Debate on public finances is polarized, opaque, and often relies on orders of magnitude that are hard to grasp. People don’t see who spends what, for whom, and what is at stake when changing one euro here or there.
- We aim to turn trade‑offs into something people can touch: move a slider, see what changes, and trace back to sources.

Who It’s For

- Citizens & students: learn where money goes and compare over time/peers.
- Journalists & fact‑checkers: build shareable, sourced visuals and simple scenarios.
- Teachers: run classroom exercises (“move €1bn from X to Y”) tied to curriculum.
- Civil society & analysts: stress‑test proposals with transparent assumptions.
- Local officials: benchmark and understand constraints (V2: local module).

What It Is (Product in One Page)

- Explore €1: navigate spending by administrative lens (missions/programmes) and functional lens (COFOG); always with totals, shares, trends, and sources.
- Who gets paid?: procurement recipients (firms/NGOs), geography, sectors; transparency on amounts and data quality flags.
- Budget Playground ↔ Policy Workshop (MVP+/V1): two synchronized ways to build a plan.
  - Top‑Down “What”: use Budget Dials on big mass blocks (Education, Pensions, Health, Defense, Revenues) in the Playground. Twin stacked bars (Spending vs Revenues) sit center stage; the gap equals deficit/surplus.
  - Bottom‑Up “How”: specify concrete, fixed-impact levers in the Policy Workshop (e.g., Repeal 2023 Pension Reform, Lower VAT on Energy). A progress bar shows how much of a mass goal is specified.
  - Resolution Meter: HUD indicator “Specified 0–100%” quantifying how much of mass goals are explained by policies. Unspecified remains visible (pending stripes on masses; watermark on share cards).
  - Lens Switch: above the charts toggle By Mass ⇄ By Reform Family ⇄ By Named Reform to see the same scenario through three lenses.
  - Permalink & Share Card: every state has a shareable permalink and a stamped image card with methods/version and “Specified X%” if partially resolved.
- Distributional (V1): OpenFisca‑powered impacts by deciles/households/regions for tax/benefit changes.
- Macro (lite): reduced‑form impulse responses (IRFs) to show plausible bands for GDP/jobs/deficit changes; ranges and assumptions are explicit.
- Compare EU (V1): COFOG shares and fiscal ratios vs peers.

Interaction model on Build: the UI reads left→right as Choices → Creation → Consequences and supports both top‑down and bottom‑up entry points.
- Choices: LEGO Shelf and Reform Library (spending/revenue tabs; search with synonyms; filters; locks/bounds badges; feasibility hints).
- Creation: Budget Playground with Twin Bars, mass stacks, and tactile Budget Dials; Policy Workshop with hierarchical families → levers, presets, progress‑to‑target, and a Path‑Compare tray for alternative mixes.
- Consequences: Accounting (balance and debt path), EU rule “lights”, Distributional, and Macro bands; always stamped with method chips and uncertainty ranges.
- HUD: Resolution Meter (Specified %), year selector, real/nominal toggle, undo/redo.
- Dual lenses: Lens Switch recolors stacks into Reform Families or Named Reforms while preserving totals; ribbons can “paint” across multiple masses to show cross‑effects.

Design Principles

- Neutral & transparent: show sources on every chart; display ranges/uncertainty and assumptions; document limitations.
- Credible but simple: start with mechanical accounting; add distributional/macro in layers; prefer explainable rules to opaque black boxes.
- Inclusive & accessible: plain language, FR/EN, keyboard‑friendly, color‑blind palettes; always “show the table”.
- Artifact‑first sharing: every state has a permalink plus a source‑stamped image card suitable for social/newsroom embeds; links include a methods/version hash to preserve context. Cards include a “Specified X%” watermark when unresolved.

What It Is Not (Non‑Goals)

- A legal reference on EU fiscal compliance; we surface informative indicators, not formal decisions.
- Full general equilibrium macro forecasting; we show reduced‑form, transparent priors with uncertainty.
- Personal data collector; household inputs (V1) are optional and can be processed locally/anonymously.

How It Works (Architecture)

- Data pipelines: nightly pulls from public portals (Eurostat, INSEE, data.gouv/ODS, OFGL…); schema checks; provenance registry.
- Warehouse/semantic layer: normalized tables (Parquet/DB), admin↔COFOG mappings, aggregated views by subsector (S13).
- Services: GraphQL Query API (Explorer, Procurement, LEGO), Compliance, Macro kernel (lite), OpenFisca wrapper (V1).
- Client: Next.js SPA; scenario state machine; share/export; i18n/a11y baked in.

Roadmap (High‑Level)

- MVP: Explorer, Procurement, mechanical scenarios, EU lights, macro‑lite.
- MVP+: Budget Playground with Budget Dials and pending state; beneficiary lens; permalinks & share cards.
- V1: Policy Workshop (families/levers), Lens Switch, Compare & Remix, Distributional (OpenFisca), EU comparisons, Classroom mode and weekly Challenges (Resolution ≥80% to submit).
- V2: Macro priors & uncertainty fans, Local finance module with constraints.

Trust & Governance

- Methods open by default; advisory panel (economists, public finance, civil society, data stewards).
- Versioned assumptions and change logs; visible caveats where data quality is limited.

Where To Start

- Read readme.md for the product brief and contracts; BACKLOG.md for the delivery plan; README_DEV.md for developer instructions.
- Launch locally: API (FastAPI + GraphQL) and front‑end (Next.js) with docker compose or dev servers.

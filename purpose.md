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
- Build your budget (MVP+): LEGO‑style “pieces” for expenditures and revenues with plain labels (e.g., “Teachers & schools”, “Hospitals & ER”, “VAT standard rate”), mapped rigorously to COFOG/ESA. Users assemble a budget from scratch or adjust the current one and see balance, debt path, and EU rule indicators.
- Distributional (V1): OpenFisca‑powered impacts by deciles/households/regions for tax/benefit changes.
- Macro (lite): reduced‑form impulse responses (IRFs) to show plausible bands for GDP/jobs/deficit changes; ranges and assumptions are explicit.
- Compare EU (V1): COFOG shares and fiscal ratios vs peers.

Design Principles

- Neutral & transparent: show sources on every chart; display ranges/uncertainty and assumptions; document limitations.
- Credible but simple: start with mechanical accounting; add distributional/macro in layers; prefer explainable rules to opaque black boxes.
- Inclusive & accessible: plain language, FR/EN, keyboard‑friendly, color‑blind palettes; always “show the table”.

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
- MVP+: LEGO Budget Builder (public‑facing pieces), beneficiary lens, permalinks.
- V1: Distributional (OpenFisca), EU comparisons, Classroom mode.
- V2: Macro priors & uncertainty fans, Local finance module with constraints.

Trust & Governance

- Methods open by default; advisory panel (economists, public finance, civil society, data stewards).
- Versioned assumptions and change logs; visible caveats where data quality is limited.

Where To Start

- Read readme.md for the product brief and contracts; BACKLOG.md for the delivery plan; README_DEV.md for developer instructions.
- Launch locally: API (FastAPI + GraphQL) and front‑end (Next.js) with docker compose or dev servers.


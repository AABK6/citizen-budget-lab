# API Map — France Spending Explorer

**Goal**
Give the app reliable, up‑to‑date, and well‑documented pipes into French and EU public‑finance data for (1) central & local budgets, (2) procurement/contracts, (3) social protection & health, (4) macro/fiscal time series for scenario modeling, and (5) robust reference catalogs (geo & organisations).

---

## Conventions used below

* **Base URL** → canonical API root.
* **Auth** → none | API key | OAuth2 (client credentials).
* **Key endpoints** → most useful paths with brief purpose.
* **Fields to rely on** → identifiers/keys you should use for joins.
* **Freshness** → update cadence you can expect.
* **Notes / gotchas** → breaking changes, rate limits, caveats.

---

**Fresh addition (2025-09-22):** The API’s `runScenario` payload now returns `baselineDeficitPath` / `baselineDebtPath` alongside their delta equivalents. When integrating downstream analyses, add the baseline back if you need absolute levels rather than pure scenario deltas.

---

## A) Central‑government budget & performance (MEFSIN / data.economie.gouv.fr)

**Platform**: Opendatasoft “Explore API v2.1” (uniform across many datasets)

* **Base URL**: `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records`
* **Auth**: none (public). Consider caching & backoff.
* **Query pattern**: `?select=...&where=...&group_by=...&order_by=...&limit=...&offset=...`
* **Representative datasets** (all ODS):

  1. **PLF 2025 – Dépenses selon destination**

     * Dataset id: `plf25-depenses-2025-selon-destination`
     * Fields: `code_mission`, `mission`, `code_programme`, `programme`, `code_action`, `action`, `cp` (Crédits de paiement), `ae` (Autorisations d’engagement), `ministere`.
     * **Freshness**: once per PLF (annually; published Oct Y‑1 for Y).
     * **Sample**: `.../plf25-depenses-2025-selon-destination/records?select=code_mission,mission,code_programme,programme,sum(cp) as cp&group_by=code_mission,mission,code_programme,programme&order_by=code_mission`
  2. **Budget vert (PLF 2025)**

     * Dataset id: `plf25-budget-vert`
     * Adds climate tagging axes and scores for credits (execution 2023, LFI 2024, PLF 2025).
  3. **Performance – exécution & cibles**

     * Dataset id: `performance-execution-cible-n-1-du-budget-de-l-etat-jusqu-au-niveau-sous-indicateur`
     * Key fields: `mission`, `programme`, `indicateur`, `sous_indicateur`, `valeur_execution`, `valeur_cible_n_plus_1`.
  4. **Historical LFI/PLF/LFR series**

     * Multiple dataset ids (per vintage). Same query pattern.
* **Fields to rely on**: `code_mission`, `code_programme`, `code_action` (destination); `titre`, `categorie` (nature) when available; `ministere`.
* **Notes / gotchas**:

  * Nomenclature (missions/programmes/actions) changes over years; keep a lookup layer and version your joins by **exercise** (year).
  * ODS API is fast but not infinite; use pagination, HTTP caching, and async batchers.

---

## B) Procurement & contracts

1. **DECP v3 – Données essentielles de la commande publique (marchés & concessions)**

* **Base**: consolidated open files exposed via data.gouv.fr & data.economie.gouv.fr (ODS Explore API v2.1 for the unified “consolidated” views).
* **Auth**: none.
* **Key consolidated datasets**:

  * `decp-v3-marches-valides` (marchés)
  * `decp-v3-concessions-valides` (concessions)
* **Fields to rely on**: `acheteur.id` (**SIRET/SIREN**), `acheteur.nom`, `id`, `objet`, `dateNotification`, `montant`/`montantTtc`, `procedure`, `lieuExecution.code` (INSEE code), `titulaire.siren/siret` (array), per‑lot fields.
* **Freshness**: rolling; national consolidation updated frequently (weekly to monthly) depending on source feeds.
* **Notes / gotchas**:

  * **New schema from 2024** unified DECP with recensement économique—expect better completeness but still **many missing amounts**; build imputation rules and “data quality” flags.
  * Use **SIREN/SIRET** to join to Sirene (see Section F) and **INSEE commune codes** to geo.
  * Deduplicate: same contract may appear multiple times (profile duplicates, updates). Keep last version by `id` + `datePublication`.

2. **BOAMP API** (notices)

* Helpful for near‑real‑time awareness and cross‑validation. Keep as optional enrichment (not the canonical spend source).

---

## C) Local‑government finances

1. **Balances comptables des communes / collectivités** (DGFiP via data.economie.gouv.fr, ODS)

* **Example datasets**: `balances-comptables-des-communes-en-2024`, `balances-comptables-des-collectivites-et-des-etablissements-publics-locaux-avec-la-presentation-croisee-nature-fonction-2024` (and similar for other years).
* **Fields**: `exercice`, `collectivite` (nom), `code_insee`, `compte`, `libelle_compte`, `montant`, plus cross‑presentation Nature/Fonction.
* **Freshness**: annual (CA/Compte administratif approval cadence). Add multi‑year backfills.
* **Gotchas**: different M14/M57 accounting frames over time; align with code lists per year.

2. **OFGL (Observatoire des finances et de la gestion publique locales)**

* **Base**: ODS Explore API v2.1 under `https://data.ofgl.fr/api/explore/v2.1/...`
* **Use**: indicators, aggregates, ratios, and metadata on local tiers; convenient for dashboards and QA versus raw balances.

---

## D) Social protection & health (aggregates)

1. **DREES Open Data** (Opendatasoft)

* **Base**: `https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records`
* **Key datasets**:

  * **Comptes de la protection sociale**: amounts by scheme/risk/operation.
  * **ONDAM** (health spending target) breakdowns.
  * Series on beneficiaries and minima sociaux (levels and reform impacts).
* **Auth**: none.
* **Gotchas**: many series come as Excel + CSV; use ODS API when available; vintage‑sensitive.

2. **CNAF (Cafdata)**

* **Base**: `https://data.caf.fr/api/explore/v2.1/...`
* **Use**: counts/amounts by benefit and territory; complements DREES. (Beware privacy thresholds & aggregation levels.)

Reform inputs (for Policy Workshop)

- Pensions (CNAV/DREES): base aggregates for age path scenarios (flows and balances), indexation rules/series, special regimes convergence. Use for calibrating levers like “Age +3m/yr to 64”, “Indexation CPI‑0.3”. Vintage‑sensitive; version assumptions.
- Health staffing (ONDAM + PAP/RAP): counts and targets for nurses/doctors, pay grid references (e.g., “grille indiciaire”), and coverage indicators to tag feasibility/lag (not auto‑costing in MVP).
- Social benefits (CNAF/DREES): base series to support toggles on minima sociaux/allocations; use as metadata for feasibility, not as automatic fiscal deltas in MVP.

---

## E) Macro‑fiscal time series for scenarios

1. **INSEE BDM (Banque de Données Macroéconomiques)**

* **Base SDMX**: `https://api.insee.fr/series/BDM/V1/data/{DATASET}/{FILTERS}?time=...`
* **Auth**: OAuth2 client credentials (token from INSEE API portal).
* **Use**: GDP, deflators, employment/unemployment, prices, sector accounts incl. **APU S13**.
* **Notes**: annual benchmark updates (late May/June) can revise levels; version outputs by extraction date.

2. **Eurostat (SDMX)**

* **Primary Access Method:** The application prioritizes the **SDMX 2.1 XML dissemination API** for reliability, as it is not subject to the same gating issues as the JSON API. The base URL for this is configured via the `EUROSTAT_SDMX_BASE` environment variable.
**Fallback Method (JSON):** The older SDMX-JSON API is used as a fallback. Access may require a `EUROSTAT_COOKIE` to be set in the environment.
**Use:** EU-harmonised fiscal series (e.g., **gov_10dd_edpt1** for deficit/debt; **gov_10a_exp** for **COFOG** functions) to benchmark France and to obtain COFOG splits not readily in national budget nomenclature.
* **Auth**: none.

3. **Banque de France – Webstat**

* **Access**: Opendatasoft Explore API (for many tables) + SDMX endpoints.
* **Use**: rates, financial conditions, supplementary macro series.

4. **DB.nomics aggregator** (optional)

* **Base**: `https://api.world/series/{provider}/{dataset}/{series}.json` (provider e.g., `INSEE`, `EUROSTAT`). Useful when you prefer one client to query multiple SDMX sources; still validate against primaries.

---

## F) Reference catalogs (join keys)

1. **Sirene (INSEE) – entreprises & établissements**

* **Base**: `https://api.insee.fr/entreprises/sirene/V3/`
* **Auth**: OAuth2 (client credentials) via INSEE.
* **Key endpoints**: `/siren`, `/siret` (query by id or criteria), with “courant” & “historique” scopes.
* **Fields to rely on**: `siren`, `siret`, `denominationUniteLegale`, `categorieJuridiqueUniteLegale`, `trancheEffectifsUniteLegale`, `activitePrincipaleUniteLegale` (NAF), `dateCreationUniteLegale`, `etatAdministratif`.
* **Use**: normalize buyers & suppliers; reconcile to DECP; aggregate by legal forms, sectors, and size.

2. **GEO – Découpage administratif (geo.api.gouv.fr)**

* **Base**: `https://geo.api.gouv.fr/`
* **Key endpoints**: `/communes`, `/departements`, `/regions`, `/epcis`, with `fields=...`, `format=geojson`, `geometry=centre|contour`, and **`millesime=`** to lock a given year.
* **Use**: map INSEE codes to names/boundaries; rollups across administrative tiers.

3. **BAN – Base Adresse Nationale (geocoding)**

* **Base**: `https://api-adresse.data.gouv.fr/search/` and `/reverse/`
* **Use**: optional geocoding of free‑text locations in contracts or budget notes; prefer INSEE codes when provided.

---

## G) Portal & catalog APIs

1. **data.gouv.fr – CKAN API** (metadata & resources)

* **Base**: `https://www.data.gouv.fr/api/1/`
* **Key endpoints**: `/datasets/` (search & list), `/datasets/{id}/`, `/organizations/{slug}/datasets`, `/reuses/`.
* **Use**: discover sources programmatically; monitor updates; pull resource URLs for bulk downloads.

2. **Opendatasoft Explore API v2.1** (all ODS portals above)

* **Base**: `.../api/explore/v2.1/catalog/datasets/{dataset}/records`
* **Notes**: homogeneous across data.economie.gouv.fr, data.ofgl.fr, data.caf.fr, data.drees..., Banque de France Webstat, etc. Respect pagination; prefer server‑side `group_by` and `select`.

---

## H) Policy microsimulation (optional but powerful)

**OpenFisca‑France**

* **Mode**: self‑host the OpenFisca API alongside the Python package & parameter repository to simulate tax/benefit reforms for scenario impacts on households (poverty, inequality). Use this in **macro‑micro** loops (see modeling doc), not for central budget accounting per se.
* **Endpoints**: `/calculate`, `/entities/`, `/parameters/`.
* **Auth**: none (if self‑hosted); the public demo API is not guaranteed for production.

---

## I) Classifications & code lists

* **COFOG** (functional classification) – use via Eurostat metadata/code lists and keep a local copy for joins.
* **NAF/APE** (economic activities) – from INSEE.
* **CPV** (procurement vocabulary) – EU codelist for lots/items.
* **Budget nomenclature** – Missions/Programmes/Actions (keep per‑year tables; do **not** assume stability across vintages).

---

## J) Authentication & rate limits (operational)

* **INSEE (Sirene & BDM)**: OAuth2 client‑credentials; typical quotas (per‑minute + daily). Build token cache and graceful backoff; parallelize within limits.
* **Eurostat / ODS portals (data.economie, OFGL, DREES, CAF)**: public, no key. Eurostat SDMX‑JSON can be gated in some edges (set `EUROSTAT_COOKIE` if needed); prefer the dissemination SDMX XML data endpoint for reliability. Still implement retries & caching.
* **BOAMP**: public; consider caps; cache aggressively.

---

## K) Data quality & reconciliation rules (must‑haves)

* **Dates**: normalize to ISO 8601; for budgets use `exercice` as join key; for DECP use `dateNotification` and `datePublication`.
* **Money**: always store both AE and CP where available; sum at the **lot** level; track currency (mostly EUR) and tax base (HT/TTC) flags.
* **Org & Geo**: prefer **SIREN/SIRET** and **INSEE commune codes** as primary keys; derive department/region/EPCI from commune code using GEO API (with **millesime** aligned to the year of the data).
* **De‑dup**: DECP: last version per `id`; Budget datasets: deduplicate by `{exercice, code_mission, code_programme, ...}`.
* **Provenance**: store `dataset_id`, `resource_id`, extraction timestamp, and full request URL.

---

## L) Recent & upcoming changes to watch (breaking‑risk)

* **DECP schema**: new version in force **from 2024‑01‑01** (merged with recensement économique); ensure your parser handles v3 fields and that you centralize via the consolidated national views.
* **INSEE API portal migration**: the legacy portal is being phased out in **2025**; create clients against the **current** portal; rotate credentials & token endpoints.
* **BAN / Adresse**: infrastructure migration towards the IGN geoplatform (late 2025 timeline). Abstract BAN behind a geocoding adapter so you can flip hosts without code churn.
* **INSEE national accounts**: benchmark updates each late May/June; macro series are revised—version scenario baselines.

---

## M) Minimal example calls (copy‑paste ready)

* **ODS aggregate by programme**

  ```
  GET https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/plf25-depenses-2025-selon-destination/records
      ?select=code_programme,programme,sum(cp)%20as%20cp
      &group_by=code_programme,programme
      &order_by=code_programme
  ```
* **Sirene – lookup unité légale**

  ```
  GET https://api.insee.fr/entreprises/sirene/V3/siren/{SIREN}
  Authorization: Bearer {token}
  ```
* **INSEE BDM – SDMX (example)**

  ```
  GET https://api.insee.fr/series/BDM/V1/data/{DATASET}/{FILTERS}?firstNObservations=1
  Authorization: Bearer {token}
  ```

* **Eurostat — SDMX XML examples (Primary Method)**

*   Expenditure bucket (COFOG × NA_ITEM)
     ```
     GET https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/GOV_10A_EXP/A.MIO_EUR.S13.GF07.D632.FR?time=2026
     Accept: application/xml
     ```

 *   Interest proxy (COFOG 01.7 total)
     ```
     GET https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/GOV_10A_EXP/A.MIO_EUR.S13.GF0107.TE.FR?time=2026
     Accept: application/xml
     ```

 **Eurostat — LEGO baseline flow map (reference)**

 For more details on the exact data flows and keys used for the LEGO baseline, see `docs/LEGO_METHOD.md`.

---

Reform inputs — Environment / Carbon

- Excise bases and rates (DGFiP/Eurostat): baseline for carbon tax levels (CO2e/t) and excise families (TICPE/TICGN/etc.). Use to parameterize a Carbon Tax lever (rate, base coverage) and recycling paths (dividend vs. labor tax cut). For distributional notes, join to household fuel shares when available.

Reform inputs — Staffing (teachers/nurses/cops)

- PAP/RAP performance indicators and ministerial HR series for FTE counts, salary grids, and coverage ratios. Use to tag feasibility (Law/Admin/Lag) and indicative lags for hiring/redeployments. MVP does not auto‑cost; amounts are lever‑driven with sources attached.

---

## N) What this enables in the app

* Drilldowns: **Mission → Programme → Action → Sous‑action**, cross‑tab with **COFOG** where feasible.
* Benchmarks: compare France to EU peers on **COFOG** shares and **EDP deficit/debt**.
* Procurement explorer: who buys what, where, for how much; join buyers/suppliers via **SIREN/SIRET**; map to local tiers via **INSEE codes**.
* Scenario engine: use **INSEE/Eurostat** macro series as baseline; optionally couple with **OpenFisca** for micro‑impacts; output growth/jobs/deficit sensitivities.

---

## O) Next technical steps

1. Extend typed clients (ODS, Eurostat SDMX XML) with local caching, constraints parsing, and rate‑limit aware retries.
2. Build an **ETL ingestion catalogue** with per‑dataset schedulers, schema validators, and versioned snapshots.
3. Implement **join rules** (Org/Geo/Time) + a **COFOG mapping layer** (document assumptions) — ongoing.
4. Add **QA dashboards** (coverage, missing amounts, duplicates) before exposing to users.
5. Parameterize revenue splits (VAT standard/reduced; PIT/CIT; D.29 sub‑splits) in config and document them.

# Track Plan: Data Consistency Audit (Pricetag vs Trajectory)

This track addresses the bug where the "pricetag" (`fixed_impact_eur`) on the UI card differs significantly from the "2026 impact" in the multi-year trajectory (`multi_year_impact['2026']`). This confusion undermines user trust.

## Phase 1: Diagnosis & Detection
Goal: Identify all reforms where the pricetag and the 2026 trajectory diverge significantly.

- [x] **Task: Create Audit Script**
    - [x] Create `tools/audit_impact_consistency.py`.
    - [x] Logic: Load `data/policy_levers.yaml`. Compare `fixed_impact_eur` vs `multi_year_impact['2026']`.
    - [x] Threshold: Flag if difference > 20% or > 100 M€.
    - [x] Output: Generate `data/impact_discrepancies.csv`.

- [x] **Task: Run Initial Audit**
    - [x] Run the script and analyze the extent of the issue.

## Phase 2: Pipeline Design
Goal: Establish a repeatable process/tool to verify and correct these values using external sources.

- [ ] **Task: Enhance Research Tool**
    - [ ] Update `tools/research_policy.py` to add a `verify_cost` mode.
    - [ ] Logic: Search for specific 2026 vs "steady state" (régime de croisière) costs.

## Phase 3: Execution & Correction
Goal: Fix the data in `policy_levers.yaml` to be consistent and accurate.

- [x] **Task: Source Verification (Deep Dive)**
    - [x] **Constraint:** Use only Institutional Reports (Senate, Inst. Montaigne, FIPECO, etc.) with clickable URLs.
    - [x] Sub-task: Verify `wealth_tax` (ISF) - *Aligned to FIPECO (6.3Md€)*.
    - [x] Sub-task: Verify `cut_vat_energy` - *Aligned to Inst. Montaigne (11.3Md€)*.
    - [x] Sub-task: Verify `lower_retirement_age_60` - *Aligned to Inst. Montaigne (33Md€)*.
    - [x] Sub-task: Verify `lower_retirement_age_62` - *Aligned to Inst. Montaigne (14Md€)*.
    - [x] Sub-task: Verify `build_social_housing` - *Calculated (33.8Md€) w/ Banque des Territoires*.
    - [x] Sub-task: Verify `raise_civil_service_pay` - *Extrapolated (21.7Md€) w/ Senate*.
    - [x] Sub-task: Verify `free_school_services` - *Aligned to iFRAP (9Md€)*.
    - [x] Sub-task: Verify `is_rate_33_5` - *Aligned to FIPECO (8Md€)*.

- [x] **Task: Batch Fix - Major Discrepancies**
    - [x] Apply corrections based on reputable data. (Executed `tools/fix_impact_with_reputable_sources.py`)
    - [x] Ensure `fixed_impact_eur` matches the "Steady State" annual cost.
    - [x] Ensure `multi_year_impact` is consistent with `fixed_impact` for 2026 (Full Year Hypothesis).
    - [x] Update `policy_levers.yaml` with URLs.

## Phase 4: Systematic Verification (Prioritized Batches)
Goal: Verify and link all remaining estimates, prioritized by discrepancy magnitude.

**Protocol per item:**
1.  **Search:** Find an official/reputable source (Senate, Court of Auditors, Institut Montaigne, OFCE, iFRAP, DG Trésor).
2.  **Verify:** Check the "Full Year" cost.
3.  **Update:** Set `fixed_impact_eur` to the verified full-year cost.
4.  **Align:** Set `multi_year_impact['2026']` to `fixed_impact_eur` (per "Full Year Simplicity" rule).
5.  **Source:** Add the specific URL to `sources`.

- [x] **Batch 2: High Value (> 2 Md€ Discrepancy)**
    - [x] `raise_retirement_age_65` (Diff: 6.5Md€)
    - [x] `extend_contribution_period` (Diff: 4.5Md€)
    - [x] `freeze_tax_brackets` (Diff: 4.1Md€) - *Corrected to 2.2Md€*.
    - [x] `transfer_pricing_enforcement` (Diff: 4.1Md€)
    - [x] `amend_no_benefit_index_freeze` (Diff: 3.8Md€) - *Corrected to 4Md€*.
    - [x] `freeze_apul_budget_value` (Local Budgets) (Diff: 3.7Md€) - *Corrected to 5Md€*.
    - [x] `freeze_spending_one_year` (State Spending) (Diff: 3.0Md€)
    - [x] `remove_ticpe_air_exemption` (Kerosene) (Diff: 3.0Md€) - *Corrected to 660M€*.
    - [x] `cut_defense_spending` (Diff: 2.7Md€)
    - [x] `airline_ticket_tax_increase` (Diff: 2.7Md€) - *Corrected to 850M€*.
    - [x] `freeze_local_transfers_value` (Diff: 2.6Md€)
    - [x] `annee_blanche_indexation` (Diff: 2.5Md€) - *Corrected to 4Md€*.
    - [x] `superprofits_tax` (Diff: 2.5Md€) - *Corrected to 6Md€*.
    - [x] `progressive_csg` (Diff: 2.5Md€) - *Corrected to 2.8Md€*.
    - [x] `cut_fuel_taxes` (Diff: 2.5Md€)
    - [x] `cut_public_workforce` (Diff: 2.3Md€)
    - [x] `cap_health_spending` (ONDAM) (Diff: 2.2Md€) - *Corrected to 2.5Md€*.
    - [x] `cap_quotient_conjugal` (Diff: 2.1Md€)
    - [x] `amend_raise_big_corp_profit_contrib` (Diff: 2.0Md€)

- [x] **Batch 3: High Overall Impact (Absolute Fixed Impact > 5Md€)**
    - [x] Identify remaining items with `abs(fixed_impact_eur) > 5,000,000,000`.
    - [x] Verify sources and align trajectory. (Executed `tools/fix_batch_3_verified.py`)
        - `restore_taxe_habitation_top20`: Corrected to 8Md€.
        - `abolish_quotient_conjugal`: Corrected to 7Md€.
        - `vat_all_rates_plus1`: Corrected to 12Md€.
        - `vat_normal_plus1`: Corrected to 8.2Md€.
        - `high_income_surtax`: Corrected to 2Md€.
        - `remove_pension_deduction`: Corrected to 4.6Md€.
        - `freeze_pension_indexation`: Aligned to 4Md€.
        - `amend_raise_big_corp_profit_contrib`: Aligned to 6Md€.

- [x] **Batch 4: Medium Value (Remaining Discrepancies > 1 Md€)**
    - [x] Run audit script to find remaining items.
    - [x] Apply "Full Year Simplicity" alignment (User Directive) to remaining items. (Executed `tools/fix_batch_4_simple.py`)
    - [x] **Add Links:** Added clickable URLs to top Batch 2 and Batch 4 items (Executed `tools/add_batch_4_links.py`).

## Phase 5: UI Clarity (Optional)
- [ ] **Task: Clarify UI Labels**
    - [ ] If `fixed_impact_eur` is "Régime de croisière", update the UI card to say "Impact à terme" or similar.

- [ ] **Batch 4: Tail (< 1 Md€)**
    - [ ] Remaining items.

## Phase 5: UI Clarity (Optional)
- [ ] **Task: Clarify UI Labels**
    - [ ] If `fixed_impact_eur` is "Régime de croisière", update the UI card to say "Impact à terme" or similar.

## Phase 4: UI Clarity (Optional but Recommended)
- [ ] **Task: Clarify UI Labels**
    - [ ] If `fixed_impact_eur` is "Régime de croisière", update the UI card to say "Impact à terme" or similar, OR ensure the simulation engine handles the ramp-up correctly if the user expects 2026 impact.

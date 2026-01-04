# Track Plan: Data Integrity & CI Hardening

**Goal:** Permanently safeguard data quality by integrating strict semantic checks into the Continuous Integration (CI) pipeline. This prevents regression of the "Pricetag vs Trajectory" alignment and ensures all high-impact policy levers remain properly sourced.

## Phase 1: Enhanced Validator Development [checkpoint: 696fded]
Goal: Upgrade the catalog validator with semantic rules derived from the recent audit.

- [x] **Task: Implement Strict YAML Loading** [commit: 2a399a9]
    - [ ] Update `tools/validate_policy_catalog.py` to use a loader that rejects duplicate keys (standard YAML loaders often silently overwrite them).
- [x] **Task: Add Impact Consistency Rule** [commit: 7ca4daa]
    - [ ] Logic: Fail validation if `abs(fixed_impact_eur - multi_year_impact['2026'])` exceeds a threshold (e.g., 100M€ or 1%).
- [x] **Task: Add Sourcing Requirement Rule** [commit: c697310]
    - [ ] Logic: Fail validation if a lever with `abs(fixed_impact_eur) > 1Md€` does not contain at least one valid URL in its `sources` list.

## Phase 2: CI Integration
Goal: Automate these checks on every code/data change.

- [x] **Task: Configure GitHub Actions** [commit: 407caed]
    - [ ] Ensure `tools/validate_policy_catalog.py` is executed in the CI environment (e.g., in `.github/workflows/ci.yml`).
    - [ ] Verify that data errors correctly block PR merges.

## Phase 3: Documentation [checkpoint: 15be30b]
- [x] **Task: Update Contributor Guide** [commit: 9222657]
    - [ ] Document the data integrity requirements in `docs/DEVELOPER_GUIDE.md` so contributors know why their data might be rejected.

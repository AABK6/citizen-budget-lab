# Verification Matrix - APU Hardening P0 to P3

## Scope

This matrix tracks robust verification coverage for the 2026 voted baseline hardening path (`P0` to `P3`), with implementation anchors and reproducible commands.

## Status Summary

- `P0`: implemented and test-covered.
- `P1`: implemented and test-covered.
- `P2`: implemented and test-covered.
- `P3`: implemented and test-covered.
- Anti-double-count policy: `warn` in strict mode (intentional, non-blocking).

## Matrix

| Phase | Exit Criterion | Implementation Anchor | Automated Test | Repro Command | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | No hidden macro closure in strict mode | `tools/apply_voted_2026_to_lego_baseline.py` (`strict_official` in `_apply_revenue_overlay`) | `tests/test_apply_voted_2026_overlay.py::test_revenue_overlay_strict_does_not_apply_macro_closure` | `PYTHONPATH=. python -m pytest -q tests/test_apply_voted_2026_overlay.py` | Pass |
| P0 | Source quality is explicit on rows | `tools/build_voted_2026_aggregates.py` (`source_quality` on expenditure/revenue rows) | `tests/test_build_voted_2026_aggregates.py::test_build_apu_targets_includes_local_rows_and_source_quality` | `PYTHONPATH=. python -m pytest -q tests/test_build_voted_2026_aggregates.py` | Pass |
| P0 | Sentinel and quality checks are produced | `tools/apply_voted_2026_to_lego_baseline.py` (`quality` metadata) | Covered indirectly by overlay tests + artifact inspection | `python3 - <<'PY' ... inspect meta.voted_2026_overlay.quality ... PY` | Pass |
| P1 | APUL bridge artifact exists and is source-tagged | `tools/verify_apul_2026.py` | `tests/test_verify_apul_2026.py` | `PYTHONPATH=. python -m pytest -q tests/test_verify_apul_2026.py` | Pass |
| P1 | APUL artifact is required by aggregate build | `tools/build_voted_2026_aggregates.py::_read_apul_rows` | `tests/test_build_voted_2026_aggregates.py::test_build_aggregates_requires_apul_verified_csv` | `PYTHONPATH=. python -m pytest -q tests/test_build_voted_2026_aggregates.py` | Pass |
| P2 | Versioned bridge is mandatory | `tools/build_voted_2026_aggregates.py::_read_bridge_rows` | `tests/test_build_voted_2026_aggregates.py::test_build_aggregates_requires_bridge_csv` | `PYTHONPATH=. python -m pytest -q tests/test_build_voted_2026_aggregates.py` | Pass |
| P2 | Closure report is generated and enforced | `tools/build_voted_2026_aggregates.py` + `tools/validate_apu_closure.py` | `tests/test_validate_apu_closure.py` | `PYTHONPATH=. python3 tools/validate_apu_closure.py --year 2026 --strict` | Pass |
| P2 | Subsector/mass/cofog closure is exact in current artifact | `data/outputs/validation_report_2026.json` | Artifact check | `python3 - <<'PY' ... print checks.max_abs_diff_eur ... PY` | Pass |
| P3 | Strict mode forbids temporal fallback | `services/api/cache_warm.py::_sdmx_value_fallback` | `services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_proxy_and_fallback` | `PYTHONPATH=. python -m pytest -q services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_proxy_and_fallback` | Pass |
| P3 | Strict mode forbids D.41 proxy path | `services/api/cache_warm.py` (debt-interest COFOG proxy block) | `services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_d41_proxy` | `PYTHONPATH=. python -m pytest -q services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_d41_proxy` | Pass |
| P3 | Snapshot build is blocked without strict validation report | `tools/build_snapshot.py::_assert_strict_validation_ok` | `tests/test_build_snapshot_strict.py` | `PYTHONPATH=. python -m pytest -q tests/test_build_snapshot_strict.py` | Pass |
| P3 | `SNAPSHOT_FAST` alias maps to static flags | `services/api/settings.py` | `services/api/tests/test_settings_snapshot_fast.py` | `PYTHONPATH=. python -m pytest -q services/api/tests/test_settings_snapshot_fast.py` | Pass |

## Anti-double-count Policy

- Current strict behavior keeps anti-double-count as warning-only (`warn`) by policy.
- Signal source:
  - `meta.voted_2026_overlay.quality.double_count_checks` in `data/cache/lego_baseline_2026.json`.
- This warning does not fail strict builds.

## Focused Verification Command

```bash
source .venv/bin/activate
export PYTHONPATH=.
python -m pytest -q \
  tests/test_apply_voted_2026_overlay.py \
  tests/test_build_voted_2026_aggregates.py \
  tests/test_verify_apul_2026.py \
  tests/test_validate_apu_closure.py \
  tests/test_build_snapshot_strict.py \
  services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_proxy_and_fallback \
  services/api/tests/test_lego.py::test_warm_lego_baseline_strict_official_blocks_d41_proxy \
  services/api/tests/test_settings_snapshot_fast.py
```

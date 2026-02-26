# Runbook - Baseline 2026 strict officiel

## Objectif

Executer un rebuild 2026 qui bloque toute publication snapshot en cas de fallback non officiel ou d'ecart de fermeture APU/COFOG.

## Variables cle

- `STRICT_OFFICIAL=1`: active les blocages stricts (fallback temporel SDMX interdit, proxy D.41 interdit, snapshot bloque sans validation `ok`).
- `SNAPSHOT_FAST=1`: mode snapshot UI rapide (aligne les flags `LEGO_BASELINE_STATIC` et `MACRO_BASELINE_STATIC`).

## Pipeline recommande (strict)

```bash
source .venv/bin/activate
export PYTHONPATH=.
export STRICT_OFFICIAL=1
export SNAPSHOT_FAST=1

python tools/verify_lfi_2026_state_b.py --update-seed
python tools/verify_lfi_2026_state_a.py
python tools/verify_lfss_2026.py
python tools/verify_apul_2026.py --strict-links

python tools/build_voted_2026_aggregates.py \
  --bridge-csv data/reference/cofog_bridge_apu_2026.csv \
  --validation-out data/outputs/validation_report_2026.json

python tools/apply_voted_2026_to_lego_baseline.py --year 2026 --mode true_level --strict-official
python tools/build_snapshot.py --year 2026
```

## Verification rapide

- Rapport fermeture: `data/outputs/validation_report_2026.json`
  - `status` doit etre `ok`.
- Overlay metadata: `data/cache/lego_baseline_2026.json`
  - `meta.voted_2026_overlay.strict_official` doit etre `true`.
- Snapshot: `data/cache/build_page_2026.json`
  - regenaire uniquement si validation stricte `ok`.

## Mode test/local (iteration)

Pour iterer rapidement sans bloquer sur les gardes strictes:

```bash
export STRICT_OFFICIAL=0
export SNAPSHOT_FAST=0
```

Puis relancer `build_voted_2026_aggregates.py` et `apply_voted_2026_to_lego_baseline.py` selon le besoin.

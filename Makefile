SHELL := /bin/bash

# Defaults (override on invocation: make warm-all YEAR=2026 COUNTRIES=FR,DE,IT)
YEAR ?= 2026
COUNTRIES ?= FR,DE,IT

.PHONY: help warm-all warm-eurostat warm-plf summary

help:
	@echo "Targets:"
	@echo "  make warm-all YEAR=2026 COUNTRIES=FR,DE,IT  # Warm LEGO baseline (SDMX XML) + EU COFOG shares, then print summary"
	@echo "  make warm-eurostat YEAR=2026 COUNTRIES=FR,DE,IT  # Only Eurostat warmers"
	@echo "  make warm-plf YEAR=2025 DATASET=plf25-depenses-2025-selon-destination  # Optional ODS snapshot"
	@echo "Env (optional): EUROSTAT_SDMX_BASE, EUROSTAT_COOKIE, EUROSTAT_BASE"

warm-eurostat:
	@echo "==> Warming LEGO baseline for $(YEAR) (Eurostat SDMX XML)"
	python3 -m services.api.cache_warm lego --year $(YEAR)
	@echo "==> Warming EU COFOG shares for $(YEAR) in $(COUNTRIES)"
	python3 -m services.api.cache_warm eurostat-cofog --year $(YEAR) --countries $(COUNTRIES)

warm-plf:
	@if [ -z "$(DATASET)" ]; then \
		echo "ERROR: Set DATASET=<ods_dataset_id>, e.g. plf25-depenses-2025-selon-destination"; \
		exit 2; \
	fi
	@echo "==> Warming PLF/LFI snapshot for $(YEAR) from $(DATASET)"
	python3 -m services.api.cache_warm plf --dataset $(DATASET) --year $(YEAR)

summary:
	@echo "==> Summary for $(YEAR)"
	@python3 tools/warm_summary.py $(YEAR)

warm-all: warm-eurostat summary
	@echo "==> Done"

# -----------------
# dbt / Semantic layer
# -----------------

DBT := dbt
DBT_PROFILES_DIR := warehouse

.PHONY: dbt-install dbt-seed dbt-build dbt-clean dbt-test

dbt-install:
	python -m pip install --upgrade pip
	pip install dbt-core dbt-duckdb dbt-postgres dbt-utils

dbt-seed:
	python tools/build_seeds.py
	DBT_PROFILES_DIR=$(DBT_PROFILES_DIR) $(DBT) seed --project-dir warehouse

dbt-build:
	DBT_PROFILES_DIR=$(DBT_PROFILES_DIR) $(DBT) deps --project-dir warehouse || true
	DBT_PROFILES_DIR=$(DBT_PROFILES_DIR) $(DBT) build --project-dir warehouse

dbt-test:
	DBT_PROFILES_DIR=$(DBT_PROFILES_DIR) $(DBT) test --project-dir warehouse

dbt-clean:
	DBT_PROFILES_DIR=$(DBT_PROFILES_DIR) $(DBT) clean --project-dir warehouse

SHELL := /bin/bash

# Defaults (override on invocation: make warm-all YEAR=2026 COUNTRIES=FR,DE,IT)
YEAR ?= 2026
COUNTRIES ?= FR,DE,IT

.PHONY: help warm-all warm-eurostat warm-eurostat-sub warm-plf warm-macro warm-decp summary

	help:
		@echo "Targets:"
		@echo "  make warm-all YEAR=2026 COUNTRIES=FR,DE,IT  # Warm LEGO baseline (SDMX XML) + EU COFOG shares, then print summary"
		@echo "  make warm-eurostat YEAR=2026 COUNTRIES=FR,DE,IT  # Only Eurostat warmers"
		@echo "  make warm-eurostat-sub YEAR=2026 COUNTRIES=FR,DE,IT  # Eurostat COFOG subfunction shares"
		@echo "  make warm-plf YEAR=2025 DATASET=plf25-depenses-2025-selon-destination  # Optional ODS snapshot"
		@echo "  make warm-macro CFG=data/macro_config.json  # Warm INSEE BDM macro series cache"
		@echo "  make warm-decp YEAR=2024 DATASET=decp-v3-marches-valides ENRICH=1 SIRENE_MAX=100 SIRENE_QPS=5  # DECP ingest"
		@echo "Env (optional): EUROSTAT_SDMX_BASE, EUROSTAT_COOKIE, EUROSTAT_BASE, INSEE_CLIENT_ID, INSEE_CLIENT_SECRET"

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

warm-macro:
	@CFG_RUNTIME="$(CFG)"; \
	if [ -z "$$CFG_RUNTIME" ]; then \
		if [ -f data/macro_series_config.json ]; then CFG_RUNTIME=data/macro_series_config.json; \
		else echo "ERROR: Set CFG=path/to/config.json (see README_DEV.md)"; exit 2; fi; \
	fi; \
	echo "==> Warming INSEE macro from $$CFG_RUNTIME"; \
	python3 -m services.api.cache_warm macro-insee --config $$CFG_RUNTIME

warm-decp:
	@if [ -z "$(DATASET)" ]; then \
		DATASET=decp-v3-marches-valides; \
	fi; \
	if [ -z "$(YEAR)" ]; then \
		echo "ERROR: Set YEAR=YYYY"; \
		exit 2; \
	fi; \
	ENRICH_FLAG=; \
	if [ "$(ENRICH)" = "1" ]; then ENRICH_FLAG=--enrich-sirene; fi; \
	echo "==> Warming DECP $(YEAR) from $(DATASET) (enrich=$(ENRICH))"; \
	python3 -m services.api.cache_warm decp --year $(YEAR) --base https://data.economie.gouv.fr --dataset $(DATASET) $$ENRICH_FLAG --sirene-max $(SIRENE_MAX) --sirene-qps $(SIRENE_QPS)

summary:
	@echo "==> Summary for $(YEAR)"
	@python3 tools/warm_summary.py $(YEAR)

warm-all: verify-warmers warm-eurostat warm-macro summary
		@echo "==> Done"

warm-eurostat-sub:
	@echo "==> Warming EU COFOG subfunction shares for $(YEAR) in $(COUNTRIES)"
	python3 -m services.api.cache_warm eurostat-cofog-sub --year $(YEAR) --countries $(COUNTRIES)

.PHONY: verify-warmers
verify-warmers:
	@echo "==> Probing warmer sources (Eurostat/ODS)"
	@PLF=""; if [ -n "$(DATASET)" ]; then PLF="--plf-dataset $(DATASET)"; fi; \
	if [ -f .venv/bin/activate ]; then source .venv/bin/activate; fi; \
	PYTHONPATH=. python -m tools.verify_warmers --year $(YEAR) --countries $(COUNTRIES) $$PLF

# -----------------
# dbt / Semantic layer
# -----------------

DBT := dbt
DBT_PROFILES_DIR := warehouse

.PHONY: dbt-install dbt-seed dbt-build dbt-clean dbt-test

dbt-install:
	python -m pip install --upgrade pip
	# Install Python packages only; dbt macro packages (e.g., dbt_utils) are installed via `dbt deps`
	pip install "dbt-core~=1.9.0" "dbt-duckdb~=1.9.0" "dbt-postgres~=1.9.0"

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

# -----------------
# Benchmarks
# -----------------

.PHONY: bench-api
bench-api:
	@echo "==> Running API benchmark (no SIRENE enrichment)"
	@PROCUREMENT_ENRICH_SIRENE=0 PYTHONPATH=. python3 tools/bench_api.py --runs 30 --warmup 5 --no-enrichment

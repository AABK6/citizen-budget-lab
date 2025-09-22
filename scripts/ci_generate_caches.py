from __future__ import annotations

import csv
import json
import datetime as dt
from pathlib import Path

CACHE_DIR = Path("data/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

STATE_ROWS = [
    {
        "year": 2026,
        "mission_code": "101",
        "mission_label": "Action extérieure de l'État",
        "programme_code": "",
        "programme_label": "",
        "cp_eur": 7_600_500_000,
        "ae_eur": 7_600_500_000,
    },
    {
        "year": 2026,
        "mission_code": "124",
        "mission_label": "Justice",
        "programme_code": "",
        "programme_label": "",
        "cp_eur": 9_550_000_000,
        "ae_eur": 9_550_000_000,
    },
    {
        "year": 2026,
        "mission_code": "150",
        "mission_label": "Enseignement scolaire",
        "programme_code": "",
        "programme_label": "",
        "cp_eur": 78_500_000_000,
        "ae_eur": 78_500_000_000,
    },
]

PROC_ROWS = [
    {
        "contract_id": "PC-2024-0001",
        "buyer_org_id": "MIN-EDU",
        "supplier_siren": "552100554",
        "supplier_name": "Acadomia",
        "signed_date": "2024-05-20",
        "amount_eur": 250_000,
        "cpv_code": "80100000",
        "procedure_type": "Open",
        "lot_count": 3,
        "location_code": "75001",
        "year": 2024,
    },
    {
        "contract_id": "PC-2024-0002",
        "buyer_org_id": "MIN-EDU",
        "supplier_siren": "732829320",
        "supplier_name": "La Papeterie",
        "signed_date": "2024-03-17",
        "amount_eur": 125_000,
        "cpv_code": "30192000",
        "procedure_type": "Open",
        "lot_count": 1,
        "location_code": "75015",
        "year": 2024,
    },
    {
        "contract_id": "PC-2024-0003",
        "buyer_org_id": "MIN-DEF",
        "supplier_siren": "130002785",
        "supplier_name": "NavalGroup",
        "signed_date": "2024-09-01",
        "amount_eur": 5_000_000,
        "cpv_code": "35512000",
        "procedure_type": "Restricted",
        "lot_count": 5,
        "location_code": "75007",
        "year": 2024,
    },
    {
        "contract_id": "PC-2024-0004",
        "buyer_org_id": "MIN-HEA",
        "supplier_siren": "784933146",
        "supplier_name": "Meditech",
        "signed_date": "2024-11-12",
        "amount_eur": 800_000,
        "cpv_code": "33110000",
        "procedure_type": "Open",
        "lot_count": 2,
        "location_code": "69001",
        "year": 2024,
    },
    {
        "contract_id": "PC-2024-0005",
        "buyer_org_id": "MIN-ECO",
        "supplier_siren": "480256912",
        "supplier_name": "GreenPower",
        "signed_date": "2024-04-05",
        "amount_eur": 450_000,
        "cpv_code": "09310000",
        "procedure_type": "Open",
        "lot_count": 1,
        "location_code": "75019",
        "year": 2024,
    },
]


def write_csv_with_meta(rows: list[dict[str, object]], filename: str, meta: dict[str, object]) -> None:
    csv_path = CACHE_DIR / filename
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    meta_path = csv_path.with_suffix(".meta.json")
    meta.setdefault("row_count", len(rows))
    meta.setdefault("extraction_ts", dt.datetime.now(dt.timezone.utc).isoformat())
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    write_csv_with_meta(
        STATE_ROWS,
        "state_budget_mission_2026.csv",
        {
            "base": "https://data.economie.gouv.fr",
            "dataset": "plf25-depenses-2025-selon-destination",
            "year": 2026,
            "where": "exercice=2025",
            "method": "ci-sample",
            "cp_field": "credit_de_paiement",
            "ae_field": "autorisation_engagement",
            "mission_code_field": "mission",
            "mission_label_field": "libelle_mission",
            "produced_columns": [
                "year",
                "mission_code",
                "mission_label",
                "programme_code",
                "programme_label",
                "cp_eur",
                "ae_eur",
            ],
        },
    )

    write_csv_with_meta(
        PROC_ROWS,
        "procurement_contracts_2024.csv",
        {
            "source": "ci-sample",
            "year": 2024,
            "produced_columns": [
                "contract_id",
                "buyer_org_id",
                "supplier_siren",
                "supplier_name",
                "signed_date",
                "amount_eur",
                "cpv_code",
                "procedure_type",
                "lot_count",
                "location_code",
                "year",
            ],
        },
    )


if __name__ == "__main__":
    main()

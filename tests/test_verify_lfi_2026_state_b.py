from __future__ import annotations

import csv
from pathlib import Path

from tools.verify_lfi_2026_state_b import (
    AN_STATE_B_RAW_URL,
    JO_LAW_URL,
    VerifiedRow,
    extract_an_cp,
    update_seed_from_verified,
)


def test_extract_an_cp_parses_mission_cp_rows() -> None:
    html = """
    <html><body>
      <p>ÉTAT B</p>
      <p>Mission / Programme</p>
      <table>
        <tr>
          <td><p class="assnatT10GRASCENTER">Action extérieure de l’État</p></td>
          <td><p class="assnatT10GRASRIGHT">3 449 452 613</p></td>
          <td><p class="assnatT10GRASRIGHT">3 454 425 325</p></td>
        </tr>
        <tr>
          <td><p class="assnatT10GRASCENTER">Défense</p></td>
          <td><p class="assnatT10GRASRIGHT">92 828 480 008</p></td>
          <td><p class="assnatT10GRASRIGHT">66 475 476 236</p></td>
        </tr>
      </table>
    </body></html>
    """
    got = extract_an_cp(html)
    assert got["AA"] == 3_454_425_325
    assert got["DA"] == 66_475_476_236


def test_update_seed_from_verified_updates_amounts_and_source(tmp_path: Path) -> None:
    seed = tmp_path / "plf_2026_plafonds.csv"
    seed.write_text(
        "\n".join(
            [
                "year,mission_code,mission_label,plf_ceiling_eur,source",
                "2026,AA,Action extérieure de l'État,1.0,old",
                "2026,DA,Défense,2.0,old",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    rows = [
        VerifiedRow(
            code="AA",
            label="Action extérieure de l'État",
            cp_eur_jo=3_454_425_325,
            cp_eur_budget_annex=3_454_425_325,
            match_ok=True,
            source_jo=JO_LAW_URL,
            source_annex=AN_STATE_B_RAW_URL,
            line_ref_jo=f"{JO_LAW_URL}#L10634",
            line_ref_annex=f"{AN_STATE_B_RAW_URL}#L38055",
        ),
        VerifiedRow(
            code="DA",
            label="Défense",
            cp_eur_jo=66_475_476_236,
            cp_eur_budget_annex=66_475_476_236,
            match_ok=True,
            source_jo=JO_LAW_URL,
            source_annex=AN_STATE_B_RAW_URL,
            line_ref_jo=f"{JO_LAW_URL}#L10706",
            line_ref_annex=f"{AN_STATE_B_RAW_URL}#L38922",
        ),
    ]

    update_seed_from_verified(rows, seed)

    with seed.open("r", encoding="utf-8", newline="") as fh:
        data = list(csv.DictReader(fh))

    assert data[0]["plf_ceiling_eur"] == "3454425325.0"
    assert data[1]["plf_ceiling_eur"] == "66475476236.0"
    expected_source = f"{JO_LAW_URL} | {AN_STATE_B_RAW_URL}"
    assert data[0]["source"] == expected_source
    assert data[1]["source"] == expected_source


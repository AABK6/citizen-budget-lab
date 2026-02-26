#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import httpx


ROOT = Path(__file__).resolve().parents[1]

JO_LAW_URL = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155"
AN_STATE_B_RAW_URL = "https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw"


# JO 2026-02-20, ÉTAT B mission-level CP values (EUR), extracted line-by-line.
JO_CP_BY_CODE: Dict[str, int] = {
    "AA": 3_454_425_325,
    "AB": 5_081_543_463,
    "AC": 4_125_856_189,
    "AD": 3_569_384_015,
    "MB": 1_729_987_774,
    "VA": 22_570_898_614,
    "CA": 866_116_724,
    "PC": 475_000_000,
    "CB": 3_744_547_181,
    "DA": 66_475_476_236,
    "DC": 1_052_475_340,
    "TA": 22_762_823_002,
    "DB": 3_512_606_546,
    "EB": 60_341_209_199,
    "EC": 89_621_003_132,
    "GA": 11_017_882_630,
    "IA": 2_130_584_454,
    "AV": 4_397_829_332,
    "JA": 12_966_577_407,
    "MA": 702_973_552,
    "OA": 3_277_446_171,
    "PB": 1_140_179_221,
    "RA": 31_633_945_500,
    "RB": 6_067_878_084,
    "RC": 3_959_044_081,
    "RD": 145_600_362_742,
    "SA": 1_888_133_258,
    "SB": 25_844_617_241,
    "SE": 31_281_524_154,
    "SF": 1_258_895_900,
    "TR": 518_293_247,
    "TB": 20_820_551_935,
}


# JO PDF line references captured from the authenticated Legifrance PDF extraction.
JO_LINE_REF_BY_CODE: Dict[str, int] = {
    "AA": 10634,
    "AB": 10642,
    "AC": 10650,
    "AD": 10658,
    "MB": 10794,
    "VA": 10674,
    "CA": 10682,
    "PC": 10690,
    "CB": 10698,
    "DA": 10706,
    "DC": 10714,
    "TA": 10722,
    "DB": 10730,
    "EB": 10738,
    "EC": 10746,
    "GA": 10754,
    "IA": 10762,
    "AV": 10770,
    "JA": 10778,
    "MA": 10786,
    "OA": 10802,
    "PB": 10810,
    "RA": 10818,
    "RB": 10826,
    "RC": 10834,
    "RD": 10842,
    "SA": 10850,
    "SB": 10858,
    "SE": 10866,
    "SF": 10874,
    "TR": 10882,
    "TB": 10890,
}


MISSION_CODE_TO_LABEL: Dict[str, str] = {
    "AA": "Action extérieure de l'État",
    "AB": "Administration générale et territoriale de l'État",
    "AC": "Agriculture, alimentation, forêt et affaires rurales",
    "AD": "Aide publique au développement",
    "AV": "Investir pour la France de 2030",
    "CA": "Conseil et contrôle de l'État",
    "CB": "Culture",
    "DA": "Défense",
    "DB": "Économie",
    "DC": "Direction de l'action du Gouvernement",
    "EB": "Engagements financiers de l'État",
    "EC": "Enseignement scolaire",
    "GA": "Gestion des finances publiques",
    "IA": "Immigration, asile et intégration",
    "JA": "Justice",
    "MA": "Médias, livre et industries culturelles",
    "MB": "Monde combattant, mémoire et liens avec la Nation",
    "OA": "Outre-mer",
    "PB": "Pouvoirs publics",
    "PC": "Crédits non répartis",
    "RA": "Recherche et enseignement supérieur",
    "RB": "Régimes sociaux et de retraite",
    "RC": "Relations avec les collectivités territoriales",
    "RD": "Remboursements et dégrèvements",
    "SA": "Santé",
    "SB": "Sécurités",
    "SE": "Solidarité, insertion et égalité des chances",
    "SF": "Sport, jeunesse et vie associative",
    "TA": "Écologie, développement et mobilité durables",
    "TB": "Travail, emploi et administration des ministères sociaux",
    "TR": "Transformation et fonction publiques",
    "VA": "Cohésion des territoires",
}


LABEL_KEY_TO_CODE: Dict[str, str] = {}
for _code, _label in MISSION_CODE_TO_LABEL.items():
    key = re.sub(r"[^a-z0-9]+", " ", html.unescape(_label).lower()).strip()
    LABEL_KEY_TO_CODE[key] = _code
LABEL_KEY_TO_CODE["anciens combattants mémoire et liens avec la nation"] = "MB"


MISSION_ROW_RE = re.compile(
    r'<p class="assnatT10GRASCENTER"[^>]*>\s*(.*?)\s*</p>\s*</td>\s*'
    r'<td[^>]*>\s*<p class="assnatT10GRASRIGHT"[^>]*>\s*([0-9\s\u00a0]+)\s*</p>\s*</td>\s*'
    r'<td[^>]*>\s*<p class="assnatT10GRASRIGHT"[^>]*>\s*([0-9\s\u00a0]+)\s*</p>',
    re.S,
)


@dataclass
class VerifiedRow:
    code: str
    label: str
    cp_eur_jo: int
    cp_eur_budget_annex: int
    match_ok: bool
    source_jo: str
    source_annex: str
    line_ref_jo: str
    line_ref_annex: str


def _clean_label(label: str) -> str:
    txt = html.unescape(re.sub(r"<[^>]+>", "", label))
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def _normalize_text(s: str) -> str:
    s = html.unescape(s)
    s = s.replace("’", "'").replace("`", "'")
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def _label_to_code(label: str) -> str:
    key = re.sub(r"[^a-z0-9]+", " ", _clean_label(label).lower()).strip()
    return LABEL_KEY_TO_CODE.get(key, "")


def _parse_eur(raw: str) -> int:
    digits = re.sub(r"\D", "", raw)
    if not digits:
        raise ValueError(f"Could not parse amount from {raw!r}")
    return int(digits)


def _line_ref_from_raw(raw_html: str, label: str) -> int:
    lines = raw_html.splitlines()
    start_idx = 0
    for idx, line in enumerate(lines):
        if "Mission / Programme" in line:
            start_idx = idx
            break

    target = _normalize_text(label)
    for idx in range(start_idx, len(lines)):
        if target in _normalize_text(lines[idx]):
            return idx
    return -1


def extract_an_cp(raw_html: str) -> Dict[str, int]:
    if "ÉTAT" not in raw_html or "Mission / Programme" not in raw_html:
        raise RuntimeError("Could not locate ÉTAT B table in AN raw document")

    an_cp: Dict[str, int] = {}
    for match in MISSION_ROW_RE.finditer(raw_html):
        label = _clean_label(match.group(1))
        code = _label_to_code(label)
        if not code:
            continue
        cp = _parse_eur(match.group(3))
        # Keep first occurrence inside ÉTAT B.
        if code not in an_cp:
            an_cp[code] = cp
    return an_cp


def write_verified_csv(rows: List[VerifiedRow], output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "mission_code",
                "mission_label",
                "cp_eur_jo",
                "cp_eur_budget_annex",
                "match_ok",
                "source_jo",
                "source_annex",
                "line_ref_jo",
                "line_ref_annex",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "mission_code": row.code,
                    "mission_label": row.label,
                    "cp_eur_jo": row.cp_eur_jo,
                    "cp_eur_budget_annex": row.cp_eur_budget_annex,
                    "match_ok": str(row.match_ok).lower(),
                    "source_jo": row.source_jo,
                    "source_annex": row.source_annex,
                    "line_ref_jo": row.line_ref_jo,
                    "line_ref_annex": row.line_ref_annex,
                }
            )


def update_seed_from_verified(rows: List[VerifiedRow], seed_csv: Path) -> None:
    if not seed_csv.exists():
        raise FileNotFoundError(f"Seed CSV not found: {seed_csv}")

    with seed_csv.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        existing = list(reader)
        fields = reader.fieldnames or []

    required = {"year", "mission_code", "mission_label", "plf_ceiling_eur", "source"}
    if set(fields) != required:
        raise RuntimeError(f"Unexpected seed schema in {seed_csv}: {fields}")

    by_code = {row.code: row for row in rows}
    updated_codes = set()
    source_value = f"{JO_LAW_URL} | {AN_STATE_B_RAW_URL}"

    for row in existing:
        code = (row.get("mission_code") or "").strip()
        if code in by_code:
            row["plf_ceiling_eur"] = str(float(by_code[code].cp_eur_jo))
            row["source"] = source_value
            updated_codes.add(code)

    missing = sorted(set(by_code) - updated_codes)
    if missing:
        raise RuntimeError(f"Missing mission codes in seed update: {missing}")

    with seed_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(existing)


def write_markdown_report(rows: List[VerifiedRow], output_md: Path) -> None:
    output_md.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Vérification LFI 2026 - ÉTAT B (CP)",
        "",
        "- Source JO: `Loi n° 2026-103 du 19 février 2026` (`JORFTEXT000053508155`).",
        f"- Source annexe parlementaire: `{AN_STATE_B_RAW_URL}`.",
        "- Méthode: comparaison stricte mission par mission (32 missions du budget général, CP).",
        "",
        "| Code | Mission | CP JO (€) | CP Annexe (€) | Match | Réf JO | Réf annexe |",
        "| --- | --- | ---: | ---: | :---: | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row.code} | {row.label} | {row.cp_eur_jo} | {row.cp_eur_budget_annex} | "
            f"{'OK' if row.match_ok else 'KO'} | {row.line_ref_jo} | {row.line_ref_annex} |"
        )

    mismatches = [r for r in rows if not r.match_ok]
    lines.extend(
        [
            "",
            f"**Résultat global:** {'OK' if not mismatches else 'KO'} "
            f"({len(rows) - len(mismatches)}/{len(rows)} correspondances).",
        ]
    )
    output_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify enacted LFI 2026 ÉTAT B mission CP values against AN annex and update seed."
    )
    parser.add_argument(
        "--output-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_b_cp_verified.csv"),
        help="Path to write verified comparison CSV.",
    )
    parser.add_argument(
        "--report-md",
        default=str(ROOT / "docs" / "verification_lfi2026_missions.md"),
        help="Path to write markdown verification report.",
    )
    parser.add_argument(
        "--update-seed",
        action="store_true",
        help="Also update warehouse/seeds/plf_2026_plafonds.csv from verified JO CP values.",
    )
    parser.add_argument(
        "--seed-csv",
        default=str(ROOT / "warehouse" / "seeds" / "plf_2026_plafonds.csv"),
        help="Seed CSV to update when --update-seed is provided.",
    )
    args = parser.parse_args()

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        raw = client.get(AN_STATE_B_RAW_URL)
        raw.raise_for_status()
        raw_html = raw.text

    an_cp_by_code = extract_an_cp(raw_html)
    expected_codes = sorted(JO_CP_BY_CODE.keys())
    missing_annex = sorted(set(expected_codes) - set(an_cp_by_code.keys()))
    if missing_annex:
        raise RuntimeError(f"Annexe extraction missing mission codes: {missing_annex}")

    rows: List[VerifiedRow] = []
    for code in expected_codes:
        jo_cp = JO_CP_BY_CODE[code]
        annex_cp = an_cp_by_code[code]
        match_ok = jo_cp == annex_cp
        jo_line = JO_LINE_REF_BY_CODE.get(code, -1)
        annex_line = _line_ref_from_raw(raw_html, MISSION_CODE_TO_LABEL[code])
        rows.append(
            VerifiedRow(
                code=code,
                label=MISSION_CODE_TO_LABEL[code],
                cp_eur_jo=jo_cp,
                cp_eur_budget_annex=annex_cp,
                match_ok=match_ok,
                source_jo=JO_LAW_URL,
                source_annex=AN_STATE_B_RAW_URL,
                line_ref_jo=f"{JO_LAW_URL}#L{jo_line}" if jo_line > 0 else JO_LAW_URL,
                line_ref_annex=f"{AN_STATE_B_RAW_URL}#L{annex_line}" if annex_line > 0 else AN_STATE_B_RAW_URL,
            )
        )

    out_csv = Path(args.output_csv)
    write_verified_csv(rows, out_csv)
    write_markdown_report(rows, Path(args.report_md))

    mismatches = [r for r in rows if not r.match_ok]
    if mismatches:
        details = ", ".join(f"{r.code}: JO={r.cp_eur_jo} AN={r.cp_eur_budget_annex}" for r in mismatches)
        raise RuntimeError(f"JO/annex mismatch detected: {details}")

    if args.update_seed:
        update_seed_from_verified(rows, Path(args.seed_csv))

    print(f"Wrote verified CSV: {out_csv}")
    print(f"Wrote report: {args.report_md}")
    if args.update_seed:
        print(f"Updated seed: {args.seed_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

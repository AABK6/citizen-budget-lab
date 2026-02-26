#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import httpx


ROOT = Path(__file__).resolve().parents[1]

LFSS_JO_URL = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053226384"
AN_LFSS_RAW_URL = "https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw"

ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
TABLE_RE = re.compile(r"<table[^>]*>.*?</table>", re.S)

ASSO_PCT_EXPECTED: Dict[str, float] = {
    "asso_recettes_pct_pib_2026": 26.9,
    "asso_depenses_pct_pib_2026": 26.8,
    "asso_solde_pct_pib_2026": 0.1,
}

BRANCH_EXPECTED_BN: Dict[str, Tuple[float, float, float]] = {
    "maladie": (257.5, 271.3, -13.8),
    "at_mp": (17.1, 18.0, -1.0),
    "vieillesse": (305.8, 310.4, -4.6),
    "famille": (60.1, 59.7, 0.4),
    "autonomie": (43.3, 43.6, -0.4),
    "all_branches_hors_transferts": (664.8, 684.2, -19.4),
}


@dataclass(frozen=True)
class AssoMetric:
    key: str
    label: str
    value_pct: float
    expected_pct: float
    match_ok: bool
    source_jo: str
    source_annex: str
    line_ref_jo: str
    line_ref_annex: str


@dataclass(frozen=True)
class BranchMetric:
    key: str
    label: str
    recettes_bn: float
    depenses_bn: float
    solde_bn: float
    expected_recettes_bn: float
    expected_depenses_bn: float
    expected_solde_bn: float
    match_ok: bool
    source_jo: str
    source_annex: str
    line_ref_jo: str
    line_ref_annex: str


def _strip_tags(text: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = text.replace("’", "'").replace("`", "'")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _line_ref_from_raw(raw_html: str, label: str) -> int:
    target = _norm(label)
    for idx, line in enumerate(raw_html.splitlines()):
        if target and target in _norm(line):
            return idx
    return -1


def _parse_fr_float(token: str) -> float:
    cleaned = (
        token.replace("\u202f", "")
        .replace("\xa0", "")
        .replace(" ", "")
        .replace("‑", "-")
        .replace("−", "-")
        .replace(",", ".")
    )
    cleaned = re.sub(r"[^0-9+\-.]", "", cleaned)
    if not cleaned:
        raise ValueError(f"Could not parse numeric token: {token!r}")
    return float(cleaned)


def _first_table_after(raw_html: str, anchor_pattern: str) -> str:
    m = re.search(anchor_pattern, raw_html, re.S)
    if not m:
        raise RuntimeError(f"Could not find anchor pattern: {anchor_pattern}")
    tail = raw_html[m.end() :]
    mt = TABLE_RE.search(tail)
    if not mt:
        raise RuntimeError(f"Could not find table after anchor pattern: {anchor_pattern}")
    return mt.group(0)


def _extract_rows(table_html: str) -> List[tuple[str, List[float]]]:
    rows: List[tuple[str, List[float]]] = []
    for row_html in ROW_RE.findall(table_html):
        tds = TD_RE.findall(row_html)
        if not tds:
            continue
        label = _strip_tags(tds[0])
        nums: List[float] = []
        for td in tds[1:]:
            token = _strip_tags(td)
            if not re.search(r"\d", token):
                continue
            try:
                nums.append(_parse_fr_float(token))
            except Exception:
                continue
        rows.append((label, nums))
    return rows


def _extract_asso_pct_metrics(raw_html: str) -> List[AssoMetric]:
    table = _first_table_after(
        raw_html,
        r"Article liminaire.*?Les prévisions de dépenses, de recettes et de solde des administrations de sécurité sociale",
    )
    rows = _extract_rows(table)

    by_key: Dict[str, tuple[str, float]] = {}
    for label, nums in rows:
        norm_label = _norm(label)
        if len(nums) < 2:
            continue
        value_2026 = nums[1]
        if "recettes" in norm_label:
            by_key["asso_recettes_pct_pib_2026"] = (label, value_2026)
        elif "depenses" in norm_label:
            by_key["asso_depenses_pct_pib_2026"] = (label, value_2026)
        elif "solde" in norm_label:
            by_key["asso_solde_pct_pib_2026"] = (label, value_2026)

    out: List[AssoMetric] = []
    for key, expected in ASSO_PCT_EXPECTED.items():
        if key not in by_key:
            raise RuntimeError(f"Could not extract LFSS article liminaire metric: {key}")
        label, value = by_key[key]
        line = _line_ref_from_raw(raw_html, label)
        out.append(
            AssoMetric(
                key=key,
                label=label,
                value_pct=value,
                expected_pct=expected,
                match_ok=abs(value - expected) < 1e-9,
                source_jo=LFSS_JO_URL,
                source_annex=AN_LFSS_RAW_URL,
                line_ref_jo=LFSS_JO_URL,
                line_ref_annex=f"{AN_LFSS_RAW_URL}#L{line}" if line > 0 else AN_LFSS_RAW_URL,
            )
        )
    return out


def _branch_key_from_label(label: str) -> str | None:
    norm = _norm(label)
    if norm == "maladie":
        return "maladie"
    if "accidents du travail" in norm:
        return "at_mp"
    if norm == "vieillesse":
        return "vieillesse"
    if norm == "famille":
        return "famille"
    if norm == "autonomie":
        return "autonomie"
    if "toutes branches" in norm:
        return "all_branches_hors_transferts"
    return None


def _extract_branch_metrics(raw_html: str) -> List[BranchMetric]:
    table = _first_table_after(
        raw_html,
        r"Pour l’année 2026 est approuvé le tableau d’équilibre, par branche, de l’ensemble des régimes obligatoires de base de sécurité sociale",
    )
    rows = _extract_rows(table)

    extracted: Dict[str, tuple[str, float, float, float]] = {}
    for label, nums in rows:
        key = _branch_key_from_label(label)
        if key is None:
            continue
        if len(nums) < 3:
            raise RuntimeError(f"Branch row '{label}' does not expose 3 numeric values")
        extracted[key] = (label, nums[0], nums[1], nums[2])

    out: List[BranchMetric] = []
    for key, (exp_rec, exp_dep, exp_sol) in BRANCH_EXPECTED_BN.items():
        if key not in extracted:
            raise RuntimeError(f"Could not extract LFSS branch row: {key}")
        label, rec, dep, sol = extracted[key]
        line = _line_ref_from_raw(raw_html, label)
        out.append(
            BranchMetric(
                key=key,
                label=label,
                recettes_bn=rec,
                depenses_bn=dep,
                solde_bn=sol,
                expected_recettes_bn=exp_rec,
                expected_depenses_bn=exp_dep,
                expected_solde_bn=exp_sol,
                match_ok=(
                    abs(rec - exp_rec) < 1e-9
                    and abs(dep - exp_dep) < 1e-9
                    and abs(sol - exp_sol) < 1e-9
                ),
                source_jo=LFSS_JO_URL,
                source_annex=AN_LFSS_RAW_URL,
                line_ref_jo=LFSS_JO_URL,
                line_ref_annex=f"{AN_LFSS_RAW_URL}#L{line}" if line > 0 else AN_LFSS_RAW_URL,
            )
        )
    return out


def write_asso_csv(rows: List[AssoMetric], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "metric_key",
                "label",
                "value_pct_pib",
                "expected_pct_pib",
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
                    "metric_key": row.key,
                    "label": row.label,
                    "value_pct_pib": row.value_pct,
                    "expected_pct_pib": row.expected_pct,
                    "match_ok": str(row.match_ok).lower(),
                    "source_jo": row.source_jo,
                    "source_annex": row.source_annex,
                    "line_ref_jo": row.line_ref_jo,
                    "line_ref_annex": row.line_ref_annex,
                }
            )


def write_branch_csv(rows: List[BranchMetric], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "branch_key",
                "branch_label",
                "recettes_bn",
                "depenses_bn",
                "solde_bn",
                "recettes_eur",
                "depenses_eur",
                "solde_eur",
                "expected_recettes_bn",
                "expected_depenses_bn",
                "expected_solde_bn",
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
                    "branch_key": row.key,
                    "branch_label": row.label,
                    "recettes_bn": row.recettes_bn,
                    "depenses_bn": row.depenses_bn,
                    "solde_bn": row.solde_bn,
                    "recettes_eur": int(round(row.recettes_bn * 1_000_000_000)),
                    "depenses_eur": int(round(row.depenses_bn * 1_000_000_000)),
                    "solde_eur": int(round(row.solde_bn * 1_000_000_000)),
                    "expected_recettes_bn": row.expected_recettes_bn,
                    "expected_depenses_bn": row.expected_depenses_bn,
                    "expected_solde_bn": row.expected_solde_bn,
                    "match_ok": str(row.match_ok).lower(),
                    "source_jo": row.source_jo,
                    "source_annex": row.source_annex,
                    "line_ref_jo": row.line_ref_jo,
                    "line_ref_annex": row.line_ref_annex,
                }
            )


def write_report(asso_rows: List[AssoMetric], branch_rows: List[BranchMetric], out_md: Path) -> None:
    out_md.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Verification LFSS 2026 - Equilibres votes",
        "",
        "- Source JO: `Loi n° 2025-1403 du 19 decembre 2025` (`JORFTEXT000053226384`).",
        f"- Source annexe parlementaire: `{AN_LFSS_RAW_URL}`.",
        "- Methode: extraction ligne a ligne des tableaux votes (article liminaire + tableau d'equilibre 2026 par branche), comparaison stricte.",
        "",
        "## ASSO (Article liminaire, % PIB)",
        "",
        "| Cle | Libelle | Extrait | Attendu | Match | Ref annexe |",
        "| --- | --- | ---: | ---: | :---: | --- |",
    ]
    for row in asso_rows:
        lines.append(
            f"| {row.key} | {row.label} | {row.value_pct:.1f} | {row.expected_pct:.1f} | "
            f"{'OK' if row.match_ok else 'KO'} | {row.line_ref_annex} |"
        )

    lines.extend(
        [
            "",
            "## Regimes de base (2026, MdEUR)",
            "",
            "| Branche | Recettes | Depenses | Solde | Match | Ref annexe |",
            "| --- | ---: | ---: | ---: | :---: | --- |",
        ]
    )
    for row in branch_rows:
        lines.append(
            f"| {row.label} | {row.recettes_bn:.1f} | {row.depenses_bn:.1f} | {row.solde_bn:.1f} | "
            f"{'OK' if row.match_ok else 'KO'} | {row.line_ref_annex} |"
        )

    mismatches = [r for r in asso_rows if not r.match_ok] + [r for r in branch_rows if not r.match_ok]
    lines.extend(
        [
            "",
            f"**Resultat global:** {'OK' if not mismatches else 'KO'} "
            f"({len(asso_rows) + len(branch_rows) - len(mismatches)}/{len(asso_rows) + len(branch_rows)} correspondances).",
        ]
    )
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify enacted LFSS 2026 aggregate branch and ASSO balance values against AN adopted text."
    )
    parser.add_argument(
        "--output-branch-csv",
        default=str(ROOT / "data" / "reference" / "lfss_2026_branch_equilibre_verified.csv"),
        help="Path to write branch-level LFSS verified CSV.",
    )
    parser.add_argument(
        "--output-asso-csv",
        default=str(ROOT / "data" / "reference" / "lfss_2026_asso_pct_verified.csv"),
        help="Path to write ASSO (% PIB) LFSS verified CSV.",
    )
    parser.add_argument(
        "--report-md",
        default=str(ROOT / "docs" / "verification_lfss2026.md"),
        help="Path to write markdown verification report.",
    )
    args = parser.parse_args()

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(AN_LFSS_RAW_URL)
        resp.raise_for_status()
        raw_html = resp.text

    asso_rows = _extract_asso_pct_metrics(raw_html)
    branch_rows = _extract_branch_metrics(raw_html)

    write_asso_csv(asso_rows, Path(args.output_asso_csv))
    write_branch_csv(branch_rows, Path(args.output_branch_csv))
    write_report(asso_rows, branch_rows, Path(args.report_md))

    mismatches = [r for r in asso_rows if not r.match_ok] + [r for r in branch_rows if not r.match_ok]
    if mismatches:
        raise RuntimeError(f"LFSS 2026 verification mismatch count: {len(mismatches)}")

    print(f"Wrote branch CSV: {args.output_branch_csv}")
    print(f"Wrote ASSO CSV: {args.output_asso_csv}")
    print(f"Wrote report: {args.report_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

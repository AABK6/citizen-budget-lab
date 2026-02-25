#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import httpx


ROOT = Path(__file__).resolve().parents[1]

JO_LAW_URL = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155"
AN_STATE_A_RAW_URL = "https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw"

ARTICLE_147_TABLE_RE = re.compile(
    r"Article\s+147.*?I\.\s*–\s*Pour\s+2026.*?(<table[^>]*>.*?</table>)",
    re.S,
)
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
LINE_CODE_RE = re.compile(r"^\d{4,}$")


@dataclass(frozen=True)
class MetricSpec:
    key: str
    label_contains: str
    value_index: int
    expected_mio: int


@dataclass(frozen=True)
class VerifiedMetric:
    key: str
    label: str
    value_mio: int
    expected_mio: int
    match_ok: bool
    source_jo: str
    source_annex: str
    line_ref_jo: str
    line_ref_annex: str


@dataclass(frozen=True)
class VerifiedLineItem:
    line_code: str
    section: str
    label: str
    amount_eur: int
    source_jo: str
    source_annex: str
    line_ref_jo: str
    line_ref_annex: str


METRICS: List[MetricSpec] = [
    MetricSpec(
        key="budget_general_recettes_fiscales_nettes",
        label_contains="recettes fiscales",
        value_index=0,
        expected_mio=363_603,
    ),
    MetricSpec(
        key="budget_general_recettes_non_fiscales",
        label_contains="recettes non fiscales",
        value_index=0,
        expected_mio=28_900,
    ),
    MetricSpec(
        key="budget_general_recettes_totales",
        label_contains="recettes totales",
        value_index=0,
        expected_mio=392_503,
    ),
    MetricSpec(
        key="budget_general_psr_collectivites_ue",
        label_contains="prelevements sur recettes",
        value_index=0,
        expected_mio=73_264,
    ),
    MetricSpec(
        key="budget_general_montants_nets_ressources",
        label_contains="montants nets pour le budget general",
        value_index=0,
        expected_mio=319_239,
    ),
    MetricSpec(
        key="budget_general_montants_nets_charges",
        label_contains="montants nets pour le budget general",
        value_index=3,
        expected_mio=452_716,
    ),
    MetricSpec(
        key="budget_general_montants_nets_solde",
        label_contains="montants nets pour le budget general",
        value_index=6,
        expected_mio=-133_477,
    ),
    MetricSpec(
        key="solde_general",
        label_contains="solde general",
        value_index=0,
        expected_mio=-134_627,
    ),
]


def _strip_tags(text: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("’", "'").replace("`", "'")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_mio(value: str) -> int:
    cleaned = (
        value.replace("\u202f", "")
        .replace("\xa0", "")
        .replace(" ", "")
        .replace("‑", "-")
        .replace("−", "-")
    )
    cleaned = re.sub(r"[^0-9+\-]", "", cleaned)
    if not cleaned:
        raise ValueError(f"Could not parse numeric token: {value!r}")
    return int(cleaned)


def _extract_article_147_table(raw_html: str) -> str:
    m = ARTICLE_147_TABLE_RE.search(raw_html)
    if not m:
        raise RuntimeError("Could not locate Article 147 balance table in AN raw document")
    return m.group(1)


def _extract_etat_a_voies_table(raw_html: str) -> str:
    anchor = re.search(r"(?:É|E)tat\s+A.*?Voies et moyens", raw_html, re.S | re.I)
    if not anchor:
        raise RuntimeError("Could not locate Etat A / Voies et moyens anchor in AN raw document")
    tail = raw_html[anchor.end() :]
    m = re.search(r"<table[^>]*>.*?</table>", tail, re.S)
    if not m:
        raise RuntimeError("Could not locate Etat A / Voies et moyens table in AN raw document")
    return m.group(0)


def _extract_rows(raw_html: str) -> List[tuple[str, List[int]]]:
    table_html = _extract_article_147_table(raw_html)
    rows: List[tuple[str, List[int]]] = []
    for row_html in ROW_RE.findall(table_html):
        tds = TD_RE.findall(row_html)
        if not tds:
            continue
        label = _strip_tags(tds[0])
        nums: List[int] = []
        for td in tds[1:]:
            token = _strip_tags(td)
            if not re.search(r"\d", token):
                continue
            try:
                nums.append(_parse_mio(token))
            except Exception:
                continue
        rows.append((label, nums))
    return rows


def _extract_line_ref_for_code(raw_html: str, code: str, start_idx: int = 0) -> int:
    needle = f">{code}<"
    lines = raw_html.splitlines()
    for idx in range(max(start_idx, 0), len(lines)):
        if needle in lines[idx]:
            return idx
    return -1


def _section_from_code(code: str) -> str:
    if code.startswith("1"):
        return "fiscal"
    if code.startswith("2"):
        return "non_fiscal"
    if code.startswith("3"):
        return "prelevements_sur_recettes"
    return "other"


def extract_line_items(raw_html: str) -> List[VerifiedLineItem]:
    table_html = _extract_etat_a_voies_table(raw_html)
    out: List[VerifiedLineItem] = []
    anchor_idx = max(raw_html.find("Voies et moyens"), 0)

    for row_html in ROW_RE.findall(table_html):
        tds = TD_RE.findall(row_html)
        if len(tds) < 3:
            continue
        code = _strip_tags(tds[0])
        if not LINE_CODE_RE.fullmatch(code):
            continue

        label = _strip_tags(tds[1])
        if not label:
            continue

        amount_token = _strip_tags(tds[2])
        try:
            amount_eur = _parse_mio(amount_token)
        except Exception:
            continue

        line_annex = _extract_line_ref_for_code(raw_html, code, start_idx=anchor_idx)
        out.append(
            VerifiedLineItem(
                line_code=code,
                section=_section_from_code(code),
                label=label,
                amount_eur=amount_eur,
                source_jo=JO_LAW_URL,
                source_annex=AN_STATE_A_RAW_URL,
                line_ref_jo=JO_LAW_URL,
                line_ref_annex=f"{AN_STATE_A_RAW_URL}#L{line_annex}" if line_annex > 0 else AN_STATE_A_RAW_URL,
            )
        )

    if not out:
        raise RuntimeError("No Etat A line items extracted from Voies et moyens table")
    return out


def _line_ref_from_raw(raw_html: str, label: str) -> int:
    lines = raw_html.splitlines()
    target = _norm(label)
    for idx, line in enumerate(lines):
        if target and target in _norm(line):
            return idx
    return -1


def verify_metrics(raw_html: str) -> List[VerifiedMetric]:
    rows = _extract_rows(raw_html)
    out: List[VerifiedMetric] = []

    norm_rows = [(_norm(label), label, nums) for label, nums in rows]

    for spec in METRICS:
        matched = None
        needle = _norm(spec.label_contains)
        for norm_label, label, nums in norm_rows:
            if needle and needle in norm_label:
                matched = (label, nums)
                break
        if matched is None:
            raise RuntimeError(f"Could not find row for metric '{spec.key}'")

        label, nums = matched
        if spec.value_index >= len(nums):
            raise RuntimeError(
                f"Row '{label}' does not have value index {spec.value_index} for metric '{spec.key}'"
            )
        value = nums[spec.value_index]
        line_annex = _line_ref_from_raw(raw_html, label)

        out.append(
            VerifiedMetric(
                key=spec.key,
                label=label,
                value_mio=value,
                expected_mio=spec.expected_mio,
                match_ok=(value == spec.expected_mio),
                source_jo=JO_LAW_URL,
                source_annex=AN_STATE_A_RAW_URL,
                line_ref_jo=JO_LAW_URL,
                line_ref_annex=(
                    f"{AN_STATE_A_RAW_URL}#L{line_annex}" if line_annex > 0 else AN_STATE_A_RAW_URL
                ),
            )
        )

    return out


def write_csv(rows: List[VerifiedMetric], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "metric_key",
                "label",
                "value_mio",
                "value_eur",
                "expected_mio",
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
                    "value_mio": row.value_mio,
                    "value_eur": row.value_mio * 1_000_000,
                    "expected_mio": row.expected_mio,
                    "match_ok": str(row.match_ok).lower(),
                    "source_jo": row.source_jo,
                    "source_annex": row.source_annex,
                    "line_ref_jo": row.line_ref_jo,
                    "line_ref_annex": row.line_ref_annex,
                }
            )


def write_line_items_csv(rows: List[VerifiedLineItem], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "line_code",
                "section",
                "label",
                "amount_eur",
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
                    "line_code": row.line_code,
                    "section": row.section,
                    "label": row.label,
                    "amount_eur": row.amount_eur,
                    "source_jo": row.source_jo,
                    "source_annex": row.source_annex,
                    "line_ref_jo": row.line_ref_jo,
                    "line_ref_annex": row.line_ref_annex,
                }
            )


def write_report(rows: List[VerifiedMetric], line_rows: List[VerifiedLineItem], out_md: Path) -> None:
    out_md.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Verification LFI 2026 - ETAT A (recettes/equilibre)",
        "",
        "- Source JO: `Loi n° 2026-103 du 19 fevrier 2026` (`JORFTEXT000053508155`).",
        f"- Source annexe parlementaire: `{AN_STATE_A_RAW_URL}` (Article 147, tableau d'equilibre).",
        "- Methode: extraction ligne a ligne des principaux agregats de recettes/charges/solde (M EUR), comparaison stricte aux montants promulgues.",
        "- Complement: extraction exhaustive de la table `Etat A > Voies et moyens > I. Budget general` (codes de ligne + montants en euros).",
        "",
        "| Cle | Libelle | Valeur extraite (M EUR) | Valeur JO attendue (M EUR) | Match | Ref annexe |",
        "| --- | --- | ---: | ---: | :---: | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row.key} | {row.label} | {row.value_mio} | {row.expected_mio} | "
            f"{'OK' if row.match_ok else 'KO'} | {row.line_ref_annex} |"
        )
    mismatches = [r for r in rows if not r.match_ok]
    lines.extend(
        [
            "",
            f"**Resultat global:** {'OK' if not mismatches else 'KO'} "
            f"({len(rows) - len(mismatches)}/{len(rows)} correspondances).",
        ]
    )

    by_section: Dict[str, int] = {}
    for row in line_rows:
        by_section[row.section] = by_section.get(row.section, 0) + 1
    lines.extend(
        [
            "",
            "## Etat A - Voies et moyens (lignes extraites)",
            "",
            f"- Lignes extraites: `{len(line_rows)}`.",
            f"- Repartition: fiscal `{by_section.get('fiscal', 0)}`, non fiscal `{by_section.get('non_fiscal', 0)}`, prelevements sur recettes `{by_section.get('prelevements_sur_recettes', 0)}`.",
            "",
            "| Code | Intitule | Montant (EUR) | Ref annexe |",
            "| --- | --- | ---: | --- |",
        ]
    )
    showcase_codes = {"1101", "1301", "1302", "1304", "1501", "1601", "1761", "2116", "2505", "2622"}
    for row in line_rows:
        if row.line_code in showcase_codes:
            lines.append(f"| {row.line_code} | {row.label} | {row.amount_eur} | {row.line_ref_annex} |")
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify enacted LFI 2026 ETAT A aggregate receipts/balance values against AN annex table."
    )
    parser.add_argument(
        "--output-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_a_aggregates_verified.csv"),
        help="Path to write verified ETAT A aggregates CSV.",
    )
    parser.add_argument(
        "--report-md",
        default=str(ROOT / "docs" / "verification_lfi2026_state_a.md"),
        help="Path to write markdown verification report.",
    )
    parser.add_argument(
        "--output-lines-csv",
        default=str(ROOT / "data" / "reference" / "lfi_2026_etat_a_line_items_verified.csv"),
        help="Path to write verified ETAT A Voies et moyens line-item CSV.",
    )
    args = parser.parse_args()

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(AN_STATE_A_RAW_URL)
        resp.raise_for_status()
        raw_html = resp.text

    rows = verify_metrics(raw_html)
    line_rows = extract_line_items(raw_html)

    required_line_codes = {"1101", "1301", "1601", "1761", "2116", "2505", "2622"}
    extracted_codes = {r.line_code for r in line_rows}
    missing_codes = sorted(required_line_codes - extracted_codes)
    if missing_codes:
        raise RuntimeError(f"Etat A line-item extraction missing required codes: {missing_codes}")

    write_csv(rows, Path(args.output_csv))
    write_line_items_csv(line_rows, Path(args.output_lines_csv))
    write_report(rows, line_rows, Path(args.report_md))

    mismatches = [r for r in rows if not r.match_ok]
    if mismatches:
        details = ", ".join(f"{m.key}: got={m.value_mio} expected={m.expected_mio}" for m in mismatches)
        raise RuntimeError(f"LFI ETAT A mismatch detected: {details}")

    print(f"Wrote verified CSV: {args.output_csv}")
    print(f"Wrote line-item CSV: {args.output_lines_csv}")
    print(f"Wrote report: {args.report_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import csv
import json
import sys
import types
from pathlib import Path

import pytest

from services.api.cache_warm import warm_plf_2026_plafonds


def test_warm_plf_2026_from_sample_xlsx(tmp_path):
    sample = Path('data/reference/plf_2026_plafonds_sample.xlsx')
    assert sample.exists(), "Sample workbook missing"
    out_csv = tmp_path / 'plf_2026.csv'
    result_path = warm_plf_2026_plafonds(source=str(sample), output_csv=str(out_csv))
    assert Path(result_path) == out_csv
    assert out_csv.exists()
    rows = list(csv_iter(out_csv))
    assert rows, 'Expected at least one row'
    codes = {row['mission_code'] for row in rows}
    assert '101' in codes
    assert any(float(row['plf_ceiling_eur']) > 1_000_000_000 for row in rows)
    meta_path = out_csv.with_suffix('.meta.json')
    assert meta_path.exists()
    with open(meta_path, 'r', encoding='utf-8') as fh:
        meta = json.load(fh)
    assert meta['rows'] == len(rows)
    assert meta['amount_unit'] == 'EUR'


def test_warm_plf_2026_pdf_stub(monkeypatch, tmp_path):
    fake_pdf = tmp_path / 'plf.pdf'
    fake_pdf.write_bytes(b'%PDF-1.4\n%Stub content')

    class _FakePage:
        def extract_tables(self):
            return [[['Code mission', 'Mission', 'Montant'], ['150', 'Education', '78 500'], ['124', 'Justice', '9 550']]]

    class _FakePDF:
        def __init__(self, *args, **kwargs):
            self._closed = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            self._closed = True

        @property
        def pages(self):
            return [_FakePage()]

    fake_module = types.SimpleNamespace(open=lambda *args, **kwargs: _FakePDF())
    monkeypatch.setitem(sys.modules, 'pdfplumber', fake_module)

    out_csv = tmp_path / 'plf_pdf.csv'
    result_path = warm_plf_2026_plafonds(source=str(fake_pdf), output_csv=str(out_csv))
    assert Path(result_path) == out_csv
    rows = list(csv_iter(out_csv))
    codes = {row['mission_code'] for row in rows}
    assert '150' in codes and '124' in codes


def test_warm_plf_2026_pdf_text_fallback(monkeypatch, tmp_path):
    fake_pdf = tmp_path / 'plf_text.pdf'
    fake_pdf.write_bytes(b'%PDF-1.4\n%Stub content')

    class _FakePage:
        def extract_tables(self):
            return []

        def extract_text(self):
            return (
                "Tableau 1bis\n"
                "Action extérieure de l'État 3,3 3,2 -0,0\n"
                "Défense 50,5 57,1 +6,7\n"
                "Remboursements et dégrèvements 148,3 152,2 +3,9\n"
            )

    class _FakePDF:
        def __init__(self, *args, **kwargs):
            self._closed = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            self._closed = True

        @property
        def pages(self):
            return [_FakePage()]

    fake_module = types.SimpleNamespace(open=lambda *args, **kwargs: _FakePDF())
    monkeypatch.setitem(sys.modules, 'pdfplumber', fake_module)

    out_csv = tmp_path / 'plf_pdf_text.csv'
    result_path = warm_plf_2026_plafonds(source=str(fake_pdf), output_csv=str(out_csv))
    assert Path(result_path) == out_csv
    rows = list(csv_iter(out_csv))
    by_code = {row['mission_code']: float(row['plf_ceiling_eur']) for row in rows}
    assert abs(by_code['AA'] - 3_200_000_000.0) < 1e-3
    assert abs(by_code['DA'] - 57_100_000_000.0) < 1e-3
    assert abs(by_code['RD'] - 152_200_000_000.0) < 1e-3


def csv_iter(path: Path):
    with open(path, 'r', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            yield row

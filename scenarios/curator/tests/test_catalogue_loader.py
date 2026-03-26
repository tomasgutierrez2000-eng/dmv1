"""Tests for CatalogueLoader — metric lookup and ingredient extraction."""
import pytest
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from curator_factory.utils.catalogue_loader import CatalogueLoader


@pytest.fixture
def sample_catalogue(tmp_path) -> Path:
    """Create a minimal catalogue.json for testing."""
    items = [
        {
            "item_id": "MET-001",
            "item_name": "Expected Loss Rate",
            "abbreviation": "EL",
            "ingredient_fields": [
                {"table": "facility_risk_snapshot", "field": "pd_pct"},
                {"table": "facility_risk_snapshot", "field": "lgd_pct"},
                {"table": "facility_exposure_snapshot", "field": "committed_amount"},
            ],
        },
        {
            "item_id": "MET-029",
            "item_name": "Debt Service Coverage Ratio",
            "abbreviation": "DSCR",
            "ingredient_fields": [
                {"table": "facility_financial_snapshot", "field": "net_operating_income"},
                {"table": "facility_financial_snapshot", "field": "total_debt_service"},
            ],
        },
        {
            "item_id": "MET-050",
            "item_name": "Loan-to-Value Ratio",
            "abbreviation": "LTV",
            "ingredient_fields": [
                {"table": "facility_exposure_snapshot", "field": "drawn_amount"},
                {"table": "collateral_snapshot", "field": "valuation_amount"},
            ],
        },
    ]
    path = tmp_path / "catalogue.json"
    path.write_text(json.dumps(items))
    return path


def test_find_by_exact_id(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    metric = loader.find_metric("MET-029")
    assert metric is not None
    assert metric["item_name"] == "Debt Service Coverage Ratio"


def test_find_by_name(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    metric = loader.find_metric("DSCR")
    assert metric is not None
    assert metric["item_id"] == "MET-029"


def test_find_by_partial_name(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    metric = loader.find_metric("Expected Loss")
    assert metric is not None
    assert metric["item_id"] == "MET-001"


def test_find_nonexistent(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    metric = loader.find_metric("NONEXISTENT")
    assert metric is None


def test_get_required_tables(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    fields = loader.get_required_tables("MET-029")
    assert len(fields) == 2
    assert fields[0]["table"] == "facility_financial_snapshot"


def test_get_required_l2_tables(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    tables = loader.get_required_l2_tables("MET-050")
    assert "facility_exposure_snapshot" in tables
    assert "collateral_snapshot" in tables


def test_get_required_tables_nonexistent(sample_catalogue):
    loader = CatalogueLoader(sample_catalogue)
    fields = loader.get_required_tables("NONEXISTENT")
    assert fields == []


def test_catalogue_not_found():
    with pytest.raises(FileNotFoundError):
        CatalogueLoader(Path("/nonexistent/catalogue.json"))

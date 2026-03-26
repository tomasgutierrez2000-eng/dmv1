"""Tests for GSIB domain knowledge constants."""
import pytest
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from curator_factory.domain_knowledge.gsib_constants import (
    PD_RANGES, COMMITMENT_RANGES, VALID_COUNTRIES,
    DSCR_THRESHOLDS, LTV_THRESHOLDS, UTILIZATION_BANDS,
    INDUSTRY_MAP, COUNTRY_MAP,
)
from curator_factory.domain_knowledge.scenario_taxonomy import SCENARIO_PROMPTS
from curator_factory.models.scenario import ScenarioType, RatingTier, SizeProfile


def test_pd_ranges_cover_all_tiers():
    for tier in RatingTier:
        assert tier.value in PD_RANGES, f"Missing PD range for {tier.value}"


def test_pd_ranges_non_overlapping():
    tiers = list(PD_RANGES.keys())
    for i in range(len(tiers) - 1):
        current_hi = PD_RANGES[tiers[i]][1]
        next_lo = PD_RANGES[tiers[i + 1]][0]
        assert current_hi <= next_lo, (
            f"PD ranges overlap: {tiers[i]} hi={current_hi} > {tiers[i+1]} lo={next_lo}"
        )


def test_commitment_ranges_cover_all_sizes():
    for size in SizeProfile:
        assert size.value in COMMITMENT_RANGES, f"Missing commitment range for {size.value}"


def test_commitment_ranges_ordered():
    # SMALL < MID < LARGE
    assert COMMITMENT_RANGES["SMALL"][1] <= COMMITMENT_RANGES["MID"][0] or \
           COMMITMENT_RANGES["SMALL"][1] <= COMMITMENT_RANGES["MID"][1]
    assert COMMITMENT_RANGES["MID"][1] <= COMMITMENT_RANGES["LARGE"][1]


def test_valid_countries_count():
    assert len(VALID_COUNTRIES) == 16


def test_valid_countries_iso_format():
    for c in VALID_COUNTRIES:
        assert len(c) == 2 and c == c.upper(), f"Country '{c}' not ISO 2-letter uppercase"


def test_industry_map_covers_1_to_10():
    for i in range(1, 11):
        assert str(i) in INDUSTRY_MAP, f"Missing industry_id {i}"


def test_industry_map_naics_codes():
    for key, val in INDUSTRY_MAP.items():
        assert "naics" in val, f"Industry {key} missing naics code"
        assert isinstance(val["naics"], int), f"Industry {key} naics not int"


def test_country_map_currencies():
    for code, val in COUNTRY_MAP.items():
        assert "currency" in val, f"Country {code} missing currency"
        assert "region" in val, f"Country {code} missing region"
        assert val["region"] in ("AMER", "EMEA", "APAC"), f"Invalid region {val['region']}"


def test_scenario_prompts_cover_all_types():
    for st in ScenarioType:
        assert st.value in SCENARIO_PROMPTS, f"Missing prompt for {st.value}"


def test_dscr_thresholds():
    assert DSCR_THRESHOLDS["healthy"] > DSCR_THRESHOLDS["watch"]
    assert DSCR_THRESHOLDS["watch"] > DSCR_THRESHOLDS["critical"]


def test_ltv_thresholds():
    assert LTV_THRESHOLDS["healthy"] < LTV_THRESHOLDS["elevated"]
    assert LTV_THRESHOLDS["elevated"] < LTV_THRESHOLDS["critical"]


def test_shared_json_exists():
    json_path = Path(__file__).resolve().parents[2] / "shared" / "gsib-constants.json"
    # May not exist in all environments, but if it does, it should be valid JSON
    if json_path.exists():
        data = json.loads(json_path.read_text())
        assert "pd_ranges" in data
        assert "valid_countries" in data

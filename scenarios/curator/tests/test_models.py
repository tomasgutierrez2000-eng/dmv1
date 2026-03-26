"""Tests for Pydantic models — ScenarioConfig, CounterpartyProfile, validation rules."""
import pytest
import sys
from pathlib import Path

# Add package to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from curator_factory.models.scenario import (
    ScenarioConfig, CounterpartyProfile, NarrativeAnalysis,
    ScenarioType, RatingTier, StoryArc, SizeProfile,
    FacilityConfig, TimelineConfig, EventsConfig, CreditEventConfig,
    PD_RANGES, VALID_COUNTRIES, VALID_ENTITY_TYPE_CODES,
)
from curator_factory.models.quality_report import (
    CoherenceReport, CoherenceIssue, ValidationResult,
    SyntheticDetectionResult, MetricRequirement,
)
from curator_factory.models.story_arc import (
    STORY_ARC_PROFILES, clamp_pd_to_tier,
)


# ─── CounterpartyProfile Tests ───────────────────────────────────────────

def _make_cp(**overrides) -> CounterpartyProfile:
    defaults = dict(
        legal_name="Test Corp",
        country="US",
        industry_id=1,
        rating_tier=RatingTier.IG_MID,
        story_arc=StoryArc.STABLE_IG,
        size=SizeProfile.LARGE,
    )
    defaults.update(overrides)
    return CounterpartyProfile(**defaults)


def test_valid_counterparty():
    cp = _make_cp()
    assert cp.legal_name == "Test Corp"
    assert cp.country == "US"


def test_country_uppercased():
    cp = _make_cp(country="us")
    assert cp.country == "US"


def test_invalid_country_rejected():
    with pytest.raises(ValueError, match="not in VALID_COUNTRIES"):
        _make_cp(country="ZZ")


def test_invalid_entity_type_rejected():
    with pytest.raises(ValueError, match="not valid"):
        _make_cp(entity_type_code="INVALID")


def test_valid_entity_type_accepted():
    cp = _make_cp(entity_type_code="CORP")
    assert cp.entity_type_code == "CORP"


def test_industry_id_bounds():
    _make_cp(industry_id=1)  # min
    _make_cp(industry_id=10)  # max
    with pytest.raises(ValueError):
        _make_cp(industry_id=0)
    with pytest.raises(ValueError):
        _make_cp(industry_id=11)


def test_lgd_bounds():
    _make_cp(lgd_unsecured=0.0)
    _make_cp(lgd_unsecured=1.0)
    with pytest.raises(ValueError, match="lgd_unsecured must be 0.0-1.0"):
        _make_cp(lgd_unsecured=1.5)


def test_pd_within_tier_range():
    # IG_MID range: 0.0004 - 0.0015, with 50% tolerance
    _make_cp(rating_tier=RatingTier.IG_MID, pd_annual=0.001)  # within range


def test_pd_far_outside_tier_rejected():
    # IG_HIGH max is 0.0004, 50% tolerance = 0.0006. PD=0.05 is way outside
    with pytest.raises(ValueError, match="far outside"):
        _make_cp(rating_tier=RatingTier.IG_HIGH, pd_annual=0.05)


def test_entity_type_industry_consistency_financial():
    # industry 3 (Financials) requires BANK or FI
    with pytest.raises(ValueError, match="requires entity_type BANK or FI"):
        _make_cp(industry_id=3, entity_type_code="CORP")


def test_entity_type_industry_consistency_real_estate():
    # industry 10 (Real Estate) requires RE
    with pytest.raises(ValueError, match="requires entity_type RE"):
        _make_cp(industry_id=10, entity_type_code="CORP")


def test_entity_type_industry_consistency_valid():
    _make_cp(industry_id=3, entity_type_code="BANK")
    _make_cp(industry_id=10, entity_type_code="RE")


# ─── ScenarioConfig Tests ────────────────────────────────────────────────

def _make_config(**overrides) -> ScenarioConfig:
    defaults = dict(
        scenario_id="S099",
        name="Test Scenario",
        type=ScenarioType.DETERIORATION_TREND,
        narrative="Test narrative",
        counterparties=[_make_cp()],
    )
    defaults.update(overrides)
    return ScenarioConfig(**defaults)


def test_valid_scenario_config():
    config = _make_config()
    assert config.scenario_id == "S099"
    assert config.type == ScenarioType.DETERIORATION_TREND


def test_scenario_requires_counterparties():
    with pytest.raises(ValueError):
        _make_config(counterparties=[])


def test_timeline_chronological():
    _make_config(timeline=TimelineConfig(as_of_dates=["2024-11-30", "2024-12-31", "2025-01-31"]))


def test_timeline_non_chronological_rejected():
    with pytest.raises(ValueError, match="chronological"):
        _make_config(timeline=TimelineConfig(as_of_dates=["2025-01-31", "2024-12-31"]))


def test_event_dates_within_timeline():
    with pytest.raises(ValueError, match="outside timeline range"):
        _make_config(
            timeline=TimelineConfig(as_of_dates=["2024-11-30", "2024-12-31", "2025-01-31"]),
            events=EventsConfig(credit_events=[
                CreditEventConfig(type="DOWNGRADE", date="2023-01-01")
            ]),
        )


def test_event_dates_within_range_accepted():
    config = _make_config(
        timeline=TimelineConfig(as_of_dates=["2024-11-30", "2024-12-31", "2025-01-31"]),
        events=EventsConfig(credit_events=[
            CreditEventConfig(type="DOWNGRADE", date="2024-12-15")
        ]),
    )
    assert len(config.events.credit_events) == 1


# ─── NarrativeAnalysis Tests ─────────────────────────────────────────────

def test_narrative_analysis_valid():
    na = NarrativeAnalysis(
        scenario_type=ScenarioType.DETERIORATION_TREND,
        industry_sector="Energy",
        country_exposure=["US", "CA"],
        counterparty_count=5,
        key_risk_driver="Oil price crash",
    )
    assert na.counterparty_count == 5


def test_narrative_analysis_count_bounds():
    with pytest.raises(ValueError):
        NarrativeAnalysis(
            scenario_type=ScenarioType.DETERIORATION_TREND,
            industry_sector="Energy",
            country_exposure=["US"],
            counterparty_count=0,  # Must be ≥ 1
            key_risk_driver="test",
        )


# ─── Quality Report Tests ────────────────────────────────────────────────

def test_coherence_report_passed():
    report = CoherenceReport(
        scenario_id="S001",
        total_facilities=10,
        overall_score=85.0,
        passed=True,
    )
    assert report.computed_passed is True


def test_coherence_report_failed():
    report = CoherenceReport(
        scenario_id="S001",
        total_facilities=10,
        overall_score=65.0,
        passed=False,
    )
    assert report.computed_passed is False


def test_metric_requirement():
    mr = MetricRequirement(
        metric_id="MET-029",
        metric_name="DSCR",
        required_l2_tables=["facility_financial_snapshot"],
        desired_behavior="breach",
    )
    assert mr.metric_id == "MET-029"


# ─── Story Arc Tests ─────────────────────────────────────────────────────

def test_story_arc_profiles_complete():
    assert len(STORY_ARC_PROFILES) == 7
    for arc in StoryArc:
        assert arc.value in STORY_ARC_PROFILES


def test_clamp_pd_to_tier():
    # IG_HIGH range: 0.0001 - 0.0004
    assert clamp_pd_to_tier(0.0002, RatingTier.IG_HIGH) == 0.0002  # within range
    assert clamp_pd_to_tier(0.001, RatingTier.IG_HIGH) == 0.0004  # clamped to max
    assert clamp_pd_to_tier(0.00001, RatingTier.IG_HIGH) == 0.0001  # clamped to min


# ─── Enum Coverage Tests ─────────────────────────────────────────────────

def test_all_scenario_types():
    assert len(ScenarioType) == 15


def test_all_rating_tiers():
    assert len(RatingTier) == 6


def test_all_story_arcs():
    assert len(StoryArc) == 7


def test_all_size_profiles():
    assert len(SizeProfile) == 3

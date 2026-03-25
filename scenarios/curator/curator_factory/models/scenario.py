from enum import Enum
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
import json
from pathlib import Path

# Load shared constants
_CONSTANTS_PATH = Path(__file__).resolve().parents[3] / "shared" / "gsib-constants.json"

class ScenarioType(str, Enum):
    EXPOSURE_BREACH = "EXPOSURE_BREACH"
    DETERIORATION_TREND = "DETERIORATION_TREND"
    RATING_DIVERGENCE = "RATING_DIVERGENCE"
    COLLATERAL_DECLINE = "COLLATERAL_DECLINE"
    STRESS_TEST = "STRESS_TEST"
    EVENT_CASCADE = "EVENT_CASCADE"
    PIPELINE_SPIKE = "PIPELINE_SPIKE"
    DELINQUENCY_TREND = "DELINQUENCY_TREND"
    SYNDICATED_FACILITY = "SYNDICATED_FACILITY"
    BREACH_RESOLUTION = "BREACH_RESOLUTION"
    DATA_QUALITY = "DATA_QUALITY"
    PRODUCT_MIX = "PRODUCT_MIX"
    LEVERAGED_FINANCE = "LEVERAGED_FINANCE"
    REGULATORY_NEAR_MISS = "REGULATORY_NEAR_MISS"
    MATURITY_WALL = "MATURITY_WALL"

class RatingTier(str, Enum):
    IG_HIGH = "IG_HIGH"
    IG_MID = "IG_MID"
    IG_LOW = "IG_LOW"
    HY_HIGH = "HY_HIGH"
    HY_MID = "HY_MID"
    HY_LOW = "HY_LOW"

class StoryArc(str, Enum):
    STABLE_IG = "STABLE_IG"
    GROWING = "GROWING"
    STEADY_HY = "STEADY_HY"
    DETERIORATING = "DETERIORATING"
    RECOVERING = "RECOVERING"
    STRESSED_SECTOR = "STRESSED_SECTOR"
    NEW_RELATIONSHIP = "NEW_RELATIONSHIP"

class SizeProfile(str, Enum):
    LARGE = "LARGE"
    MID = "MID"
    SMALL = "SMALL"

# Valid countries from COUNTRY_MAP in gsib-enrichment.ts
VALID_COUNTRIES = {"US", "GB", "DE", "FR", "JP", "CH", "CA", "AU", "NL", "SG", "HK", "KR", "BR", "IN", "AE", "MX"}

# Valid entity type codes from shared-constants.ts
VALID_ENTITY_TYPE_CODES = {"BANK", "CORP", "FI", "FUND", "INS", "MDB", "OTH", "PE", "PSE", "RE", "SOV", "SPE"}

# PD ranges per rating tier (from gsib-enrichment.ts RATING_TIER_MAP)
PD_RANGES: dict[str, tuple[float, float]] = {
    "IG_HIGH": (0.0001, 0.0004),
    "IG_MID": (0.0004, 0.0015),
    "IG_LOW": (0.0015, 0.0040),
    "HY_HIGH": (0.0040, 0.0200),
    "HY_MID": (0.0200, 0.0500),
    "HY_LOW": (0.0500, 0.1500),
}

# Commitment ranges per size profile
COMMITMENT_RANGES: dict[str, tuple[int, int]] = {
    "LARGE": (500_000_000, 5_000_000_000),
    "MID": (100_000_000, 500_000_000),
    "SMALL": (20_000_000, 100_000_000),
}

class CounterpartyProfile(BaseModel):
    legal_name: str
    country: str = Field(min_length=2, max_length=2)
    industry_id: int = Field(ge=1, le=10)
    rating_tier: RatingTier
    story_arc: StoryArc
    size: SizeProfile
    counterparty_type: Optional[str] = None
    entity_type_code: Optional[str] = None
    basel_asset_class: Optional[str] = None
    external_rating_sp: Optional[str] = None
    external_rating_moodys: Optional[str] = None
    internal_risk_rating: Optional[str] = None
    pd_annual: Optional[float] = None
    lgd_unsecured: Optional[float] = None

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_COUNTRIES:
            raise ValueError(f"country '{v}' not in VALID_COUNTRIES: {sorted(VALID_COUNTRIES)}")
        return v

    @field_validator("entity_type_code")
    @classmethod
    def validate_entity_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_ENTITY_TYPE_CODES:
            raise ValueError(f"entity_type_code '{v}' not valid. Valid: {sorted(VALID_ENTITY_TYPE_CODES)}")
        return v

    @field_validator("lgd_unsecured")
    @classmethod
    def validate_lgd(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError(f"lgd_unsecured must be 0.0-1.0, got {v}")
        return v

    @model_validator(mode="after")
    def validate_cross_fields(self) -> "CounterpartyProfile":
        # PD must be within tier range if explicitly set
        if self.pd_annual is not None:
            pd_range = PD_RANGES.get(self.rating_tier.value)
            if pd_range:
                lo, hi = pd_range
                # Allow 50% tolerance beyond band for edge cases
                if self.pd_annual > hi * 1.5 or self.pd_annual < lo * 0.5:
                    raise ValueError(
                        f"pd_annual={self.pd_annual} far outside {self.rating_tier.value} "
                        f"range [{lo}, {hi}]"
                    )
        # Entity type must be consistent with industry
        if self.entity_type_code:
            if self.industry_id == 3 and self.entity_type_code not in ("BANK", "FI"):
                raise ValueError(
                    f"industry_id=3 (Financial) requires entity_type BANK or FI, got {self.entity_type_code}"
                )
            if self.industry_id == 10 and self.entity_type_code != "RE":
                raise ValueError(
                    f"industry_id=10 (Real Estate) requires entity_type RE, got {self.entity_type_code}"
                )
        return self


class FacilityConfig(BaseModel):
    per_counterparty: int = Field(default=3, ge=1, le=20)
    types: Optional[list[str]] = None
    total_commitment_range: Optional[tuple[int, int]] = None


class TimelineConfig(BaseModel):
    as_of_dates: list[str] = Field(default_factory=lambda: [
        "2024-11-30", "2024-12-31", "2025-01-31"
    ])

    @field_validator("as_of_dates")
    @classmethod
    def validate_chronological(cls, v: list[str]) -> list[str]:
        for i in range(1, len(v)):
            if v[i] <= v[i - 1]:
                raise ValueError(f"as_of_dates must be chronological: {v[i-1]} >= {v[i]}")
        return v


class CreditEventConfig(BaseModel):
    type: str
    date: str
    description: Optional[str] = None
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None


class RiskFlagConfig(BaseModel):
    code: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    description: Optional[str] = None


class AmendmentConfig(BaseModel):
    type: str
    status: str
    date: str
    description: Optional[str] = None


class EventsConfig(BaseModel):
    credit_events: Optional[list[CreditEventConfig]] = None
    risk_flags: Optional[list[RiskFlagConfig]] = None
    amendments: Optional[list[AmendmentConfig]] = None


class StressTestConfig(BaseModel):
    scenario_name: str
    loss_amount: float
    result_status: str


class LimitConfig(BaseModel):
    limit_amount: float
    utilization_trend: Optional[list[float]] = None
    limit_type: Optional[str] = None


class VerificationConfig(BaseModel):
    min_rows: Optional[int] = None
    key_assertion: Optional[str] = None


class NarrativeAnalysis(BaseModel):
    """Intermediate model for Block 1 output -- structured extraction from English narrative."""
    scenario_type: ScenarioType
    industry_sector: str
    country_exposure: list[str]
    counterparty_count: int = Field(ge=1, le=20)
    total_exposure_usd: Optional[float] = None
    key_risk_driver: str
    time_horizon_months: int = Field(default=3, ge=3, le=24)
    expected_events: list[str] = Field(default_factory=list)
    target_metrics: list[str] = Field(default_factory=list)
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"


class ScenarioConfig(BaseModel):
    scenario_id: str
    name: str
    type: ScenarioType
    narrative: str = ""
    counterparties: list[CounterpartyProfile] = Field(min_length=1)
    facilities: FacilityConfig = Field(default_factory=FacilityConfig)
    timeline: TimelineConfig = Field(default_factory=TimelineConfig)
    events: Optional[EventsConfig] = None
    stress_test: Optional[StressTestConfig] = None
    limit: Optional[LimitConfig] = None
    l2_tables: Optional[dict] = None
    verification: Optional[VerificationConfig] = None
    market_environment: Optional[dict] = None
    time_series: Optional[dict] = None
    lifecycle: Optional[dict] = None
    covenants: Optional[dict] = None

    @model_validator(mode="after")
    def validate_events_in_timeline(self) -> "ScenarioConfig":
        if self.events and self.events.credit_events and self.timeline.as_of_dates:
            start = self.timeline.as_of_dates[0]
            end = self.timeline.as_of_dates[-1]
            for evt in self.events.credit_events:
                if evt.date < start or evt.date > end:
                    raise ValueError(
                        f"Event date {evt.date} outside timeline range [{start}, {end}]"
                    )
        return self

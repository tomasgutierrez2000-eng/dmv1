"""GSIB calibration constants -- loaded from shared JSON where possible, hardcoded for regulatory values."""
import json
from pathlib import Path

_SHARED_JSON = Path(__file__).resolve().parents[3] / "shared" / "gsib-constants.json"

def _load_shared() -> dict:
    if _SHARED_JSON.exists():
        return json.loads(_SHARED_JSON.read_text())
    return {}

_shared = _load_shared()

# PD ranges per rating tier (regulatory, Basel III calibration)
PD_RANGES = _shared.get("pd_ranges", {
    "IG_HIGH": [0.0001, 0.0004],
    "IG_MID": [0.0004, 0.0015],
    "IG_LOW": [0.0015, 0.0040],
    "HY_HIGH": [0.0040, 0.0200],
    "HY_MID": [0.0200, 0.0500],
    "HY_LOW": [0.0500, 0.1500],
})

COMMITMENT_RANGES = _shared.get("commitment_ranges", {
    "LARGE": [500_000_000, 5_000_000_000],
    "MID": [100_000_000, 500_000_000],
    "SMALL": [20_000_000, 100_000_000],
})

DSCR_THRESHOLDS = {"healthy": 1.25, "watch": 1.0, "critical": 0.8}
LTV_THRESHOLDS = {"healthy": 0.65, "elevated": 0.80, "critical": 0.90}
UTILIZATION_BANDS = {"normal": [0.30, 0.70], "elevated": [0.70, 0.90], "critical": [0.90, 1.0]}

VALID_COUNTRIES = _shared.get("valid_countries", [
    "US", "GB", "DE", "FR", "JP", "CH", "CA", "AU", "NL", "SG", "HK", "KR", "BR", "IN", "AE", "MX"
])

VALID_SCENARIO_TYPES = [
    "EXPOSURE_BREACH", "DETERIORATION_TREND", "RATING_DIVERGENCE",
    "COLLATERAL_DECLINE", "STRESS_TEST", "EVENT_CASCADE", "PIPELINE_SPIKE",
    "DELINQUENCY_TREND", "SYNDICATED_FACILITY", "BREACH_RESOLUTION",
    "DATA_QUALITY", "PRODUCT_MIX", "LEVERAGED_FINANCE",
    "REGULATORY_NEAR_MISS", "MATURITY_WALL",
]

INDUSTRY_MAP = _shared.get("industry_map", {
    "1": {"name": "TMT", "naics": 51, "entity_type": "CORP"},
    "2": {"name": "Healthcare", "naics": 62, "entity_type": "CORP"},
    "3": {"name": "Financials", "naics": 52, "entity_type": "BANK"},
    "4": {"name": "Energy", "naics": 21, "entity_type": "CORP"},
    "5": {"name": "Industrials", "naics": 31, "entity_type": "CORP"},
    "6": {"name": "Consumer Staples", "naics": 42, "entity_type": "CORP"},
    "7": {"name": "Retail", "naics": 44, "entity_type": "CORP"},
    "8": {"name": "Utilities", "naics": 22, "entity_type": "CORP"},
    "9": {"name": "Materials", "naics": 23, "entity_type": "CORP"},
    "10": {"name": "Real Estate", "naics": 53, "entity_type": "RE"},
})

COUNTRY_MAP = _shared.get("country_map", {
    "US": {"currency": "USD", "region": "AMER"},
    "GB": {"currency": "GBP", "region": "EMEA"},
    "DE": {"currency": "EUR", "region": "EMEA"},
    "FR": {"currency": "EUR", "region": "EMEA"},
    "JP": {"currency": "JPY", "region": "APAC"},
    "CH": {"currency": "CHF", "region": "EMEA"},
    "CA": {"currency": "CAD", "region": "AMER"},
    "AU": {"currency": "AUD", "region": "APAC"},
    "NL": {"currency": "EUR", "region": "EMEA"},
    "SG": {"currency": "SGD", "region": "APAC"},
    "HK": {"currency": "HKD", "region": "APAC"},
    "KR": {"currency": "KRW", "region": "APAC"},
    "BR": {"currency": "BRL", "region": "AMER"},
    "IN": {"currency": "INR", "region": "APAC"},
    "AE": {"currency": "AED", "region": "EMEA"},
    "MX": {"currency": "MXN", "region": "AMER"},
})

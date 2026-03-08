"""Data models for the calculation engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class DemoPosition:
    position_id: str
    facility_id: str
    position_type: str
    balance_amount: float
    description: str


@dataclass
class DemoFacility:
    facility_id: str
    facility_name: str
    counterparty_id: str
    counterparty_name: str
    lob_segment_id: str
    desk_name: str
    portfolio_name: str
    lob_name: str
    committed_amt: float
    collateral_value: float
    ltv_pct: float
    positions: list[DemoPosition] = field(default_factory=list)
    # Generic extra fields for any metric-specific values
    extra_fields: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "facility_id": self.facility_id,
            "facility_name": self.facility_name,
            "counterparty_id": self.counterparty_id,
            "counterparty_name": self.counterparty_name,
            "lob_segment_id": self.lob_segment_id,
            "desk_name": self.desk_name,
            "portfolio_name": self.portfolio_name,
            "lob_name": self.lob_name,
            "committed_amt": self.committed_amt,
            "collateral_value": self.collateral_value,
            "ltv_pct": self.ltv_pct,
            "positions": [
                {
                    "position_id": p.position_id,
                    "facility_id": p.facility_id,
                    "position_type": p.position_type,
                    "balance_amount": p.balance_amount,
                    "description": p.description,
                }
                for p in self.positions
            ],
        }
        # Merge extra fields at top level (matches DemoFacility TS type)
        # Only add keys not already in d to avoid overwriting base fields
        for k, v in self.extra_fields.items():
            if k not in d:
                d[k] = v
        return d


@dataclass
class LevelResult:
    """Result of a metric calculation at one rollup level."""

    level: str  # facility, counterparty, desk, portfolio, lob
    metric_id: str
    data: Any  # pd.DataFrame
    as_of_date: str


@dataclass
class GenerateDemoResult:
    ok: bool
    demo_data: dict | None = None
    error: str | None = None
    diagnostics: dict | None = None

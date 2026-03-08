"""Interest Expense calculator — committed × bank_share × cost_of_funds."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator

if TYPE_CHECKING:
    from ..data_loader import DataLoader


@register
class InterestExpenseCalculator(BaseCalculator):
    metric_id = "PROF-108"
    catalogue_id = "MET-108"
    name = "Interest Expense"
    _legacy_ids = ["INT_EXP"]

    def primary_value_column(self) -> str:
        return "interest_expense_amt"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "committed_facility_amt": "committed_facility_amt",
            "bank_share_pct": "bank_share_pct",
            "cost_of_funds_pct": "cost_of_funds_pct",
        }

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fm = loader.load_table("L1", "facility_master")
        fla = loader.load_table("L1", "facility_lender_allocation")
        fps = loader.load_table("L2", "facility_pricing_snapshot")

        # Filter pricing to as_of_date
        if "as_of_date" in fps.columns:
            fps = fps[fps["as_of_date"] == as_of_date]

        # Join facility_master → facility_lender_allocation
        result = fm[["facility_id", "committed_facility_amt"]].merge(
            fla[["facility_id", "bank_share_pct"]], on="facility_id", how="inner"
        )

        # Join → facility_pricing_snapshot (derive cost_of_funds if NULL)
        pricing = fps[["facility_id"]].copy()
        if "cost_of_funds_pct" in fps.columns:
            pricing["cost_of_funds_pct"] = fps["cost_of_funds_pct"]
        else:
            pricing["cost_of_funds_pct"] = pd.NA

        # Derive from all_in_rate - spread_bps/100 where cost_of_funds is null
        if "all_in_rate_pct" in fps.columns and "spread_bps" in fps.columns:
            derived = fps["all_in_rate_pct"] - fps["spread_bps"] / 100.0
            pricing["cost_of_funds_pct"] = pricing["cost_of_funds_pct"].fillna(derived)

        result = result.merge(pricing, on="facility_id", how="inner")

        # Calculate: committed × bank_share/100 × cost_of_funds/100
        result["interest_expense_amt"] = (
            result["committed_facility_amt"]
            * result["bank_share_pct"] / 100.0
            * result["cost_of_funds_pct"] / 100.0
        )

        return result[
            ["facility_id", "interest_expense_amt",
             "committed_facility_amt", "bank_share_pct", "cost_of_funds_pct"]
        ]

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L1", "facility_master")[["facility_id", "counterparty_id"]]
        j = fac.merge(fm, on="facility_id", how="left")
        g = j.groupby("counterparty_id", as_index=False).agg(
            interest_expense_amt=("interest_expense_amt", "sum"),
        )
        return g[["counterparty_id", "interest_expense_amt"]]

    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L1", "facility_master")[["facility_id", "lob_segment_id"]]
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")

        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"

        desks = ebt.loc[
            ebt[level_col].astype(str).isin(["L3", "3"]),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "lob_segment_id", name_col: "segment_name"})

        j = fac.merge(fm, on="facility_id", how="left").merge(desks, on="lob_segment_id", how="left")
        g = j.groupby(["lob_segment_id", "segment_name"], as_index=False).agg(
            interest_expense_amt=("interest_expense_amt", "sum"),
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "interest_expense_amt"]
        ]

"""Interest Expense calculator — SUM(funded_amount) × bank_share × cost_of_funds.

L1/L2 → Python → L3 Pipeline:
  L2 Inputs:  position (position_id, facility_id, as_of_date)
              position_detail (funded_amount)
              facility_pricing_snapshot (cost_of_funds_pct, all_in_rate_pct, spread_bps)
  L2 Inputs:  facility_master (is_active_flag)
              facility_lender_allocation (bank_share_pct)
              facility_counterparty_participation (participation_pct)
  L1 Inputs:  enterprise_business_taxonomy (hierarchy)
  Formula:    SUM(funded_amount) × bank_share_pct / 100 × cost_of_funds_pct / 100
              (funded basis — actual interest cost on drawn exposure)
  L3 Output:  interest_expense_amt per dimension
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator, filter_by_date

if TYPE_CHECKING:
    from ..data_loader import DataLoader

_ACTIVE_TRUTHY = {"Y", "YES", "TRUE", "T", "1"}


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
            "funded_amount_sum": "funded_amt",
            "bank_share_pct": "bank_share_pct",
            "cost_of_funds_pct": "cost_of_funds_pct",
        }

    # ── L1/L2 → Python → L3: Facility Level ───────────────────
    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        # L2 inputs
        fm = loader.load_table("L2", "facility_master")
        fla = loader.load_table("L2", "facility_lender_allocation")
        # L2 inputs
        pos = loader.load_table("L2", "position")
        pdtl = loader.load_table("L2", "position_detail")
        fps = loader.load_table("L2", "facility_pricing_snapshot")

        # Step 1: SUM(funded_amount) per facility from position → position_detail
        pos_f = filter_by_date(pos, "as_of_date", as_of_date)[["position_id", "facility_id"]].drop_duplicates()

        pdtl_f = filter_by_date(pdtl, "as_of_date", as_of_date)[["position_id", "funded_amount"]].copy()
        pdtl_f["funded_amount"] = pdtl_f["funded_amount"].fillna(0.0)

        j = pos_f.merge(pdtl_f, on="position_id", how="inner")
        fac_sum = j.groupby("facility_id", as_index=False).agg(
            funded_amount_sum=("funded_amount", "sum")
        )

        # Step 2: Filter active facilities
        fm_sub = fm[["facility_id", "is_active_flag"]].copy()
        fm_sub["is_active_flag"] = (
            fm_sub["is_active_flag"].fillna("").astype(str).str.upper().str.strip()
        )
        fm_sub = fm_sub[fm_sub["is_active_flag"].isin(_ACTIVE_TRUTHY)]
        fac_sum = fac_sum.merge(fm_sub[["facility_id"]], on="facility_id", how="inner")

        # Step 3: Join bank_share_pct from facility_lender_allocation
        fla_sub = fla[["facility_id", "bank_share_pct"]].drop_duplicates("facility_id")
        fac_sum = fac_sum.merge(fla_sub, on="facility_id", how="left")
        fac_sum["bank_share_pct"] = fac_sum["bank_share_pct"].fillna(100.0)

        # Step 4: Join cost_of_funds from facility_pricing_snapshot
        if "as_of_date" in fps.columns:
            fps = filter_by_date(fps, "as_of_date", as_of_date)

        pricing = fps[["facility_id"]].copy()
        if "cost_of_funds_pct" in fps.columns:
            pricing["cost_of_funds_pct"] = fps["cost_of_funds_pct"].values
        else:
            pricing["cost_of_funds_pct"] = pd.NA

        # Derive from all_in_rate - spread_bps/100 where cost_of_funds is null
        if "all_in_rate_pct" in fps.columns and "spread_bps" in fps.columns:
            derived = fps["all_in_rate_pct"].values - fps["spread_bps"].values / 100.0
            pricing["cost_of_funds_pct"] = pricing["cost_of_funds_pct"].fillna(
                pd.Series(derived, index=pricing.index)
            )

        fac_sum = fac_sum.merge(
            pricing.drop_duplicates("facility_id"), on="facility_id", how="left"
        )
        fac_sum["cost_of_funds_pct"] = fac_sum["cost_of_funds_pct"].fillna(0.0)

        # L3 output: funded_sum × bank_share/100 × cost_of_funds/100
        fac_sum["interest_expense_amt"] = (
            fac_sum["funded_amount_sum"]
            * fac_sum["bank_share_pct"] / 100.0
            * fac_sum["cost_of_funds_pct"] / 100.0
        )

        return fac_sum[
            ["facility_id", "interest_expense_amt",
             "funded_amount_sum", "bank_share_pct", "cost_of_funds_pct"]
        ]

    # ── L2 → Python → L3: Counterparty Level ──────────────────
    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fcp = loader.load_table("L2", "facility_counterparty_participation")
        part = fcp[["facility_id", "counterparty_id", "participation_pct"]].copy()
        part["participation_pct"] = part["participation_pct"].fillna(100.0)

        j = fac.merge(part, on="facility_id", how="inner")
        j["cp_interest_expense"] = j["interest_expense_amt"] * j["participation_pct"] / 100.0
        return (
            j.groupby("counterparty_id", as_index=False)
            .agg(interest_expense_amt=("cp_interest_expense", "sum"))
        )

    # ── L1/L2 → Python → L3: Desk Level ───────────────────────
    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L2", "facility_master")[["facility_id", "lob_segment_id"]]
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")

        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"

        desks = ebt.loc[
            ebt[level_col].astype(str).isin(["L3", "3"]),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "lob_segment_id", name_col: "segment_name"})

        j = fac.merge(fm, on="facility_id", how="left").merge(
            desks, on="lob_segment_id", how="left"
        )
        g = j.groupby(["lob_segment_id", "segment_name"], as_index=False).agg(
            interest_expense_amt=("interest_expense_amt", "sum"),
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "interest_expense_amt"]
        ]

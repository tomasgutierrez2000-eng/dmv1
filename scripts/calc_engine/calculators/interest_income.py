"""Interest Income calculator — ETL'd interest_income_amt × bank_share_pct.

L1/L2 → Python → L3 Pipeline:
  L2 Inputs:  facility_profitability_snapshot (interest_income_amt)
  L2 Inputs:  facility_master (is_active_flag)
              facility_lender_allocation (bank_share_pct)
              facility_counterparty_participation (participation_pct)
  L1 Inputs:  enterprise_business_taxonomy (hierarchy)
  Formula:    interest_income_amt × bank_share_pct / 100
              (interest_income_amt is ETL'd from core banking, includes proper
               accrual, day-count, and fee amortization per ASC 310-20)
  L3 Output:  interest_income_amt per dimension
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
class InterestIncomeCalculator(BaseCalculator):
    metric_id = "EXP-041"
    catalogue_id = "MET-087"
    name = "Interest Income"
    _legacy_ids = ["INT_INC"]

    def primary_value_column(self) -> str:
        return "interest_income_amt"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "interest_income_raw": "interest_income_amt",
            "bank_share_pct": "bank_share_pct",
        }

    # ── L1/L2 → Python → L3: Facility Level ───────────────────
    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        # L2 inputs
        fm = loader.load_table("L2", "facility_master")
        fla = loader.load_table("L2", "facility_lender_allocation")
        # L2 inputs
        fprs = loader.load_table("L2", "facility_profitability_snapshot")

        # Filter profitability snapshot to as_of_date
        if "as_of_date" in fprs.columns:
            fprs = filter_by_date(fprs, "as_of_date", as_of_date)

        fprs_sub = fprs[["facility_id", "interest_income_amt"]].copy()
        fprs_sub["interest_income_amt"] = fprs_sub["interest_income_amt"].fillna(0.0)

        # SUM interest_income_amt per facility (in case of multiple snapshots)
        fac_sum = fprs_sub.groupby("facility_id", as_index=False).agg(
            interest_income_raw=("interest_income_amt", "sum")
        )

        # Filter active facilities
        fm_sub = fm[["facility_id", "is_active_flag"]].copy()
        fm_sub["is_active_flag"] = (
            fm_sub["is_active_flag"].fillna("").astype(str).str.upper().str.strip()
        )
        fm_sub = fm_sub[fm_sub["is_active_flag"].isin(_ACTIVE_TRUTHY)]
        fac_sum = fac_sum.merge(fm_sub[["facility_id"]], on="facility_id", how="inner")

        # Join bank_share_pct from facility_lender_allocation
        fla_sub = fla[["facility_id", "bank_share_pct"]].drop_duplicates("facility_id")
        fac_sum = fac_sum.merge(fla_sub, on="facility_id", how="left")
        fac_sum["bank_share_pct"] = fac_sum["bank_share_pct"].fillna(100.0)

        # L3 output: interest_income × bank_share / 100
        fac_sum["interest_income_amt"] = (
            fac_sum["interest_income_raw"] * fac_sum["bank_share_pct"] / 100.0
        )

        return fac_sum[
            ["facility_id", "interest_income_amt",
             "interest_income_raw", "bank_share_pct"]
        ]

    # ── L2 → Python → L3: Counterparty Level ──────────────────
    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fcp = loader.load_table("L2", "facility_counterparty_participation")
        part = fcp[["facility_id", "counterparty_id", "participation_pct"]].copy()
        part["participation_pct"] = part["participation_pct"].fillna(100.0)

        j = fac.merge(part, on="facility_id", how="inner")
        j["cp_interest_income"] = j["interest_income_amt"] * j["participation_pct"] / 100.0
        return (
            j.groupby("counterparty_id", as_index=False)
            .agg(interest_income_amt=("cp_interest_income", "sum"))
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
            interest_income_amt=("interest_income_amt", "sum"),
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "interest_income_amt"]
        ]

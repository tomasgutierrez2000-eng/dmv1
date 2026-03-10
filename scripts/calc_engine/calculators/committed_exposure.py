"""Committed Exposure calculator — committed_facility_amt × bank_share_pct.

L1/L2 → Python → L3 Pipeline:
  L2 Inputs:  facility_master (committed_facility_amt, is_active_flag)
              facility_lender_allocation (bank_share_pct)
              facility_counterparty_participation (participation_pct)
  L1 Inputs:  enterprise_business_taxonomy (hierarchy)
  Formula:    committed_facility_amt × bank_share_pct / 100
  L3 Output:  committed_exposure_usd per dimension
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
class CommittedExposureCalculator(BaseCalculator):
    metric_id = "EXP-004"
    catalogue_id = "MET-012"
    name = "Committed Exposure"
    _legacy_ids = ["C112"]

    def primary_value_column(self) -> str:
        return "committed_exposure_usd"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "committed_facility_amt": "committed_facility_amt",
            "bank_share_pct": "bank_share_pct",
        }

    # ── L2 → Python → L3: Facility Level ──────────────────────
    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        # L2 inputs
        fm = loader.load_table("L2", "facility_master")
        fla = loader.load_table("L2", "facility_lender_allocation")

        # Filter active facilities
        fm_sub = fm[["facility_id", "committed_facility_amt", "is_active_flag"]].copy()
        fm_sub["is_active_flag"] = (
            fm_sub["is_active_flag"].fillna("").astype(str).str.upper().str.strip()
        )
        fm_sub = fm_sub[fm_sub["is_active_flag"].isin(_ACTIVE_TRUTHY)].copy()

        # Join bank_share_pct from facility_lender_allocation
        fla_sub = fla[["facility_id", "bank_share_pct"]].drop_duplicates("facility_id")
        result = fm_sub.merge(fla_sub, on="facility_id", how="left")
        result["bank_share_pct"] = result["bank_share_pct"].fillna(100.0)

        # L3 output: committed_facility_amt × bank_share_pct / 100
        result["committed_exposure_usd"] = (
            result["committed_facility_amt"] * result["bank_share_pct"] / 100.0
        )

        return result[
            ["facility_id", "committed_exposure_usd",
             "committed_facility_amt", "bank_share_pct"]
        ]

    # ── L2 → Python → L3: Counterparty Level ──────────────────
    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fcp = loader.load_table("L2", "facility_counterparty_participation")
        part = fcp[["facility_id", "counterparty_id", "participation_pct"]].copy()
        part["participation_pct"] = part["participation_pct"].fillna(100.0)

        j = fac.merge(part, on="facility_id", how="inner")
        j["cp_committed"] = j["committed_exposure_usd"] * j["participation_pct"] / 100.0
        return (
            j.groupby("counterparty_id", as_index=False)
            .agg(committed_exposure_usd=("cp_committed", "sum"))
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
            committed_exposure_usd=("committed_exposure_usd", "sum")
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "committed_exposure_usd"]
        ]

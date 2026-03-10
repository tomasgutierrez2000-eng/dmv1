"""Undrawn Exposure calculator — SUM(unfunded_amount) × bank_share_pct.

L1/L2 → Python → L3 Pipeline:
  L2 Inputs:  position (position_id, facility_id, as_of_date)
              position_detail (unfunded_amount)
  L2 Inputs:  facility_master (is_active_flag)
              facility_lender_allocation (bank_share_pct)
              facility_counterparty_participation (participation_pct)
  L1 Inputs:  enterprise_business_taxonomy (hierarchy)
  Formula:    SUM(unfunded_amount per position) × bank_share_pct / 100
  L3 Output:  undrawn_exposure_usd per dimension
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
class UndrawnExposureCalculator(BaseCalculator):
    metric_id = "EXP-017"
    catalogue_id = "MET-033"
    name = "Undrawn Exposure"
    _legacy_ids = ["C114"]

    def primary_value_column(self) -> str:
        return "undrawn_exposure_usd"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "unfunded_amount_sum": "unfunded_amt",
            "bank_share_pct": "bank_share_pct",
        }

    # ── L1/L2 → Python → L3: Facility Level ───────────────────
    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        # L2 inputs
        fm = loader.load_table("L2", "facility_master")
        fla = loader.load_table("L2", "facility_lender_allocation")
        # L2 inputs
        pos = loader.load_table("L2", "position")
        pdtl = loader.load_table("L2", "position_detail")

        # Filter positions to as_of_date
        pos_f = filter_by_date(pos, "as_of_date", as_of_date)[["position_id", "facility_id"]].drop_duplicates()

        pdtl_f = filter_by_date(pdtl, "as_of_date", as_of_date)[["position_id", "unfunded_amount"]].copy()
        pdtl_f["unfunded_amount"] = pdtl_f["unfunded_amount"].fillna(0.0)

        # Join position → position_detail, SUM(unfunded_amount) per facility
        j = pos_f.merge(pdtl_f, on="position_id", how="inner")
        fac_sum = j.groupby("facility_id", as_index=False).agg(
            unfunded_amount_sum=("unfunded_amount", "sum")
        )

        # Filter active facilities
        fm_sub = fm[["facility_id", "is_active_flag"]].copy()
        fm_sub["is_active_flag"] = (
            fm_sub["is_active_flag"].fillna("").astype(str).str.upper().str.strip()
        )
        fm_sub = fm_sub[fm_sub["is_active_flag"].isin(_ACTIVE_TRUTHY)]
        fac_sum = fac_sum.merge(fm_sub[["facility_id"]], on="facility_id", how="inner")

        # Join bank_share_pct from facility_lender_allocation (NOT facility_master)
        fla_sub = fla[["facility_id", "bank_share_pct"]].drop_duplicates("facility_id")
        fac_sum = fac_sum.merge(fla_sub, on="facility_id", how="left")
        fac_sum["bank_share_pct"] = fac_sum["bank_share_pct"].fillna(100.0)

        # L3 output: unfunded_sum × bank_share / 100
        fac_sum["undrawn_exposure_usd"] = (
            fac_sum["unfunded_amount_sum"] * fac_sum["bank_share_pct"] / 100.0
        )

        return fac_sum[
            ["facility_id", "undrawn_exposure_usd",
             "unfunded_amount_sum", "bank_share_pct"]
        ]

    # ── L2 → Python → L3: Counterparty Level ──────────────────
    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fcp = loader.load_table("L2", "facility_counterparty_participation")
        part = fcp[["facility_id", "counterparty_id", "participation_pct"]].copy()
        part["participation_pct"] = part["participation_pct"].fillna(100.0)

        j = fac.merge(part, on="facility_id", how="inner")
        j["cp_undrawn"] = j["undrawn_exposure_usd"] * j["participation_pct"] / 100.0
        return (
            j.groupby("counterparty_id", as_index=False)
            .agg(undrawn_exposure_usd=("cp_undrawn", "sum"))
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
            undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "undrawn_exposure_usd"]
        ]

"""Undrawn Exposure calculator — generalized from scripts/run-undrawn-exposure.py."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator

if TYPE_CHECKING:
    from ..data_loader import DataLoader

ACTIVE_FLAG_VALUE = "Y"


@register
class UndrawnExposureCalculator(BaseCalculator):
    metric_id = "EXP-002"
    catalogue_id = "UE"
    name = "Undrawn Exposure"
    _legacy_ids = ["C114"]

    def primary_value_column(self) -> str:
        return "undrawn_exposure_usd"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "unfunded_amount_sum": "unfunded_amt",
            "bank_share_pct": "bank_share_pct",
        }

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fm = loader.load_table("L1", "facility_master")
        pos = loader.load_table("L2", "position")
        pdtl = loader.load_table("L2", "position_detail")

        pos_f = pos.loc[
            pos["as_of_date"] == as_of_date,
            ["position_id", "facility_id"],
        ].drop_duplicates()

        pdtl_f = pdtl.loc[
            pdtl["as_of_date"] == as_of_date,
            ["position_id", "unfunded_amount"],
        ].copy()
        pdtl_f["unfunded_amount"] = pdtl_f["unfunded_amount"].fillna(0.0)

        j = pos_f.merge(pdtl_f, on="position_id", how="inner")
        fac_sum = j.groupby("facility_id", as_index=False).agg(
            unfunded_amount_sum=("unfunded_amount", "sum")
        )

        active_col = "active_flag"
        bank_col = "bank_share_pct" if "bank_share_pct" in fm.columns else None
        cols = ["facility_id", active_col]
        if bank_col:
            cols.append(bank_col)
        fm_sub = fm[[c for c in cols if c in fm.columns]].drop_duplicates("facility_id")

        fac_sum = fac_sum.merge(fm_sub, on="facility_id", how="left")
        fac_sum[active_col] = fac_sum[active_col].fillna("").astype(str).str.upper()
        fac_sum = fac_sum[fac_sum[active_col] == ACTIVE_FLAG_VALUE].copy()

        if bank_col and bank_col in fac_sum.columns:
            fac_sum[bank_col] = fac_sum[bank_col].fillna(1.0)
            fac_sum["undrawn_exposure_usd"] = fac_sum["unfunded_amount_sum"] * fac_sum[bank_col]
        else:
            fac_sum["undrawn_exposure_usd"] = fac_sum["unfunded_amount_sum"]

        result_cols = ["facility_id", "undrawn_exposure_usd", "unfunded_amount_sum"]
        if bank_col and bank_col in fac_sum.columns:
            result_cols.append(bank_col)
        return fac_sum[result_cols]

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fcp = loader.load_table("L1", "facility_counterparty_participation")
        part = fcp[["facility_id", "counterparty_id", "participation_pct"]].copy()
        part["participation_pct"] = part["participation_pct"].fillna(0.0)

        j = fac.merge(part, on="facility_id", how="inner")
        j["cp_undrawn"] = j["undrawn_exposure_usd"] * j["participation_pct"]
        return (
            j.groupby("counterparty_id", as_index=False)
            .agg(undrawn_exposure_usd=("cp_undrawn", "sum"))
        )

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
            undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "undrawn_exposure_usd"]
        ]

"""LTV (Loan-to-Value Ratio) calculator."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator

if TYPE_CHECKING:
    from ..data_loader import DataLoader


@register
class LTVCalculator(BaseCalculator):
    metric_id = "RSK-009"
    catalogue_id = "MET-109"
    name = "Loan-to-Value Ratio"
    _legacy_ids = ["C005"]

    def primary_value_column(self) -> str:
        return "ltv_pct"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "committed_facility_amt": "committed_amt",
            "current_valuation_usd": "collateral_value",
        }

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fm = loader.load_table("L1", "facility_master")
        cs = loader.load_table("L2", "collateral_snapshot")

        cs_latest = cs[cs["as_of_date"] == as_of_date].copy()
        # Aggregate collateral per facility (a facility may have multiple collateral assets)
        coll = cs_latest.groupby("facility_id", as_index=False).agg(
            current_valuation_usd=("current_valuation_usd", "sum")
        )

        result = fm[["facility_id", "committed_facility_amt"]].merge(
            coll, on="facility_id", how="inner"
        )
        result["ltv_pct"] = (
            result["committed_facility_amt"]
            / result["current_valuation_usd"].replace(0, float("nan"))
            * 100
        )
        return result[["facility_id", "ltv_pct", "committed_facility_amt", "current_valuation_usd"]]

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L1", "facility_master")[["facility_id", "counterparty_id"]]
        j = fac.merge(fm, on="facility_id", how="left")
        g = j.groupby("counterparty_id", as_index=False).agg(
            committed_facility_amt=("committed_facility_amt", "sum"),
            current_valuation_usd=("current_valuation_usd", "sum"),
        )
        g["ltv_pct"] = (
            g["committed_facility_amt"]
            / g["current_valuation_usd"].replace(0, float("nan"))
            * 100
        )
        return g[["counterparty_id", "ltv_pct"]]

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
            committed_facility_amt=("committed_facility_amt", "sum"),
            current_valuation_usd=("current_valuation_usd", "sum"),
        )
        g["ltv_pct"] = (
            g["committed_facility_amt"]
            / g["current_valuation_usd"].replace(0, float("nan"))
            * 100
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "ltv_pct", "committed_facility_amt", "current_valuation_usd"]
        ]

    # ── Rollup hooks: re-derive ratio from summed numerator/denominator ──

    def rollup_agg_spec(self) -> dict[str, tuple[str, str]]:
        return {
            "committed_facility_amt": ("committed_facility_amt", "sum"),
            "current_valuation_usd": ("current_valuation_usd", "sum"),
        }

    def rollup_post_agg(self, df: pd.DataFrame) -> pd.DataFrame:
        df["ltv_pct"] = (
            df["committed_facility_amt"]
            / df["current_valuation_usd"].replace(0, float("nan"))
            * 100
        )
        return df

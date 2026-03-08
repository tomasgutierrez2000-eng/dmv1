"""DSCR (Debt Service Coverage Ratio) calculator."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator

if TYPE_CHECKING:
    from ..data_loader import DataLoader


@register
class DSCRCalculator(BaseCalculator):
    metric_id = "CR-001"
    catalogue_id = "DSCR"
    name = "Debt Service Coverage Ratio"
    _legacy_ids = ["C003"]

    def primary_value_column(self) -> str:
        return "dscr_value"

    def extra_field_mapping(self) -> dict[str, str]:
        return {
            "noi_amt": "noi_amt",
            "total_debt_service_amt": "debt_service_amt",
        }

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        ffs = loader.load_table("L2", "facility_financial_snapshot")
        ffs = ffs[ffs["as_of_date"] == as_of_date].copy()
        ffs["dscr_value"] = (
            ffs["noi_amt"] / ffs["total_debt_service_amt"].replace(0, float("nan"))
        )
        return ffs[["facility_id", "dscr_value", "noi_amt", "total_debt_service_amt"]].drop_duplicates("facility_id")

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L1", "facility_master")[["facility_id", "counterparty_id"]]
        fes = loader.load_table("L2", "facility_exposure_snapshot")
        fes = fes[fes["as_of_date"] == as_of_date][["facility_id", "drawn_amount"]].drop_duplicates("facility_id")

        j = fac.merge(fm, on="facility_id").merge(fes, on="facility_id", how="left")
        j["drawn_amount"] = j["drawn_amount"].fillna(0)
        j["weighted"] = j["dscr_value"] * j["drawn_amount"]

        g = j.groupby("counterparty_id", as_index=False).agg(
            weighted_sum=("weighted", "sum"),
            weight_total=("drawn_amount", "sum"),
        )
        g["dscr_value"] = g["weighted_sum"] / g["weight_total"].replace(0, float("nan"))
        return g[["counterparty_id", "dscr_value"]]

    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L1", "facility_master")[["facility_id", "lob_segment_id"]]
        fes = loader.load_table("L2", "facility_exposure_snapshot")
        fes = fes[fes["as_of_date"] == as_of_date][["facility_id", "drawn_amount"]].drop_duplicates("facility_id")
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")

        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"

        desks = ebt.loc[
            ebt[level_col].astype(str).isin(["L3", "3"]),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "lob_segment_id", name_col: "segment_name"})

        j = (
            fac.merge(fm, on="facility_id")
            .merge(fes, on="facility_id", how="left")
            .merge(desks, on="lob_segment_id", how="left")
        )
        j["drawn_amount"] = j["drawn_amount"].fillna(0)
        j["weighted"] = j["dscr_value"] * j["drawn_amount"]

        g = j.groupby(["lob_segment_id", "segment_name"], as_index=False).agg(
            weighted_sum=("weighted", "sum"),
            weight_total=("drawn_amount", "sum"),
        )
        g["dscr_value"] = g["weighted_sum"] / g["weight_total"].replace(0, float("nan"))
        return g.rename(columns={"lob_segment_id": "segment_id"})[["segment_id", "segment_name", "dscr_value"]]

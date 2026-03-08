"""Base calculator abstract class — YAML-aware."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    from ..data_loader import DataLoader
    from ..yaml_loader import MetricDefinitionYAML


class BaseCalculator(ABC):
    """Every metric calculator implements these methods.

    Subclasses must set class attributes:
      metric_id    — YAML metric ID, e.g. "CR-001"
      catalogue_id — CatalogueItem ID, e.g. "DSCR"
      name         — Human-readable name
      _legacy_ids  — List of legacy metric IDs for backward compat (optional)
    """

    metric_id: str
    catalogue_id: str
    name: str
    _legacy_ids: list[str] = []

    def __init__(self) -> None:
        self._yaml_def: MetricDefinitionYAML | None = None
        self._load_yaml()

    def _load_yaml(self) -> None:
        """Attempt to load the YAML definition for this calculator."""
        try:
            from ..yaml_loader import load_metric_definitions
            defs, _ = load_metric_definitions()
            self._yaml_def = defs.get(self.metric_id) or defs.get(self.catalogue_id)
        except Exception:
            self._yaml_def = None

    @property
    def yaml_def(self) -> MetricDefinitionYAML | None:
        return self._yaml_def

    # ── Required: override in each calculator ──────────────────

    @abstractmethod
    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Return DataFrame with facility_id + metric value + ingredient columns."""

    @abstractmethod
    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Return DataFrame with counterparty_id + aggregated metric value."""

    @abstractmethod
    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Return DataFrame with segment_id + desk_name + aggregated metric value."""

    # ── Optional: default implementations roll up from lower levels ──

    def portfolio_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Default: aggregate desk results up via parent_segment_id."""
        return self._rollup_hierarchy(loader, as_of_date, from_level="L3", to_level="L2")

    def lob_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Default: aggregate portfolio results up via parent_segment_id."""
        return self._rollup_hierarchy(loader, as_of_date, from_level="L2", to_level="L1")

    def ingredient_fields(self) -> list[dict]:
        """Return ingredient field specs — derived from YAML MEASURE fields if available."""
        if self._yaml_def:
            return self._yaml_def.measure_fields()
        return []

    def aggregation_type(self, level: str) -> str | None:
        """Get the YAML-defined aggregation type for a level."""
        if self._yaml_def:
            formula = self._yaml_def.get_level(level)
            return formula.aggregation_type if formula else None
        return None

    def formula_text(self, level: str) -> str | None:
        """Get the human-readable formula text for a level from YAML."""
        if self._yaml_def:
            formula = self._yaml_def.get_level(level)
            return formula.formula_text if formula else None
        return None

    def primary_value_column(self) -> str:
        """Column name in the facility-level result that holds the primary metric value."""
        return "metric_value"

    def extra_field_mapping(self) -> dict[str, str]:
        """Map calculator output columns -> DemoFacility extra_fields keys.

        Example: {"noi_amt": "noi_amt", "total_debt_service_amt": "debt_service_amt"}
        """
        return {}

    # ── Helpers ─────────────────────────────────────────────────

    def run(self, loader: DataLoader, as_of_date: str, dimension: str) -> pd.DataFrame:
        """Dispatch to the correct level method."""
        method = {
            "facility": self.facility_level,
            "counterparty": self.counterparty_level,
            "desk": self.desk_level,
            "portfolio": self.portfolio_level,
            "lob": self.lob_level,
        }.get(dimension)
        if method is None:
            raise ValueError(f"Unknown dimension: {dimension}")
        return method(loader, as_of_date)

    def _rollup_hierarchy(
        self,
        loader: DataLoader,
        as_of_date: str,
        from_level: str,
        to_level: str,
    ) -> pd.DataFrame:
        """Generic rollup: aggregate desk->portfolio or portfolio->lob."""
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")
        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"
        parent_col = "parent_segment_id" if "parent_segment_id" in ebt.columns else "parent"

        # Get child-level results
        child = self.desk_level(loader, as_of_date) if from_level == "L3" else self.portfolio_level(loader, as_of_date)
        if child.empty:
            return pd.DataFrame(columns=["segment_id", "segment_name", self.primary_value_column()])

        # Map child segment_id -> parent segment_id
        # Handle both "L3"/"L2"/"L1" and "3"/"2"/"1" tree_level formats
        from_variants = {from_level, from_level.replace("L", "")}
        to_variants = {to_level, to_level.replace("L", "")}

        child_nodes = ebt.loc[
            ebt[level_col].astype(str).isin(from_variants),
            ["managed_segment_id", parent_col],
        ].rename(columns={"managed_segment_id": "segment_id", parent_col: "parent_id"})

        parent_nodes = ebt.loc[
            ebt[level_col].astype(str).isin(to_variants),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "parent_id", name_col: "segment_name"})

        merged = child.merge(child_nodes, on="segment_id", how="left")
        # Drop child's segment_name before merging parent — avoids suffix collision
        if "segment_name" in merged.columns:
            merged = merged.drop(columns=["segment_name"])
        merged = merged.merge(parent_nodes, on="parent_id", how="left")

        val_col = self.primary_value_column()
        result = (
            merged.groupby(["parent_id", "segment_name"], as_index=False)
            .agg(**{val_col: (val_col, "sum")})
            .rename(columns={"parent_id": "segment_id"})
        )
        return result

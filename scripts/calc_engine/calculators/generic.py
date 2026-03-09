"""Generic YAML-driven calculator — auto-registers all YAML metrics without dedicated calculators.

Instead of hand-coding a Python calculator for every metric, this module reads the
YAML formula_sql definitions and executes them via an in-memory SQLite database.
Source DataFrames are loaded via the DataLoader, pushed into SQLite, then the YAML
SQL is executed at each rollup level.
"""

from __future__ import annotations

import re
import sqlite3
from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register, _REGISTRY
from ..yaml_loader import load_metric_definitions
from .base import BaseCalculator

if TYPE_CHECKING:
    from ..data_loader import DataLoader


def _adapt_sql_for_sqlite(sql: str, as_of_date: str) -> str:
    """Convert PostgreSQL-flavored YAML SQL to SQLite-compatible SQL."""
    # Strip schema prefixes (l1., l2., l3.)
    sql = re.sub(r"\bl([123])\.", "", sql)
    # Replace :as_of_date bind parameter
    sql = sql.replace(":as_of_date", f"'{as_of_date}'")
    # CAST(x AS VARCHAR(...)) → CAST(x AS TEXT)
    sql = re.sub(
        r"CAST\((.+?)\s+AS\s+VARCHAR(?:\(\d+\))?\)",
        r"CAST(\1 AS TEXT)",
        sql,
        flags=re.IGNORECASE,
    )
    return sql


class GenericYAMLCalculator(BaseCalculator):
    """Calculator that executes YAML formula_sql against loaded DataFrames via SQLite.

    For each rollup level (facility, counterparty, desk, portfolio, business_segment),
    this calculator:
      1. Loads the source tables declared in the YAML into an in-memory SQLite DB
      2. Adapts the YAML formula_sql for SQLite (strips schema prefixes, binds params)
      3. Executes the SQL and returns the result as a DataFrame
    """

    def _load_tables_to_sqlite(
        self, loader: DataLoader, conn: sqlite3.Connection
    ) -> None:
        """Load all YAML-declared source tables into the SQLite in-memory DB."""
        if not self._yaml_def:
            return
        loaded: set[str] = set()
        for st in self._yaml_def.source_tables:
            if st.table in loaded:
                continue
            loaded.add(st.table)
            try:
                df = loader.load_table(st.layer, st.table)
                df.to_sql(st.table, conn, if_exists="replace", index=False)
            except Exception:
                pass  # Table may not exist in sample data

    def _execute_level(
        self, loader: DataLoader, as_of_date: str, level_name: str
    ) -> pd.DataFrame:
        """Execute the YAML formula_sql for a given rollup level via SQLite."""
        empty = pd.DataFrame(columns=["dimension_key", "metric_value"])

        if not self._yaml_def:
            return empty

        level_def = self._yaml_def.get_level(level_name)
        if not level_def or not level_def.formula_sql:
            return empty

        sql = _adapt_sql_for_sqlite(level_def.formula_sql, as_of_date)
        conn = sqlite3.connect(":memory:")
        try:
            self._load_tables_to_sqlite(loader, conn)
            result = pd.read_sql(sql, conn)
        except Exception:
            result = empty
        finally:
            conn.close()

        return result

    def _add_segment_name(
        self, df: pd.DataFrame, loader: DataLoader
    ) -> pd.DataFrame:
        """Add segment_name column for desk/portfolio/business_segment levels."""
        if df.empty or "segment_id" not in df.columns:
            return df
        try:
            ebt = loader.load_table("L1", "enterprise_business_taxonomy")
        except Exception:
            return df
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"
        names = (
            ebt[["managed_segment_id", name_col]]
            .rename(
                columns={"managed_segment_id": "segment_id", name_col: "segment_name"}
            )
            .drop_duplicates("segment_id")
        )
        if "segment_name" in df.columns:
            df = df.drop(columns=["segment_name"])
        return df.merge(names, on="segment_id", how="left")

    # ── Level implementations ────────────────────────────────────

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        result = self._execute_level(loader, as_of_date, "facility")
        if "dimension_key" in result.columns:
            result = result.rename(columns={"dimension_key": "facility_id"})
        return result

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        result = self._execute_level(loader, as_of_date, "counterparty")
        if "dimension_key" in result.columns:
            result = result.rename(columns={"dimension_key": "counterparty_id"})
        return result

    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        result = self._execute_level(loader, as_of_date, "desk")
        if "dimension_key" in result.columns:
            result = result.rename(columns={"dimension_key": "segment_id"})
        return self._add_segment_name(result, loader)

    def portfolio_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        result = self._execute_level(loader, as_of_date, "portfolio")
        if not result.empty and "dimension_key" in result.columns:
            result = result.rename(columns={"dimension_key": "segment_id"})
            return self._add_segment_name(result, loader)
        return super().portfolio_level(loader, as_of_date)

    def lob_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        result = self._execute_level(loader, as_of_date, "business_segment")
        if not result.empty and "dimension_key" in result.columns:
            result = result.rename(columns={"dimension_key": "segment_id"})
            return self._add_segment_name(result, loader)
        return super().lob_level(loader, as_of_date)


# ── Auto-registration ───────────────────────────────────────────


def auto_register_yaml_metrics() -> int:
    """Create and register a GenericYAMLCalculator subclass for every YAML metric
    that does not already have a dedicated calculator registered."""
    import yaml as _yaml

    defs, _ = load_metric_definitions()
    registered = 0

    for metric_id, defn in defs.items():
        # Skip legacy-ID aliases (they map to the same definition)
        if metric_id != defn.metric_id:
            continue

        # Skip if a dedicated calculator already covers this metric_id
        if metric_id in _REGISTRY:
            continue

        # Read catalogue.item_id from the raw YAML
        catalogue_id = ""
        try:
            with open(defn._file_path) as f:
                raw = _yaml.safe_load(f)
            catalogue_id = raw.get("catalogue", {}).get("item_id", "")
        except Exception:
            pass

        # Skip if catalogue_id is already registered
        if catalogue_id and catalogue_id in _REGISTRY:
            continue

        # Create a dynamic subclass with the correct class attributes
        cls = type(
            f"Generic_{metric_id.replace('-', '_')}",
            (GenericYAMLCalculator,),
            {
                "metric_id": metric_id,
                "catalogue_id": catalogue_id or metric_id,
                "name": defn.name,
                "_legacy_ids": defn.legacy_metric_ids or [],
            },
        )
        register(cls)
        registered += 1

    return registered


# Auto-register on import
_auto_registered = auto_register_yaml_metrics()

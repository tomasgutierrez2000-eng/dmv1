/**
 * GET /api/metrics/library/upload/template/python?mode=full|simple
 *
 * Downloads a Python calculator template file.
 * - ?mode=full   → BaseCalculator subclass template
 * - ?mode=simple → standalone facility_level function template (default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api-response';

// ── Template: Full BaseCalculator subclass ─────────────────────────────────

const FULL_TEMPLATE = `"""
Calculator Template — Full Mode (BaseCalculator subclass)

Replace placeholder values with your metric's actual logic.
Available API:
  - loader.load_table(layer, table) -> pd.DataFrame  (layer = "L1" or "L2")
  - filter_by_date(df, col, as_of_date) -> filtered DataFrame
  - BaseCalculator hooks: primary_value_column(), extra_field_mapping(),
    rollup_agg_spec(), rollup_post_agg()

Required methods: facility_level, counterparty_level, desk_level
Optional methods: portfolio_level, lob_level (default rollup provided)
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator, filter_by_date

if TYPE_CHECKING:
    from ..data_loader import DataLoader


@register
class MyMetricCalculator(BaseCalculator):
    # ── Must match your Excel template metric_id and catalogue item_id ──
    metric_id = "CHANGE-ME"
    catalogue_id = "CHANGE-ME"
    name = "My Metric Name"
    _legacy_ids: list[str] = []

    def primary_value_column(self) -> str:
        """Column name that holds the computed metric value."""
        return "metric_value"

    def extra_field_mapping(self) -> dict[str, str]:
        """Map calculator output columns -> demo data extra_fields.
        Example: {"noi_amt": "noi_amt", "debt_service_amt": "debt_service_amt"}
        """
        return {}

    # ── Required: facility-level calculation ──────────────────────────

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Compute metric at facility grain.
        Must return DataFrame with columns: [facility_id, metric_value, ...ingredients]
        """
        # Load source tables
        fm = loader.load_table("L2", "facility_master")
        fes = loader.load_table("L2", "facility_exposure_snapshot")
        fes = filter_by_date(fes, "as_of_date", as_of_date).copy()

        # Join tables
        j = fes.merge(fm[["facility_id", "counterparty_id"]], on="facility_id", how="inner")

        # Your calculation here
        j["metric_value"] = j["drawn_amount"]  # REPLACE with your formula

        return j[["facility_id", "metric_value"]]

    # ── Required: counterparty-level aggregation ─────────────────────

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Aggregate facility results to counterparty grain.
        Must return DataFrame with columns: [counterparty_id, metric_value]
        """
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L2", "facility_master")[["facility_id", "counterparty_id"]]
        j = fac.merge(fm, on="facility_id")
        return j.groupby("counterparty_id", as_index=False).agg(
            metric_value=("metric_value", "sum")
        )

    # ── Required: desk-level aggregation ─────────────────────────────

    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        """Aggregate facility results to desk/segment grain.
        Must return DataFrame with columns: [segment_id, segment_name, metric_value]
        """
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L2", "facility_master")[["facility_id", "lob_segment_id"]]
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")

        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"

        desks = ebt.loc[
            ebt[level_col].astype(str).isin(["L3", "3"]),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "lob_segment_id", name_col: "segment_name"})

        j = fac.merge(fm, on="facility_id", how="left").merge(desks, on="lob_segment_id", how="left")
        g = j.groupby(["lob_segment_id", "segment_name"], as_index=False).agg(
            metric_value=("metric_value", "sum")
        )
        return g.rename(columns={"lob_segment_id": "segment_id"})[
            ["segment_id", "segment_name", "metric_value"]
        ]
`;

// ── Template: Simple facility_level function ───────────────────────────────

const SIMPLE_TEMPLATE = `"""
Calculator Template — Simple Mode (facility_level function only)

Write your calculation logic in the facility_level function below.
The upload system will auto-scaffold counterparty and desk rollups.

Available API:
  - loader.load_table(layer, table) -> pd.DataFrame  (layer = "L1" or "L2")
  - filter_by_date(df, col, as_of_date) -> filtered DataFrame

Your function MUST return a DataFrame with at least: facility_id, metric_value
"""
import pandas as pd


def facility_level(loader, as_of_date: str) -> pd.DataFrame:
    """Compute metric at facility grain.

    Args:
        loader: DataLoader instance — call loader.load_table("L2", "table_name")
        as_of_date: Snapshot date string (e.g., "2025-01-31")

    Returns:
        DataFrame with columns: [facility_id, metric_value]
    """
    # Load source tables
    fes = loader.load_table("L2", "facility_exposure_snapshot")
    fes = fes[fes["as_of_date"] == as_of_date].copy()

    # Your calculation here
    fes["metric_value"] = fes["drawn_amount"]  # REPLACE with your formula

    return fes[["facility_id", "metric_value"]]
`;

const VALID_MODES = ['full', 'simple'] as const;
type TemplateMode = (typeof VALID_MODES)[number];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawMode = searchParams.get('mode') ?? 'simple';

  if (!VALID_MODES.includes(rawMode as TemplateMode)) {
    return jsonError(`Invalid mode "${rawMode}". Use "full" or "simple".`, { status: 400 });
  }

  const mode = rawMode as TemplateMode;
  const content = mode === 'full' ? FULL_TEMPLATE : SIMPLE_TEMPLATE;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/x-python',
      'Content-Disposition': `attachment; filename="calculator_template_${mode}.py"`,
    },
  });
}

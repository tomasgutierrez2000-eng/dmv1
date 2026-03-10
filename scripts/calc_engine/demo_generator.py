"""Core demo data generator: select facilities, extract ingredients, assemble DemoFacility[]."""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

from .calculators.base import BaseCalculator
from .data_loader import DataLoader
from .hierarchy import build_hierarchy_lookup
from .models import DemoFacility, DemoPosition, GenerateDemoResult


def generate_demo_data(
    catalogue_item: dict,
    calculator: BaseCalculator | None,
    loader: DataLoader,
    facility_count: int = 5,
    strategy: str = "diverse",
    as_of_date: str = "2025-01-31",
) -> GenerateDemoResult:
    """Auto-generate demo_data for a CatalogueItem.

    1. Load facility_master, counterparty, enterprise_business_taxonomy
    2. Run calculator.facility_level() for per-facility metric values
    3. Select representative facilities
    4. Enrich with counterparty names, hierarchy, positions, ingredient values
    5. Return GenerateDemoResult with { facilities: [...] }
    """
    try:
        # ── Load base tables ────────────────────────────────────
        fm = loader.load_table("L2", "facility_master")
        cp = loader.load_table("L2", "counterparty")
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")

        # ── Build lookups ───────────────────────────────────────
        cp_map = _build_counterparty_map(cp)
        hierarchy = build_hierarchy_lookup(ebt)

        # ── Run metric calculation ──────────────────────────────
        metric_df: pd.DataFrame | None = None
        calc_success = False
        if calculator is not None:
            try:
                metric_df = calculator.facility_level(loader, as_of_date)
                calc_success = not metric_df.empty
            except Exception as e:
                print(f"Warning: metric calculation failed: {e}")

        # ── Select facilities ───────────────────────────────────
        selected = _select_facilities(
            fm, metric_df, calculator, facility_count, strategy
        )

        if selected.empty:
            return GenerateDemoResult(
                ok=False,
                error="No facilities found in sample data",
            )

        # ── Load positions ──────────────────────────────────────
        positions_by_fac = _load_positions(loader, as_of_date)

        # ── Load ingredient values ──────────────────────────────
        ingredient_dfs = _load_ingredient_tables(
            loader, catalogue_item.get("ingredient_fields", []), as_of_date
        )

        # ── Load collateral for base fields ─────────────────────
        collateral_by_fac = _load_collateral(loader, as_of_date)

        # ── Assemble DemoFacility objects ───────────────────────
        facilities: list[dict] = []
        for _, fac_row in selected.iterrows():
            fac_id = int(fac_row["facility_id"])
            cp_id = int(fac_row.get("counterparty_id", 0))
            lob_seg_id = fac_row.get("lob_segment_id")
            lob_seg_int = int(lob_seg_id) if lob_seg_id is not None and not _is_nan(lob_seg_id) else 0

            # Hierarchy info
            h = hierarchy.get(lob_seg_int)
            cp_info = cp_map.get(cp_id, {})

            # Collateral
            coll_val = collateral_by_fac.get(fac_id, 0.0)
            committed = float(fac_row.get("committed_facility_amt", 0) or 0)
            ltv = (committed / coll_val * 100) if coll_val > 0 else 0.0

            demo = DemoFacility(
                facility_id=f"F-{fac_id}",
                facility_name=str(fac_row.get("facility_name", f"Facility {fac_id}")),
                counterparty_id=f"CP-{cp_id}",
                counterparty_name=str(cp_info.get("legal_name", f"Counterparty {cp_id}")),
                lob_segment_id=f"SEG-{lob_seg_int}",
                desk_name=h.desk_name if h else "Unknown Desk",
                portfolio_name=h.portfolio_name if h else "Unknown Portfolio",
                lob_name=h.lob_name if h else "Unknown Department",
                committed_amt=committed,
                collateral_value=coll_val,
                ltv_pct=round(ltv, 2),
                positions=positions_by_fac.get(fac_id, []),
            )

            # Add metric-specific extra fields
            if calculator and metric_df is not None and not metric_df.empty:
                metric_row = metric_df[metric_df["facility_id"] == fac_id]
                if not metric_row.empty:
                    row = metric_row.iloc[0]
                    # Primary metric value
                    val_col = calculator.primary_value_column()
                    if val_col in row.index:
                        val = row[val_col]
                        demo.extra_fields[val_col] = round(float(val), 4) if not _is_nan(val) else 0.0

                    # Ingredient columns from metric result
                    for src_col, dest_col in calculator.extra_field_mapping().items():
                        if src_col in row.index:
                            v = row[src_col]
                            demo.extra_fields[dest_col] = round(float(v), 2) if not _is_nan(v) else 0.0

            # Add any remaining ingredient fields from L2 tables
            # Skip join keys — they're structural, not interesting ingredient values
            _JOIN_KEYS = {"facility_id", "counterparty_id", "as_of_date", "position_id",
                          "lob_segment_id", "managed_segment_id", "parent_segment_id",
                          "tree_level", "segment_name", "credit_agreement_id"}
            for ing in catalogue_item.get("ingredient_fields", []):
                field_name = ing["field"]
                if field_name in _JOIN_KEYS:
                    continue
                if field_name in demo.extra_fields:
                    continue  # Already populated from metric result
                table_key = f"{ing['layer']}.{ing['table']}"
                if table_key in ingredient_dfs:
                    val = _lookup_ingredient(
                        ingredient_dfs[table_key], fac_id, cp_id, field_name
                    )
                    if val is not None:
                        demo.extra_fields[field_name] = val

            facilities.append(demo.to_dict())

        return GenerateDemoResult(
            ok=True,
            demo_data={"facilities": facilities},
            diagnostics={
                "totalFacilitiesInSample": len(fm),
                "facilitiesSelected": len(facilities),
                "metricCalculationSuccess": calc_success,
                "asOfDateUsed": as_of_date,
                "ingredientFieldsCaptured": list(
                    set().union(*(f.get("extra_fields", {}).keys() for f in facilities)) if facilities else []
                ),
                "calculatorUsed": calculator.name if calculator else None,
            },
        )

    except Exception as e:
        return GenerateDemoResult(ok=False, error=str(e))


# ═══════════════════════════════════════════════════════════════
# Facility selection strategies
# ═══════════════════════════════════════════════════════════════


def _select_facilities(
    fm: pd.DataFrame,
    metric_df: pd.DataFrame | None,
    calculator: BaseCalculator | None,
    count: int,
    strategy: str,
) -> pd.DataFrame:
    """Select representative facilities using the given strategy."""
    if strategy == "diverse":
        return _select_diverse(fm, metric_df, calculator, count)
    elif strategy == "range-spread":
        return _select_range_spread(fm, metric_df, calculator, count)
    elif strategy == "top-values":
        return _select_top_values(fm, metric_df, calculator, count)
    else:
        # Random fallback
        return fm.sample(n=min(count, len(fm)), random_state=42)


def _select_diverse(
    fm: pd.DataFrame,
    metric_df: pd.DataFrame | None,
    calculator: BaseCalculator | None,
    count: int,
) -> pd.DataFrame:
    """Pick facilities from different counterparties with spread of metric values."""
    if metric_df is not None and not metric_df.empty and calculator:
        val_col = calculator.primary_value_column()
        merged = fm.merge(metric_df[["facility_id", val_col]], on="facility_id", how="inner")
        merged = merged.dropna(subset=[val_col])
        if merged.empty:
            return fm.head(count)

        merged = merged.sort_values(val_col)
        n = len(merged)

        # Pick from percentiles
        percentile_indices = [
            0,
            max(0, n // 4),
            max(0, n // 2),
            max(0, 3 * n // 4),
            n - 1,
        ]
        # Deduplicate indices
        percentile_indices = sorted(set(percentile_indices))

        candidates = merged.iloc[percentile_indices]

        # Prefer different counterparties
        selected_ids: list[int] = []
        seen_cps: set[int] = set()
        for _, row in candidates.iterrows():
            cp = int(row.get("counterparty_id", 0))
            if cp not in seen_cps and len(selected_ids) < count:
                selected_ids.append(int(row["facility_id"]))
                seen_cps.add(cp)

        # Backfill if needed
        if len(selected_ids) < count:
            for _, row in merged.iterrows():
                fid = int(row["facility_id"])
                if fid not in selected_ids and len(selected_ids) < count:
                    selected_ids.append(fid)

        return fm[fm["facility_id"].isin(selected_ids)]
    else:
        # No metric data — pick by counterparty diversity
        groups = fm.groupby("counterparty_id")
        selected: list[pd.DataFrame] = []
        for _, group in groups:
            if len(selected) >= count:
                break
            selected.append(group.head(1))
        if not selected:
            return fm.head(count)
        result = pd.concat(selected).head(count)
        return result


def _select_range_spread(
    fm: pd.DataFrame,
    metric_df: pd.DataFrame | None,
    calculator: BaseCalculator | None,
    count: int,
) -> pd.DataFrame:
    """Pick evenly spaced facilities across the metric value range."""
    if metric_df is None or metric_df.empty or calculator is None:
        return fm.head(count)

    val_col = calculator.primary_value_column()
    merged = fm.merge(metric_df[["facility_id", val_col]], on="facility_id", how="inner")
    merged = merged.dropna(subset=[val_col]).sort_values(val_col)

    if len(merged) <= count:
        return merged

    step = len(merged) / count
    indices = [min(int(i * step), len(merged) - 1) for i in range(count)]
    return merged.iloc[indices]


def _select_top_values(
    fm: pd.DataFrame,
    metric_df: pd.DataFrame | None,
    calculator: BaseCalculator | None,
    count: int,
) -> pd.DataFrame:
    """Pick facilities with highest metric values."""
    if metric_df is None or metric_df.empty or calculator is None:
        return fm.nlargest(count, "committed_facility_amt")

    val_col = calculator.primary_value_column()
    merged = fm.merge(metric_df[["facility_id", val_col]], on="facility_id", how="inner")
    return merged.nlargest(count, val_col)


# ═══════════════════════════════════════════════════════════════
# Data extraction helpers
# ═══════════════════════════════════════════════════════════════


def _build_counterparty_map(cp: pd.DataFrame) -> dict[int, dict]:
    result: dict[int, dict] = {}
    for _, row in cp.iterrows():
        cid = int(row.get("counterparty_id", 0))
        result[cid] = {
            "legal_name": str(row.get("legal_name", "")),
            "external_rating_sp": str(row.get("external_rating_sp", "")),
            "country_code": str(row.get("country_code", "")),
        }
    return result


def _load_positions(loader: DataLoader, as_of_date: str) -> dict[int, list[DemoPosition]]:
    """Load positions grouped by facility_id."""
    try:
        pos = loader.load_table("L2", "position")
        pos = pos[pos["as_of_date"] == as_of_date]
    except (KeyError, FileNotFoundError):
        return {}

    result: dict[int, list[DemoPosition]] = {}
    for _, row in pos.iterrows():
        fac_id = int(row.get("facility_id", 0))
        if fac_id not in result:
            result[fac_id] = []
        result[fac_id].append(
            DemoPosition(
                position_id=f"P-{row.get('position_id', 0)}",
                facility_id=f"F-{fac_id}",
                position_type=str(row.get("position_type", "LOAN")),
                balance_amount=float(row.get("balance_amount", 0) or 0),
                description=f"{row.get('position_type', 'Position')} exposure",
            )
        )
    return result


def _load_collateral(loader: DataLoader, as_of_date: str) -> dict[int, float]:
    """Load total collateral value per facility."""
    try:
        cs = loader.load_table("L2", "collateral_snapshot")
        cs = cs[cs["as_of_date"] == as_of_date]
    except (KeyError, FileNotFoundError):
        return {}

    val_col = "current_valuation_usd" if "current_valuation_usd" in cs.columns else "valuation_amount"
    grouped = cs.groupby("facility_id", as_index=False).agg(total=(val_col, "sum"))
    return dict(zip(grouped["facility_id"].astype(int), grouped["total"].astype(float)))


def _load_ingredient_tables(
    loader: DataLoader,
    ingredient_fields: list[dict],
    as_of_date: str,
) -> dict[str, pd.DataFrame]:
    """Load all L1/L2 tables referenced by ingredient_fields."""
    tables: dict[str, pd.DataFrame] = {}
    seen: set[str] = set()
    for ing in ingredient_fields:
        key = f"{ing['layer']}.{ing['table']}"
        if key in seen:
            continue
        seen.add(key)
        try:
            df = loader.load_table(ing["layer"], ing["table"])
            if "as_of_date" in df.columns:
                df = df[df["as_of_date"] == as_of_date]
            tables[key] = df
        except (KeyError, FileNotFoundError):
            pass
    return tables


def _lookup_ingredient(
    df: pd.DataFrame,
    facility_id: int,
    counterparty_id: int,
    field: str,
) -> Any:
    """Look up a field value from a table, matching by facility_id or counterparty_id."""
    if field not in df.columns:
        return None

    if "facility_id" in df.columns:
        match = df[df["facility_id"] == facility_id]
    elif "counterparty_id" in df.columns:
        match = df[df["counterparty_id"] == counterparty_id]
    else:
        return None

    if match.empty:
        return None

    val = match.iloc[0][field]
    if _is_nan(val):
        return None
    if isinstance(val, (int, float)):
        return round(float(val), 4)
    return val


def _is_nan(val: Any) -> bool:
    if val is None:
        return True
    try:
        return math.isnan(float(val))
    except (ValueError, TypeError):
        return False

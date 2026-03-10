#!/usr/bin/env python3
"""Batch script: run all metric calculators and INSERT results into l3.metric_value_fact.

Usage:
  python -m scripts.calc_engine.populate_l3
  python -m scripts.calc_engine.populate_l3 --metric EXP-014 --dimension facility
  python -m scripts.calc_engine.populate_l3 --dry-run
  python -m scripts.calc_engine.populate_l3 --as-of-date 2025-01-31 --run-version RUN_002

Env: DATABASE_URL (required for INSERT).
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

try:
    import pandas as pd
except ImportError:
    print("pip install pandas", file=sys.stderr)
    sys.exit(1)

from .config import DATABASE_URL, DEFAULT_AS_OF_DATE
from .data_loader import DataLoader
from .registry import get_calculator, list_calculators

# Import calculators to trigger registration
from . import calculators as _  # noqa: F401

DIMENSIONS = ["facility", "counterparty", "desk", "portfolio", "lob"]

# Maps dimension name → (aggregation_level, id_column) for metric_value_fact
DIMENSION_MAP: dict[str, tuple[str, str]] = {
    "facility": ("facility", "facility_id"),
    "counterparty": ("counterparty", "counterparty_id"),
    "desk": ("desk", "segment_id"),
    "portfolio": ("portfolio", "segment_id"),
    "lob": ("lob", "segment_id"),
}

# Maps dimension → target column in metric_value_fact
DIMENSION_TO_FACT_COLUMN: dict[str, str] = {
    "facility": "facility_id",
    "counterparty": "counterparty_id",
    "desk": "desk_id",
    "portfolio": "portfolio_id",
    "lob": "lob_id",
}


def _build_rows(
    metric_id: str,
    dimension: str,
    as_of_date: str,
    run_version: str,
    df: pd.DataFrame,
) -> list[tuple[Any, ...]]:
    """Convert a calculator DataFrame into metric_value_fact rows."""
    agg_level, src_col = DIMENSION_MAP[dimension]
    fact_col = DIMENSION_TO_FACT_COLUMN[dimension]

    rows: list[tuple[Any, ...]] = []
    val_col = "metric_value"

    # Find the dimension key column in the DataFrame
    key_col: str | None = None
    for candidate in [src_col, "dimension_key"]:
        if candidate in df.columns:
            key_col = candidate
            break

    for _, row in df.iterrows():
        value = row.get(val_col)
        if value is not None and pd.notna(value):
            value = float(value)
        else:
            value = None

        dim_key = str(row[key_col]) if key_col and pd.notna(row.get(key_col)) else None

        # Build the 13-column tuple matching metric_value_fact INSERT order
        fact_row = [
            run_version,       # run_version_id
            as_of_date,        # as_of_date
            metric_id,         # metric_id
            None,              # variant_id
            agg_level,         # aggregation_level
            None,              # facility_id
            None,              # counterparty_id
            None,              # desk_id
            None,              # portfolio_id
            None,              # lob_id
            value,             # value
            None,              # unit
            None,              # display_format
        ]

        # Set the dimension-specific ID column
        col_idx = {
            "facility_id": 5,
            "counterparty_id": 6,
            "desk_id": 7,
            "portfolio_id": 8,
            "lob_id": 9,
        }
        fact_row[col_idx[fact_col]] = dim_key
        rows.append(tuple(fact_row))

    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Populate l3.metric_value_fact from Python calc engine"
    )
    parser.add_argument("--metric", help="Run only this metric ID (e.g. EXP-014)")
    parser.add_argument(
        "--dimension",
        choices=DIMENSIONS,
        help="Run only this dimension (default: all)",
    )
    parser.add_argument("--as-of-date", default=DEFAULT_AS_OF_DATE)
    parser.add_argument("--run-version", default="RUN_MVP_001")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print summary without writing to DB",
    )
    args = parser.parse_args()

    if not DATABASE_URL and not args.dry_run:
        print("DATABASE_URL not set. Use --dry-run or set DATABASE_URL.", file=sys.stderr)
        sys.exit(1)

    # Determine which calculators and dimensions to run
    if args.metric:
        calc = get_calculator(args.metric)
        if calc is None:
            print(f"No calculator found for: {args.metric}", file=sys.stderr)
            sys.exit(1)
        calcs = [{"metric_id": calc.metric_id, "calculator": calc}]
    else:
        calcs = []
        for entry in list_calculators():
            calc = get_calculator(entry["metric_id"])
            if calc:
                calcs.append({"metric_id": entry["metric_id"], "calculator": calc})

    dims = [args.dimension] if args.dimension else DIMENSIONS

    # Run calculations
    loader = DataLoader()
    all_rows: list[tuple[Any, ...]] = []
    errors: list[dict[str, str]] = []
    calc_count = 0

    try:
        for entry in calcs:
            calc = entry["calculator"]
            mid = entry["metric_id"]

            for dim in dims:
                try:
                    result = calc.run(loader, args.as_of_date, dim)
                    if result.empty:
                        continue
                    rows = _build_rows(mid, dim, args.as_of_date, args.run_version, result)
                    all_rows.extend(rows)
                    calc_count += 1
                except Exception as e:
                    errors.append({"metric_id": mid, "dimension": dim, "error": str(e)})
    finally:
        loader.close()

    print(
        f"Calculated {len(all_rows)} rows from {calc_count} metric/dimension combos "
        f"({len(errors)} errors). "
        f"Run version: {args.run_version}, as_of_date: {args.as_of_date}."
    )

    if args.dry_run:
        print("Dry run — no INSERT.")
        if all_rows:
            print(f"Sample row: {all_rows[0]}")
        if errors:
            print(f"Errors: {errors}")
        return

    # Write to PostgreSQL
    import psycopg2

    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor()
        cur.execute("CREATE SCHEMA IF NOT EXISTS l3;")

        # Delete existing rows for this run_version + as_of_date
        cur.execute(
            "DELETE FROM l3.metric_value_fact WHERE run_version_id = %s AND as_of_date = %s",
            (args.run_version, args.as_of_date),
        )
        deleted = cur.rowcount
        print(f"Deleted {deleted} existing rows for ({args.run_version}, {args.as_of_date}).")

        insert_sql = """
            INSERT INTO l3.metric_value_fact (
                run_version_id, as_of_date, metric_id, variant_id, aggregation_level,
                facility_id, counterparty_id, desk_id, portfolio_id, lob_id,
                value, unit, display_format
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.executemany(insert_sql, all_rows)

        conn.commit()
        print(f"Inserted {len(all_rows)} rows into l3.metric_value_fact.")
        if errors:
            print(f"Skipped (errors): {errors}", file=sys.stderr)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()

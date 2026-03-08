#!/usr/bin/env python3
"""Run a metric calculation at a specified dimension.

Usage:
  python -m scripts.calc_engine.run_metric --metric C003 --dimension facility
  python -m scripts.calc_engine.run_metric --metric DSCR --dimension counterparty
  python -m scripts.calc_engine.run_metric --metric LTV --dimension desk --as-of-date 2025-01-31
  python -m scripts.calc_engine.run_metric --list
"""

import argparse
import sys

try:
    import pandas as pd
except ImportError:
    print("pip install pandas", file=sys.stderr)
    sys.exit(1)

from .config import DEFAULT_AS_OF_DATE
from .data_loader import DataLoader
from .registry import get_calculator, list_calculators

# Import calculators to trigger registration
from . import calculators as _  # noqa: F401


def main():
    parser = argparse.ArgumentParser(description="Run a metric calculation")
    parser.add_argument("--metric", help="Metric ID (C003) or catalogue ID (DSCR)")
    parser.add_argument(
        "--dimension",
        default="facility",
        choices=["facility", "counterparty", "desk", "portfolio", "lob"],
    )
    parser.add_argument("--as-of-date", default=DEFAULT_AS_OF_DATE)
    parser.add_argument("--list", action="store_true", help="List available calculators")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    if args.list:
        calcs = list_calculators()
        print(f"{'Metric ID':<12} {'Catalogue ID':<15} {'Name'}")
        print("-" * 50)
        for c in calcs:
            print(f"{c['metric_id']:<12} {c['catalogue_id']:<15} {c['name']}")
        return

    if not args.metric:
        parser.error("--metric is required (or use --list)")

    calc = get_calculator(args.metric)
    if calc is None:
        print(f"No calculator found for: {args.metric}", file=sys.stderr)
        print("Available calculators:", file=sys.stderr)
        for c in list_calculators():
            print(f"  {c['metric_id']} / {c['catalogue_id']} — {c['name']}", file=sys.stderr)
        sys.exit(1)

    loader = DataLoader()
    try:
        print(f"=== {calc.name} — {args.dimension.title()} Level ===")
        print(f"As-of date: {args.as_of_date}")
        print()

        result = calc.run(loader, args.as_of_date, args.dimension)

        if args.json:
            print(result.to_json(orient="records", indent=2))
        else:
            print(result.to_string(index=False))
            print()
            val_col = calc.primary_value_column()
            if val_col in result.columns:
                print(f"Rows: {len(result)}")
                print(f"Mean {val_col}: {result[val_col].mean():.4f}")
                print(f"Min:  {result[val_col].min():.4f}")
                print(f"Max:  {result[val_col].max():.4f}")
    finally:
        loader.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate demo_data for catalogue items from real L1/L2 data.

Usage:
  python -m scripts.calc-engine.generate_demo_data --metric DSCR
  python -m scripts.calc-engine.generate_demo_data --metric LTV --count 5 --persist
  python -m scripts.calc-engine.generate_demo_data --all --persist
  python -m scripts.calc-engine.generate_demo_data --metric DSCR --output /tmp/dscr-demo.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
import numpy as np

try:
    import pandas as pd  # noqa: F401
except ImportError:
    print("pip install pandas", file=sys.stderr)
    sys.exit(1)

from .config import CATALOGUE_PATH, DEFAULT_AS_OF_DATE
from .data_loader import DataLoader
from .demo_generator import generate_demo_data
from .registry import get_calculator, list_calculators

# Import calculators to trigger registration
from . import calculators as _  # noqa: F401


class NumpyEncoder(json.JSONEncoder):
    """Handle numpy types in JSON serialization."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def load_catalogue() -> list[dict]:
    if not CATALOGUE_PATH.exists():
        print(f"Catalogue not found: {CATALOGUE_PATH}", file=sys.stderr)
        sys.exit(1)
    with open(CATALOGUE_PATH) as f:
        return json.load(f)


def save_catalogue(items: list[dict]) -> None:
    with open(CATALOGUE_PATH, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False, cls=NumpyEncoder)
    print(f"Catalogue saved: {CATALOGUE_PATH}")


def find_item(catalogue: list[dict], item_id: str) -> dict | None:
    for item in catalogue:
        if item.get("item_id") == item_id:
            return item
    return None


def main():
    parser = argparse.ArgumentParser(description="Generate demo data for catalogue items")
    parser.add_argument("--metric", help="Catalogue item_id (e.g. DSCR, LTV, UE)")
    parser.add_argument("--all", action="store_true", help="Generate for all items with calculators")
    parser.add_argument("--count", type=int, default=5, help="Number of facilities (default: 5)")
    parser.add_argument(
        "--strategy",
        default="diverse",
        choices=["diverse", "range-spread", "top-values"],
        help="Facility selection strategy (default: diverse)",
    )
    parser.add_argument("--as-of-date", default=DEFAULT_AS_OF_DATE)
    parser.add_argument("--output", help="Write demo data JSON to this file instead of stdout")
    parser.add_argument("--persist", action="store_true", help="Update catalogue.json in-place")
    parser.add_argument("--force", action="store_true", help="Overwrite existing demo_data")
    args = parser.parse_args()

    if not args.metric and not args.all:
        parser.error("--metric or --all is required")

    catalogue = load_catalogue()
    loader = DataLoader()

    try:
        if args.all:
            _generate_all(catalogue, loader, args)
        else:
            _generate_single(catalogue, loader, args)
    finally:
        loader.close()


def _generate_single(catalogue: list[dict], loader: DataLoader, args) -> None:
    item = find_item(catalogue, args.metric)
    if item is None:
        print(f"Catalogue item not found: {args.metric}", file=sys.stderr)
        print("Available items:", file=sys.stderr)
        for it in catalogue:
            print(f"  {it['item_id']} — {it['item_name']}", file=sys.stderr)
        sys.exit(1)

    # Skip if already has demo data and not forcing
    if not args.force and item.get("demo_data", {}).get("facilities"):
        print(f"[{args.metric}] Already has demo_data ({len(item['demo_data']['facilities'])} facilities). Use --force to overwrite.")
        return

    # Find calculator
    calc_id = item.get("executable_metric_id") or args.metric
    calc = get_calculator(calc_id)
    if calc is None:
        calc = get_calculator(args.metric)

    if calc:
        print(f"[{args.metric}] Using calculator: {calc.name} ({calc.metric_id})")
    else:
        print(f"[{args.metric}] No calculator found — will generate with raw ingredient fields only")

    result = generate_demo_data(
        catalogue_item=item,
        calculator=calc,
        loader=loader,
        facility_count=args.count,
        strategy=args.strategy,
        as_of_date=args.as_of_date,
    )

    if not result.ok:
        print(f"[{args.metric}] Error: {result.error}", file=sys.stderr)
        sys.exit(1)

    # Output
    output = {
        "item_id": args.metric,
        "demo_data": result.demo_data,
        "diagnostics": result.diagnostics,
    }

    if args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False, cls=NumpyEncoder)
        print(f"[{args.metric}] Demo data written to: {args.output}")
    elif args.persist:
        item["demo_data"] = result.demo_data
        save_catalogue(catalogue)
        print(f"[{args.metric}] Demo data persisted to catalogue.json ({result.diagnostics['facilitiesSelected']} facilities)")
    else:
        print(json.dumps(output, indent=2, ensure_ascii=False, cls=NumpyEncoder))

    # Print diagnostics
    if result.diagnostics:
        d = result.diagnostics
        print(f"\n--- Diagnostics ---")
        print(f"  Total facilities in sample: {d.get('totalFacilitiesInSample')}")
        print(f"  Facilities selected: {d.get('facilitiesSelected')}")
        print(f"  Metric calculation: {'OK' if d.get('metricCalculationSuccess') else 'N/A'}")
        print(f"  Calculator: {d.get('calculatorUsed', 'None')}")
        print(f"  As-of date: {d.get('asOfDateUsed')}")


def _generate_all(catalogue: list[dict], loader: DataLoader, args) -> None:
    calcs = list_calculators()
    calc_ids = {c["catalogue_id"] for c in calcs}

    generated = 0
    skipped = 0
    failed = 0

    for item in catalogue:
        item_id = item.get("item_id", "")
        exec_id = item.get("executable_metric_id")

        # Find calculator by executable_metric_id or item_id
        calc = None
        if exec_id:
            calc = get_calculator(exec_id)
        if calc is None:
            calc = get_calculator(item_id)

        if calc is None:
            continue  # No calculator for this item

        # Skip if already has demo data
        if not args.force and item.get("demo_data", {}).get("facilities"):
            print(f"[{item_id}] Skipping — already has demo_data")
            skipped += 1
            continue

        print(f"[{item_id}] Generating with {calc.name}...")
        result = generate_demo_data(
            catalogue_item=item,
            calculator=calc,
            loader=loader,
            facility_count=args.count,
            strategy=args.strategy,
            as_of_date=args.as_of_date,
        )

        if result.ok:
            item["demo_data"] = result.demo_data
            generated += 1
            print(f"  OK — {result.diagnostics['facilitiesSelected']} facilities")
        else:
            failed += 1
            print(f"  FAILED — {result.error}")

    if args.persist and generated > 0:
        save_catalogue(catalogue)

    print(f"\n=== Summary ===")
    print(f"  Generated: {generated}")
    print(f"  Skipped:   {skipped}")
    print(f"  Failed:    {failed}")


if __name__ == "__main__":
    main()

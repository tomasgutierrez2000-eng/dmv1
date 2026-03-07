#!/usr/bin/env python3
"""
Undrawn Exposure — Python calculation at all levels.

Runs against sample data JSON (L1 + L2) to verify the formula.
Usage:
  python scripts/run-undrawn-exposure.py [--as-of-date 2025-01-31]

Reads from scripts/l1/output/sample-data.json and scripts/l2/output/sample-data.json
(or SAMPLE_DATA_L1_PATH / SAMPLE_DATA_L2_PATH env vars).
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("pip install pandas", file=sys.stderr)
    sys.exit(1)

ACTIVE_FLAG_VALUE = "Y"


def load_table(data: dict, key: str) -> "pd.DataFrame":
    entry = data.get(key)
    if not entry or "columns" not in entry or "rows" not in entry:
        raise KeyError(f"Missing table: {key}")
    return pd.DataFrame(entry["rows"], columns=entry["columns"])


def undrawn_exposure_facility_level(
    as_of_date: str,
    facility_master: "pd.DataFrame",
    position: "pd.DataFrame",
    position_detail: "pd.DataFrame",
) -> "pd.DataFrame":
    pos = position.loc[
        position["as_of_date"] == as_of_date,
        ["position_id", "facility_id"],
    ].drop_duplicates()

    pdtl = position_detail.loc[
        position_detail["as_of_date"] == as_of_date,
        ["position_id", "unfunded_amount"],
    ].copy()
    pdtl["unfunded_amount"] = pdtl["unfunded_amount"].fillna(0.0)

    j = pos.merge(pdtl, on="position_id", how="inner")
    fac_sum = j.groupby("facility_id", as_index=False).agg(
        unfunded_amount_sum=("unfunded_amount", "sum")
    )

    # facility_master may have active_flag or facility_active_flag
    active_col = "facility_active_flag" if "facility_active_flag" in facility_master.columns else "active_flag"
    bank_col = "bank_share_pct" if "bank_share_pct" in facility_master.columns else None

    cols = ["facility_id", active_col]
    if bank_col:
        cols.append(bank_col)
    fm_sub = facility_master[[c for c in cols if c in facility_master.columns]].drop_duplicates("facility_id")
    fac_sum = fac_sum.merge(fm_sub, on="facility_id", how="left")

    fac_sum[active_col] = fac_sum[active_col].fillna("").astype(str).str.upper()
    fac_sum = fac_sum.loc[fac_sum[active_col] == ACTIVE_FLAG_VALUE]

    if bank_col:
        fac_sum[bank_col] = fac_sum[bank_col].fillna(1.0)
        fac_sum["undrawn_exposure_usd"] = fac_sum["unfunded_amount_sum"] * fac_sum[bank_col]
    else:
        fac_sum["undrawn_exposure_usd"] = fac_sum["unfunded_amount_sum"]

    return fac_sum[["facility_id", "undrawn_exposure_usd"]]


def undrawn_exposure_counterparty_level(
    as_of_date: str,
    facility_master: "pd.DataFrame",
    position: "pd.DataFrame",
    position_detail: "pd.DataFrame",
    facility_counterparty_participation: "pd.DataFrame",
) -> "pd.DataFrame":
    fac = undrawn_exposure_facility_level(
        as_of_date, facility_master, position, position_detail
    )
    part = facility_counterparty_participation[
        ["facility_id", "counterparty_id", "participation_pct"]
    ].copy()
    part["participation_pct"] = part["participation_pct"].fillna(0.0)

    j = fac.merge(part, on="facility_id", how="inner")
    j["counterparty_undrawn_exposure_usd"] = (
        j["undrawn_exposure_usd"] * j["participation_pct"]
    )
    return (
        j.groupby("counterparty_id", as_index=False)
        .agg(counterparty_undrawn_exposure_usd=("counterparty_undrawn_exposure_usd", "sum"))
    )


def undrawn_exposure_lob_rollup(
    as_of_date: str,
    facility_master: "pd.DataFrame",
    position: "pd.DataFrame",
    position_detail: "pd.DataFrame",
    enterprise_business_taxonomy: "pd.DataFrame",
    target_tree_level: str,
    target_lob_description: str,
) -> "pd.DataFrame":
    ebt = enterprise_business_taxonomy
    tree_col = "tree_level" if "tree_level" in ebt.columns else "level"
    desc_col = "description" if "description" in ebt.columns else "segment_name"
    node = ebt.loc[
        (ebt[tree_col].astype(str) == target_tree_level)
        & (ebt[desc_col].astype(str) == target_lob_description),
        ["managed_segment_id"],
    ]
    if node.empty:
        return pd.DataFrame(columns=["lob_segment_id", "undrawn_exposure_usd"])

    lob_id = node.iloc[0]["managed_segment_id"]
    fac_exp = undrawn_exposure_facility_level(
        as_of_date, facility_master, position, position_detail
    )
    fac_attr = facility_master.loc[
        facility_master["lob_segment_id"] == lob_id,
        ["facility_id", "lob_segment_id"],
    ]
    j = fac_exp.merge(fac_attr, on="facility_id", how="inner")
    return (
        j.groupby("lob_segment_id", as_index=False)
        .agg(undrawn_exposure_usd=("undrawn_exposure_usd", "sum"))
    )


def main():
    parser = argparse.ArgumentParser(description="Run Undrawn Exposure calculation")
    parser.add_argument("--as-of-date", default="2025-01-31", help="As-of date (YYYY-MM-DD)")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    l1_path = os.environ.get("SAMPLE_DATA_L1_PATH") or str(root / "scripts" / "l1" / "output" / "sample-data.json")
    l2_path = os.environ.get("SAMPLE_DATA_L2_PATH") or str(root / "scripts" / "l2" / "output" / "sample-data.json")

    for p in [l1_path, l2_path]:
        if not os.path.isfile(p):
            print(f"Missing: {p}", file=sys.stderr)
            sys.exit(1)

    with open(l1_path) as f:
        l1 = json.load(f)
    with open(l2_path) as f:
        l2 = json.load(f)

    fm = load_table(l1, "L1.facility_master")
    pos = load_table(l2, "L2.position")
    pdtl = load_table(l2, "L2.position_detail")
    fcp = load_table(l1, "L1.facility_counterparty_participation")
    ebt = load_table(l1, "L1.enterprise_business_taxonomy")

    as_of = args.as_of_date

    print("=== Undrawn Exposure — Facility Level ===")
    fac = undrawn_exposure_facility_level(as_of, fm, pos, pdtl)
    print(fac.to_string(index=False))
    print(f"Total: ${fac['undrawn_exposure_usd'].sum():,.0f}")

    print("\n=== Undrawn Exposure — Counterparty Level ===")
    cp = undrawn_exposure_counterparty_level(as_of, fm, pos, pdtl, fcp)
    print(cp.to_string(index=False))
    print(f"Total: ${cp['counterparty_undrawn_exposure_usd'].sum():,.0f}")

    # L3/L2/L1 rollup — use first available segment for demo
    if "tree_level" in ebt.columns and "description" in ebt.columns:
        for level, label in [("L3", "Desk"), ("L2", "Portfolio"), ("L1", "Business Segment")]:
            levels = ebt[ebt["tree_level"].astype(str) == level]
            if levels.empty:
                continue
            desc = levels["description"].iloc[0]
            lob = undrawn_exposure_lob_rollup(as_of, fm, pos, pdtl, ebt, level, str(desc))
            if not lob.empty:
                print(f"\n=== Undrawn Exposure — {label} ({level}): {desc} ===")
                print(lob.to_string(index=False))
                print(f"Total: ${lob['undrawn_exposure_usd'].sum():,.0f}")

    print("\nDone.")


if __name__ == "__main__":
    main()

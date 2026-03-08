#!/usr/bin/env python3
"""Validate that Python calculators are aligned with YAML metric definitions.

Usage:
    python3 -m scripts.calc_engine.validate_yaml_alignment
"""

import sys

from .registry import _REGISTRY, list_calculators
from .yaml_loader import load_metric_definitions

# Import calculators to trigger registration
from . import calculators as _  # noqa: F401


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    # Load YAML definitions
    yaml_defs, yaml_errors = load_metric_definitions(use_cache=False)
    if yaml_errors:
        for e in yaml_errors:
            errors.append(f"YAML load error: {e}")

    print(f"Loaded {len(yaml_defs)} YAML definitions (including legacy aliases)")
    print(f"Registered {len(list_calculators())} Python calculators\n")

    calculators = list_calculators()
    for info in calculators:
        mid = info["metric_id"]
        cid = info["catalogue_id"]
        name = info["name"]
        cls = _REGISTRY.get(mid)
        if cls is None:
            errors.append(f"[{mid}] Calculator class not found in registry")
            continue

        inst = cls()
        yaml_def = inst.yaml_def

        print(f"── {mid} ({cid}) — {name} ──")

        # Check 1: YAML definition exists
        if yaml_def is None:
            errors.append(f"[{mid}] No matching YAML definition found")
            print(f"  FAIL: No YAML definition\n")
            continue
        print(f"  YAML: {yaml_def._file_path}")

        # Check 2: metric_id matches
        if yaml_def.metric_id != mid:
            warnings.append(
                f"[{mid}] YAML metric_id={yaml_def.metric_id} "
                f"(matched via legacy/catalogue)"
            )

        # Check 3: legacy IDs match
        legacy_ids = getattr(cls, "_legacy_ids", [])
        if set(legacy_ids) != set(yaml_def.legacy_metric_ids):
            errors.append(
                f"[{mid}] legacy_ids mismatch: "
                f"Python={legacy_ids}, YAML={yaml_def.legacy_metric_ids}"
            )
        else:
            print(f"  Legacy IDs: {legacy_ids}")

        # Check 4: legacy IDs are registered in the registry
        for lid in legacy_ids:
            if lid not in _REGISTRY:
                errors.append(f"[{mid}] Legacy ID '{lid}' not registered in registry")
            else:
                print(f"  Registry['{lid}'] -> {_REGISTRY[lid].__name__}")

        # Check 5: YAML has ingredient (MEASURE) fields
        measure_fields = yaml_def.measure_fields()
        if not measure_fields:
            warnings.append(f"[{mid}] No MEASURE fields in YAML source_tables")
        else:
            print(f"  MEASURE fields: {len(measure_fields)}")

        # Check 6: YAML has expected levels
        expected_levels = {"facility", "counterparty", "desk", "portfolio", "business_segment"}
        actual_levels = set(yaml_def.levels.keys())
        missing_levels = expected_levels - actual_levels
        if missing_levels:
            warnings.append(f"[{mid}] Missing YAML levels: {missing_levels}")
        else:
            print(f"  Levels: {sorted(actual_levels)}")

        # Check 7: ingredient_fields() returns YAML-derived data
        inst_fields = inst.ingredient_fields()
        if inst_fields == measure_fields:
            print(f"  ingredient_fields() == YAML MEASURE fields")
        elif inst_fields:
            warnings.append(
                f"[{mid}] ingredient_fields() differs from YAML MEASURE fields"
            )

        print()

    # Summary
    print("=" * 60)
    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  X {e}")
    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  ! {w}")
    if not errors and not warnings:
        print("\nAll calculators aligned with YAML definitions.")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

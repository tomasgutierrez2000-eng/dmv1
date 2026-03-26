"""CLI entry point: curator-variants — batch variant generation."""
import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Generate variants of a base scenario",
        prog="curator-variants",
    )
    parser.add_argument("--base", "-b", required=True, help="Path to base scenario YAML")
    parser.add_argument("--mod", "-m", required=True, help="Modification prompt")
    parser.add_argument("--count", "-n", type=int, default=5, help="Number of variants")
    parser.add_argument("--model", default="claude-opus-4-6", help="LLM model to use")
    parser.add_argument("--output-dir", help="Output directory (defaults to base YAML directory)")
    parser.add_argument("--dry-run", action="store_true", help="Print configs, don't write YAML")

    args = parser.parse_args()

    from ..pipelines.variant_generator import VariantGeneratorPipeline

    pipeline = VariantGeneratorPipeline(model=args.model)
    variants = pipeline.run(
        base_yaml_path=Path(args.base),
        modification_prompt=args.mod,
        count=args.count,
        output_dir=Path(args.output_dir) if args.output_dir else None,
        dry_run=args.dry_run,
    )

    print(f"Generated {len(variants)} variants (requested {args.count})")
    for v in variants:
        print(f"  {v.scenario_id}: {v.name}")


if __name__ == "__main__":
    main()

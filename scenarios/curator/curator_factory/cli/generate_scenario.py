"""CLI entry point: curator-gen — generate scenarios from English narratives."""
import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Generate GSIB scenario YAML from English narrative",
        prog="curator-gen",
    )
    parser.add_argument("narrative", nargs="?", help="English scenario description")
    parser.add_argument("--file", "-f", help="File with one narrative per line")
    parser.add_argument("--model", default="claude-opus-4-6", help="LLM model to use")
    parser.add_argument("--batch", action="store_true", help="Use batch API (slower, cheaper)")
    parser.add_argument("--output-dir", default="scenarios/narratives", help="Output directory for YAML files")
    parser.add_argument("--dry-run", action="store_true", help="Print config, don't write YAML")
    parser.add_argument("--run-factory", action="store_true", help="Also run TS factory after YAML emission")
    parser.add_argument("--max-retries", type=int, default=3, help="Max retries per scenario")

    args = parser.parse_args()

    # Collect narratives
    narratives: list[str] = []
    if args.narrative:
        narratives.append(args.narrative)
    elif args.file:
        with open(args.file) as f:
            narratives = [line.strip() for line in f if line.strip()]
    else:
        print("Error: provide a narrative string or --file", file=sys.stderr)
        sys.exit(1)

    from ..pipelines.narrative_to_yaml import NarrativeToYamlPipeline

    pipeline = NarrativeToYamlPipeline(
        model=args.model,
        batch=args.batch,
        output_dir=Path(args.output_dir),
        max_retries=args.max_retries,
    )

    configs = pipeline.run(narratives, dry_run=args.dry_run)

    for config in configs:
        if args.dry_run:
            import yaml
            print(yaml.dump(config.model_dump(exclude_none=True), default_flow_style=False))
        else:
            print(f"Generated: {config.scenario_id} — {config.name}")

    if args.run_factory and not args.dry_run:
        import subprocess
        for config in configs:
            print(f"Running factory for {config.scenario_id}...")
            subprocess.run(
                ["npx", "tsx", "scenarios/factory/scenario-runner.ts", "--scenario", config.scenario_id],
                check=False,
            )

    print(f"\nTotal: {len(configs)} scenarios generated")


if __name__ == "__main__":
    main()

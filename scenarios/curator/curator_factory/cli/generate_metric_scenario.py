"""CLI entry point: curator-metric — metric-driven scenario generation."""
import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Generate scenario targeting a specific metric",
        prog="curator-metric",
    )
    parser.add_argument("--metric", "-m", required=True, help="Metric ID (MET-029) or name (DSCR)")
    parser.add_argument("--behavior", "-b", default="breach",
                       choices=["breach", "near-miss", "healthy", "deteriorating"],
                       help="Desired metric behavior")
    parser.add_argument("--model", default="claude-opus-4-6", help="LLM model to use")
    parser.add_argument("--dry-run", action="store_true", help="Print config, don't write YAML")
    parser.add_argument("--run-factory", action="store_true", help="Also run TS factory")

    args = parser.parse_args()

    from ..pipelines.metric_scenario_gen import MetricScenarioGenPipeline

    pipeline = MetricScenarioGenPipeline(model=args.model)
    config = pipeline.run(args.metric, args.behavior, dry_run=args.dry_run)

    if config:
        if args.dry_run:
            import yaml
            print(yaml.dump(config.model_dump(exclude_none=True), default_flow_style=False))
        else:
            print(f"Generated: {config.scenario_id} — {config.name}")
            print(f"  Targeting: {args.metric} ({args.behavior})")

        if args.run_factory and not args.dry_run:
            import subprocess
            subprocess.run(
                ["npx", "tsx", "scenarios/factory/scenario-runner.ts", "--scenario", config.scenario_id],
                check=False,
            )
    else:
        print(f"Failed to generate scenario for metric '{args.metric}'", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

"""CLI entry point: curator-audit — post-generation coherence audit."""
import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Audit factory output for coherence issues",
        prog="curator-audit",
    )
    parser.add_argument("--input", "-i", required=True, help="Path to V2 JSON export")
    parser.add_argument("--config", "-c", help="Path to scenario YAML config")
    parser.add_argument("--model", default="claude-opus-4-6", help="LLM model to use")
    parser.add_argument("--threshold", type=float, default=80.0, help="Pass threshold (0-100)")
    parser.add_argument("--strict", action="store_true", help="Exit code 1 if score < threshold")

    args = parser.parse_args()

    from ..pipelines.coherence_auditor import CoherenceAuditorPipeline

    pipeline = CoherenceAuditorPipeline(model=args.model)
    report = pipeline.run(
        Path(args.input),
        config_yaml_path=Path(args.config) if args.config else None,
    )

    print(f"Coherence Report: {report.scenario_id}")
    print(f"  Facilities: {report.total_facilities}")
    print(f"  Score: {report.overall_score:.0f}/100")
    print(f"  Issues: {len(report.issues)}")
    print(f"  Passed: {'YES' if report.passed else 'NO'}")

    if report.issues:
        print("\nIssues:")
        for issue in report.issues:
            print(f"  [{issue.severity}] {issue.facility_id}: {issue.issue_type}")
            print(f"    {issue.description}")

    if args.strict and not report.passed:
        sys.exit(1)


if __name__ == "__main__":
    main()

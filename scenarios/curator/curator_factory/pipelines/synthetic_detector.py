"""Anti-synthetic detection: LLM reviews statistical distributions for realism."""
import json
from pathlib import Path
from typing import Optional

from bespokelabs import curator

from ..models.quality_report import SyntheticDetectionResult
from ..utils.audit_bridge import CuratorAuditBridge


class SyntheticDetectorPipeline:
    """LLM-based review of generated data distributions for synthetic patterns."""

    def __init__(self, model: str = "claude-opus-4-6", columns_per_batch: int = 10):
        self.model = model
        self.columns_per_batch = columns_per_batch
        self.audit = CuratorAuditBridge("synthetic-detector")

    def run(self, output_json_path: Path) -> SyntheticDetectionResult:
        """Analyze V2 output distributions for synthetic patterns."""
        output = json.loads(output_json_path.read_text())
        samples = self._extract_distribution_samples(output)

        if not samples:
            return SyntheticDetectionResult()

        all_findings: list[str] = []
        all_recommendations: list[str] = []

        for i in range(0, len(samples), self.columns_per_batch):
            batch = samples[i:i + self.columns_per_batch]
            result = self._detect_batch(batch)
            if result:
                all_findings.extend(result.findings)
                all_recommendations.extend(result.recommendations)

        suspicious = len(all_findings) > 3
        confidence = min(1.0, len(all_findings) / 10.0)

        final = SyntheticDetectionResult(
            suspicious=suspicious,
            confidence=confidence,
            findings=all_findings,
            recommendations=all_recommendations,
        )
        self.audit.finalize("completed", {"suspicious": suspicious, "findings": len(all_findings)})
        return final

    def _extract_distribution_samples(self, output: dict) -> list[dict]:
        """Extract statistical summaries per numeric column."""
        import numpy as np
        samples = []
        state_map = output.get("stateMap", {})
        if not state_map:
            return []

        # Collect numeric fields across all states
        numeric_fields: dict[str, list[float]] = {}
        for state in state_map.values():
            if not isinstance(state, dict):
                continue
            for field, value in state.items():
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    if field not in numeric_fields:
                        numeric_fields[field] = []
                    numeric_fields[field].append(float(value))

        for field, values in numeric_fields.items():
            if len(values) < 10:
                continue
            arr = np.array(values)
            pct_round = sum(1 for v in values if abs(v - round(v)) < 0.001) / len(values)
            samples.append({
                "column": field,
                "mean": float(np.mean(arr)),
                "std": float(np.std(arr)),
                "min": float(np.min(arr)),
                "max": float(np.max(arr)),
                "p25": float(np.percentile(arr, 25)),
                "p50": float(np.percentile(arr, 50)),
                "p75": float(np.percentile(arr, 75)),
                "n_unique": len(set(round(v, 6) for v in values)),
                "pct_round_numbers": round(pct_round, 3),
                "sample_values": [round(v, 4) for v in values[:20]],
            })
        return samples

    def _detect_batch(self, batch: list[dict]) -> Optional[SyntheticDetectionResult]:
        """Send a batch of distribution samples to LLM for review."""
        prompt = f"""You are a data quality expert reviewing statistical distributions of generated banking data.

COLUMN DISTRIBUTIONS:
{json.dumps(batch, indent=2)[:6000]}

Check for these synthetic data tells:
1. Too-uniform distributions (std < 1% of mean)
2. Suspicious rounding (>80% round numbers)
3. Unrealistic value ranges (PD > 100%, negative amounts)
4. Benford's Law violations on leading digits
5. Identical values across many records (n_unique too low)
6. Correlation artifacts (all values clustered around mean)

Return findings and recommendations as JSON."""

        try:
            detector = curator.LLM(
                model_name=self.model,
                response_format=SyntheticDetectionResult,
            )
            result = detector([{"prompt": prompt}], prompt_func=lambda row: row["prompt"])
            return result[0] if result else None
        except Exception as e:
            self.audit.log_error("DETECT_BATCH_FAILURE", str(e))
            return None

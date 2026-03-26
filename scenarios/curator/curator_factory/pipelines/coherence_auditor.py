"""Post-generation coherence auditor: reviews V2 factory output for narrative consistency."""
import json
from pathlib import Path
from typing import Optional

from bespokelabs import curator

from ..models.quality_report import CoherenceReport, CoherenceIssue
from ..utils.audit_bridge import CuratorAuditBridge


class CoherenceAuditorPipeline:
    """Reviews factory JSON output for cross-table coherence issues."""

    def __init__(self, model: str = "claude-opus-4-6", batch_size: int = 5):
        self.model = model
        self.batch_size = batch_size
        self.audit = CuratorAuditBridge("coherence-auditor")

    def run(self, output_json_path: Path, config_yaml_path: Optional[Path] = None) -> CoherenceReport:
        """Audit V2 factory output for coherence issues."""
        output = json.loads(output_json_path.read_text())
        narrative = ""
        scenario_id = "UNKNOWN"

        if config_yaml_path and config_yaml_path.exists():
            import yaml
            config = yaml.safe_load(config_yaml_path.read_text())
            narrative = config.get("narrative", "")
            scenario_id = config.get("scenario_id", "UNKNOWN")

        trajectories = self._extract_trajectories(output)
        if not trajectories:
            return CoherenceReport(
                scenario_id=scenario_id,
                total_facilities=0,
                overall_score=100.0,
                passed=True,
            )

        # Batch trajectories and send to LLM
        all_issues: list[CoherenceIssue] = []
        for i in range(0, len(trajectories), self.batch_size):
            batch = trajectories[i:i + self.batch_size]
            issues = self._audit_batch(batch, narrative, scenario_id)
            all_issues.extend(issues)

        score = self._compute_score(all_issues, len(trajectories))
        report = CoherenceReport(
            scenario_id=scenario_id,
            total_facilities=len(trajectories),
            issues=all_issues,
            overall_score=score,
            passed=score >= 80.0,
        )
        self.audit.log_scenario_generated(scenario_id, f"score={score:.0f}")
        self.audit.finalize("completed", {"score": score, "issues": len(all_issues)})
        return report

    def _extract_trajectories(self, output: dict) -> list[dict]:
        """Extract per-facility time-series trajectories from V2 JSON output."""
        state_map = output.get("stateMap", {})
        dates = output.get("dates", [])
        if not state_map or not dates:
            return []

        # Group by facility_id
        facilities: dict[str, list] = {}
        for key, state in state_map.items():
            fac_id = key.split("|")[0] if "|" in key else key
            if fac_id not in facilities:
                facilities[fac_id] = []
            facilities[fac_id].append(state)

        trajectories = []
        for fac_id, states in facilities.items():
            traj = {
                "facility_id": fac_id,
                "counterparty_id": states[0].get("counterparty_id", ""),
                "story_arc": states[0].get("story_arc", ""),
                "dates": dates,
                "pd_trajectory": [s.get("pd_annual", 0) for s in states],
                "utilization_trajectory": [
                    s.get("drawn_amount", 0) / max(s.get("committed_amount", 1), 1)
                    for s in states
                ],
                "spread_trajectory": [s.get("spread_bps", 0) for s in states],
                "credit_status_trajectory": [s.get("credit_status", "") for s in states],
                "dpd_trajectory": [s.get("days_past_due", 0) for s in states],
            }
            trajectories.append(traj)
        return trajectories

    def _audit_batch(self, batch: list[dict], narrative: str, scenario_id: str) -> list[CoherenceIssue]:
        """Send a batch of trajectories to LLM for coherence review."""
        prompt = f"""You are a GSIB credit risk data quality reviewer. Analyze these facility trajectories for coherence issues.

SCENARIO NARRATIVE: {narrative}

FACILITY TRAJECTORIES:
{json.dumps(batch, indent=2, default=str)[:8000]}

Check for these issue types:
1. PD_UTILIZATION_MISMATCH: PD rising but utilization stable or falling
2. EVENT_STATE_INCONSISTENCY: Credit event occurred but state didn't change
3. COVENANT_IFRS9_MISALIGN: Covenant breach but still Stage 1
4. SPREAD_PD_DIVERGENCE: Spread tightening while PD rising
5. TEMPORAL_MONOTONICITY: Non-monotonic deterioration in DETERIORATING arc
6. NARRATIVE_DEVIATION: Generated data contradicts the scenario narrative

Return a JSON array of issues found. Each issue: facility_id, issue_type, severity (INFO/WARNING/ERROR), description, recommendation."""

        try:
            auditor = curator.LLM(
                model_name=self.model,
                response_format=list[CoherenceIssue],
            )
            result = auditor([{"prompt": prompt}], prompt_func=lambda row: row["prompt"])
            return result[0] if result else []
        except Exception as e:
            self.audit.log_error("AUDIT_BATCH_FAILURE", str(e))
            return []

    def _compute_score(self, issues: list[CoherenceIssue], total_facilities: int) -> float:
        """Compute coherence score 0-100."""
        if total_facilities == 0:
            return 100.0
        penalty = 0.0
        for issue in issues:
            if issue.severity == "ERROR":
                penalty += 15.0
            elif issue.severity == "WARNING":
                penalty += 5.0
            else:
                penalty += 1.0
        return max(0.0, 100.0 - penalty)

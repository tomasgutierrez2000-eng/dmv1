"""Bridge to existing .claude/audit/audit_logger.py for dual-write logging."""
import json
import sys
from pathlib import Path
from typing import Any, Optional

# Add the audit directory to path so we can import the logger
_AUDIT_DIR = Path(__file__).resolve().parents[5] / ".claude" / "audit"


class CuratorAuditBridge:
    """Wraps the existing AuditLogger for Curator pipeline logging."""

    def __init__(self, pipeline_name: str):
        self.pipeline_name = pipeline_name
        self._logger = None
        self._init_logger()

    def _init_logger(self) -> None:
        try:
            sys.path.insert(0, str(_AUDIT_DIR))
            from audit_logger import AuditLogger
            self._logger = AuditLogger(
                agent_name=f"curator-{self.pipeline_name}",
                trigger_source="curator-cli",
            )
        except (ImportError, Exception):
            # Audit logger not available -- continue without it
            self._logger = None

    def log_llm_call(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        cached: bool = False,
    ) -> None:
        if self._logger:
            self._logger.write_action(
                "LLM_CALL",
                json.dumps({
                    "model": model,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "cost_usd": round(cost_usd, 6),
                    "cached": cached,
                }),
            )

    def log_scenario_generated(self, scenario_id: str, validation_status: str) -> None:
        if self._logger:
            self._logger.write_action(
                "SCENARIO_GENERATED",
                f"{scenario_id}: {validation_status}",
            )

    def log_error(self, error_type: str, details: str) -> None:
        if self._logger:
            self._logger.write_action("ERROR", f"{error_type}: {details}")

    def finalize(self, status: str, output: Optional[dict] = None) -> None:
        if self._logger:
            self._logger.finalize_session(status, output or {})

#!/usr/bin/env python3
"""
Audit Logger — writes agent session logs to both local JSON files
and the postgres_audit database.

Usage:
    from audit_logger import AuditLogger

    logger = AuditLogger(agent_name="metric-decomp-expert", session_id=uuid4())
    logger.write_reasoning_step(1, "Analyzing EXP-001 formula", "Use sum-ratio rollup", "HIGH")
    logger.write_action("DECOMPOSE_METRIC", "Decomposed EXP-001 into 5 ingredients")
    logger.finalize_session("completed", {"metric_id": "EXP-001", "ingredients": 5})
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


# Resolve paths relative to this file's location
_AUDIT_DIR = Path(__file__).parent
_SESSIONS_DIR = _AUDIT_DIR / "sessions"
_SCHEMA_CHANGES_DIR = _AUDIT_DIR / "schema-changes"

# Allow-list of valid audit tables (SQL injection prevention)
_VALID_TABLES = frozenset({
    "agent_runs",
    "schema_changes",
    "metric_decompositions",
    "review_findings",
    "data_lineage",
})


def _ensure_dirs() -> None:
    """Create output directories if they don't exist."""
    _SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    _SCHEMA_CHANGES_DIR.mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    """Current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


def _safe_write_file(path: Path, content: str) -> bool:
    """Write content to file with error handling. Returns True on success."""
    try:
        path.write_text(content)
        return True
    except OSError as e:
        print(f"[audit_logger] Failed to write {path}: {e}", file=sys.stderr)
        return False


class _DBConnection:
    """Lazy, cached database connection for audit writes."""

    def __init__(self) -> None:
        self._conn = None
        self._url: Optional[str] = None

    def _get_url(self) -> Optional[str]:
        db_url = os.environ.get("AUDIT_DATABASE_URL") or os.environ.get("DATABASE_URL")
        if not db_url:
            return None
        if "postgres_audit" not in db_url:
            parts = db_url.rsplit("/", 1)
            db_url = parts[0] + "/postgres_audit"
        return db_url

    def write(self, table: str, data: dict) -> bool:
        """Write a record to the audit database. Returns True on success."""
        if table not in _VALID_TABLES:
            print(f"[audit_logger] Rejected write to unknown table: {table}", file=sys.stderr)
            return False

        url = self._get_url()
        if not url:
            return False

        try:
            import psycopg2  # type: ignore

            if self._conn is None or self._conn.closed:
                self._conn = psycopg2.connect(url)
                self._url = url

            cur = self._conn.cursor()

            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = []
            for v in data.values():
                if isinstance(v, (dict, list)):
                    values.append(json.dumps(v))
                else:
                    values.append(v)

            cur.execute(
                f"INSERT INTO audit.{table} ({columns}) VALUES ({placeholders})",
                values,
            )
            self._conn.commit()
            cur.close()
            return True
        except Exception as e:
            # DB write is best-effort; local JSON is the fallback
            print(f"[audit_logger] DB write to {table} failed: {e}", file=sys.stderr)
            self._conn = None  # reset on error
            return False

    def close(self) -> None:
        """Close the cached connection if open."""
        if self._conn is not None and not self._conn.closed:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None


# Module-level shared connection (reused across AuditLogger instances in same process)
_db = _DBConnection()


class AuditLogger:
    """Logger for agent audit sessions. Writes to local JSON + optionally DB."""

    def __init__(
        self,
        agent_name: str,
        session_id: Optional[uuid.UUID] = None,
        agent_version: str = "1.0.0",
        trigger_source: str = "user",
    ):
        _ensure_dirs()
        self.agent_name = agent_name
        self.session_id = session_id or uuid.uuid4()
        self.run_id = uuid.uuid4()
        self.agent_version = agent_version
        self.trigger_source = trigger_source
        self.reasoning_chain: list[dict] = []
        self.actions_taken: list[dict] = []
        self.started_at = _now_iso()
        self._session_file = (
            _SESSIONS_DIR
            / f"{self.session_id}_{self.agent_name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        )

        # Write initial session record
        self._write_local(
            {
                "run_id": str(self.run_id),
                "session_id": str(self.session_id),
                "agent_name": self.agent_name,
                "agent_version": self.agent_version,
                "trigger_source": self.trigger_source,
                "status": "started",
                "started_at": self.started_at,
                "reasoning_chain": [],
                "actions_taken": [],
            }
        )

        # Attempt DB write
        _db.write(
            "agent_runs",
            {
                "run_id": str(self.run_id),
                "session_id": str(self.session_id),
                "agent_name": self.agent_name,
                "agent_version": self.agent_version,
                "trigger_source": self.trigger_source,
                "status": "started",
            },
        )

    def write_reasoning_step(
        self,
        step_num: int,
        thought: str,
        decision: str,
        confidence: str = "MEDIUM",
    ) -> None:
        """Record a reasoning step in the chain."""
        step = {
            "step": step_num,
            "thought": thought,
            "decision": decision,
            "confidence": confidence,
            "timestamp": _now_iso(),
        }
        self.reasoning_chain.append(step)
        self._update_local()

    def write_action(self, action_type: str, detail: str) -> None:
        """Record an action taken by the agent."""
        action = {
            "type": action_type,
            "detail": detail,
            "timestamp": _now_iso(),
        }
        self.actions_taken.append(action)
        self._update_local()

    def write_schema_change(
        self,
        change_type: str,
        object_schema: str,
        object_name: str,
        ddl_before: Optional[str] = None,
        ddl_after: Optional[str] = None,
        ddl_statement: Optional[str] = None,
    ) -> str:
        """Record a schema change. Returns the change_id."""
        change_id = str(uuid.uuid4())
        change = {
            "change_id": change_id,
            "run_id": str(self.run_id),
            "change_type": change_type,
            "object_schema": object_schema,
            "object_name": object_name,
            "ddl_before": ddl_before,
            "ddl_after": ddl_after,
            "ddl_statement": ddl_statement,
            "approved_by_reviewer": False,
            "created_at": _now_iso(),
        }

        # Write to schema-changes directory
        change_file = _SCHEMA_CHANGES_DIR / f"{change_id}.json"
        _safe_write_file(change_file, json.dumps(change, indent=2))

        # Attempt DB write
        _db.write("schema_changes", change)

        self.write_action(
            "SCHEMA_CHANGE", f"{change_type} {object_schema}.{object_name}"
        )
        return change_id

    def write_finding(
        self,
        finding_ref: str,
        finding_type: str,
        severity: str,
        domain: str,
        issue_description: str,
        mra_classification: str = "N/A",
        required_action: Optional[str] = None,
        regulatory_reference: Optional[str] = None,
        affected_objects: Optional[list] = None,
    ) -> str:
        """Record a review finding. Returns the finding_id."""
        finding_id = str(uuid.uuid4())
        finding = {
            "finding_id": finding_id,
            "run_id": str(self.run_id),
            "finding_ref": finding_ref,
            "finding_type": finding_type,
            "severity": severity,
            "mra_classification": mra_classification,
            "domain": domain,
            "issue_description": issue_description,
            "regulatory_reference": regulatory_reference,
            "affected_objects": affected_objects or [],
            "required_action": required_action,
            "status": "BLOCKING" if severity in ("CRITICAL", "HIGH") else "WARNING",
            "created_at": _now_iso(),
        }

        _db.write("review_findings", finding)
        self.write_action(
            "FINDING", f"{finding_ref} [{severity}] {issue_description[:80]}"
        )
        return finding_id

    def finalize_session(
        self,
        status: str,
        output_payload: Optional[dict] = None,
    ) -> dict:
        """Finalize the session with a status and optional output."""
        completed_at = _now_iso()
        started = datetime.fromisoformat(self.started_at)
        completed = datetime.fromisoformat(completed_at)
        duration_ms = int((completed - started).total_seconds() * 1000)

        session_data = {
            "run_id": str(self.run_id),
            "session_id": str(self.session_id),
            "agent_name": self.agent_name,
            "agent_version": self.agent_version,
            "trigger_source": self.trigger_source,
            "status": status,
            "started_at": self.started_at,
            "completed_at": completed_at,
            "duration_ms": duration_ms,
            "reasoning_chain": self.reasoning_chain,
            "actions_taken": self.actions_taken,
            "output_payload": output_payload,
        }

        self._write_local(session_data)

        # Update DB record
        _db.write(
            "agent_runs",
            {
                "run_id": str(self.run_id),
                "session_id": str(self.session_id),
                "agent_name": self.agent_name,
                "agent_version": self.agent_version,
                "trigger_source": self.trigger_source,
                "status": status,
                "reasoning_chain": self.reasoning_chain,
                "actions_taken": self.actions_taken,
                "output_payload": output_payload,
                "duration_ms": duration_ms,
            },
        )

        # Close the DB connection on session finalize
        _db.close()

        return session_data

    def _write_local(self, data: dict) -> None:
        """Write session data to local JSON file."""
        _safe_write_file(
            self._session_file,
            json.dumps(data, indent=2, default=str),
        )

    def _update_local(self) -> None:
        """Update the local JSON file with current state."""
        try:
            if self._session_file.exists():
                data = json.loads(self._session_file.read_text())
            else:
                data = {}
        except (OSError, json.JSONDecodeError) as e:
            print(f"[audit_logger] Failed to read {self._session_file}: {e}", file=sys.stderr)
            data = {}
        data["reasoning_chain"] = self.reasoning_chain
        data["actions_taken"] = self.actions_taken
        self._write_local(data)

    # ========================================================================
    # Convenience aliases — some agent .md files reference these names.
    # Canonical methods above are the primary API.
    # ========================================================================

    def log_agent_run(self, **kwargs: Any) -> None:
        """Alias: agent run is initialized in __init__(). This is a no-op
        provided for call-site compatibility in agent pseudocode."""
        pass  # Initialization already happened in __init__

    def log_action(self, action_type: str, detail: str) -> None:
        """Alias for write_action()."""
        self.write_action(action_type, detail)

    def log_schema_change(self, **kwargs: Any) -> None:
        """Alias for write_schema_change()."""
        self.write_schema_change(**kwargs)

    def log_session_complete(self, status: str = "completed", output_payload: Optional[dict] = None) -> None:
        """Alias for finalize_session()."""
        self.finalize_session(status, output_payload)

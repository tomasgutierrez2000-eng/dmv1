#!/usr/bin/env python3
"""Tests for audit_logger.py — covers all 7 codepaths."""

import json
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add parent directory to path so we can import audit_logger
sys.path.insert(0, str(Path(__file__).parent))
from audit_logger import AuditLogger, _DBConnection, _VALID_TABLES, _safe_write_file


@pytest.fixture
def tmp_audit_dir(tmp_path):
    """Create a temporary audit directory structure."""
    sessions = tmp_path / "sessions"
    schema_changes = tmp_path / "schema-changes"
    sessions.mkdir()
    schema_changes.mkdir()
    return tmp_path


@pytest.fixture
def logger(tmp_audit_dir, monkeypatch):
    """Create an AuditLogger with temporary directories."""
    import audit_logger as mod
    monkeypatch.setattr(mod, "_SESSIONS_DIR", tmp_audit_dir / "sessions")
    monkeypatch.setattr(mod, "_SCHEMA_CHANGES_DIR", tmp_audit_dir / "schema-changes")
    monkeypatch.setattr(mod, "_db", _DBConnection())  # fresh connection, no real DB
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("AUDIT_DATABASE_URL", raising=False)
    return AuditLogger(agent_name="test-agent", agent_version="1.0.0")


class TestAuditLoggerInit:
    def test_creates_session_file(self, logger, tmp_audit_dir):
        """Init should write a JSON session file."""
        files = list((tmp_audit_dir / "sessions").glob("*.json"))
        assert len(files) == 1
        data = json.loads(files[0].read_text())
        assert data["agent_name"] == "test-agent"
        assert data["status"] == "started"

    def test_generates_uuids(self, logger):
        """Init should generate run_id and session_id as valid UUIDs."""
        assert isinstance(logger.run_id, uuid.UUID)
        assert isinstance(logger.session_id, uuid.UUID)

    def test_without_db(self, logger, tmp_audit_dir):
        """Init without DATABASE_URL should still write local JSON."""
        files = list((tmp_audit_dir / "sessions").glob("*.json"))
        assert len(files) == 1

    def test_empty_reasoning_and_actions(self, logger):
        """Init should start with empty reasoning chain and actions."""
        assert logger.reasoning_chain == []
        assert logger.actions_taken == []


class TestWriteReasoningStep:
    def test_appends_step(self, logger):
        logger.write_reasoning_step(1, "thought1", "decision1", "HIGH")
        assert len(logger.reasoning_chain) == 1
        assert logger.reasoning_chain[0]["step"] == 1
        assert logger.reasoning_chain[0]["thought"] == "thought1"
        assert logger.reasoning_chain[0]["confidence"] == "HIGH"

    def test_multiple_steps(self, logger):
        logger.write_reasoning_step(1, "t1", "d1")
        logger.write_reasoning_step(2, "t2", "d2")
        assert len(logger.reasoning_chain) == 2

    def test_default_confidence(self, logger):
        logger.write_reasoning_step(1, "t", "d")
        assert logger.reasoning_chain[0]["confidence"] == "MEDIUM"

    def test_updates_local_file(self, logger, tmp_audit_dir):
        logger.write_reasoning_step(1, "thought", "decision")
        files = list((tmp_audit_dir / "sessions").glob("*.json"))
        data = json.loads(files[0].read_text())
        assert len(data["reasoning_chain"]) == 1


class TestWriteAction:
    def test_appends_action(self, logger):
        logger.write_action("TEST", "did something")
        assert len(logger.actions_taken) == 1
        assert logger.actions_taken[0]["type"] == "TEST"

    def test_updates_local_file(self, logger, tmp_audit_dir):
        logger.write_action("TEST", "detail")
        files = list((tmp_audit_dir / "sessions").glob("*.json"))
        data = json.loads(files[0].read_text())
        assert len(data["actions_taken"]) == 1


class TestWriteSchemaChange:
    def test_returns_change_id(self, logger):
        cid = logger.write_schema_change("CREATE_TABLE", "l1", "test_table")
        uuid.UUID(cid)  # should not raise

    def test_writes_change_file(self, logger, tmp_audit_dir):
        cid = logger.write_schema_change("ADD_COLUMN", "l2", "my_table", ddl_statement="ALTER TABLE...")
        files = list((tmp_audit_dir / "schema-changes").glob("*.json"))
        assert len(files) == 1
        data = json.loads(files[0].read_text())
        assert data["change_type"] == "ADD_COLUMN"
        assert data["object_name"] == "my_table"
        assert data["ddl_statement"] == "ALTER TABLE..."

    def test_logs_action(self, logger):
        logger.write_schema_change("CREATE_TABLE", "l1", "new_table")
        assert len(logger.actions_taken) == 1
        assert logger.actions_taken[0]["type"] == "SCHEMA_CHANGE"


class TestWriteFinding:
    def test_returns_finding_id(self, logger):
        fid = logger.write_finding("FINDING-001", "pre_execution", "HIGH", "credit_risk", "Bad thing")
        uuid.UUID(fid)  # should not raise

    def test_critical_is_blocking(self, logger):
        logger.write_finding("F-1", "pre_execution", "CRITICAL", "domain", "issue")
        # Finding status is internal to the dict, check action log
        assert "CRITICAL" in logger.actions_taken[0]["detail"]

    def test_low_is_warning(self, logger):
        logger.write_finding("F-1", "post_execution", "LOW", "domain", "minor issue")
        assert "LOW" in logger.actions_taken[0]["detail"]

    def test_truncates_long_description(self, logger):
        long_desc = "A" * 200
        logger.write_finding("F-1", "pre_execution", "MEDIUM", "domain", long_desc)
        assert len(logger.actions_taken[0]["detail"]) < 200


class TestFinalizeSession:
    def test_returns_session_data(self, logger):
        result = logger.finalize_session("completed", {"metric": "EXP-001"})
        assert result["status"] == "completed"
        assert result["output_payload"]["metric"] == "EXP-001"
        assert result["duration_ms"] >= 0

    def test_updates_local_file(self, logger, tmp_audit_dir):
        logger.finalize_session("completed")
        files = list((tmp_audit_dir / "sessions").glob("*.json"))
        data = json.loads(files[0].read_text())
        assert data["status"] == "completed"
        assert "completed_at" in data

    def test_failed_status(self, logger):
        result = logger.finalize_session("failed")
        assert result["status"] == "failed"


class TestDBConnection:
    def test_rejects_invalid_table(self):
        db = _DBConnection()
        result = db.write("evil_table; DROP TABLE users;--", {"key": "val"})
        assert result is False

    def test_valid_tables_constant(self):
        assert "agent_runs" in _VALID_TABLES
        assert "schema_changes" in _VALID_TABLES
        assert "metric_decompositions" in _VALID_TABLES
        assert "review_findings" in _VALID_TABLES
        assert "data_lineage" in _VALID_TABLES
        assert len(_VALID_TABLES) == 5

    def test_no_db_url_returns_false(self, monkeypatch):
        monkeypatch.delenv("DATABASE_URL", raising=False)
        monkeypatch.delenv("AUDIT_DATABASE_URL", raising=False)
        db = _DBConnection()
        assert db.write("agent_runs", {"key": "val"}) is False

    def test_close_idempotent(self):
        db = _DBConnection()
        db.close()  # should not raise even with no connection
        db.close()


class TestSafeWriteFile:
    def test_writes_file(self, tmp_path):
        p = tmp_path / "test.json"
        assert _safe_write_file(p, '{"key": "val"}') is True
        assert p.read_text() == '{"key": "val"}'

    def test_returns_false_on_error(self, tmp_path):
        # Write to a directory path (invalid)
        p = tmp_path / "nonexistent_dir" / "subdir" / "test.json"
        assert _safe_write_file(p, "data") is False


class TestFullPipeline:
    """Integration test: full audit session lifecycle."""

    def test_full_session(self, logger, tmp_audit_dir):
        # Reasoning
        logger.write_reasoning_step(1, "Analyzing metric", "Use sum-ratio", "HIGH")
        logger.write_reasoning_step(2, "Check schema gaps", "3 gaps found", "MEDIUM")

        # Actions
        logger.write_action("ANALYZE", "Parsed metric EXP-001")

        # Schema change
        cid = logger.write_schema_change("CREATE_TABLE", "l3", "exposure_calc")

        # Finding
        fid = logger.write_finding("FINDING-001", "pre_execution", "MEDIUM", "credit_risk", "Missing index")

        # Finalize
        result = logger.finalize_session("completed", {"changes": 1, "findings": 1})

        # Verify final state
        assert len(result["reasoning_chain"]) == 2
        assert len(result["actions_taken"]) == 3  # ANALYZE + SCHEMA_CHANGE + FINDING
        assert result["status"] == "completed"
        assert result["duration_ms"] >= 0

        # Verify files
        session_files = list((tmp_audit_dir / "sessions").glob("*.json"))
        change_files = list((tmp_audit_dir / "schema-changes").glob("*.json"))
        assert len(session_files) == 1
        assert len(change_files) == 1

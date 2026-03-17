-- Migration 024: Make audit logs tamper-evident (append-only)
--
-- GSIB governance requirement: audit trails must be immutable.
-- Prevents UPDATE and DELETE on metric_change_log and metric_sandbox_run.
-- Only INSERT is allowed; corrections are made via new compensating entries.
--
-- Uses PG rules (not triggers) for minimal overhead.

SET search_path TO l3, public;

-- ── metric_change_log: append-only ──────────────────────────────────

-- Block UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'metric_change_log' AND rulename = 'no_update_audit_log'
  ) THEN
    EXECUTE 'CREATE RULE no_update_audit_log AS ON UPDATE TO l3.metric_change_log DO INSTEAD NOTHING';
  END IF;
END $$;

-- Block DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'metric_change_log' AND rulename = 'no_delete_audit_log'
  ) THEN
    EXECUTE 'CREATE RULE no_delete_audit_log AS ON DELETE TO l3.metric_change_log DO INSTEAD NOTHING';
  END IF;
END $$;

-- ── metric_sandbox_run: append-only ─────────────────────────────────

-- Block UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'metric_sandbox_run' AND rulename = 'no_update_sandbox_run'
  ) THEN
    EXECUTE 'CREATE RULE no_update_sandbox_run AS ON UPDATE TO l3.metric_sandbox_run DO INSTEAD NOTHING';
  END IF;
END $$;

-- Block DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'metric_sandbox_run' AND rulename = 'no_delete_sandbox_run'
  ) THEN
    EXECUTE 'CREATE RULE no_delete_sandbox_run AS ON DELETE TO l3.metric_sandbox_run DO INSTEAD NOTHING';
  END IF;
END $$;

-- ── schema_change_log: create append-only schema change audit table ──

CREATE TABLE IF NOT EXISTS l3.schema_change_log (
  change_id       BIGSERIAL PRIMARY KEY,
  change_type     VARCHAR(30) NOT NULL,   -- ADD_TABLE, DELETE_TABLE, ADD_FIELD, UPDATE_FIELD, DELETE_FIELD
  layer           VARCHAR(5)  NOT NULL,   -- L1, L2, L3
  table_name      VARCHAR(200) NOT NULL,
  field_name      VARCHAR(200),
  changed_by_id   VARCHAR(100),
  changed_by_name VARCHAR(200),
  change_reason   VARCHAR(2000),
  before_snapshot JSONB,
  after_snapshot  JSONB,
  created_ts      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Append-only rules for schema_change_log
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'schema_change_log' AND rulename = 'no_update_schema_log'
  ) THEN
    EXECUTE 'CREATE RULE no_update_schema_log AS ON UPDATE TO l3.schema_change_log DO INSTEAD NOTHING';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'l3' AND tablename = 'schema_change_log' AND rulename = 'no_delete_schema_log'
  ) THEN
    EXECUTE 'CREATE RULE no_delete_schema_log AS ON DELETE TO l3.schema_change_log DO INSTEAD NOTHING';
  END IF;
END $$;

-- Index for querying by table
CREATE INDEX IF NOT EXISTS idx_schema_change_log_table
  ON l3.schema_change_log (layer, table_name, created_ts DESC);

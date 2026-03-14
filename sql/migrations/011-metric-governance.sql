-- Migration 011: Metric Governance Tables
-- Supports: audit trail (change log), sandbox testing (sandbox runs),
-- and governance workflow for GSIB metric definitions.
--
-- Prerequisites: l3 schema exists (from prior migrations)
-- Idempotent: uses IF NOT EXISTS / DO $$ blocks

SET search_path TO l1, l2, l3, public;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Metric Change Log — audit trail for metric definition changes
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.metric_change_log (
    change_id           BIGSERIAL PRIMARY KEY,
    item_id             VARCHAR(64) NOT NULL,
    change_type         VARCHAR(30) NOT NULL
                        CHECK (change_type IN ('CREATE','UPDATE','STATUS_CHANGE','ROLLBACK','EXCEPTION')),
    changed_by_id       VARCHAR(100),
    changed_by_name     VARCHAR(200),
    changed_by_role     VARCHAR(30)
                        CHECK (changed_by_role IS NULL OR changed_by_role IN ('analyst','modeler','reviewer','admin')),
    change_reason       TEXT,
    ticket_reference    VARCHAR(100),
    before_snapshot     JSONB,
    after_snapshot      JSONB NOT NULL,
    diff_summary        JSONB NOT NULL DEFAULT '{}'::jsonb,
    governance_status   VARCHAR(30),
    created_ts          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookups: item history (most recent first)
CREATE INDEX IF NOT EXISTS ix_mcl_item
    ON l3.metric_change_log(item_id, created_ts DESC);

-- Lookup by user (for admin "who changed what" queries)
CREATE INDEX IF NOT EXISTS ix_mcl_user
    ON l3.metric_change_log(changed_by_id, created_ts DESC);

-- Lookup by change type (for filtering CREATE/ROLLBACK events)
CREATE INDEX IF NOT EXISTS ix_mcl_type
    ON l3.metric_change_log(change_type, created_ts DESC);

COMMENT ON TABLE l3.metric_change_log IS
    'Audit trail for all metric/data-element catalogue changes. '
    'Before/after JSONB snapshots with computed diff summaries. '
    'Supports governance workflow, rollback, and SR 11-7 compliance.';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Metric Sandbox Run — records of formula test executions
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.metric_sandbox_run (
    sandbox_run_id      BIGSERIAL PRIMARY KEY,
    item_id             VARCHAR(64) NOT NULL,
    run_by_name         VARCHAR(200),
    run_by_id           VARCHAR(100),
    level               VARCHAR(30) NOT NULL
                        CHECK (level IN ('facility','counterparty','desk','portfolio','lob','business_segment')),
    as_of_date          DATE NOT NULL,
    proposed_sql        TEXT NOT NULL,
    current_sql         TEXT,
    proposed_row_count  INTEGER,
    current_row_count   INTEGER,
    proposed_total      NUMERIC(20,6),
    current_total       NUMERIC(20,6),
    reconciliation_pass BOOLEAN,
    duration_ms         BIGINT,
    result_snapshot     JSONB,
    created_ts          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookups: sandbox history per metric
CREATE INDEX IF NOT EXISTS ix_msr_item
    ON l3.metric_sandbox_run(item_id, created_ts DESC);

COMMENT ON TABLE l3.metric_sandbox_run IS
    'Records of formula sandbox test executions. Stores current vs proposed '
    'SQL, row counts, totals, and reconciliation results for evidence.';

-- ═══════════════════════════════════════════════════════════════════════
-- Done
-- ═══════════════════════════════════════════════════════════════════════

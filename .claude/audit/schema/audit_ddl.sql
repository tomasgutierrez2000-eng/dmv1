-- ============================================================================
-- AUDIT SCHEMA DDL — Agent Suite Audit Trail
-- Database: postgres_audit (separate from risk data)
-- Version: 1.0.0
-- Created: 2026-03-23
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS audit;

SET search_path TO audit, public;

-- ============================================================================
-- Table: audit.agent_runs
-- Purpose: Tracks every agent execution — inputs, outputs, reasoning chain,
--          and actions taken. Core table for auditability and reproducibility.
-- ============================================================================
CREATE TABLE audit.agent_runs (
    run_id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID            NOT NULL,
    agent_name          VARCHAR(100)    NOT NULL,
    agent_version       VARCHAR(20),
    trigger_source      VARCHAR(20)     NOT NULL
                        CHECK (trigger_source IN ('user', 'orchestrator', 'sub_agent')),
    input_payload       JSONB,
    output_payload      JSONB,
    reasoning_chain     JSONB,          -- array of {step, thought, decision, confidence}
    actions_taken       JSONB,          -- array of {type, detail, timestamp}
    status              VARCHAR(20)     NOT NULL DEFAULT 'started'
                        CHECK (status IN ('started', 'completed', 'failed', 'blocked_by_reviewer')),
    error_message       TEXT,
    duration_ms         INTEGER,
    token_usage         JSONB,          -- {input_tokens, output_tokens, total_tokens}
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

COMMENT ON TABLE audit.agent_runs IS
    'Tracks every agent execution including inputs, outputs, reasoning chain, '
    'and actions taken. Core audit trail for reproducibility and compliance.';

CREATE INDEX idx_agent_runs_session_id ON audit.agent_runs (session_id);
CREATE INDEX idx_agent_runs_agent_name ON audit.agent_runs (agent_name);
CREATE INDEX idx_agent_runs_status ON audit.agent_runs (status);
CREATE INDEX idx_agent_runs_created_at ON audit.agent_runs (created_at DESC);
CREATE INDEX idx_agent_runs_session_agent ON audit.agent_runs (session_id, agent_name);

-- ============================================================================
-- Table: audit.schema_changes
-- Purpose: Records every DDL change proposed or applied by agents, with
--          before/after snapshots and reviewer approval tracking.
-- ============================================================================
CREATE TABLE audit.schema_changes (
    change_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID            NOT NULL
                        REFERENCES audit.agent_runs(run_id),
    change_type         VARCHAR(30)     NOT NULL
                        CHECK (change_type IN (
                            'CREATE_TABLE', 'ALTER_TABLE', 'ADD_COLUMN',
                            'MODIFY_COLUMN', 'DROP_COLUMN', 'CREATE_INDEX',
                            'ADD_FK', 'DROP_TABLE', 'ADD_CONSTRAINT',
                            'DROP_CONSTRAINT', 'RENAME_COLUMN', 'RENAME_TABLE'
                        )),
    object_schema       VARCHAR(100)    NOT NULL,
    object_name         VARCHAR(200)    NOT NULL,
    ddl_before          TEXT,
    ddl_after           TEXT,
    ddl_statement       TEXT,           -- the actual SQL executed
    impact_assessment   JSONB,          -- {affected_tables, affected_metrics, breaking_change}
    approved_by_reviewer BOOLEAN        DEFAULT FALSE,
    reviewer_run_id     UUID
                        REFERENCES audit.agent_runs(run_id),
    reviewer_notes      TEXT,
    applied_at          TIMESTAMPTZ,
    rolled_back_at      TIMESTAMPTZ,
    rollback_ddl        TEXT,           -- SQL to undo this change
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit.schema_changes IS
    'Records every DDL change proposed or applied by agents. Captures before/after '
    'state, reviewer approval, and rollback DDL for reversibility.';

CREATE INDEX idx_schema_changes_run_id ON audit.schema_changes (run_id);
CREATE INDEX idx_schema_changes_object ON audit.schema_changes (object_schema, object_name);
CREATE INDEX idx_schema_changes_type ON audit.schema_changes (change_type);
CREATE INDEX idx_schema_changes_created_at ON audit.schema_changes (created_at DESC);
CREATE INDEX idx_schema_changes_unapproved ON audit.schema_changes (approved_by_reviewer)
    WHERE approved_by_reviewer = FALSE;

-- ============================================================================
-- Table: audit.metric_decompositions
-- Purpose: Stores the full decomposition of each metric — formula, ingredients,
--          consumers, rollup dimensions, and regulatory references.
-- ============================================================================
CREATE TABLE audit.metric_decompositions (
    decomp_id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID            NOT NULL
                        REFERENCES audit.agent_runs(run_id),
    metric_id           VARCHAR(50)     NOT NULL,    -- e.g. EXP-001, CAP-002
    metric_name         VARCHAR(200)    NOT NULL,
    risk_stripe         VARCHAR(50)     NOT NULL,
    formula_latex       TEXT,
    formula_sql         TEXT,           -- executable SQL representation
    ingredients         JSONB           NOT NULL,    -- [{name, source_table, source_field, data_type, transformation}]
    consumers           JSONB,                       -- [{function, team, use_case}]
    rollup_dimensions   JSONB,                       -- [{level, dimension, aggregation_method}]
    regulatory_refs     JSONB,                       -- [{standard, article, description}]
    gsib_nuances        TEXT,
    regional_nuances    TEXT,
    confidence_level    VARCHAR(10)     NOT NULL DEFAULT 'MEDIUM'
                        CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
    supersedes_decomp_id UUID,         -- previous version of this decomposition
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit.metric_decompositions IS
    'Stores the full decomposition of each metric including formula, ingredients, '
    'consumers, rollup dimensions, and regulatory references. Versioned via supersedes_decomp_id.';

CREATE INDEX idx_metric_decomps_run_id ON audit.metric_decompositions (run_id);
CREATE INDEX idx_metric_decomps_metric_id ON audit.metric_decompositions (metric_id);
CREATE INDEX idx_metric_decomps_risk_stripe ON audit.metric_decompositions (risk_stripe);
CREATE INDEX idx_metric_decomps_created_at ON audit.metric_decompositions (created_at DESC);
CREATE INDEX idx_metric_decomps_metric_latest ON audit.metric_decompositions (metric_id, created_at DESC);

-- ============================================================================
-- Table: audit.review_findings
-- Purpose: Captures findings from pre-execution and post-execution reviews.
--          Uses MRA/MRIA/OFI classification per OCC examination standards.
-- ============================================================================
CREATE TABLE audit.review_findings (
    finding_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID            NOT NULL
                        REFERENCES audit.agent_runs(run_id),
    finding_ref         VARCHAR(30)     NOT NULL,    -- e.g. FINDING-001
    finding_type        VARCHAR(20)     NOT NULL
                        CHECK (finding_type IN ('pre_execution', 'post_execution')),
    severity            VARCHAR(20)     NOT NULL
                        CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL')),
    mra_classification  VARCHAR(10)     NOT NULL DEFAULT 'N/A'
                        CHECK (mra_classification IN ('MRA', 'MRIA', 'OFI', 'N/A')),
    domain              VARCHAR(100)    NOT NULL,
    issue_description   TEXT            NOT NULL,
    regulatory_reference TEXT,
    affected_objects    JSONB,          -- [{type: "table"|"field"|"metric", name, schema}]
    required_action     TEXT,
    remediation_plan    TEXT,
    status              VARCHAR(20)     NOT NULL DEFAULT 'BLOCKING'
                        CHECK (status IN ('BLOCKING', 'WARNING', 'INFORMATIONAL', 'RESOLVED', 'WAIVED')),
    resolution_notes    TEXT,
    resolved_by_run_id  UUID
                        REFERENCES audit.agent_runs(run_id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);

COMMENT ON TABLE audit.review_findings IS
    'Captures findings from pre/post-execution reviews using OCC MRA/MRIA/OFI '
    'classification. Tracks resolution status and links to remediation runs.';

CREATE INDEX idx_review_findings_run_id ON audit.review_findings (run_id);
CREATE INDEX idx_review_findings_severity ON audit.review_findings (severity);
CREATE INDEX idx_review_findings_status ON audit.review_findings (status);
CREATE INDEX idx_review_findings_mra ON audit.review_findings (mra_classification)
    WHERE mra_classification IN ('MRA', 'MRIA');
CREATE INDEX idx_review_findings_domain ON audit.review_findings (domain);
CREATE INDEX idx_review_findings_created_at ON audit.review_findings (created_at DESC);
CREATE INDEX idx_review_findings_open ON audit.review_findings (status)
    WHERE status IN ('BLOCKING', 'WARNING');

-- ============================================================================
-- Table: audit.data_lineage
-- Purpose: Tracks ingredient-level data lineage with BCBS 239 principle
--          references and data quality tiering.
-- ============================================================================
CREATE TABLE audit.data_lineage (
    lineage_id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id           VARCHAR(50)     NOT NULL,
    ingredient_name     VARCHAR(200)    NOT NULL,
    source_system       VARCHAR(100),
    source_table        VARCHAR(200)    NOT NULL,
    source_field        VARCHAR(200)    NOT NULL,
    target_table        VARCHAR(200),
    target_field        VARCHAR(200),
    transformation_logic TEXT,
    bcbs239_principle_ref VARCHAR(50),   -- e.g. "P3 - Accuracy", "P6 - Adaptability"
    data_quality_tier   VARCHAR(10)     NOT NULL DEFAULT 'T2'
                        CHECK (data_quality_tier IN ('T1', 'T2', 'T3')),
    validation_rule     TEXT,           -- how quality is checked
    refresh_frequency   VARCHAR(50),    -- e.g. "daily", "monthly", "event-driven"
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit.data_lineage IS
    'Tracks ingredient-level data lineage with BCBS 239 principle references '
    'and data quality tiering. Supports end-to-end traceability audits.';

CREATE INDEX idx_data_lineage_metric_id ON audit.data_lineage (metric_id);
CREATE INDEX idx_data_lineage_source ON audit.data_lineage (source_table, source_field);
CREATE INDEX idx_data_lineage_target ON audit.data_lineage (target_table, target_field);
CREATE INDEX idx_data_lineage_bcbs239 ON audit.data_lineage (bcbs239_principle_ref);
CREATE INDEX idx_data_lineage_quality ON audit.data_lineage (data_quality_tier);

-- ============================================================================
-- Utility views
-- ============================================================================

-- Open findings requiring attention (MRA/MRIA or BLOCKING)
CREATE VIEW audit.v_open_findings AS
SELECT
    f.finding_id,
    f.finding_ref,
    f.severity,
    f.mra_classification,
    f.domain,
    f.issue_description,
    f.required_action,
    f.status,
    r.agent_name,
    r.session_id,
    f.created_at
FROM audit.review_findings f
JOIN audit.agent_runs r ON f.run_id = r.run_id
WHERE f.status IN ('BLOCKING', 'WARNING')
ORDER BY
    CASE f.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    f.created_at DESC;

-- Latest decomposition per metric
CREATE VIEW audit.v_latest_decompositions AS
SELECT DISTINCT ON (metric_id)
    decomp_id,
    metric_id,
    metric_name,
    risk_stripe,
    confidence_level,
    created_at
FROM audit.metric_decompositions
ORDER BY metric_id, created_at DESC;

-- Pending schema changes (not yet approved)
CREATE VIEW audit.v_pending_schema_changes AS
SELECT
    sc.change_id,
    sc.change_type,
    sc.object_schema,
    sc.object_name,
    sc.ddl_statement,
    r.agent_name,
    r.session_id,
    sc.created_at
FROM audit.schema_changes sc
JOIN audit.agent_runs r ON sc.run_id = r.run_id
WHERE sc.approved_by_reviewer = FALSE
  AND sc.rolled_back_at IS NULL
ORDER BY sc.created_at DESC;

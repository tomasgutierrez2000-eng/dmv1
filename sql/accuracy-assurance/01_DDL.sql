-- ============================================================
-- Accuracy Assurance Engine — validation runs and break tracking
-- Data Lineage & Source Mapping Platform. Target: PostgreSQL 12+
-- ============================================================

CREATE SCHEMA IF NOT EXISTS accuracy_assurance;

-- Validation layers: 1 Source-to-Landing, 2 Cross-Source, 3 Calculation, 4 End-to-End Regulatory
CREATE TABLE IF NOT EXISTS accuracy_assurance.validation_runs (
    run_id          VARCHAR(64) PRIMARY KEY,
    layer           INTEGER NOT NULL CHECK (layer IN (1,2,3,4)),
    entity_ref      VARCHAR(256),
    entity_type     VARCHAR(32),
    result          VARCHAR(16) NOT NULL CHECK (result IN ('pass','warning','fail')),
    details         JSONB,
    run_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_layer ON accuracy_assurance.validation_runs(layer);
CREATE INDEX IF NOT EXISTS idx_validation_runs_run_at ON accuracy_assurance.validation_runs(run_at);

-- Reconciliation breaks (cross-source or end-to-end)
CREATE TABLE IF NOT EXISTS accuracy_assurance.breaks (
    break_id        VARCHAR(64) PRIMARY KEY,
    break_type      VARCHAR(32) NOT NULL,
    severity        VARCHAR(16) NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
    status          VARCHAR(32) NOT NULL DEFAULT 'Identified' CHECK (status IN ('Identified','Under Investigation','Root Cause Determined','Remediation In Progress','Resolved','Closed')),
    metric_ref      VARCHAR(128),
    target_ref      VARCHAR(256),
    variance_amount NUMERIC,
    variance_pct    NUMERIC,
    assigned_to     VARCHAR(256),
    identified_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMPTZ,
    root_cause      TEXT
);

CREATE INDEX IF NOT EXISTS idx_breaks_status ON accuracy_assurance.breaks(status);
CREATE INDEX IF NOT EXISTS idx_breaks_severity ON accuracy_assurance.breaks(severity);

COMMENT ON SCHEMA accuracy_assurance IS 'Accuracy Assurance Engine: validation results and reconciliation break tracking.';

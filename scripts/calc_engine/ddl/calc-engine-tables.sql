-- ============================================================
-- GSIB Calculation Engine — Output Tables
-- Schema: l3
--
-- 4 tables:
--   1. calc_run             — Master record per CLI invocation
--   2. metric_result        — Unified metric output
--   3. calc_audit_log       — Per metric+level execution trace
--   4. calc_validation_result — Validation check results
--
-- Idempotent: uses IF NOT EXISTS throughout.
-- ============================================================

SET search_path TO l1, l2, l3, public;

-- ────────────────────────────────────────────────────────────
-- 1. calc_run
-- One row per CLI invocation. Immutable once completed.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l3.calc_run (
    run_id                  VARCHAR(64)   NOT NULL,
    run_version_id          VARCHAR(64)   NOT NULL,
    as_of_date              DATE          NOT NULL,
    prior_as_of_date        DATE,
    base_currency_code      VARCHAR(10)   NOT NULL DEFAULT 'USD',
    mode                    VARCHAR(20)   NOT NULL DEFAULT 'FULL',
    status                  VARCHAR(20)   NOT NULL DEFAULT 'RUNNING',
    metrics_requested       INTEGER,
    metrics_succeeded       INTEGER,
    metrics_failed          INTEGER,
    metrics_skipped         INTEGER,
    total_rows_written      BIGINT,
    started_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at            TIMESTAMP,
    duration_ms             BIGINT,
    triggered_by            VARCHAR(200),
    cli_args                TEXT,
    engine_version          VARCHAR(30),
    git_sha                 VARCHAR(40),
    error_summary           TEXT,
    config_snapshot         JSONB,

    PRIMARY KEY (run_id)
);

CREATE INDEX IF NOT EXISTS ix_calc_run_version
  ON l3.calc_run (run_version_id, as_of_date);
CREATE INDEX IF NOT EXISTS ix_calc_run_status
  ON l3.calc_run (status, started_at);

-- ────────────────────────────────────────────────────────────
-- 2. metric_result
-- Unified output for all metric calculations.
-- One row per (run, metric, level, dimension_key, scenario).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l3.metric_result (
    result_id               BIGSERIAL     NOT NULL,
    run_id                  VARCHAR(64)   NOT NULL,
    run_version_id          VARCHAR(64)   NOT NULL,
    as_of_date              DATE          NOT NULL,
    metric_id               VARCHAR(64)   NOT NULL,
    metric_version          VARCHAR(20),
    aggregation_level       VARCHAR(30)   NOT NULL,
    dimension_key           VARCHAR(128),
    dimension_label         VARCHAR(500),
    metric_value            NUMERIC(20,6),
    unit_type               VARCHAR(30),
    display_format          VARCHAR(64),
    base_currency_code      VARCHAR(10),
    scenario_id             VARCHAR(64)   DEFAULT 'BASE',
    formula_hash            VARCHAR(64),
    source_row_count        INTEGER,
    created_ts              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (result_id),
    CONSTRAINT fk_metric_result_run
      FOREIGN KEY (run_id) REFERENCES l3.calc_run(run_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_result
  ON l3.metric_result (
    run_id, metric_id, aggregation_level,
    COALESCE(dimension_key, ''), COALESCE(scenario_id, 'BASE')
  );
CREATE INDEX IF NOT EXISTS ix_metric_result_lookup
  ON l3.metric_result (metric_id, aggregation_level, as_of_date, run_version_id);
CREATE INDEX IF NOT EXISTS ix_metric_result_run
  ON l3.metric_result (run_id);

-- ────────────────────────────────────────────────────────────
-- 3. calc_audit_log
-- One row per metric+level execution attempt.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l3.calc_audit_log (
    audit_id                BIGSERIAL     NOT NULL,
    run_id                  VARCHAR(64)   NOT NULL,
    metric_id               VARCHAR(64)   NOT NULL,
    metric_version          VARCHAR(20),
    aggregation_level       VARCHAR(30)   NOT NULL,
    status                  VARCHAR(20)   NOT NULL,
    started_at              TIMESTAMP     NOT NULL,
    completed_at            TIMESTAMP,
    duration_ms             BIGINT,
    rows_returned           INTEGER,
    rows_written            INTEGER,
    sql_executed            TEXT,
    sql_hash                VARCHAR(64),
    source_tables           TEXT[],
    source_row_counts       JSONB,
    bind_params             JSONB,
    error_message           TEXT,
    error_code              VARCHAR(30),
    error_detail            TEXT,
    dependency_chain        TEXT[],

    PRIMARY KEY (audit_id),
    CONSTRAINT fk_audit_log_run
      FOREIGN KEY (run_id) REFERENCES l3.calc_run(run_id)
);

CREATE INDEX IF NOT EXISTS ix_audit_log_run
  ON l3.calc_audit_log (run_id, metric_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_status
  ON l3.calc_audit_log (status, started_at);

-- ────────────────────────────────────────────────────────────
-- 4. calc_validation_result
-- One row per validation rule execution.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l3.calc_validation_result (
    validation_id           BIGSERIAL     NOT NULL,
    run_id                  VARCHAR(64)   NOT NULL,
    metric_id               VARCHAR(64)   NOT NULL,
    rule_id                 VARCHAR(64)   NOT NULL,
    rule_type               VARCHAR(30)   NOT NULL,
    severity                VARCHAR(10)   NOT NULL,
    status                  VARCHAR(10)   NOT NULL,
    aggregation_level       VARCHAR(30),
    dimension_key           VARCHAR(128),
    expected_value          NUMERIC(20,6),
    actual_value            NUMERIC(20,6),
    tolerance               NUMERIC(20,6),
    message                 TEXT          NOT NULL,
    detail                  JSONB,
    checked_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (validation_id),
    CONSTRAINT fk_validation_run
      FOREIGN KEY (run_id) REFERENCES l3.calc_run(run_id)
);

CREATE INDEX IF NOT EXISTS ix_validation_run
  ON l3.calc_validation_result (run_id, severity, status);
CREATE INDEX IF NOT EXISTS ix_validation_metric
  ON l3.calc_validation_result (metric_id, rule_type);

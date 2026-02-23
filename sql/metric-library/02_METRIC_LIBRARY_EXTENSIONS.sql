-- ============================================================
-- Metric Library — Extensions for Data Lineage & Source Mapping Platform
-- Thresholds, criticality, reconciliation points, dashboard pages, quality weight
-- Run after 01_DDL.sql. Target: PostgreSQL 12+
-- ============================================================

-- Parent metrics: add criticality and dashboard page refs
ALTER TABLE metric_library.parent_metrics
  ADD COLUMN IF NOT EXISTS metric_criticality VARCHAR(32) CHECK (metric_criticality IN ('TIER_1','TIER_2','TIER_3')),
  ADD COLUMN IF NOT EXISTS dashboard_pages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS business_purpose_tags JSONB DEFAULT '[]';

COMMENT ON COLUMN metric_library.parent_metrics.metric_criticality IS 'Tier 1 Regulatory-Mandated, Tier 2 Board/Risk Committee, Tier 3 Management Information; drives approval routing.';
COMMENT ON COLUMN metric_library.parent_metrics.dashboard_pages IS 'Page IDs (P1-P8) where this metric appears.';
COMMENT ON COLUMN metric_library.parent_metrics.business_purpose_tags IS 'Risk Appetite, Regulatory Compliance, Management Information, Early Warning Signal, etc.';

-- Threshold configuration (parent-level; each threshold has governance lifecycle)
CREATE TABLE IF NOT EXISTS metric_library.metric_thresholds (
    threshold_id         VARCHAR(128) PRIMARY KEY,
    parent_metric_id     VARCHAR(128) NOT NULL REFERENCES metric_library.parent_metrics(metric_id) ON DELETE CASCADE,
    inner_value         NUMERIC,
    outer_value         NUMERIC,
    limit_type          VARCHAR(16) NOT NULL CHECK (limit_type IN ('CEILING','FLOOR')),
    threshold_source    VARCHAR(64),
    effective_date      DATE NOT NULL,
    expiration_date     DATE,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_thresholds_parent ON metric_library.metric_thresholds(parent_metric_id);

CREATE TABLE IF NOT EXISTS metric_library.metric_threshold_history (
    history_id          SERIAL PRIMARY KEY,
    threshold_id        VARCHAR(128) NOT NULL REFERENCES metric_library.metric_thresholds(threshold_id) ON DELETE CASCADE,
    changed_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    prior_inner         NUMERIC,
    prior_outer         NUMERIC,
    new_inner           NUMERIC,
    new_outer           NUMERIC,
    changed_by          VARCHAR(256),
    approver            VARCHAR(256),
    rationale           TEXT
);

-- Reconciliation points: where this metric should be independently verified
CREATE TABLE IF NOT EXISTS metric_library.reconciliation_points (
    point_id            VARCHAR(128) PRIMARY KEY,
    parent_metric_id   VARCHAR(128) NOT NULL REFERENCES metric_library.parent_metrics(metric_id) ON DELETE CASCADE,
    target_name        VARCHAR(256) NOT NULL,
    target_type        VARCHAR(32),
    tolerance_absolute  NUMERIC,
    tolerance_pct      NUMERIC,
    description        TEXT,
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_points_parent ON metric_library.reconciliation_points(parent_metric_id);

-- Metric variants: add quality score weight and last/next review (governance)
ALTER TABLE metric_library.metric_variants
  ADD COLUMN IF NOT EXISTS quality_score_weight NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS last_full_review_date DATE,
  ADD COLUMN IF NOT EXISTS next_scheduled_review_date DATE,
  ADD COLUMN IF NOT EXISTS reconciliation_points JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_quality_rules JSONB DEFAULT '[]';

COMMENT ON COLUMN metric_library.metric_variants.quality_score_weight IS 'Relative weight in overall Data Quality Score (Page 4).';
COMMENT ON COLUMN metric_library.metric_variants.last_full_review_date IS 'Date of most recent comprehensive review.';
COMMENT ON COLUMN metric_library.metric_variants.next_scheduled_review_date IS 'Next mandatory review; driven by criticality (Tier 1 quarterly, etc.).';

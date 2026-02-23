-- ============================================================
-- Source Mapping Engine — Source Registry & Mapping records
-- Data Lineage & Source Mapping Platform. Target: PostgreSQL 12+
-- ============================================================

CREATE SCHEMA IF NOT EXISTS source_mapping;

-- Source systems (upstream systems of record)
CREATE TABLE IF NOT EXISTS source_mapping.source_systems (
    source_system_id   VARCHAR(64) PRIMARY KEY,
    name               VARCHAR(256) NOT NULL,
    system_type        VARCHAR(64),
    environment        VARCHAR(32) NOT NULL DEFAULT 'Production' CHECK (environment IN ('Production','UAT','Development')),
    owner              VARCHAR(256),
    technical_contact  VARCHAR(256),
    connectivity       VARCHAR(64),
    health_status      VARCHAR(32) DEFAULT 'UNKNOWN',
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Feeds published by a source system
CREATE TABLE IF NOT EXISTS source_mapping.source_feeds (
    feed_id            VARCHAR(64) PRIMARY KEY,
    source_system_id   VARCHAR(64) NOT NULL REFERENCES source_mapping.source_systems(source_system_id) ON DELETE CASCADE,
    feed_name          VARCHAR(256) NOT NULL,
    frequency          VARCHAR(64),
    sla_window         VARCHAR(128),
    schema_ref         VARCHAR(512),
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_feeds_system ON source_mapping.source_feeds(source_system_id);

-- Mapping records: link Metric Library (variant/parent) to source path and target field
CREATE TABLE IF NOT EXISTS source_mapping.mappings (
    mapping_id         VARCHAR(64) PRIMARY KEY,
    metric_ref_type    VARCHAR(16) NOT NULL CHECK (metric_ref_type IN ('parent','variant')),
    metric_ref_id      VARCHAR(128) NOT NULL,
    target_field_ref   VARCHAR(512),
    source_path        TEXT,
    transformation_steps JSONB DEFAULT '[]',
    effective_date     DATE,
    expiration_date    DATE,
    status             VARCHAR(32) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Under Review','Approved','Active','Suspended','Deprecated')),
    version            INTEGER DEFAULT 1,
    approved_by        VARCHAR(256),
    change_rationale  TEXT,
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mappings_metric ON source_mapping.mappings(metric_ref_type, metric_ref_id);
CREATE INDEX IF NOT EXISTS idx_mappings_status ON source_mapping.mappings(status);

COMMENT ON SCHEMA source_mapping IS 'Source Mapping Engine: linkage between Metric Library and source systems/feeds.';
COMMENT ON COLUMN source_mapping.mappings.metric_ref_type IS 'parent = parent_metric_id, variant = variant_id from metric_library.';
COMMENT ON COLUMN source_mapping.mappings.source_path IS 'Full chain: Source System → Feed → Raw Table → Raw Field → … → Reporting Field.';
COMMENT ON COLUMN source_mapping.mappings.transformation_steps IS 'Ordered list: input_field, output_field, transformation_type, logic.';

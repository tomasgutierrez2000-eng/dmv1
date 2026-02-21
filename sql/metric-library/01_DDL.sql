-- ============================================================
-- Metric Library — DDL for GSIB metric governance
-- Domains, Parent Metrics, Metric Variants
-- Target: PostgreSQL 12+
-- ============================================================

CREATE SCHEMA IF NOT EXISTS metric_library;

-- Domains: navigational grouping (e.g. Credit Quality, Exposure)
CREATE TABLE IF NOT EXISTS metric_library.domains (
    domain_id       VARCHAR(16) PRIMARY KEY,
    domain_name     VARCHAR(128) NOT NULL,
    domain_description TEXT,
    icon            VARCHAR(16),
    color           VARCHAR(16),
    regulatory_relevance JSONB DEFAULT '[]',
    primary_stakeholders  JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Parent metrics: canonical business concepts (e.g. DSCR, PD, LTV)
CREATE TABLE IF NOT EXISTS metric_library.parent_metrics (
    metric_id               VARCHAR(128) PRIMARY KEY,
    metric_name             VARCHAR(256) NOT NULL,
    definition              TEXT NOT NULL,
    generic_formula         VARCHAR(512),
    metric_class            VARCHAR(32) NOT NULL CHECK (metric_class IN ('SOURCED','CALCULATED','HYBRID')),
    unit_type               VARCHAR(32) NOT NULL,
    direction               VARCHAR(32) NOT NULL,
    risk_appetite_relevant  BOOLEAN NOT NULL DEFAULT FALSE,
    rollup_philosophy       VARCHAR(512),
    rollup_description      TEXT,
    domain_ids              JSONB NOT NULL DEFAULT '[]',
    variant_count           INTEGER DEFAULT 0,
    regulatory_references    JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Metric variants: specific implementations under a parent (e.g. CRE DSCR NOI, C&I DSCR EBITDA)
CREATE TABLE IF NOT EXISTS metric_library.metric_variants (
    variant_id              VARCHAR(128) PRIMARY KEY,
    variant_name            VARCHAR(256) NOT NULL,
    parent_metric_id         VARCHAR(128) NOT NULL REFERENCES metric_library.parent_metrics(metric_id) ON DELETE CASCADE,
    variant_type            VARCHAR(32) NOT NULL CHECK (variant_type IN ('SOURCED','CALCULATED')),
    status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    version                 VARCHAR(32) NOT NULL DEFAULT 'v1.0',
    effective_date           DATE NOT NULL,
    supersedes_variant_id   VARCHAR(128),

    detailed_description    TEXT,
    formula_display         VARCHAR(1024) NOT NULL,
    formula_specification   TEXT,
    numerator_field_refs    JSONB DEFAULT '[]',
    numerator_definition    TEXT,
    denominator_field_refs  JSONB DEFAULT '[]',
    denominator_definition   TEXT,
    product_scope           VARCHAR(512),
    product_scope_filter    JSONB,
    edge_cases              JSONB DEFAULT '[]',

    rollup_logic            JSONB,
    weighting_basis         VARCHAR(32),

    used_by_dashboards      JSONB DEFAULT '[]',
    used_by_reports         JSONB DEFAULT '[]',
    used_by_filings         JSONB DEFAULT '[]',
    risk_appetite_thresholds JSONB DEFAULT '[]',

    validation_rules        JSONB DEFAULT '[]',

    owner_team              VARCHAR(128),
    approver                VARCHAR(128),
    approval_date           DATE,
    review_cycle            VARCHAR(32),
    related_variant_ids     JSONB DEFAULT '[]',
    recalculation_triggers  JSONB DEFAULT '[]',
    regulatory_references    JSONB DEFAULT '[]',

    upstream_inputs         JSONB DEFAULT '[]',
    downstream_consumers    JSONB DEFAULT '[]',

    executable_metric_id    VARCHAR(128),

    source_system           VARCHAR(256),
    source_field_name       VARCHAR(256),
    source_methodology      TEXT,
    refresh_frequency       VARCHAR(128),
    data_lag                VARCHAR(64),
    data_format             VARCHAR(128),
    companion_fields        JSONB DEFAULT '[]',

    calculation_authority_tier          VARCHAR(4) CHECK (calculation_authority_tier IN ('T1','T2','T3')),
    calculation_authority_tier_future   VARCHAR(4) CHECK (calculation_authority_tier_future IN ('T1','T2','T3')),
    calculation_authority_rationale    TEXT,
    calculation_authority_components   TEXT,
    calculation_authority_future_evolution TEXT,
    calculation_authority_migration_path  TEXT,
    expected_gsib_data_source          TEXT,
    source_integration_pattern         VARCHAR(8) CHECK (source_integration_pattern IN ('PUSH','PULL')),
    source_delivery_method             VARCHAR(256),
    source_endpoint_or_feed            VARCHAR(512),
    source_variant_identifier         VARCHAR(256),
    source_payload_spec                JSONB DEFAULT '[]',
    source_setup_validation_notes     TEXT,

    version_history         JSONB DEFAULT '[]',
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_variants_parent ON metric_library.metric_variants(parent_metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_variants_status ON metric_library.metric_variants(status);
CREATE INDEX IF NOT EXISTS idx_metric_variants_executable ON metric_library.metric_variants(executable_metric_id) WHERE executable_metric_id IS NOT NULL;

COMMENT ON COLUMN metric_library.metric_variants.expected_gsib_data_source IS 'GSIB system/database/feed from which this metric is sourced; drives integration design.';
COMMENT ON SCHEMA metric_library IS 'GSIB Metric Library: governed definitions, variants, rollup, and lineage';

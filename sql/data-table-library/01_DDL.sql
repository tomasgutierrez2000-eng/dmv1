-- ============================================================
-- Data Table Library — table and field catalog
-- Data Lineage & Source Mapping Platform. Target: PostgreSQL 12+
-- ============================================================

CREATE SCHEMA IF NOT EXISTS data_table_library;

CREATE TYPE dtl_layer AS ENUM ('Raw Landing', 'Conformed/Curated', 'Reporting/Aggregated', 'Reference Data');

-- Tables
CREATE TABLE IF NOT EXISTS data_table_library.tables (
    table_id            VARCHAR(64) PRIMARY KEY,
    table_name_business  VARCHAR(256) NOT NULL,
    table_name_technical VARCHAR(256) NOT NULL,
    layer               VARCHAR(32) NOT NULL,
    source_of_origin    VARCHAR(256),
    refresh_frequency   VARCHAR(64),
    sla                 VARCHAR(128),
    record_count_current INTEGER,
    grain              TEXT,
    unique_key         VARCHAR(512),
    data_steward       VARCHAR(256),
    owning_team        VARCHAR(256),
    retention_policy   VARCHAR(128),
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dtl_tables_layer ON data_table_library.tables(layer);

-- Fields
CREATE TABLE IF NOT EXISTS data_table_library.fields (
    field_id            VARCHAR(128) PRIMARY KEY,
    table_id            VARCHAR(64) NOT NULL REFERENCES data_table_library.tables(table_id) ON DELETE CASCADE,
    field_name_technical VARCHAR(256) NOT NULL,
    field_name_business  VARCHAR(256),
    data_type           VARCHAR(64),
    precision_info      VARCHAR(64),
    business_definition TEXT,
    field_classification VARCHAR(32) CHECK (field_classification IN ('Sourced','Derived','Enriched','Configuration')),
    source_lineage      TEXT,
    golden_source_flag  BOOLEAN DEFAULT FALSE,
    sensitivity         VARCHAR(32),
    quality_profile_ref VARCHAR(256),
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dtl_fields_table ON data_table_library.fields(table_id);

COMMENT ON SCHEMA data_table_library IS 'Data Table Library: authoritative catalog of tables and fields from raw through reporting.';

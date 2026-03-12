-- Migration 004: DUNS (Dun & Bradstreet) Integration
-- Adds D&B firmographic enrichment dimension and DUNS identifiers to counterparty
--
-- Purpose:
--   - GSIB regulatory reporting (FR Y-14, FR 2590) requires D&B entity identification
--   - Corporate family concentration analysis via DUNS hierarchy (HQ + Global Ultimate)
--   - D&B credit intelligence: PAYDEX payment scores, failure scores, firmographic data
--
-- Changes:
--   A) New L1 table: duns_entity_dim (D&B firmographic lookup, SCD-1)
--   B) 3 new columns on l2.counterparty: duns_number, duns_hq_number, duns_global_ultimate
--   C) FK from l2.counterparty.duns_number → l1.duns_entity_dim
--   D) Partial index on l2.counterparty.duns_number

SET client_min_messages TO WARNING;
SET search_path TO l1, l2, l3, public;

-- ============================================================
-- A) D&B Entity Dimension — firmographic enrichment from D&B Direct+
-- ============================================================
-- L1 reference table: stable external data from Dun & Bradstreet
-- SCD-1: refreshed periodically from D&B feed, overwrites in place
CREATE TABLE IF NOT EXISTS l1.duns_entity_dim (
    duns_number             VARCHAR(9)  NOT NULL,
    business_name           VARCHAR(500),
    trade_style_name        VARCHAR(500),
    sic_code                VARCHAR(10),
    naics_code              VARCHAR(10),
    employee_count          INTEGER,
    annual_revenue_amt      NUMERIC(20,4),
    duns_country_code       VARCHAR(3),
    paydex_score            INTEGER,
    dnb_rating              VARCHAR(10),
    failure_score           INTEGER,
    is_out_of_business_flag BOOLEAN DEFAULT FALSE,
    last_updated_date       DATE,
    created_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_duns_entity_dim PRIMARY KEY (duns_number)
);

-- ============================================================
-- B) Add DUNS columns to l2.counterparty
-- ============================================================
-- duns_number:         Entity's own 9-digit DUNS
-- duns_hq_number:      Domestic headquarters DUNS (parent entity)
-- duns_global_ultimate: Global ultimate parent DUNS (top of corporate tree)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2'
          AND table_name = 'counterparty'
          AND column_name = 'duns_number'
    ) THEN
        ALTER TABLE l2.counterparty ADD COLUMN duns_number VARCHAR(9);
        ALTER TABLE l2.counterparty ADD COLUMN duns_hq_number VARCHAR(9);
        ALTER TABLE l2.counterparty ADD COLUMN duns_global_ultimate VARCHAR(9);

        -- FK: entity DUNS must exist in D&B dimension
        ALTER TABLE l2.counterparty
            ADD CONSTRAINT fk_cp_duns
            FOREIGN KEY (duns_number)
            REFERENCES l1.duns_entity_dim (duns_number);

        RAISE NOTICE 'Added duns_number, duns_hq_number, duns_global_ultimate to l2.counterparty';
    END IF;
END $$;

-- ============================================================
-- C) Partial index for DUNS lookups (skip NULL rows)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cp_duns
    ON l2.counterparty (duns_number)
    WHERE duns_number IS NOT NULL;

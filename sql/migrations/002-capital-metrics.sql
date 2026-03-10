-- Migration 002: Capital Metrics Schema Extension
-- Adds tables and fields for Basel III / Basel III Endgame capital metrics
-- Covers: regulatory requirements, capital position, binding constraints,
--         facility-level RWA calc, capital consumption at all rollup levels
--
-- Source: CapitalMetrics_Analysis.xlsx (60 elements, 10 metrics)
-- Design decisions:
--   - All legal_entity FKs → l2.legal_entity (confirmed L2 SCD-2 table)
--   - facility_master, counterparty confirmed in l2 schema
--   - RWA amounts split to L3 (strict convention): risk weights in L2, RWA _amt in L3.facility_rwa_calc
--   - basel_exposure_type_id = 0 sentinel for "ALL" totals in composite PKs
--
-- This file is idempotent: safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS guards).

SET client_min_messages TO WARNING;

-- Required for cross-schema FK references
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- L1: NEW TABLES
-----------------------------------------------------------------------

-- 1. Basel Exposure Type Dimension
-- Basel III exposure classes for RWA segmentation (Corporate, Sovereign, Bank, etc.)
-- Sentinel row 0 = ALL (for composite PK totals where NULL is not allowed)
CREATE TABLE IF NOT EXISTS l1.basel_exposure_type_dim (
    basel_exposure_type_id   BIGINT NOT NULL,
    exposure_type_code       VARCHAR(30),
    exposure_type_name       VARCHAR(200),
    description              VARCHAR(2000),
    std_risk_weight_pct      NUMERIC(10,6),
    erba_risk_weight_pct     NUMERIC(10,6),
    asset_class_group        VARCHAR(100),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_basel_exposure_type_dim PRIMARY KEY (basel_exposure_type_id)
);

-- 2. Regulatory Capital Requirement
-- Fed-published capital requirements per GSIB per effective date per regulatory basis.
-- Supports binding constraint analysis (elements 53-60) and Metrics B/C.
CREATE TABLE IF NOT EXISTS l1.regulatory_capital_requirement (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    regulatory_capital_basis_id BIGINT NOT NULL,
    min_cet1_ratio_pct          NUMERIC(10,6),
    min_tier1_ratio_pct         NUMERIC(10,6),
    min_total_capital_ratio_pct NUMERIC(10,6),
    min_leverage_ratio_pct      NUMERIC(10,6),
    min_slr_pct                 NUMERIC(10,6),
    stress_capital_buffer_pct   NUMERIC(10,6),
    gsib_surcharge_pct          NUMERIC(10,6),
    countercyclical_buffer_pct  NUMERIC(10,6),
    total_cet1_req_pct          NUMERIC(10,6),
    total_tier1_req_pct         NUMERIC(10,6),
    total_capital_req_pct       NUMERIC(10,6),
    total_leverage_req_pct      NUMERIC(10,6),
    total_slr_req_pct           NUMERIC(10,6),
    tlac_risk_based_req_pct     NUMERIC(10,6),
    tlac_leverage_req_pct       NUMERIC(10,6),
    currency_code               VARCHAR(20),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_reg_capital_req PRIMARY KEY (legal_entity_id, as_of_date, regulatory_capital_basis_id),
    CONSTRAINT fk_rcr_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_rcr_reg_basis FOREIGN KEY (regulatory_capital_basis_id) REFERENCES l1.regulatory_capital_basis_dim (regulatory_capital_basis_id),
    CONSTRAINT fk_rcr_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code)
);

-----------------------------------------------------------------------
-- L1: ALTER TABLE — New fields on existing tables
-----------------------------------------------------------------------

-- facility_master: add legal_entity_id for capital attribution to BHC/Bank
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_master' AND column_name = 'legal_entity_id'
    ) THEN
        ALTER TABLE l2.facility_master ADD COLUMN legal_entity_id BIGINT;
        ALTER TABLE l2.facility_master ADD CONSTRAINT fk_fm_legal_entity
            FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id);
        RAISE NOTICE 'Added l2.facility_master.legal_entity_id';
    END IF;
END $$;

-- facility_master: add profit_center_code for capital allocation to P&L centers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_master' AND column_name = 'profit_center_code'
    ) THEN
        ALTER TABLE l2.facility_master ADD COLUMN profit_center_code VARCHAR(30);
        RAISE NOTICE 'Added l2.facility_master.profit_center_code';
    END IF;
END $$;

-----------------------------------------------------------------------
-- L2: NEW TABLES
-----------------------------------------------------------------------

-- 3. Capital Position Snapshot
-- Entity-level capital position from Y-9C / Call Reports (quarterly observations).
-- Elements 38-52 from spec.
CREATE TABLE IF NOT EXISTS l2.capital_position_snapshot (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    currency_code               VARCHAR(20),
    cet1_ratio_pct              NUMERIC(10,6),
    tier1_ratio_pct             NUMERIC(10,6),
    total_capital_ratio_pct     NUMERIC(10,6),
    tier1_leverage_ratio_pct    NUMERIC(10,6),
    leverage_ratio_pct          NUMERIC(10,6),
    tlac_ratio_pct              NUMERIC(10,6),
    slr_pct                     NUMERIC(10,6),
    tier1_capital_amt           NUMERIC(20,4),
    cet1_capital_amt            NUMERIC(20,4),
    total_capital_amt           NUMERIC(20,4),
    rwa_amt                     NUMERIC(20,4),
    total_assets_leverage_amt   NUMERIC(20,4),
    total_leverage_exposure_amt NUMERIC(20,4),
    tlac_amt                    NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    source_filing_code          VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_capital_position_snapshot PRIMARY KEY (legal_entity_id, as_of_date),
    CONSTRAINT fk_cps_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_cps_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code)
);

-----------------------------------------------------------------------
-- L2: ALTER TABLE — New fields on facility_risk_snapshot
-----------------------------------------------------------------------

-- risk_weight_std_pct: Basel III US standardized risk weight
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_risk_snapshot' AND column_name = 'risk_weight_std_pct'
    ) THEN
        ALTER TABLE l2.facility_risk_snapshot ADD COLUMN risk_weight_std_pct NUMERIC(10,6);
        RAISE NOTICE 'Added l2.facility_risk_snapshot.risk_weight_std_pct';
    END IF;
END $$;

-- risk_weight_erba_pct: Basel III Endgame enhanced risk-based approach risk weight
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_risk_snapshot' AND column_name = 'risk_weight_erba_pct'
    ) THEN
        ALTER TABLE l2.facility_risk_snapshot ADD COLUMN risk_weight_erba_pct NUMERIC(10,6);
        RAISE NOTICE 'Added l2.facility_risk_snapshot.risk_weight_erba_pct';
    END IF;
END $$;

-- defaulted_flag: Basel default definition (90+ DPD or unlikely to pay)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_risk_snapshot' AND column_name = 'defaulted_flag'
    ) THEN
        ALTER TABLE l2.facility_risk_snapshot ADD COLUMN defaulted_flag BOOLEAN;
        RAISE NOTICE 'Added l2.facility_risk_snapshot.defaulted_flag';
    END IF;
END $$;

-- basel_exposure_type_id: Basel exposure class for RWA segmentation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'facility_risk_snapshot' AND column_name = 'basel_exposure_type_id'
    ) THEN
        ALTER TABLE l2.facility_risk_snapshot ADD COLUMN basel_exposure_type_id BIGINT;
        ALTER TABLE l2.facility_risk_snapshot ADD CONSTRAINT fk_frs_basel_exp_type
            FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id);
        RAISE NOTICE 'Added l2.facility_risk_snapshot.basel_exposure_type_id';
    END IF;
END $$;

-----------------------------------------------------------------------
-- L3: NEW TABLES
-----------------------------------------------------------------------

-- Ensure l3 schema exists
CREATE SCHEMA IF NOT EXISTS l3;

-- 4. Facility RWA Calc (strict L3 convention — derived from L2 risk weights)
-- rwa_std_amt = EAD × risk_weight_std_pct, rwa_erba_amt = EAD × risk_weight_erba_pct
CREATE TABLE IF NOT EXISTS l3.facility_rwa_calc (
    facility_id     BIGINT NOT NULL,
    as_of_date      DATE NOT NULL,
    rwa_std_amt     NUMERIC(20,4),
    rwa_erba_amt    NUMERIC(20,4),
    created_ts      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_facility_rwa_calc PRIMARY KEY (facility_id, as_of_date),
    CONSTRAINT fk_frc_facility FOREIGN KEY (facility_id) REFERENCES l2.facility_master (facility_id)
);

-- 5. Capital Binding Constraint (entity-level)
-- Compares actual capital ratios to requirements, identifies most binding constraint.
-- Elements 53-60 from spec. One row per entity per date.
CREATE TABLE IF NOT EXISTS l3.capital_binding_constraint (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    cet1_binding_amt            NUMERIC(20,4),
    tier1_binding_amt           NUMERIC(20,4),
    total_capital_binding_amt   NUMERIC(20,4),
    tier1_leverage_binding_amt  NUMERIC(20,4),
    leverage_binding_amt        NUMERIC(20,4),
    slr_binding_amt             NUMERIC(20,4),
    tlac_binding_amt            NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    most_binding_ratio_pct      NUMERIC(10,6),
    most_binding_denominator    VARCHAR(30),
    binding_rwa_approach        VARCHAR(10),
    cet1_buffer_pct             NUMERIC(10,6),
    tier1_buffer_pct            NUMERIC(10,6),
    total_capital_buffer_pct    NUMERIC(10,6),
    tier1_leverage_buffer_pct   NUMERIC(10,6),
    leverage_buffer_pct         NUMERIC(10,6),
    slr_buffer_pct              NUMERIC(10,6),
    tlac_buffer_pct             NUMERIC(10,6),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_capital_binding_constraint PRIMARY KEY (legal_entity_id, as_of_date),
    CONSTRAINT fk_cbc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 6. Facility Capital Consumption
-- Top-down capital allocation from entity binding constraint to individual facilities.
-- Elements 35-37 + Metric B at facility level.
CREATE TABLE IF NOT EXISTS l3.facility_capital_consumption (
    facility_id                 BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT,
    counterparty_id             BIGINT,
    min_capital_std_amt         NUMERIC(20,4),
    min_capital_erba_amt        NUMERIC(20,4),
    min_capital_delta_amt       NUMERIC(20,4),
    capital_consumption_amt     NUMERIC(20,4),
    rwa_binding_amt             NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    basel_exposure_type_id      BIGINT,
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_facility_capital_consumption PRIMARY KEY (facility_id, as_of_date),
    CONSTRAINT fk_fcc_facility FOREIGN KEY (facility_id) REFERENCES l2.facility_master (facility_id),
    CONSTRAINT fk_fcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_fcc_counterparty FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty (counterparty_id),
    CONSTRAINT fk_fcc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-- 7. Counterparty Capital Consumption (rollup)
CREATE TABLE IF NOT EXISTS l3.counterparty_capital_consumption (
    counterparty_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT NOT NULL,
    exposure_count              INTEGER,
    total_exposure_amt          NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    rwa_binding_amt             NUMERIC(20,4),
    rwa_density_pct             NUMERIC(10,6),
    capital_consumption_amt     NUMERIC(20,4),
    capital_consumption_std_amt NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt           NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_cp_capital_consumption PRIMARY KEY (counterparty_id, as_of_date, legal_entity_id),
    CONSTRAINT fk_cpcc_counterparty FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty (counterparty_id),
    CONSTRAINT fk_cpcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 8. Desk Capital Consumption (rollup)
CREATE TABLE IF NOT EXISTS l3.desk_capital_consumption (
    org_unit_id                 BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT NOT NULL,
    exposure_count              INTEGER,
    total_exposure_amt          NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    rwa_binding_amt             NUMERIC(20,4),
    rwa_density_pct             NUMERIC(10,6),
    capital_consumption_amt     NUMERIC(20,4),
    capital_consumption_std_amt NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt           NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_desk_capital_consumption PRIMARY KEY (org_unit_id, as_of_date, legal_entity_id),
    CONSTRAINT fk_dcc_org_unit FOREIGN KEY (org_unit_id) REFERENCES l1.org_unit_dim (org_unit_id),
    CONSTRAINT fk_dcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 9. Portfolio Capital Consumption (rollup — primary level per spec)
-- basel_exposure_type_id = 0 (sentinel) for portfolio totals (Metric B).
-- Non-zero values for segment breakdown within portfolio (Metric C).
CREATE TABLE IF NOT EXISTS l3.portfolio_capital_consumption (
    portfolio_id                BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT NOT NULL,
    basel_exposure_type_id      BIGINT NOT NULL,
    exposure_count              INTEGER,
    total_exposure_amt          NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    rwa_density_pct             NUMERIC(10,6),
    capital_consumption_amt     NUMERIC(20,4),
    capital_consumption_std_amt NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt           NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_portfolio_capital_consumption PRIMARY KEY (portfolio_id, as_of_date, legal_entity_id, basel_exposure_type_id),
    CONSTRAINT fk_pcc_portfolio FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim (portfolio_id),
    CONSTRAINT fk_pcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_pcc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-- 10. Segment Capital Consumption (business line rollup)
-- Same structure as portfolio but keyed by lob_segment_id (enterprise_business_taxonomy).
CREATE TABLE IF NOT EXISTS l3.segment_capital_consumption (
    lob_segment_id              BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT NOT NULL,
    basel_exposure_type_id      BIGINT NOT NULL,
    exposure_count              INTEGER,
    total_exposure_amt          NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    rwa_density_pct             NUMERIC(10,6),
    capital_consumption_amt     NUMERIC(20,4),
    capital_consumption_std_amt NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt           NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_segment_capital_consumption PRIMARY KEY (lob_segment_id, as_of_date, legal_entity_id, basel_exposure_type_id),
    CONSTRAINT fk_scc_lob_segment FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy (managed_segment_id),
    CONSTRAINT fk_scc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_scc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-----------------------------------------------------------------------
-- Summary
-----------------------------------------------------------------------
-- New L1 tables:  2 (basel_exposure_type_dim, regulatory_capital_requirement)
-- New L2 tables:  1 (capital_position_snapshot)
-- New L3 tables:  7 (facility_rwa_calc, capital_binding_constraint,
--                     facility_capital_consumption, counterparty_capital_consumption,
--                     desk_capital_consumption, portfolio_capital_consumption,
--                     segment_capital_consumption)
-- Altered tables: 2 (facility_master +2 cols, facility_risk_snapshot +4 cols)
-- Total new fields across all new tables: ~150+
-- Total ALTER TABLE additions: 6 fields

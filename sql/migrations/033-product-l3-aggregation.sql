-- Migration 033: L3 product-level aggregation tables
-- Cross-product views and position-level derived calculations
-- Date: 2026-03-23

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- T89. facility_position_agg — Aggregate positions per facility across products
-- Reconciles with existing facility_exposure_snapshot
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.facility_position_agg (
    facility_id              BIGINT       NOT NULL,
    as_of_date               DATE         NOT NULL,
    -- Aggregated measures
    total_drawn_amt          NUMERIC(20,4),
    total_committed_amt      NUMERIC(20,4),
    total_undrawn_amt        NUMERIC(20,4),
    total_fair_value_amt     NUMERIC(20,4),
    total_ead_amt            NUMERIC(20,4),
    position_count           INTEGER,
    product_count            INTEGER,
    product_types            VARCHAR(500),   -- Comma-separated product codes
    -- Utilization
    utilization_pct          NUMERIC(10,6),
    ccf_adjusted_exposure_amt NUMERIC(20,4),
    -- Audit
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (facility_id, as_of_date)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- T90. cross_product_accounting_view — Unified accounting across all products
-- Call Report / Y-9C aggregation layer
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.cross_product_accounting_view (
    position_id              BIGINT       NOT NULL,
    as_of_date               DATE         NOT NULL,
    product_type_code        VARCHAR(30),
    -- Universal accounting fields (COALESCE across product accounting tables)
    carrying_value_amt       NUMERIC(20,4),
    fair_value_amt           NUMERIC(20,4),
    bs_amount_amt            NUMERIC(20,4),
    accrued_interest_amt     NUMERIC(20,4),
    unrealized_gain_loss_amt NUMERIC(20,4),
    allowance_amt            NUMERIC(20,4),
    charge_off_amt           NUMERIC(20,4),
    recovery_amt             NUMERIC(20,4),
    net_income_amt           NUMERIC(20,4),
    accounting_intent        VARCHAR(100),
    -- Regulatory classification
    call_report_schedule     VARCHAR(30),
    call_report_line_code    VARCHAR(30),
    -- Audit
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (position_id, as_of_date)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- T91. cross_product_risk_view — Unified risk fields across all products
-- CRO dashboard cross-product risk
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.cross_product_risk_view (
    position_id              BIGINT       NOT NULL,
    as_of_date               DATE         NOT NULL,
    product_type_code        VARCHAR(30),
    -- Counterparty identifiers (for cross-product concentration)
    counterparty_id          BIGINT,
    facility_id              BIGINT,
    legal_entity_id          BIGINT,
    -- Universal risk metrics (normalized across products)
    pd_pct                   NUMERIC(10,6),
    lgd_pct                  NUMERIC(10,6),
    ead_amt                  NUMERIC(20,4),
    expected_loss_amt        NUMERIC(20,4),
    risk_weight_pct          NUMERIC(10,6),
    rwa_amt                  NUMERIC(20,4),
    -- Delinquency (loans/commitments)
    days_past_due            INTEGER,
    delinquency_status_code  VARCHAR(30),
    -- Credit status
    credit_status_code       VARCHAR(30),
    internal_risk_rating     VARCHAR(100),
    external_risk_rating     VARCHAR(100),
    -- Audit
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (position_id, as_of_date)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- T92. position_exposure_calc — Per-position derived exposure/capital metrics
-- Calculated overlay at position grain (L3 convention: derived from L2 inputs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l3.position_exposure_calc (
    position_id              BIGINT       NOT NULL,
    as_of_date               DATE         NOT NULL,
    -- Exposure at default
    ead_amt                  NUMERIC(20,4),
    ead_method               VARCHAR(30),   -- SA-CCR, IMM, STANDARDIZED
    -- Expected loss
    expected_loss_amt        NUMERIC(20,4),
    el_rate_pct              NUMERIC(10,6),
    -- Risk-weighted assets
    rwa_amt                  NUMERIC(20,4),
    rwa_method               VARCHAR(30),   -- SA, A-IRB, F-IRB
    risk_weight_pct          NUMERIC(10,6),
    -- Capital consumption (from binding constraint)
    capital_consumption_amt  NUMERIC(20,4),
    capital_ratio_contribution_pct NUMERIC(10,6),
    -- CCF (for off-balance-sheet)
    ccf_applied_pct          NUMERIC(10,6),
    ccf_source               VARCHAR(30),   -- REGULATORY, MODEL, OVERRIDE
    -- FX conversion
    reporting_currency_code  VARCHAR(10),
    fx_rate                  NUMERIC(12,6),
    ead_reporting_ccy_amt    NUMERIC(20,4),
    rwa_reporting_ccy_amt    NUMERIC(20,4),
    -- Audit
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (position_id, as_of_date)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- Note on position_detail deprecation:
-- l2.position_detail is NOT dropped in this migration.
-- It is kept for backward compatibility but will no longer be populated
-- by the data factory. All consumers should migrate to product-specific
-- tables (loans_*_snapshot, derivatives_*_snapshot, etc.) or the L3
-- cross-product views above.
-- ═══════════════════════════════════════════════════════════════════════════


COMMIT;

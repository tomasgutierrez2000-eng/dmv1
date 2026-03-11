-- Migration 002: Layer Reassignment
-- Moves ~50 data elements between L1/L2/L3 layers per the architecture convention:
--   L1 = Reference/configuration only
--   L2 = Atomic/raw data (snapshots, events, SCD-2 masters)
--   L3 = Derived/calculated data (ratios, aggregations, scores)
--
-- Changes:
--   - 3 new L1 dimension tables (bucket/status reference)
--   - 6 new L3 overlay tables (calculated fields split from L2)
--   - 2 existing L3 tables modified (add fields)
--   - 1 new L2 table (limit_assignment_snapshot)
--   - 3 L2 tables modified (add fields)
--   - Multiple L2 fields dropped (moved to L3 overlays)

-- ============================================================================
-- PART 1: NEW L1 DIMENSION TABLES
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS l1;

-- limit_status_dim: Reference codes for limit utilization statuses
CREATE TABLE IF NOT EXISTS "l1"."limit_status_dim" (
    "limit_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "severity_ordinal" INTEGER,
    "display_order" INTEGER,
    "active_flag" BOOLEAN DEFAULT TRUE,
    PRIMARY KEY ("limit_status_code")
);

-- rating_change_status_dim: Reference codes for rating movement direction
CREATE TABLE IF NOT EXISTS "l1"."rating_change_status_dim" (
    "rating_change_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "direction" VARCHAR(20),
    "display_order" INTEGER,
    "active_flag" BOOLEAN DEFAULT TRUE,
    PRIMARY KEY ("rating_change_status_code")
);

-- Seed data for new L1 dims
INSERT INTO "l1"."limit_status_dim" ("limit_status_code", "status_name", "description", "severity_ordinal", "display_order", "active_flag") VALUES
    ('WITHIN_LIMIT', 'Within Limit', 'Utilization is within approved limit', 1, 1, TRUE),
    ('APPROACHING', 'Approaching Limit', 'Utilization is approaching approved limit (>80%)', 2, 2, TRUE),
    ('AT_LIMIT', 'At Limit', 'Utilization equals approved limit', 3, 3, TRUE),
    ('BREACHED', 'Limit Breached', 'Utilization exceeds approved limit', 4, 4, TRUE),
    ('SUSPENDED', 'Limit Suspended', 'Limit has been suspended', 5, 5, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO "l1"."rating_change_status_dim" ("rating_change_status_code", "status_name", "description", "direction", "display_order", "active_flag") VALUES
    ('UPGRADE', 'Upgrade', 'Rating improved', 'positive', 1, TRUE),
    ('STABLE', 'Stable', 'Rating unchanged', 'neutral', 2, TRUE),
    ('DOWNGRADE', 'Downgrade', 'Rating deteriorated', 'negative', 3, TRUE),
    ('NEW', 'New Rating', 'First rating assigned', 'neutral', 4, TRUE),
    ('WITHDRAWN', 'Withdrawn', 'Rating withdrawn', 'neutral', 5, TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- PART 2: NEW L2 TABLE
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS l2;
SET search_path TO l1, l2, public;

-- limit_assignment_snapshot: Tracks limit assignments over time per facility
CREATE TABLE IF NOT EXISTS "l2"."limit_assignment_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "limit_rule_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "limit_amt" NUMERIC(20,4),
    "assigned_date" DATE,
    "expiry_date" DATE,
    "status_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("facility_id", "limit_rule_id", "as_of_date")
);


-- ============================================================================
-- PART 3: L2 TABLE MODIFICATIONS — ADD FIELDS
-- ============================================================================

-- counterparty: add fees_income_amt, ensure pd_pct and lgd_pct exist as NUMERIC
ALTER TABLE "l2"."counterparty" ADD COLUMN IF NOT EXISTS "fees_income_amt" NUMERIC(20,4);
ALTER TABLE "l2"."counterparty" ADD COLUMN IF NOT EXISTS "pd_pct" NUMERIC(10,6);
ALTER TABLE "l2"."counterparty" ADD COLUMN IF NOT EXISTS "lgd_pct" NUMERIC(10,6);

-- counterparty_financial_snapshot: add operating_expense_amt, total_assets_amt, allocated_equity_amt
-- Note: operating_expense_amt, total_assets_amt already exist; adding allocated_equity_amt
ALTER TABLE "l2"."counterparty_financial_snapshot" ADD COLUMN IF NOT EXISTS "allocated_equity_amt" NUMERIC(20,4);

-- position_detail: add rwa_density_pct (source system output, moved from L3)
ALTER TABLE "l2"."position_detail" ADD COLUMN IF NOT EXISTS "rwa_density_pct" NUMERIC(10,6);


-- ============================================================================
-- PART 4: NEW L3 OVERLAY TABLES
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS l3;
SET search_path TO l1, l2, l3, public;

-- facility_exposure_calc: Calculated overlay for facility_exposure_snapshot
-- Fields moved from L2: number_of_loans, days_until_maturity, rwa_amt, number_of_facilities
-- Plus calculated assignments: utilization_status_code, risk_rating_tier_code, limit_status_code
CREATE TABLE IF NOT EXISTS "l3"."facility_exposure_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "days_until_maturity" INTEGER,
    "rwa_amt" NUMERIC(20,4),
    "utilization_status_code" VARCHAR(20),
    "risk_rating_tier_code" VARCHAR(20),
    "limit_status_code" VARCHAR(20),
    "coverage_ratio_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_financial_calc: Calculated overlay for facility_financial_snapshot
-- Fields moved from L2: ltv_pct, net_income_amt, total_debt_service_amt, revenue_amt, etc.
CREATE TABLE IF NOT EXISTS "l3"."facility_financial_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "net_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "revenue_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "fee_rate_pct" NUMERIC(10,6),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- counterparty_rating_calc: Calculated overlay for counterparty_rating_observation
-- Fields moved from L2: risk_rating_change_steps, risk_rating_status_code
CREATE TABLE IF NOT EXISTS "l3"."counterparty_rating_calc" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "rating_type" VARCHAR(30),
    "risk_rating_change_steps" INTEGER,
    "rating_change_status_code" VARCHAR(20),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("counterparty_id", "as_of_date", "rating_type")
);

-- facility_pricing_calc: Calculated overlay for facility_pricing_snapshot
-- Fields moved from L2: pricing_exception_flag, pricing_tier_code
CREATE TABLE IF NOT EXISTS "l3"."facility_pricing_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "pricing_exception_flag" BOOLEAN,
    "pricing_tier_code" VARCHAR(20),
    "fee_rate_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- deal_pipeline_calc: Calculated overlay for deal_pipeline_fact
-- Fields moved from L2: expected_tenor_months
CREATE TABLE IF NOT EXISTS "l3"."deal_pipeline_calc" (
    "deal_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "expected_tenor_months" NUMERIC(10,2),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("deal_id", "as_of_date")
);

-- collateral_calc: Calculated overlay for collateral_snapshot
-- Fields moved from L2: allocated_amount_usd
CREATE TABLE IF NOT EXISTS "l3"."collateral_calc" (
    "collateral_asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "allocated_amount_usd" NUMERIC(20,4),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("collateral_asset_id", "as_of_date")
);

-- cash_flow_calc: Calculated overlay for cash_flow
-- Fields moved from L2: contractual_amt (projected/modeled)
CREATE TABLE IF NOT EXISTS "l3"."cash_flow_calc" (
    "cash_flow_id" BIGINT NOT NULL,
    "contractual_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("cash_flow_id")
);


-- ============================================================================
-- PART 5: MODIFY EXISTING L3 TABLES — ADD FIELDS
-- ============================================================================

-- facility_risk_calc: add exposure_at_default, lgd_estimate (as NUMERIC)
ALTER TABLE "l3"."facility_risk_calc" ADD COLUMN IF NOT EXISTS "exposure_at_default" NUMERIC(20,4);
ALTER TABLE "l3"."facility_risk_calc" ADD COLUMN IF NOT EXISTS "lgd_estimate" NUMERIC(20,4);


-- ============================================================================
-- PART 6: DROP MOVED FIELDS FROM L2 TABLES
-- (Only drop after L3 overlays are created and populated)
-- ============================================================================

-- facility_exposure_snapshot: remove calculated fields moved to l3.facility_exposure_calc
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "number_of_loans";
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "days_until_maturity";
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "rwa_amt";
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "number_of_facilities";
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "coverage_ratio_pct";
ALTER TABLE "l2"."facility_exposure_snapshot" DROP COLUMN IF EXISTS "limit_status_code";

-- facility_financial_snapshot: remove calculated fields moved to l3.facility_financial_calc
ALTER TABLE "l2"."facility_financial_snapshot" DROP COLUMN IF EXISTS "dscr_value";
ALTER TABLE "l2"."facility_financial_snapshot" DROP COLUMN IF EXISTS "ltv_pct";
ALTER TABLE "l2"."facility_financial_snapshot" DROP COLUMN IF EXISTS "net_income_amt";
ALTER TABLE "l2"."facility_financial_snapshot" DROP COLUMN IF EXISTS "total_debt_service_amt";
ALTER TABLE "l2"."facility_financial_snapshot" DROP COLUMN IF EXISTS "interest_rate_sensitivity_pct";

-- facility_risk_snapshot: remove calculated fields moved to l3.facility_risk_calc
ALTER TABLE "l2"."facility_risk_snapshot" DROP COLUMN IF EXISTS "expected_loss_amt";
ALTER TABLE "l2"."facility_risk_snapshot" DROP COLUMN IF EXISTS "rwa_amt";

-- facility_pricing_snapshot: remove calculated fields moved to l3.facility_pricing_calc
ALTER TABLE "l2"."facility_pricing_snapshot" DROP COLUMN IF EXISTS "pricing_exception_flag";

-- facility_master: remove revenue_amt (moved to L3)
ALTER TABLE "l2"."facility_master" DROP COLUMN IF EXISTS "revenue_amt";


-- ============================================================================
-- PART 7: RESET search_path
-- ============================================================================

RESET search_path;

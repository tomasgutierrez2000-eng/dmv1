-- Migration 004: Create missing L3 overlay tables
-- These tables exist in l3-tables.ts and 01_DDL_all_tables.sql but not in PostgreSQL.
-- Overlay pattern: L3 calc table at same grain as L2 source, holds derived fields only.
-- Part of GSIB Audit Remediation Phase 1.

CREATE SCHEMA IF NOT EXISTS l3;
SET search_path TO l1, l2, l3, public;

-- T52: facility_exposure_calc (overlay for l2.facility_exposure_snapshot)
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
    "utilization_pct" NUMERIC(10,6),
    "undrawn_amt" NUMERIC(20,4),
    "net_exposure_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- T51: facility_financial_calc (overlay for l2.facility_financial_snapshot)
CREATE TABLE IF NOT EXISTS "l3"."facility_financial_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "dscr_value" NUMERIC(12,6),
    "dscr" NUMERIC(10,6),
    "ltv_pct" NUMERIC(10,6),
    "net_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "revenue_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "fee_rate_pct" NUMERIC(10,6),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),
    "interest_coverage_ratio" NUMERIC(10,6),
    "debt_yield_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- T57: counterparty_rating_calc (overlay for l2.counterparty_rating_observation)
CREATE TABLE IF NOT EXISTS "l3"."counterparty_rating_calc" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "rating_type" VARCHAR(30),
    "risk_rating_change_steps" INTEGER,
    "rating_change_status_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("counterparty_id", "as_of_date", "rating_type")
);

-- T58: facility_pricing_calc (overlay for l2.facility_pricing_snapshot)
CREATE TABLE IF NOT EXISTS "l3"."facility_pricing_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "pricing_exception_flag" BOOLEAN,
    "pricing_tier_code" VARCHAR(20),
    "fee_rate_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- T60: collateral_calc (overlay for l2.collateral_snapshot)
CREATE TABLE IF NOT EXISTS "l3"."collateral_calc" (
    "collateral_asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "allocated_amount_usd" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("collateral_asset_id", "as_of_date")
);

-- T61: cash_flow_calc (overlay for l2.cash_flow)
CREATE TABLE IF NOT EXISTS "l3"."cash_flow_calc" (
    "cash_flow_id" BIGINT NOT NULL,
    "contractual_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("cash_flow_id")
);

-- T53: data_quality_score_snapshot (promoted from L2 to L3)
CREATE TABLE IF NOT EXISTS "l3"."data_quality_score_snapshot" (
    "table_name" VARCHAR(100) NOT NULL,
    "as_of_date" DATE NOT NULL,
    "completeness_score_pct" NUMERIC(10,6),
    "accuracy_score_pct" NUMERIC(10,6),
    "timeliness_score_pct" NUMERIC(10,6),
    "overall_dq_score_pct" NUMERIC(10,6),
    "total_row_count" INTEGER,
    "null_field_count" INTEGER,
    "anomaly_count" INTEGER,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("table_name", "as_of_date")
);

-- T54: stress_test_result (promoted from L2 to L3)
CREATE TABLE IF NOT EXISTS "l3"."stress_test_result" (
    "stress_test_result_id" BIGSERIAL NOT NULL,
    "position_id" BIGINT,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "scenario_id" BIGINT,
    "as_of_date" DATE,
    "stressed_exposure_amt" NUMERIC(20,4),
    "stressed_expected_loss" NUMERIC(20,4),
    "capital_impact_pct" NUMERIC(10,6),
    "currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("stress_test_result_id")
);

-- T62: gl_account_balance_calc (overlay for l2.gl_account_balance_snapshot)
CREATE TABLE IF NOT EXISTS "l3"."gl_account_balance_calc" (
    "ledger_account_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "ending_balance_net_amt" NUMERIC(20,4),
    "period_net_activity_amt" NUMERIC(20,4),
    "balance_change_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("ledger_account_id", "as_of_date")
);

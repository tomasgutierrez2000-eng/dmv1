-- Migration 019d: Drop/deprecate calculated fields from L2 snapshot tables
-- Finding: F-1.1 (HIGH) — L2 contains calculated fields that belong in L3 overlay tables
-- Remediation: GSIB Data Model Audit 2026-03
--
-- These fields are now exclusively sourced from their L3 calculated overlay tables.
-- They are dropped from L2 to enforce the L1→L2→L3 data flow convention.

SET search_path TO l1, l2, l3, public;

-- facility_financial_snapshot: 4 fields
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS dscr_value;
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS ltv_pct;
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS net_income_amt;
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS interest_rate_sensitivity_pct;

-- facility_exposure_snapshot: 9 fields
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS coverage_ratio_pct;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS rwa_amt;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS net_exposure_usd;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS number_of_loans;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS number_of_facilities;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS days_until_maturity;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS utilization_status_code;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS limit_status_code;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS internal_risk_rating_bucket_code;

-- facility_risk_snapshot: 5 fields
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS ead_amt;
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS expected_loss_amt;
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS rwa_amt;
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS risk_weight_pct;
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS expected_loss_rate_pct;

-- netting_set_exposure_snapshot: 2 fields
ALTER TABLE l2.netting_set_exposure_snapshot DROP COLUMN IF EXISTS netting_benefit_amt;
ALTER TABLE l2.netting_set_exposure_snapshot DROP COLUMN IF EXISTS netted_exposure_amount;

-- counterparty_rating_observation: 1 field
ALTER TABLE l2.counterparty_rating_observation DROP COLUMN IF EXISTS risk_rating_change_steps;

-- collateral_snapshot: 1 field
ALTER TABLE l2.collateral_snapshot DROP COLUMN IF EXISTS allocated_amount_usd;

-- exception_event: 2 fields
ALTER TABLE l2.exception_event DROP COLUMN IF EXISTS days_open;
ALTER TABLE l2.exception_event DROP COLUMN IF EXISTS breach_pct;

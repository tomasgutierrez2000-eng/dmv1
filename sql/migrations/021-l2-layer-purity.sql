-- Migration 021: L2 Layer Purity — Drop Computed Columns
-- Enforces strict L2 raw-only convention (BCBS 239 P3).
--
-- Finding H5: facility_exposure_snapshot has computed fields that belong in L3 overlay
--   L3 overlay: facility_exposure_calc (T52) already contains these fields
--
-- Finding H6: counterparty_financial_snapshot has derived fields
--   L3 overlay: counterparty_financial_calc (T84) already contains these fields
--
-- IMPORTANT: Before running, ensure L3 overlays are populated from these L2 columns.

SET search_path TO l1, l2, l3, public;

-- Step 1: Backfill L3 overlays if not already populated
INSERT INTO l3.facility_exposure_calc (facility_id, as_of_date, number_of_loans, number_of_facilities, days_until_maturity, limit_status_code)
SELECT facility_id, as_of_date, number_of_loans, number_of_facilities, days_until_maturity, limit_status_code
FROM l2.facility_exposure_snapshot
WHERE (facility_id, as_of_date) NOT IN (
  SELECT facility_id, as_of_date FROM l3.facility_exposure_calc
)
AND (number_of_loans IS NOT NULL OR number_of_facilities IS NOT NULL OR days_until_maturity IS NOT NULL);

-- Step 2: Drop computed columns from L2 facility_exposure_snapshot
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS number_of_loans;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS number_of_facilities;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS days_until_maturity;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS limit_status_code;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS internal_risk_rating_bucket_code;

-- Step 3: Backfill L3 counterparty_financial_calc
INSERT INTO l3.counterparty_financial_calc (counterparty_id, as_of_date, net_income_amt, total_debt_service_amt)
SELECT counterparty_id, as_of_date, net_income_amt, total_debt_service_amt
FROM l2.counterparty_financial_snapshot
WHERE (counterparty_id, as_of_date) NOT IN (
  SELECT counterparty_id, as_of_date FROM l3.counterparty_financial_calc
)
AND (net_income_amt IS NOT NULL OR total_debt_service_amt IS NOT NULL);

-- Step 4: Drop derived columns from L2 counterparty_financial_snapshot
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS net_income_amt;
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS ebitda_amt;
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS noi_amt;
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS total_debt_service_amt;

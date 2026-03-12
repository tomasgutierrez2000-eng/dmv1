-- Migration 007: Add currency_code to L2 tables with monetary amounts
-- GSIB Audit finding: 13 L2 tables hold monetary _amt fields but lack
-- a currency_code column, making multi-currency aggregation ambiguous.
-- Part of GSIB Audit Remediation — data quality / semantic completeness.

SET search_path TO l1, l2, public;

ALTER TABLE l2.credit_event ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.credit_event_facility_link ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.stress_test_breach ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.position_detail ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.collateral_snapshot ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.facility_profitability_snapshot ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.facility_credit_approval ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.limit_utilization_event ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.exception_event ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.netting_agreement ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.collateral_link ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.protection_link ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);
ALTER TABLE l2.facility_lender_allocation ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(20);

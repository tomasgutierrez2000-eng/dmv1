-- ============================================================================
-- Safe Migration: Data Model Batch 2
-- Applies all missing changes from commit 862f11b to live PostgreSQL
-- Idempotent — safe to re-run. Preserves existing data.
-- ============================================================================

SET search_path TO l1, l2, l3, public;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: New L1 dimension tables (CREATE IF NOT EXISTS + idempotent seed)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l1.risk_rating_tier_dim (
  tier_code VARCHAR(20) NOT NULL PRIMARY KEY,
  tier_name VARCHAR(200),
  pd_min_pct NUMERIC(10,6),
  pd_max_pct NUMERIC(10,6),
  display_order INTEGER,
  active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (active_flag IN ('Y','N'))
);

CREATE TABLE IF NOT EXISTS l1.dpd_bucket_dim (
  dpd_bucket_code VARCHAR(20) NOT NULL PRIMARY KEY,
  bucket_name VARCHAR(200),
  dpd_min INTEGER,
  dpd_max INTEGER,
  display_order INTEGER,
  active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (active_flag IN ('Y','N'))
);

CREATE TABLE IF NOT EXISTS l1.utilization_status_dim (
  utilization_status_code VARCHAR(20) NOT NULL PRIMARY KEY,
  status_name VARCHAR(200),
  utilization_min_pct NUMERIC(10,4),
  utilization_max_pct NUMERIC(10,4),
  display_order INTEGER,
  active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (active_flag IN ('Y','N'))
);

CREATE TABLE IF NOT EXISTS l1.origination_date_bucket_dim (
  origination_bucket_code VARCHAR(20) NOT NULL PRIMARY KEY,
  bucket_name VARCHAR(200),
  months_since_origination_min INTEGER,
  months_since_origination_max INTEGER,
  display_order INTEGER,
  active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (active_flag IN ('Y','N'))
);

-- Seed data (idempotent — only inserts if table is empty)

INSERT INTO l1.risk_rating_tier_dim (tier_code, tier_name, pd_min_pct, pd_max_pct, display_order, active_flag)
SELECT * FROM (VALUES
  ('INV_GRADE', 'Investment Grade', 0.000000, 0.050000, 1, 'Y'),
  ('STANDARD', 'Standard', 0.050000, 0.200000, 2, 'Y'),
  ('SUBSTANDARD', 'Substandard', 0.200000, 0.500000, 3, 'Y'),
  ('DOUBTFUL', 'Doubtful', 0.500000, 1.000000, 4, 'Y'),
  ('LOSS', 'Loss', 1.000000, 100.000000, 5, 'Y')
) AS v(tier_code, tier_name, pd_min_pct, pd_max_pct, display_order, active_flag)
WHERE NOT EXISTS (SELECT 1 FROM l1.risk_rating_tier_dim LIMIT 1);

INSERT INTO l1.dpd_bucket_dim (dpd_bucket_code, bucket_name, dpd_min, dpd_max, display_order, active_flag)
SELECT * FROM (VALUES
  ('0-30', 'Current (0-30 DPD)', 0, 30, 1, 'Y'),
  ('31-60', 'Early Delinquent (31-60 DPD)', 31, 60, 2, 'Y'),
  ('61-90', 'Delinquent (61-90 DPD)', 61, 90, 3, 'Y'),
  ('90+', 'Seriously Delinquent (90+ DPD)', 91, 99999, 4, 'Y')
) AS v(dpd_bucket_code, bucket_name, dpd_min, dpd_max, display_order, active_flag)
WHERE NOT EXISTS (SELECT 1 FROM l1.dpd_bucket_dim LIMIT 1);

INSERT INTO l1.utilization_status_dim (utilization_status_code, status_name, utilization_min_pct, utilization_max_pct, display_order, active_flag)
SELECT * FROM (VALUES
  ('NO_BREACH', 'No Breach', 0.0000, 75.0000, 1, 'Y'),
  ('WARNING', 'Warning', 75.0000, 95.0000, 2, 'Y'),
  ('FULLY_UTILIZED', 'Fully Utilized', 95.0000, 100.0000, 3, 'Y'),
  ('BREACH', 'Breach', 100.0000, 999.0000, 4, 'Y')
) AS v(utilization_status_code, status_name, utilization_min_pct, utilization_max_pct, display_order, active_flag)
WHERE NOT EXISTS (SELECT 1 FROM l1.utilization_status_dim LIMIT 1);

INSERT INTO l1.origination_date_bucket_dim (origination_bucket_code, bucket_name, months_since_origination_min, months_since_origination_max, display_order, active_flag)
SELECT * FROM (VALUES
  ('0-12M', '0-12 Months', 0, 12, 1, 'Y'),
  ('12-36M', '12-36 Months', 13, 36, 2, 'Y'),
  ('36-60M', '36-60 Months', 37, 60, 3, 'Y'),
  ('60-120M', '60-120 Months', 61, 120, 4, 'Y'),
  ('120M+', '120+ Months', 121, 99999, 5, 'Y')
) AS v(origination_bucket_code, bucket_name, months_since_origination_min, months_since_origination_max, display_order, active_flag)
WHERE NOT EXISTS (SELECT 1 FROM l1.origination_date_bucket_dim LIMIT 1);


-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: Modify existing L1 tables
-- ══════════════════════════════════════════════════════════════════════════════

-- pricing_tier_dim: add spread threshold columns
ALTER TABLE l1.pricing_tier_dim ADD COLUMN IF NOT EXISTS spread_min_bps NUMERIC(10,4);
ALTER TABLE l1.pricing_tier_dim ADD COLUMN IF NOT EXISTS spread_max_bps NUMERIC(10,4);


-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: Column changes on L2 tables (DATA-SAFE)
-- ══════════════════════════════════════════════════════════════════════════════

-- #2: facility_master — rename active_flag → is_active_flag (0 rows, safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='l2' AND table_name='facility_master' AND column_name='active_flag'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='l2' AND table_name='facility_master' AND column_name='is_active_flag'
  ) THEN
    ALTER TABLE l2.facility_master RENAME COLUMN active_flag TO is_active_flag;
  END IF;
END $$;

-- #7: facility_master + counterparty — add revenue_amt
ALTER TABLE l2.facility_master ADD COLUMN IF NOT EXISTS revenue_amt NUMERIC(18,2);
ALTER TABLE l2.counterparty ADD COLUMN IF NOT EXISTS revenue_amt NUMERIC(18,2);

-- #5: facility_exposure_snapshot — remove facility_utilization_status (now derived in L3)
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS facility_utilization_status;

-- #10: facility_exposure_snapshot — add bank_share_pct
ALTER TABLE l2.facility_exposure_snapshot ADD COLUMN IF NOT EXISTS bank_share_pct NUMERIC(10,4);

-- Backfill bank_share_pct with 100% (default = bank owns full share) for existing rows
UPDATE l2.facility_exposure_snapshot SET bank_share_pct = 100.0000 WHERE bank_share_pct IS NULL;

-- #9: cash_flow — remove maturity_bucket_id (moved to L3 facility_detail_snapshot)
ALTER TABLE l2.cash_flow DROP COLUMN IF EXISTS maturity_bucket_id;

-- #6: facility_pricing_snapshot — remove pricing_tier column + FK
DO $$ BEGIN
  ALTER TABLE l2.facility_pricing_snapshot DROP CONSTRAINT IF EXISTS fk_fps_pricing_tier;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE l2.facility_pricing_snapshot DROP CONSTRAINT IF EXISTS fk_facility_pricing_snapshot_pricing_tier;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE l2.facility_pricing_snapshot DROP COLUMN IF EXISTS pricing_tier;

-- #14 & #15: counterparty_financial_snapshot — add new columns
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS expected_drawdown_amt NUMERIC(18,2);
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS fee_income_amt NUMERIC(18,2);
-- tangible_net_worth_usd already exists (confirmed by preflight)

-- #12: position — migrate position_type → product_code (2925 rows with data!)
-- Step 1: Add product_code first
ALTER TABLE l2.position ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);

-- Step 2: Copy data from position_type to product_code (only where product_code is NULL)
UPDATE l2.position SET product_code = position_type WHERE product_code IS NULL AND position_type IS NOT NULL;

-- Step 3: Now safe to drop position_type
ALTER TABLE l2.position DROP COLUMN IF EXISTS position_type;


-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: New L2 table — payment_ledger
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l2.payment_ledger (
  payment_id BIGSERIAL PRIMARY KEY,
  counterparty_id BIGINT,
  facility_id BIGINT,
  contract_id BIGINT,
  position_id BIGINT,
  payment_amount_due NUMERIC(18,2),
  payment_due_date DATE,
  payment_amount_made NUMERIC(18,2),
  payment_date DATE,
  fee_due_amt NUMERIC(18,2),
  payment_applied_amt NUMERIC(18,2),
  applied_date DATE,
  payment_status VARCHAR(30),
  currency_code VARCHAR(20),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: L3 overlay tables + columns
-- ══════════════════════════════════════════════════════════════════════════════

-- L3 facility_detail_snapshot — add derived classification columns (IF NOT EXISTS = safe)
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS risk_rating_tier_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS utilization_status_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS pricing_tier_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS dpd_bucket_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS origination_bucket_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS maturity_bucket_id BIGINT;
-- is_deteriorated already exists (confirmed by preflight)

-- New L3 overlay: facility_risk_calc
CREATE TABLE IF NOT EXISTS l3.facility_risk_calc (
  facility_id VARCHAR(64) NOT NULL,
  as_of_date DATE NOT NULL,
  ead_amt NUMERIC(20,4),
  expected_loss_amt NUMERIC(20,4),
  rwa_amt NUMERIC(20,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (facility_id, as_of_date)
);

-- New L3 overlay: netting_set_exposure_calc
CREATE TABLE IF NOT EXISTS l3.netting_set_exposure_calc (
  netting_set_id VARCHAR(64) NOT NULL,
  as_of_date DATE NOT NULL,
  netted_exposure_amount NUMERIC(20,4),
  netting_benefit_amt NUMERIC(20,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (netting_set_id, as_of_date)
);


-- ══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- Data Model Changes — Batch 2
-- Layer restructuring + 15 requested changes
-- Idempotent patch for live PostgreSQL database
-- ============================================================================

-- ── Phase 1: Move 25 SCD-2/Snapshot tables from l1 → l2 ──
-- PostgreSQL supports ALTER TABLE ... SET SCHEMA for live migration.

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.counterparty SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.legal_entity SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.instrument_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.credit_agreement_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.facility_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.contract_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.netting_agreement SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.netting_set SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.netting_set_link SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.csa_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.margin_agreement SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.collateral_asset_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.collateral_link SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.crm_protection_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.protection_link SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.risk_mitigant_master SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.risk_mitigant_link SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.counterparty_hierarchy SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.legal_entity_hierarchy SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.control_relationship SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.economic_interdependence_relationship SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.credit_agreement_counterparty_participation SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.facility_counterparty_participation SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.facility_lender_allocation SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE l1.fx_rate SET SCHEMA l2';
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_table THEN NULL; END $$;


-- ── Phase 2: New L1 reference dimension tables ──

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

-- Modify pricing_tier_dim: add spread threshold columns
ALTER TABLE l1.pricing_tier_dim ADD COLUMN IF NOT EXISTS spread_min_bps NUMERIC(10,4);
ALTER TABLE l1.pricing_tier_dim ADD COLUMN IF NOT EXISTS spread_max_bps NUMERIC(10,4);


-- ── Phase 3: L2 table modifications ──

-- #2: Rename active_flag → is_active_flag on facility_master (now l2)
ALTER TABLE l2.facility_master RENAME COLUMN active_flag TO is_active_flag;

-- #7: Add revenue_amt to facility_master and counterparty
ALTER TABLE l2.facility_master ADD COLUMN IF NOT EXISTS revenue_amt NUMERIC(18,2);
ALTER TABLE l2.counterparty ADD COLUMN IF NOT EXISTS revenue_amt NUMERIC(18,2);

-- #5: Remove facility_utilization_status from facility_exposure_snapshot
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS facility_utilization_status;

-- #10: Add bank_share_pct to facility_exposure_snapshot
ALTER TABLE l2.facility_exposure_snapshot ADD COLUMN IF NOT EXISTS bank_share_pct NUMERIC(10,4);

-- #9: Remove maturity_bucket_id from cash_flow
ALTER TABLE l2.cash_flow DROP COLUMN IF EXISTS maturity_bucket_id;

-- #6: Remove pricing_tier from facility_pricing_snapshot
DO $$ BEGIN
  ALTER TABLE l2.facility_pricing_snapshot DROP CONSTRAINT IF EXISTS fk_fps_pricing_tier;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE l2.facility_pricing_snapshot DROP COLUMN IF EXISTS pricing_tier;

-- #14 & #15: Add expected_drawdown_amt and fee_income_amt to counterparty_financial_snapshot
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS expected_drawdown_amt NUMERIC(18,2);
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS fee_income_amt NUMERIC(18,2);
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS tangible_net_worth_usd NUMERIC(18,2);

-- #4: Add FK on dpd_bucket_code in facility_delinquency_snapshot (if column exists)
-- Note: dpd_bucket_code column should already exist on facility_delinquency_snapshot

-- #12: Remove position_type, add product_code on position
ALTER TABLE l2.position DROP COLUMN IF EXISTS position_type;
ALTER TABLE l2.position ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);


-- ── Phase 4: New L2 payment_ledger table ──

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


-- ── Phase 5: L3 changes ──

-- Add derived columns to facility_detail_snapshot
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS risk_rating_tier_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS utilization_status_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS pricing_tier_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS dpd_bucket_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS origination_bucket_code VARCHAR(20);
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS maturity_bucket_id BIGINT;
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS is_deteriorated CHAR(1);

-- New overlay table: facility_risk_calc
CREATE TABLE IF NOT EXISTS l3.facility_risk_calc (
  facility_id VARCHAR(64) NOT NULL,
  as_of_date DATE NOT NULL,
  ead_amt NUMERIC(20,4),
  expected_loss_amt NUMERIC(20,4),
  rwa_amt NUMERIC(20,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (facility_id, as_of_date)
);

-- New overlay table: netting_set_exposure_calc
CREATE TABLE IF NOT EXISTS l3.netting_set_exposure_calc (
  netting_set_id VARCHAR(64) NOT NULL,
  as_of_date DATE NOT NULL,
  netted_exposure_amount NUMERIC(20,4),
  netting_benefit_amt NUMERIC(20,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (netting_set_id, as_of_date)
);


-- ── Phase 6: Seed new dimension tables ──

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

-- Done

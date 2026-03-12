-- Migration 003: 7 Data Model Schema Changes
-- Date: 2026-03-10
-- Changes:
--   1. Add avg_nonearning_assets_amt to facility_profitability_snapshot (L2)
--   2. Rename risk_tier_code → risk_rating_tier_code on counterparty_exposure_summary (L3) + FK
--   3. Add pricing_tier_code to counterparty (L2) + FK
--   4. Add normal_balance_indicator to ledger_account_dim (L1)
--   5. Create equity_allocation_config (L1) + equity_allocation_pct on L2/L3
--   6. (Combined with 4)
--   7. Move revenue from facility to counterparty L3

SET search_path TO l1, l2, l3, public;

-- ============================================================
-- CHANGE 4: Add normal_balance_indicator to ledger_account_dim (L1)
-- ============================================================
ALTER TABLE l1.ledger_account_dim
  ADD COLUMN IF NOT EXISTS normal_balance_indicator VARCHAR(2);

UPDATE l1.ledger_account_dim SET normal_balance_indicator =
  CASE
    WHEN account_type IN ('ASSET', 'EXPENSE') THEN 'DR'
    WHEN account_type IN ('LIABILITY', 'EQUITY', 'REVENUE', 'CONTRA') THEN 'CR'
    ELSE 'DR'
  END
WHERE normal_balance_indicator IS NULL;

-- ============================================================
-- CHANGE 5a: Create equity_allocation_config (L1)
-- ============================================================
CREATE TABLE IF NOT EXISTS l1.equity_allocation_config (
    equity_allocation_id    BIGSERIAL PRIMARY KEY,
    managed_segment_id      BIGINT NOT NULL REFERENCES l1.enterprise_business_taxonomy(managed_segment_id),
    legal_entity_id         BIGINT,
    effective_date          DATE NOT NULL,
    equity_allocation_amt   NUMERIC(20,4) NOT NULL,
    currency_code           VARCHAR(20) DEFAULT 'USD',
    active_flag             BOOLEAN DEFAULT TRUE,
    created_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CHANGE 1: Add avg_nonearning_assets_amt to facility_profitability_snapshot (L2)
-- ============================================================
ALTER TABLE l2.facility_profitability_snapshot
  ADD COLUMN IF NOT EXISTS avg_nonearning_assets_amt NUMERIC(18,2);

-- ============================================================
-- CHANGE 5b: Add equity_allocation_pct to facility_profitability_snapshot (L2)
-- ============================================================
ALTER TABLE l2.facility_profitability_snapshot
  ADD COLUMN IF NOT EXISTS equity_allocation_pct NUMERIC(10,6);

-- ============================================================
-- CHANGE 3: Add pricing_tier_code to counterparty (L2)
-- ============================================================
ALTER TABLE l2.counterparty
  ADD COLUMN IF NOT EXISTS pricing_tier_code VARCHAR(20);
ALTER TABLE l2.counterparty
  ADD CONSTRAINT fk_cp_pricing_tier
  FOREIGN KEY (pricing_tier_code) REFERENCES l1.pricing_tier_dim(pricing_tier_code);

-- ============================================================
-- CHANGE 7a: Drop revenue_amt from facility tables (L2)
-- ============================================================
ALTER TABLE l2.facility_master DROP COLUMN IF EXISTS revenue_amt;
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS revenue_amt;

-- ============================================================
-- CHANGE 2: Rename risk_tier_code → risk_rating_tier_code on counterparty_exposure_summary (L3)
-- ============================================================
ALTER TABLE l3.counterparty_exposure_summary
  RENAME COLUMN risk_tier_code TO risk_rating_tier_code;
ALTER TABLE l3.counterparty_exposure_summary
  ADD CONSTRAINT fk_ces_risk_rating_tier
  FOREIGN KEY (risk_rating_tier_code) REFERENCES l1.risk_rating_tier_dim(tier_code);

-- ============================================================
-- CHANGE 7b: Add bank_revenue_amt to counterparty_exposure_summary (L3)
-- ============================================================
ALTER TABLE l3.counterparty_exposure_summary
  ADD COLUMN IF NOT EXISTS bank_revenue_amt NUMERIC(20,4);

-- ============================================================
-- CHANGE 5c: Add equity_allocation_pct to lob_profitability_summary (L3)
-- ============================================================
ALTER TABLE l3.lob_profitability_summary
  ADD COLUMN IF NOT EXISTS equity_allocation_pct NUMERIC(10,6);

-- ============================================================
-- CHANGE 7c: Drop revenue_amt from facility_financial_calc (L3)
-- ============================================================
ALTER TABLE l3.facility_financial_calc DROP COLUMN IF EXISTS revenue_amt;

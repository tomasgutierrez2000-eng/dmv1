-- ═══════════════════════════════════════════════════════════════
-- Patch: Add 6 missing fields required by bulk metric definitions
-- Run: psql "$DATABASE_URL" -f sql/patches/add-missing-metric-fields.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Cross-entity exposure total (L3 derived)
ALTER TABLE l3.counterparty_exposure_summary
  ADD COLUMN IF NOT EXISTS total_cross_entity_exposure_usd NUMERIC(18,2);

-- 2. Days-past-due bucket code (L2 atomic)
ALTER TABLE l2.facility_delinquency_snapshot
  ADD COLUMN IF NOT EXISTS dpd_bucket_code VARCHAR(20);

-- 3. Deteriorated deal flag (L3 derived)
ALTER TABLE l3.facility_detail_snapshot
  ADD COLUMN IF NOT EXISTS is_deteriorated CHAR(1);

-- 4. Expected loss rate (L2 atomic)
ALTER TABLE l2.facility_risk_snapshot
  ADD COLUMN IF NOT EXISTS expected_loss_rate_pct NUMERIC(10,6);

-- 5. Tangible net worth (L2 atomic)
ALTER TABLE l2.counterparty_financial_snapshot
  ADD COLUMN IF NOT EXISTS tangible_net_worth_usd NUMERIC(18,2);

-- 6. Return on RWA (L3 derived)
ALTER TABLE l3.lob_profitability_summary
  ADD COLUMN IF NOT EXISTS return_on_rwa_pct NUMERIC(10,6);

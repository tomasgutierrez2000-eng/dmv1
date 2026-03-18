-- ═══════════════════════════════════════════════════════════════
-- Migration 025a: Move noi_at_origination_amt from collateral_snapshot to collateral_asset_master
-- ═══════════════════════════════════════════════════════════════
-- NOI at origination is a static value captured once at loan closing.
-- It belongs on the master record (L1-like reference data), not
-- repeated on every snapshot date (L2 time-series).
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Step 1: Add noi_at_origination_amt to collateral_asset_master
ALTER TABLE l2.collateral_asset_master
  ADD COLUMN IF NOT EXISTS noi_at_origination_amt NUMERIC(18,2);

COMMENT ON COLUMN l2.collateral_asset_master.noi_at_origination_amt IS
  'Net Operating Income at loan origination — static value from underwriting appraisal (FR Y-14Q CRE H.1).';

-- Step 2: Backfill from collateral_snapshot (take the value from the earliest snapshot per asset)
UPDATE l2.collateral_asset_master cam
SET noi_at_origination_amt = cs_orig.noi_at_origination_amt
FROM (
  SELECT DISTINCT ON (collateral_asset_id)
    collateral_asset_id,
    noi_at_origination_amt
  FROM l2.collateral_snapshot
  WHERE noi_at_origination_amt IS NOT NULL
  ORDER BY collateral_asset_id, as_of_date ASC
) cs_orig
WHERE cam.collateral_asset_id = cs_orig.collateral_asset_id;

-- Step 3: Drop noi_at_origination_amt from collateral_snapshot
ALTER TABLE l2.collateral_snapshot
  DROP COLUMN IF EXISTS noi_at_origination_amt;

COMMIT;

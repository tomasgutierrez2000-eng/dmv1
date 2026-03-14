-- Migration 020: Semantic Deduplication
-- Resolves duplicate fields with overlapping semantics in L2 tables.
--
-- Finding M3: facility_exposure_snapshot has drawn_amount AND outstanding_balance_amt (same concept)
-- Finding M4: financial_metric_observation has "value" AND metric_value (same concept)
--
-- Canonical names (per _amt naming convention):
--   outstanding_balance_amt  (keep) ← drawn_amount (drop)
--   undrawn_commitment_amt   (keep) ← undrawn_amount (drop)
--   metric_value             (keep) ← "value" (drop; also a reserved word)

SET search_path TO l1, l2, public;

-- Step 1: Backfill canonical columns from deprecated columns where canonical is NULL
UPDATE l2.facility_exposure_snapshot
SET outstanding_balance_amt = drawn_amount
WHERE outstanding_balance_amt IS NULL AND drawn_amount IS NOT NULL;

UPDATE l2.facility_exposure_snapshot
SET undrawn_commitment_amt = undrawn_amount
WHERE undrawn_commitment_amt IS NULL AND undrawn_amount IS NOT NULL;

UPDATE l2.financial_metric_observation
SET metric_value = "value"
WHERE metric_value IS NULL AND "value" IS NOT NULL;

-- Step 2: Drop deprecated columns
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS drawn_amount;
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS undrawn_amount;
ALTER TABLE l2.financial_metric_observation DROP COLUMN IF EXISTS "value";

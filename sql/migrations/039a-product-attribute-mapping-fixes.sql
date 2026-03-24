-- Migration 039a: Eng review fixes for product_attribute_mapping
-- Fixes from /plan-eng-review:
--   1. Add source_snapshot_type column (cross-snapshot sourcing)
--   2. Remove invalid SFT carrying_value mapping (field doesn't exist)
--   3. Fix call_report_code dual mapping (only maps to schedule, not line_code)
-- Date: 2026-03-24

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Fix 1: Add source_snapshot_type column
-- Makes cross-snapshot sourcing explicit (e.g., call_report_code from
-- classification tables feeding T90 accounting view)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE l1.product_attribute_mapping
  ADD COLUMN IF NOT EXISTS source_snapshot_type VARCHAR(30);

COMMENT ON COLUMN l1.product_attribute_mapping.source_snapshot_type IS
  'Snapshot type of the source table (accounting, classification, indicative, risk). Derived from registry but made explicit for cross-snapshot mappings where the source snapshot type differs from the target view type.';

-- Backfill from registry: JOIN to get the snapshot_type_code
UPDATE l1.product_attribute_mapping pam
SET source_snapshot_type = ptr.snapshot_type_code
FROM l1.product_table_registry ptr
WHERE pam.product_table_id = ptr.product_table_id
  AND pam.source_snapshot_type IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- Fix 2: Remove invalid SFT carrying_value mapping
-- SFT accounting snapshot does NOT have a carrying_value field
-- (verified via information_schema.columns)
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM l1.product_attribute_mapping
WHERE source_field_name = 'carrying_value'
  AND target_field_name = 'carrying_value_amt'
  AND product_table_id = (
    SELECT product_table_id FROM l1.product_table_registry
    WHERE table_name = 'sft_accounting_snapshot'
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- Fix 3: Fix call_report_code dual mapping
-- Source: single call_report_code field (e.g., 'RC-C')
-- Target: T90.call_report_schedule (valid mapping)
-- Target: T90.call_report_line_code (NO L2 source — remove mapping)
-- call_report_line_code will be populated by L3 regulatory mapping logic
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM l1.product_attribute_mapping
WHERE source_field_name = 'call_report_code'
  AND target_field_name = 'call_report_line_code'
  AND target_view_code = 'T90';

-- Update remaining call_report_schedule mapping to DIRECT (it IS the schedule code)
UPDATE l1.product_attribute_mapping
SET mapping_type_code = 'DIRECT',
    description = REPLACE(description, 'call_report_code → schedule (from classification snapshot)',
                          'call_report_code = schedule code (from classification snapshot)')
WHERE source_field_name = 'call_report_code'
  AND target_field_name = 'call_report_schedule'
  AND target_view_code = 'T90';


-- ═══════════════════════════════════════════════════════════════════════════
-- Fix 4: Remove mappings for non-existent source fields
-- Caught by validate:l1 H19 check against information_schema
-- ═══════════════════════════════════════════════════════════════════════════

-- derivatives_risk_snapshot does NOT have internal_risk_rating
DELETE FROM l1.product_attribute_mapping
WHERE source_field_name = 'internal_risk_rating'
  AND product_table_id = (
    SELECT product_table_id FROM l1.product_table_registry
    WHERE table_name = 'derivatives_risk_snapshot'
  );

-- loans_risk_snapshot does NOT have exposure_at_default_ead
DELETE FROM l1.product_attribute_mapping
WHERE source_field_name = 'exposure_at_default_ead'
  AND product_table_id = (
    SELECT product_table_id FROM l1.product_table_registry
    WHERE table_name = 'loans_risk_snapshot'
  );


COMMIT;

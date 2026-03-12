-- Migration 006: Structural Audit Fixes (Phase 2)
-- Date: 2026-03-12
-- Changes:
--   Step 1: Remove coverage_ratio_pct from L2 facility_exposure_snapshot (L1/L2/L3 violation)
--   Step 2: Add SCD-2 temporal fields to counterparty_hierarchy and fx_rate
--   Step 3: Add facility_purpose_code to facility_master (FR Y-14Q)
--   Step 4: Add missing L3 indexes on FK columns
--   Step 5: Rename substatus_effective_to_date → substatus_effective_end_date
--   Step 6: Drop redundant as_of_date from limit_rule

SET client_min_messages TO WARNING;
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- STEP 1: Remove coverage_ratio_pct from L2 facility_exposure_snapshot
-- This is a computed ratio (collateral/exposure) — violates L2 atomic convention.
-- Already correctly exists in L3.facility_exposure_calc.coverage_ratio_pct.
-- No YAML metrics read this from L2 directly.
-----------------------------------------------------------------------
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS coverage_ratio_pct;

-----------------------------------------------------------------------
-- STEP 2: Add SCD-2 temporal fields to L2 tables missing them
-- counterparty_hierarchy — parent/subsidiary changes need versioning
-- fx_rate — rate changes need versioning
-----------------------------------------------------------------------
ALTER TABLE l2.counterparty_hierarchy
    ADD COLUMN IF NOT EXISTS effective_start_date DATE,
    ADD COLUMN IF NOT EXISTS effective_end_date DATE,
    ADD COLUMN IF NOT EXISTS is_current_flag BOOLEAN DEFAULT TRUE;

ALTER TABLE l2.fx_rate
    ADD COLUMN IF NOT EXISTS effective_start_date DATE,
    ADD COLUMN IF NOT EXISTS effective_end_date DATE,
    ADD COLUMN IF NOT EXISTS is_current_flag BOOLEAN DEFAULT TRUE;

-- Backfill: mark all existing rows as current
UPDATE l2.counterparty_hierarchy SET is_current_flag = TRUE WHERE is_current_flag IS NULL;
UPDATE l2.fx_rate SET is_current_flag = TRUE WHERE is_current_flag IS NULL;

-----------------------------------------------------------------------
-- STEP 3: Add facility_purpose_code to facility_master (FR Y-14Q)
-- FR Y-14Q Schedule H requires facility purpose (General Corporate,
-- Working Capital, Acquisition/Merger, etc.)
-----------------------------------------------------------------------
ALTER TABLE l2.facility_master
    ADD COLUMN IF NOT EXISTS facility_purpose_code VARCHAR(30);

-----------------------------------------------------------------------
-- STEP 4: Add missing L3 indexes on FK columns
-- Only PK indexes exist on L3 tables — FK columns used in JOINs need indexes
-----------------------------------------------------------------------

-- ecl_provision_calc
CREATE INDEX IF NOT EXISTS idx_epc_facility ON l3.ecl_provision_calc(facility_id);
CREATE INDEX IF NOT EXISTS idx_epc_counterparty ON l3.ecl_provision_calc(counterparty_id);

-- stress_test_result
CREATE INDEX IF NOT EXISTS idx_str_facility ON l3.stress_test_result(facility_id);
CREATE INDEX IF NOT EXISTS idx_str_counterparty ON l3.stress_test_result(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_str_scenario ON l3.stress_test_result(scenario_id);
CREATE INDEX IF NOT EXISTS idx_str_position ON l3.stress_test_result(position_id);

-- ecl_allowance_movement
CREATE INDEX IF NOT EXISTS idx_eam_legal_entity ON l3.ecl_allowance_movement(legal_entity_id);

-- watchlist_movement_summary
CREATE INDEX IF NOT EXISTS idx_wms_legal_entity ON l3.watchlist_movement_summary(legal_entity_id);

-----------------------------------------------------------------------
-- STEP 5: Rename substatus_effective_to_date → substatus_effective_end_date
-- Catches the remaining effective_to naming violation from migration 005
-----------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l1' AND table_name = 'enterprise_business_taxonomy'
        AND column_name = 'substatus_effective_to_date'
    ) THEN
        ALTER TABLE l1.enterprise_business_taxonomy
            RENAME COLUMN substatus_effective_to_date TO substatus_effective_end_date;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l1' AND table_name = 'enterprise_product_taxonomy'
        AND column_name = 'substatus_effective_to_date'
    ) THEN
        ALTER TABLE l1.enterprise_product_taxonomy
            RENAME COLUMN substatus_effective_to_date TO substatus_effective_end_date;
    END IF;
END $$;

-----------------------------------------------------------------------
-- STEP 6: Drop redundant as_of_date from limit_rule
-- limit_rule already has effective_start_date/effective_end_date for SCD-2.
-- as_of_date is redundant and violates L1 convention.
-----------------------------------------------------------------------
ALTER TABLE l1.limit_rule DROP COLUMN IF EXISTS as_of_date;

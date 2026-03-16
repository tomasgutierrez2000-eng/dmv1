-- ═══════════════════════════════════════════════════════════════
-- Migration 017: Populate sample data for metrics REF-025, REF-026, RSK-004, RSK-005
--
-- Fixes:
--   1. RSK-004/005: Populate risk_rating_change_steps on external rating observations
--      (was: 1 of 930 non-null; after: realistic distribution across all 3 months)
--   2. REF-025: Remap facility_exposure_snapshot.product_node_id to valid EPT IDs
--      (was: 1-405 fake IDs; after: valid 410001-411028 from enterprise_product_taxonomy)
--   3. REF-026: Add 'AMER' region to region_dim for Americas counterparties
--      (was: country_dim.region_code='AMER' had no match in region_dim)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- FIX 1: Populate risk_rating_change_steps on external observations
--
-- Distribution (realistic credit environment):
--   ~55% stable (0), ~20% minor downgrade (-1,-2), ~10% minor upgrade (+1,+2)
--   ~8% moderate downgrade (-3,-4), ~5% moderate upgrade (+3), ~2% severe (-5 to -7)
--
-- Uses observation_id modulo for deterministic, reproducible assignment.
-- Applied to ALL 3 as_of_dates (Nov, Dec, Jan) for trend analysis.
-- ──────────────────────────────────────────────────────────────

UPDATE l2.counterparty_rating_observation
SET risk_rating_change_steps = CASE
    -- 55% stable
    WHEN (observation_id % 100) < 55 THEN 0
    -- 10% downgrade by 1
    WHEN (observation_id % 100) < 65 THEN -1
    -- 7% downgrade by 2
    WHEN (observation_id % 100) < 72 THEN -2
    -- 5% upgrade by 1
    WHEN (observation_id % 100) < 77 THEN 1
    -- 5% upgrade by 2
    WHEN (observation_id % 100) < 82 THEN 2
    -- 5% downgrade by 3
    WHEN (observation_id % 100) < 87 THEN -3
    -- 3% upgrade by 3
    WHEN (observation_id % 100) < 90 THEN 3
    -- 3% downgrade by 4
    WHEN (observation_id % 100) < 93 THEN -4
    -- 3% downgrade by 5 (severe)
    WHEN (observation_id % 100) < 96 THEN -5
    -- 2% upgrade by 4
    WHEN (observation_id % 100) < 98 THEN 4
    -- 2% downgrade by 6-7 (severe distress)
    ELSE -6
END
WHERE is_internal_flag = false;

-- Also set risk_rating_status based on the steps we just assigned
UPDATE l2.counterparty_rating_observation
SET risk_rating_status = CASE
    WHEN risk_rating_change_steps < 0 THEN 'DOWNGRADE'
    WHEN risk_rating_change_steps > 0 THEN 'UPGRADE'
    ELSE 'STABLE'
END
WHERE is_internal_flag = false;

-- ──────────────────────────────────────────────────────────────
-- FIX 2: Remap product_node_id to valid EPT IDs
--
-- FES currently has product_node_id = 1..405 (facility_id based, not real products)
-- EPT has product_node_id = 410001..411028 (123 real products)
-- Remap: 410001 + ((old_product_node_id - 1) % 123) → distributes across all products
-- ──────────────────────────────────────────────────────────────

UPDATE l2.facility_exposure_snapshot
SET product_node_id = 410001 + ((product_node_id - 1) % 123)
WHERE product_node_id IS NOT NULL
  AND product_node_id < 410001;

-- FIX 2b: Remap any product_node_ids that fell in a gap (410101-410123 → 410001-410023)
-- EPT IDs are not contiguous (410001-411028, 123 products with gaps)
UPDATE l2.facility_exposure_snapshot
SET product_node_id = product_node_id - 100
WHERE product_node_id BETWEEN 410101 AND 410123;

-- ──────────────────────────────────────────────────────────────
-- FIX 3: Add 'AMER' (Americas) to region_dim
--
-- country_dim maps ~278 counterparties to region_code='AMER'
-- but region_dim only had NAM, LATAM — not AMER as a top-level region.
-- ──────────────────────────────────────────────────────────────

INSERT INTO l1.region_dim (
    region_code, region_name, display_order, is_active_flag,
    region_group_code, source_system_id,
    effective_start_date, is_current_flag, created_ts, updated_ts
)
VALUES (
    'AMER', 'Americas', 1, true,
    'GLOBAL', 1400010,
    '2026-03-14', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (region_code) DO NOTHING;

COMMIT;

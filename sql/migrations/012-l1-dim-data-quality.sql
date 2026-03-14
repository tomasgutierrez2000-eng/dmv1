-- Migration 012: L1 Dimension Data Quality Fixes
-- Meridian National Bancorp — GSIB Credit Risk Data Model
-- Fixes placeholder/incorrect seed data in 5 L1 dimension tables
-- Safe: all DELETEs target unreferenced rows; all UPDATEs preserve existing PKs

BEGIN;

-- ============================================================================
-- FIX 1: l1.internal_risk_rating_bucket_dim
-- Remove 10 auto-generated placeholder rows (codes 'internal_risk_rating_bucket_dim_1' .. '_10')
-- Update codes 1-10 to proper GSIB 10-point internal risk rating scale
-- Note: codes '1'-'10' are referenced by ~1,962 rows in l2.facility_exposure_snapshot
-- ============================================================================

DELETE FROM l1.internal_risk_rating_bucket_dim
WHERE internal_risk_rating_bucket_code LIKE 'internal_risk_rating_bucket_dim_%';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Exceptional',
    rating_score_min = 1,
    rating_score_max = 2,
    display_order    = 1,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '1';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Strong',
    rating_score_min = 3,
    rating_score_max = 4,
    display_order    = 2,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '2';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Good',
    rating_score_min = 5,
    rating_score_max = 6,
    display_order    = 3,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '3';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Satisfactory',
    rating_score_min = 7,
    rating_score_max = 8,
    display_order    = 4,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '4';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Adequate',
    rating_score_min = 9,
    rating_score_max = 10,
    display_order    = 5,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '5';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Watch',
    rating_score_min = 11,
    rating_score_max = 12,
    display_order    = 6,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '6';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Special Mention',
    rating_score_min = 13,
    rating_score_max = 14,
    display_order    = 7,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '7';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Substandard',
    rating_score_min = 15,
    rating_score_max = 16,
    display_order    = 8,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '8';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Doubtful',
    rating_score_min = 17,
    rating_score_max = 18,
    display_order    = 9,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '9';

UPDATE l1.internal_risk_rating_bucket_dim SET
    bucket_name      = 'Loss',
    rating_score_min = 19,
    rating_score_max = 20,
    display_order    = 10,
    is_active_flag   = true,
    updated_ts       = CURRENT_TIMESTAMP,
    created_by       = 'SYSTEM',
    record_source    = 'MDM',
    load_batch_id    = 'GSIB-INIT-001'
WHERE internal_risk_rating_bucket_code = '10';


-- ============================================================================
-- FIX 2: l1.origination_date_bucket_dim
-- Delete 4 broken rows ('0-3M','4-12M','1-5Y','>5Y') with wrong min/max values
-- Keep 5 correct rows ('0-12M','12-36M','36-60M','60-120M','120M+')
-- Standardize audit fields on kept rows
-- Note: l3.facility_detail_snapshot FK exists but has 0 rows referencing this table
-- ============================================================================

DELETE FROM l1.origination_date_bucket_dim
WHERE origination_bucket_code IN ('0-3M', '4-12M', '1-5Y', '>5Y');

UPDATE l1.origination_date_bucket_dim SET
    updated_ts    = CURRENT_TIMESTAMP,
    created_by    = 'SYSTEM',
    record_source = 'MDM',
    load_batch_id = 'GSIB-INIT-001'
WHERE origination_bucket_code IN ('0-12M', '12-36M', '36-60M', '60-120M', '120M+');


-- ============================================================================
-- FIX 3: l1.credit_status_dim
-- Codes 1,2,6,7,8 all say 'PERFORMING' — fix codes 2,6,7,8 to distinct OCC-aligned names
-- Code 1 stays PERFORMING; codes 3,4,5,9,10 are already correct
-- L2.facility_delinquency_snapshot uses codes 1,3,4,5 — safe to update 2,6,7,8
-- Standardize audit fields on all 10 rows
-- ============================================================================

-- Code 2: distinguish from code 1 as strong performing
UPDATE l1.credit_status_dim SET
    credit_status_name = 'PERFORMING_STRONG',
    is_default_flag    = false,
    delinquency_bucket = 'CURRENT',
    status_category    = 'PASS',
    updated_ts         = CURRENT_TIMESTAMP,
    created_by         = 'SYSTEM',
    record_source      = 'OCC_CLASSIFICATION',
    load_batch_id      = 'GSIB-INIT-001'
WHERE credit_status_code = '2';

-- Code 6: non-accrual (non-performing but not yet default)
UPDATE l1.credit_status_dim SET
    credit_status_name = 'NON_ACCRUAL',
    is_default_flag    = false,
    delinquency_bucket = '90-119_DPD',
    status_category    = 'NON_PERFORMING',
    updated_ts         = CURRENT_TIMESTAMP,
    created_by         = 'SYSTEM',
    record_source      = 'OCC_CLASSIFICATION',
    load_batch_id      = 'GSIB-INIT-001'
WHERE credit_status_code = '6';

-- Code 7: troubled debt restructuring
UPDATE l1.credit_status_dim SET
    credit_status_name = 'RESTRUCTURED',
    is_default_flag    = false,
    delinquency_bucket = 'TDR',
    status_category    = 'NON_PERFORMING',
    updated_ts         = CURRENT_TIMESTAMP,
    created_by         = 'SYSTEM',
    record_source      = 'OCC_CLASSIFICATION',
    load_batch_id      = 'GSIB-INIT-001'
WHERE credit_status_code = '7';

-- Code 8: partial charge-off
UPDATE l1.credit_status_dim SET
    credit_status_name = 'CHARGED_OFF',
    is_default_flag    = true,
    delinquency_bucket = 'CHARGED_OFF',
    status_category    = 'NON_PERFORMING',
    updated_ts         = CURRENT_TIMESTAMP,
    created_by         = 'SYSTEM',
    record_source      = 'OCC_CLASSIFICATION',
    load_batch_id      = 'GSIB-INIT-001'
WHERE credit_status_code = '8';

-- Standardize audit fields on remaining rows (1, 3, 4, 5, 9, 10)
UPDATE l1.credit_status_dim SET
    updated_ts    = CURRENT_TIMESTAMP,
    created_by    = 'SYSTEM',
    record_source = 'OCC_CLASSIFICATION',
    load_batch_id = 'GSIB-INIT-001'
WHERE credit_status_code IN ('1', '3', '4', '5', '9', '10');


-- ============================================================================
-- FIX 4: l1.instrument_identifier
-- Rows 11-50 have effective_end_date BEFORE effective_start_date (date inversion)
-- Fix: set effective_end_date = effective_start_date + 1 year
-- Then set is_current_flag based on whether end_date >= today
-- Standardize audit fields on all 50 rows
-- ============================================================================

-- Step 1: fix inverted dates (only where end < start)
UPDATE l1.instrument_identifier SET
    effective_end_date = effective_start_date + INTERVAL '1 year',
    updated_ts         = CURRENT_TIMESTAMP
WHERE effective_end_date < effective_start_date;

-- Step 2: set is_current_flag based on effective_end_date vs today
UPDATE l1.instrument_identifier SET
    is_current_flag = CASE
        WHEN effective_end_date >= CURRENT_DATE THEN true
        ELSE false
    END,
    updated_ts = CURRENT_TIMESTAMP;

-- Step 3: standardize audit fields on all rows
UPDATE l1.instrument_identifier SET
    created_by    = 'SYSTEM',
    record_source = 'INSTRUMENT_SVC',
    load_batch_id = 'GSIB-INIT-001',
    updated_ts    = CURRENT_TIMESTAMP;


-- ============================================================================
-- FIX 5: l1.pricing_tier_dim
-- Delete 10 auto-generated placeholder rows ('pricing_tier_dim_1' .. '_10')
-- Insert 10 real GSIB pricing tiers with spread ranges (bps)
-- Note: l2.counterparty has FK to this table but all values are currently NULL
-- ============================================================================

DELETE FROM l1.pricing_tier_dim
WHERE pricing_tier_code LIKE 'pricing_tier_dim_%';

INSERT INTO l1.pricing_tier_dim (
    pricing_tier_code, tier_name, tier_ordinal, display_order,
    is_active_flag, spread_min_bps, spread_max_bps,
    updated_ts, created_ts, created_by, record_source, load_batch_id
) VALUES
    ('AAA_AA',    'Investment Grade Prime (AAA-AA)', 1,  1,  true,   25,   75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('A',         'Investment Grade Upper (A)',      2,  2,  true,   75,  125, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('BBB_PLUS',  'Investment Grade (BBB+)',         3,  3,  true,  125,  175, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('BBB',       'Investment Grade (BBB)',          4,  4,  true,  175,  225, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('BBB_MINUS', 'Investment Grade Low (BBB-)',     5,  5,  true,  225,  300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('BB_PLUS',   'Crossover (BB+)',                 6,  6,  true,  300,  400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('BB',        'High Yield (BB)',                 7,  7,  true,  400,  525, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('B',         'High Yield (B)',                  8,  8,  true,  525,  750, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('CCC',       'Distressed (CCC)',                9,  9,  true,  750, 1200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001'),
    ('DEFAULT',   'Default/Workout',                10, 10,  true, 1200, 2500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'PRICING_DESK', 'GSIB-INIT-001');

COMMIT;

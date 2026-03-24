-- Migration 036: Fix facility_type_dim CCF compliance + nullable FK
-- Addresses two issues from eng review outside voice:
-- 1. LETTER_OF_CREDIT conflates commercial LC (20%) with SBLC (100%)
-- 2. facility_type_id on facility_master is nullable — allows silent NULL corruption

SET search_path TO l1, l2, public;

-- ── 1. Split LETTER_OF_CREDIT into COMM_LC (20%) and SBLC (100%) ────────────
-- Per CLAUDE.md Basel III Exposure Type Rules (CRE 20.93):
--   Financial guarantees (GUAR, SBLC): 100%
--   Commercial letters of credit (COMM_LC): 20%

-- Rename existing LETTER_OF_CREDIT to COMM_LC (preserves the 20% CCF)
UPDATE l1.facility_type_dim
SET facility_type_code = 'COMM_LC',
    facility_type_name = 'Commercial Letter of Credit',
    description = 'Commercial letter of credit for trade finance — 20% CCF per CRE 20.93',
    updated_ts = CURRENT_TIMESTAMP
WHERE facility_type_code = 'LETTER_OF_CREDIT';

-- Add SBLC as a new row with 100% CCF (financial guarantee equivalent)
INSERT INTO l1.facility_type_dim
    (facility_type_code, facility_type_name, description,
     is_off_balance_sheet_flag, regulatory_ccf_pct, product_category, is_revolving_flag,
     created_by, record_source)
VALUES
    ('SBLC', 'Standby Letter of Credit', 'Standby LC / financial guarantee — 100% CCF per CRE 20.93',
     TRUE, 100.000000, 'GUARANTEE', FALSE, 'migration-036', 'Basel III CRE 20.93')
ON CONFLICT (facility_type_code) DO NOTHING;

-- Update facility_master: remap old LETTER_OF_CREDIT references to COMM_LC
-- (The FK references facility_type_id which didn't change, so no UPDATE needed
--  on facility_master — the dim row was updated in place.)

-- ── 2. Add UNKNOWN type for NOT NULL default ────────────────────────────────
INSERT INTO l1.facility_type_dim
    (facility_type_code, facility_type_name, description,
     is_off_balance_sheet_flag, regulatory_ccf_pct, product_category, is_revolving_flag,
     is_active_flag, created_by, record_source)
VALUES
    ('UNKNOWN', 'Unknown Facility Type', 'Default type for facilities without explicit classification — conservative 40% CCF assumed',
     TRUE, 40.000000, 'COMMITMENT', FALSE, FALSE, 'migration-036', 'Data Quality Default')
ON CONFLICT (facility_type_code) DO NOTHING;

-- ── 3. Make facility_type_id NOT NULL with default ──────────────────────────
-- First set any remaining NULLs to UNKNOWN
UPDATE l2.facility_master
SET facility_type_id = (SELECT facility_type_id FROM l1.facility_type_dim WHERE facility_type_code = 'UNKNOWN')
WHERE facility_type_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE l2.facility_master
    ALTER COLUMN facility_type_id SET NOT NULL;

-- Set default for future inserts (PG doesn't allow subquery in DEFAULT —
-- use DO block to fetch the ID and apply it dynamically)
DO $$
DECLARE
    unknown_id BIGINT;
BEGIN
    SELECT facility_type_id INTO unknown_id
    FROM l1.facility_type_dim WHERE facility_type_code = 'UNKNOWN';
    EXECUTE format('ALTER TABLE l2.facility_master ALTER COLUMN facility_type_id SET DEFAULT %s', unknown_id);
END $$;

-- ── 4. Verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
    sblc_count INTEGER;
    comm_lc_count INTEGER;
    unknown_count INTEGER;
    null_fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sblc_count FROM l1.facility_type_dim WHERE facility_type_code = 'SBLC';
    SELECT COUNT(*) INTO comm_lc_count FROM l1.facility_type_dim WHERE facility_type_code = 'COMM_LC';
    SELECT COUNT(*) INTO unknown_count FROM l1.facility_type_dim WHERE facility_type_code = 'UNKNOWN';
    SELECT COUNT(*) INTO null_fk_count FROM l2.facility_master WHERE facility_type_id IS NULL;

    RAISE NOTICE 'SBLC row: % (expect 1)', sblc_count;
    RAISE NOTICE 'COMM_LC row: % (expect 1)', comm_lc_count;
    RAISE NOTICE 'UNKNOWN row: % (expect 1)', unknown_count;
    RAISE NOTICE 'NULL facility_type_id: % (expect 0)', null_fk_count;

    IF sblc_count != 1 THEN RAISE EXCEPTION 'SBLC row missing'; END IF;
    IF comm_lc_count != 1 THEN RAISE EXCEPTION 'COMM_LC row missing'; END IF;
    IF null_fk_count != 0 THEN RAISE EXCEPTION 'NULL facility_type_id rows remain'; END IF;
END $$;

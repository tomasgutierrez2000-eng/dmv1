-- Migration 005: Medium-Priority Audit Standardization Fixes
-- Date: 2026-03-12
-- Changes:
--   Step 1: Rename effective_from_date → effective_start_date, effective_to_date → effective_end_date (~17 tables)
--   Step 2: Add created_ts/updated_ts to tables missing audit timestamps
--   Step 3: Add is_current_flag to 6 SCD-2 tables missing it
--   Step 4: Standardize _pct precision from NUMERIC(10,4) to NUMERIC(10,6)
--   Step 5: Add 2 self-referential FK constraints (org_unit_dim, enterprise_business_taxonomy)
--   Step 6: Rename is_active_flag → active_flag (10 tables)
--   Step 7: Rename exposure_at_default → ead_amt on credit_event_facility_link

SET client_min_messages TO WARNING;
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- STEP 1: Rename effective_from_date → effective_start_date
--         Rename effective_to_date → effective_end_date
-- Must run first — Step 3 backfill depends on consistent column names
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    -- Rename effective_from_date → effective_start_date
    -- Skip if table already has effective_start_date (avoid duplicate column error)
    FOR rec IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'effective_from_date'
        AND c.table_schema IN ('l1', 'l2', 'l3')
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c2
            WHERE c2.table_schema = c.table_schema
            AND c2.table_name = c.table_name
            AND c2.column_name = 'effective_start_date'
        )
        ORDER BY c.table_schema, c.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN effective_from_date TO effective_start_date',
            rec.table_schema, rec.table_name);
        cnt := cnt + 1;
    END LOOP;

    -- Rename effective_to_date → effective_end_date
    -- Skip if table already has effective_end_date
    FOR rec IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'effective_to_date'
        AND c.table_schema IN ('l1', 'l2', 'l3')
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c2
            WHERE c2.table_schema = c.table_schema
            AND c2.table_name = c.table_name
            AND c2.column_name = 'effective_end_date'
        )
        ORDER BY c.table_schema, c.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN effective_to_date TO effective_end_date',
            rec.table_schema, rec.table_name);
    END LOOP;
    RAISE NOTICE 'Step 1: Renamed effective_from/to_date on % tables to effective_start/end_date', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 2: Add created_ts and updated_ts to tables missing them
-- Dynamic: catches any table in l1/l2/l3 missing audit timestamps
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema IN ('l1', 'l2', 'l3')
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema
            AND c.table_name = t.table_name
            AND c.column_name = 'created_ts'
        )
        ORDER BY t.table_schema, t.table_name
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            rec.table_schema, rec.table_name);
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            rec.table_schema, rec.table_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 2: Added created_ts/updated_ts to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 3: Add is_current_flag to SCD-2 tables that have
--         effective_start_date/effective_end_date but lack is_current_flag
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema IN ('l1', 'l2', 'l3')
        AND t.table_type = 'BASE TABLE'
        -- Has effective_start_date or effective_end_date
        AND EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema
            AND c.table_name = t.table_name
            AND c.column_name IN ('effective_start_date', 'effective_end_date')
        )
        -- But lacks is_current_flag
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema
            AND c.table_name = t.table_name
            AND c.column_name = 'is_current_flag'
        )
        ORDER BY t.table_schema, t.table_name
    LOOP
        -- Add the column
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN is_current_flag BOOLEAN DEFAULT TRUE',
            rec.table_schema, rec.table_name);

        -- Backfill based on effective_end_date
        BEGIN
            EXECUTE format(
                'UPDATE %I.%I SET is_current_flag = (effective_end_date IS NULL OR effective_end_date >= CURRENT_DATE) WHERE is_current_flag IS NULL OR is_current_flag = TRUE',
                rec.table_schema, rec.table_name);
        EXCEPTION WHEN undefined_column THEN
            -- Table has effective_start_date but no effective_end_date — leave as TRUE
            NULL;
        END;

        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 3: Added is_current_flag to % SCD-2 tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 4: Standardize _pct precision from NUMERIC(10,4) → NUMERIC(10,6)
-- Safe widening — no data loss
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE column_name LIKE '%\_pct' ESCAPE '\'
        AND data_type = 'numeric'
        AND numeric_precision = 10
        AND numeric_scale = 4
        AND table_schema IN ('l1', 'l2', 'l3')
        ORDER BY table_schema, table_name, column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE NUMERIC(10,6)',
            rec.table_schema, rec.table_name, rec.column_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 4: Widened % _pct columns from NUMERIC(10,4) to NUMERIC(10,6)', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 5: Add self-referential FK constraints
-- Pre-clean orphan parent references, then add FKs
-----------------------------------------------------------------------

-- 5a: org_unit_dim.parent_org_unit_id → org_unit_dim.org_unit_id
DO $$
BEGIN
    -- Clean orphan parents
    UPDATE l1.org_unit_dim SET parent_org_unit_id = NULL
    WHERE parent_org_unit_id IS NOT NULL
    AND parent_org_unit_id NOT IN (SELECT org_unit_id FROM l1.org_unit_dim);

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_org_unit_parent'
        AND table_schema = 'l1'
    ) THEN
        ALTER TABLE l1.org_unit_dim
            ADD CONSTRAINT fk_org_unit_parent
            FOREIGN KEY (parent_org_unit_id)
            REFERENCES l1.org_unit_dim(org_unit_id);
        RAISE NOTICE 'Step 5a: Added self-referential FK on org_unit_dim';
    ELSE
        RAISE NOTICE 'Step 5a: FK fk_org_unit_parent already exists — skipped';
    END IF;
END $$;

-- 5b: enterprise_business_taxonomy.parent_segment_id → managed_segment_id
DO $$
BEGIN
    -- Clean orphan parents
    UPDATE l1.enterprise_business_taxonomy SET parent_segment_id = NULL
    WHERE parent_segment_id IS NOT NULL
    AND parent_segment_id NOT IN (SELECT managed_segment_id FROM l1.enterprise_business_taxonomy);

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ebt_parent_segment'
        AND table_schema = 'l1'
    ) THEN
        ALTER TABLE l1.enterprise_business_taxonomy
            ADD CONSTRAINT fk_ebt_parent_segment
            FOREIGN KEY (parent_segment_id)
            REFERENCES l1.enterprise_business_taxonomy(managed_segment_id);
        RAISE NOTICE 'Step 5b: Added self-referential FK on enterprise_business_taxonomy';
    ELSE
        RAISE NOTICE 'Step 5b: FK fk_ebt_parent_segment already exists — skipped';
    END IF;
END $$;

-----------------------------------------------------------------------
-- STEP 6: Rename is_active_flag → active_flag (standardize to majority)
-- 10 tables use is_active_flag; 39 use active_flag
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name = 'is_active_flag'
        AND table_schema IN ('l1', 'l2', 'l3')
        ORDER BY table_schema, table_name
    LOOP
        EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN is_active_flag TO active_flag',
            rec.table_schema, rec.table_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 6: Renamed is_active_flag → active_flag on % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 7: Rename exposure_at_default → ead_amt on credit_event_facility_link
-- Also widen precision to match _amt convention NUMERIC(20,4)
-----------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2'
        AND table_name = 'credit_event_facility_link'
        AND column_name = 'exposure_at_default'
    ) THEN
        ALTER TABLE l2.credit_event_facility_link
            RENAME COLUMN exposure_at_default TO ead_amt;
        ALTER TABLE l2.credit_event_facility_link
            ALTER COLUMN ead_amt TYPE NUMERIC(20,4);
        RAISE NOTICE 'Step 7: Renamed exposure_at_default → ead_amt on credit_event_facility_link';
    ELSE
        RAISE NOTICE 'Step 7: exposure_at_default not found — already renamed or missing';
    END IF;
END $$;

-- Migration 016: Complete L1 SCD-2 Temporal Fields (BCBS 239)
-- Migration 011a added effective_start_date, effective_end_date, is_current_flag
-- to 38 SCD-1 L1 tables. This migration covers ALL remaining L1 tables
-- (SCD-0 fixed dims) so that 100% of L1 tables have temporal tracking
-- for BCBS 239 Principle 3 (Accuracy & Integrity) compliance.
--
-- All operations are idempotent (IF NOT EXISTS guards). Safe to re-run.

SET client_min_messages TO NOTICE;

-----------------------------------------------------------------------
-- SECTION 1: Add effective_start_date to all L1 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l1'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'effective_start_date'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS effective_start_date DATE DEFAULT CURRENT_DATE',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 1: Added effective_start_date to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 1 complete: Added effective_start_date to % L1 tables', cnt;
END $$;

-----------------------------------------------------------------------
-- SECTION 2: Add effective_end_date to all L1 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l1'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'effective_end_date'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS effective_end_date DATE',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 2: Added effective_end_date to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 2 complete: Added effective_end_date to % L1 tables', cnt;
END $$;

-----------------------------------------------------------------------
-- SECTION 3: Add is_current_flag to all L1 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l1'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'is_current_flag'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS is_current_flag BOOLEAN DEFAULT TRUE',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 3: Added is_current_flag to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 3 complete: Added is_current_flag to % L1 tables', cnt;
END $$;

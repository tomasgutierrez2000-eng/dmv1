-- Migration 001: Apply database audit fixes
-- Fixes: is_* rename, _flag CHAR→BOOLEAN, _code BIGINT→VARCHAR, L3 _id→BIGINT, L3 PKs, L2 duplicates
-- Generated from comprehensive PostgreSQL audit

SET client_min_messages TO WARNING;

-----------------------------------------------------------------------
-- STEP 1: Rename is_* columns → is_*_flag + convert to BOOLEAN
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    new_name TEXT;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE column_name ~ '^is_[a-z]'
        AND column_name NOT LIKE '%_flag'
        AND column_name NOT LIKE 'iso%'
        AND column_name NOT LIKE 'issue%'
        AND column_name NOT LIKE 'issuer%'
        AND table_schema IN ('l1', 'l2', 'l3')
        ORDER BY table_schema, table_name, column_name
    LOOP
        new_name := rec.column_name || '_flag';
        -- Rename column
        EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
            rec.table_schema, rec.table_name, rec.column_name, new_name);
        -- Convert to BOOLEAN
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE BOOLEAN USING CASE WHEN %I = ''Y'' THEN TRUE WHEN %I = ''N'' THEN FALSE ELSE NULL END',
            rec.table_schema, rec.table_name, new_name, new_name, new_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 1: Renamed and converted % is_* columns to is_*_flag BOOLEAN', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 2: Convert _flag CHAR(1) → BOOLEAN
-- Skip trading_banking_book_flag (contains 'B', not a boolean)
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE column_name LIKE '%_flag'
        AND data_type IN ('character', 'character varying')
        AND table_schema IN ('l1', 'l2', 'l3')
        AND column_name != 'trading_banking_book_flag'
        ORDER BY table_schema, table_name, column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE BOOLEAN USING CASE WHEN %I = ''Y'' THEN TRUE WHEN %I = ''N'' THEN FALSE ELSE NULL END',
            rec.table_schema, rec.table_name, rec.column_name, rec.column_name, rec.column_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 2: Converted % _flag columns from CHAR(1) to BOOLEAN', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 3: Convert _code BIGINT → VARCHAR(30)
-- No FK constraints to drop (verified by audit)
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE column_name LIKE '%_code'
        AND data_type = 'bigint'
        AND table_schema IN ('l1', 'l2', 'l3')
        ORDER BY table_schema, table_name, column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE VARCHAR(30) USING %I::VARCHAR(30)',
            rec.table_schema, rec.table_name, rec.column_name, rec.column_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 3: Converted % _code columns from BIGINT to VARCHAR(30)', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 4: Clean up L3 metric_value_fact data before type changes
-- facility_id and counterparty_id have float-formatted values like "97.0"
-----------------------------------------------------------------------
DO $$
DECLARE
    cnt_fac INTEGER;
    cnt_cp INTEGER;
BEGIN
    -- Strip .0 from facility_id
    UPDATE l3.metric_value_fact
    SET facility_id = regexp_replace(facility_id, '\.0$', '')
    WHERE facility_id ~ '\.\d+$';
    GET DIAGNOSTICS cnt_fac = ROW_COUNT;

    -- Strip .0 from counterparty_id
    UPDATE l3.metric_value_fact
    SET counterparty_id = regexp_replace(counterparty_id, '\.0$', '')
    WHERE counterparty_id ~ '\.\d+$';
    GET DIAGNOSTICS cnt_cp = ROW_COUNT;

    RAISE NOTICE 'Step 4: Cleaned % facility_id and % counterparty_id values in metric_value_fact', cnt_fac, cnt_cp;
END $$;

-----------------------------------------------------------------------
-- STEP 5: Convert L3 _id VARCHAR(64) → BIGINT
-- Exceptions: metric_id, variant_id, source_metric_id, mdrm_id,
--   mapped_line_id, mapped_column_id, run_id,
--   run_version_id, scenario_id, rule_id (contain non-numeric strings)
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
    err_cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE column_name LIKE '%_id'
        AND data_type = 'character varying'
        AND table_schema = 'l3'
        AND column_name NOT IN (
            'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
            'mapped_line_id', 'mapped_column_id', 'run_id',
            'run_version_id', 'scenario_id', 'rule_id'
        )
        ORDER BY table_name, column_name
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ALTER COLUMN %I TYPE BIGINT USING NULLIF(%I, '''')::BIGINT',
                rec.table_schema, rec.table_name, rec.column_name, rec.column_name);
            cnt := cnt + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'SKIPPED l3.%.% - %', rec.table_name, rec.column_name, SQLERRM;
            err_cnt := err_cnt + 1;
        END;
    END LOOP;
    RAISE NOTICE 'Step 5: Converted % L3 _id columns to BIGINT (% skipped)', cnt, err_cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 6: Add surrogate PKs to L3 tables that lack PKs
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    sk_name TEXT;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_name
        FROM information_schema.tables t
        LEFT JOIN information_schema.table_constraints tc
            ON t.table_name = tc.table_name
            AND t.table_schema = tc.table_schema
            AND tc.constraint_type = 'PRIMARY KEY'
        WHERE t.table_schema = 'l3'
        AND t.table_type = 'BASE TABLE'
        AND tc.constraint_name IS NULL
        ORDER BY t.table_name
    LOOP
        sk_name := rec.table_name || '_sk';
        -- Add BIGSERIAL surrogate key column
        EXECUTE format(
            'ALTER TABLE l3.%I ADD COLUMN %I BIGSERIAL NOT NULL',
            rec.table_name, sk_name);
        -- Add PK constraint
        EXECUTE format(
            'ALTER TABLE l3.%I ADD PRIMARY KEY (%I)',
            rec.table_name, sk_name);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE 'Step 6: Added surrogate PKs to % L3 tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 7: Drop L2 duplicate/misplaced tables
-----------------------------------------------------------------------
DO $$
BEGIN
    -- metric_threshold in L2 is a duplicate of L1 (reference data)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'l2' AND table_name = 'metric_threshold') THEN
        DROP TABLE l2.metric_threshold;
        RAISE NOTICE 'Step 7: Dropped l2.metric_threshold (duplicate of l1)';
    END IF;

    -- data_quality_score_snapshot is derived data → belongs in L3
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'l2' AND table_name = 'data_quality_score_snapshot') THEN
        DROP TABLE l2.data_quality_score_snapshot;
        RAISE NOTICE 'Step 7: Dropped l2.data_quality_score_snapshot (derived → L3)';
    END IF;

    -- stress_test_result is derived data → belongs in L3
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'l2' AND table_name = 'stress_test_result') THEN
        DROP TABLE l2.stress_test_result;
        RAISE NOTICE 'Step 7: Dropped l2.stress_test_result (derived → L3)';
    END IF;
END $$;

-----------------------------------------------------------------------
-- STEP 8: Fix trading_banking_book_flag — rename to trading_banking_book_code
-- since it contains 'B'/'T' codes, not boolean Y/N
-----------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l2' AND table_name = 'position'
        AND column_name = 'trading_banking_book_flag'
    ) THEN
        ALTER TABLE l2.position RENAME COLUMN trading_banking_book_flag TO trading_banking_book_code;
        ALTER TABLE l2.position ALTER COLUMN trading_banking_book_code TYPE VARCHAR(30)
            USING trading_banking_book_code::VARCHAR(30);
        RAISE NOTICE 'Step 8: Renamed trading_banking_book_flag → trading_banking_book_code VARCHAR(30)';
    END IF;
END $$;

-- Done
DO $$ BEGIN RAISE NOTICE 'Migration 001 complete.'; END $$;

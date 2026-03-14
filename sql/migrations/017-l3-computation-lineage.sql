-- Migration 017: L3 Computation Lineage Fields (BCBS 239)
-- Adds run_id and model_version to all L3 derived tables for
-- full computation provenance tracking per BCBS 239 Principle 2
-- (Data Architecture & IT Infrastructure).
--
-- run_id is VARCHAR(64) to match l3.calc_run.run_id type.
-- FK constraint NOT added here — will be added in a follow-up
-- migration after the calculation engine populates run_id on writes.
--
-- 4 tables already have run_id: calc_audit_log, calc_run,
-- calc_validation_result, metric_result. These are skipped automatically
-- by the NOT EXISTS guard.
--
-- All operations are idempotent. Safe to re-run.

SET client_min_messages TO NOTICE;
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- SECTION 1: Add run_id VARCHAR(64) to L3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l3'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'run_id'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS run_id VARCHAR(64)',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 1: Added run_id to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 1 complete: Added run_id to % L3 tables', cnt;
END $$;

-----------------------------------------------------------------------
-- SECTION 2: Add model_version VARCHAR(64) to L3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l3'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'model_version'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS model_version VARCHAR(64)',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 2: Added model_version to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 2 complete: Added model_version to % L3 tables', cnt;
END $$;

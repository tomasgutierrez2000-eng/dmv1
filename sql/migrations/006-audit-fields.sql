-- Migration 006: Add audit/lineage fields to all tables
-- Adds updated_ts, created_ts, created_by, record_source to all L1/L2/L3 tables.
-- Adds load_timestamp to L2+L3 tables.
-- Adds record_hash to L2 snapshot/observation tables.
-- Part of GSIB Audit Remediation — data lineage and auditability gaps.

SET client_min_messages TO WARNING;

-----------------------------------------------------------------------
-- STEP 1: Add updated_ts to all l1/l2/l3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema IN ('l1','l2','l3') AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'updated_ts'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 1: Added updated_ts to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 2: Add created_ts to all l1/l2/l3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema IN ('l1','l2','l3') AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'created_ts'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 2: Added created_ts to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 3: Add created_by to all l1/l2/l3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema IN ('l1','l2','l3') AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'created_by'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(100)', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 3: Added created_by to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 4: Add record_source to ALL l1/l2/l3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema IN ('l1','l2','l3') AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'record_source'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "record_source" VARCHAR(100)', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 4: Added record_source to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 5: Add load_timestamp to l2+l3 tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema IN ('l2','l3') AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'load_timestamp'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "load_timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 5: Added load_timestamp to % tables', cnt;
END $$;

-----------------------------------------------------------------------
-- STEP 6: Add record_hash to l2 snapshot/observation tables missing it
-----------------------------------------------------------------------
DO $$
DECLARE rec RECORD; cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'l2' AND t.table_type = 'BASE TABLE'
    AND (t.table_name LIKE '%_snapshot' OR t.table_name LIKE '%_observation')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      AND c.column_name = 'record_hash'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS "record_hash" VARCHAR(64)', rec.table_schema, rec.table_name);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Step 6: Added record_hash to % L2 snapshot/observation tables', cnt;
END $$;

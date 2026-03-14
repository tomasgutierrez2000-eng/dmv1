-- ============================================================================
-- Migration 011d: Flag Column Renames + Calendar Naming Fix
-- ============================================================================
-- Findings addressed:
--   F6: 102 boolean *_flag columns across 71 tables missing the 'is_' prefix
--       per naming convention. Renames e.g. active_flag → is_active_flag.
--   F7: reporting_calendar_dim has DATE-typed fields without _date suffix:
--       fiscal_quarter → fiscal_quarter_date, fiscal_year → fiscal_year_date.
--
-- This migration runs AFTER 011a/b/c (Phase 1 additive changes).
-- All operations are idempotent: skips if column already renamed.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Section 1: Rename reporting_calendar_dim columns (Finding 7)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'l1' AND table_name = 'reporting_calendar_dim'
    AND column_name = 'fiscal_quarter'
  ) THEN
    ALTER TABLE l1.reporting_calendar_dim RENAME COLUMN fiscal_quarter TO fiscal_quarter_date;
    RAISE NOTICE 'Renamed l1.reporting_calendar_dim.fiscal_quarter → fiscal_quarter_date';
  ELSE
    RAISE NOTICE 'Skipped: l1.reporting_calendar_dim.fiscal_quarter already renamed or missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'l1' AND table_name = 'reporting_calendar_dim'
    AND column_name = 'fiscal_year'
  ) THEN
    ALTER TABLE l1.reporting_calendar_dim RENAME COLUMN fiscal_year TO fiscal_year_date;
    RAISE NOTICE 'Renamed l1.reporting_calendar_dim.fiscal_year → fiscal_year_date';
  ELSE
    RAISE NOTICE 'Skipped: l1.reporting_calendar_dim.fiscal_year already renamed or missing';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Section 2: Rename *_flag columns to is_*_flag (Finding 6)
-- ────────────────────────────────────────────────────────────────────────────
-- Renames all boolean flag columns that do NOT already start with 'is_'.
-- Examples: active_flag → is_active_flag, eligible_flag → is_eligible_flag,
--           default_flag → is_default_flag, etc.
-- Excludes columns that already have the is_ prefix (is_current_flag, etc.)
DO $$
DECLARE
  rec RECORD;
  new_name TEXT;
  cnt INTEGER := 0;
  skip_cnt INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE column_name LIKE '%\_flag' ESCAPE '\'
    AND column_name NOT LIKE 'is\_%' ESCAPE '\'
    AND table_schema IN ('l1', 'l2', 'l3')
    ORDER BY table_schema, table_name, column_name
  LOOP
    new_name := 'is_' || rec.column_name;

    -- Check if the target name already exists (safety guard)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = rec.table_schema
      AND table_name = rec.table_name
      AND column_name = new_name
    ) THEN
      RAISE NOTICE 'SKIP %.%.%: target % already exists',
        rec.table_schema, rec.table_name, rec.column_name, new_name;
      skip_cnt := skip_cnt + 1;
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
        rec.table_schema, rec.table_name, rec.column_name, new_name);
      cnt := cnt + 1;
      RAISE NOTICE 'Renamed %.%.% → %',
        rec.table_schema, rec.table_name, rec.column_name, new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR renaming %.%.%: %',
        rec.table_schema, rec.table_name, rec.column_name, SQLERRM;
      skip_cnt := skip_cnt + 1;
    END;
  END LOOP;

  RAISE NOTICE '── Flag rename complete: % renamed, % skipped ──', cnt, skip_cnt;
END $$;

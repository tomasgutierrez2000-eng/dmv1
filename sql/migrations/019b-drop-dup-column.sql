-- Migration 019b: Deduplicate equity_allocation_pct in l2.facility_profitability_snapshot
-- Finding: F-2.2 (CRITICAL) — column appears twice in DDL, PostgreSQL rejects duplicate columns
-- Remediation: GSIB Data Model Audit 2026-03
--
-- The DDL generator produced the column twice; the live DB may have only one instance.
-- This migration is a no-op guard: it verifies the column exists once.

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT count(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'l2'
    AND table_name = 'facility_profitability_snapshot'
    AND column_name = 'equity_allocation_pct';

  IF col_count = 1 THEN
    RAISE NOTICE 'equity_allocation_pct: single instance confirmed — OK';
  ELSIF col_count = 0 THEN
    RAISE WARNING 'equity_allocation_pct: column missing — add via ALTER TABLE';
    ALTER TABLE l2.facility_profitability_snapshot
      ADD COLUMN equity_allocation_pct NUMERIC(10,6);
  ELSE
    RAISE WARNING 'equity_allocation_pct: % instances found — investigate manually', col_count;
  END IF;
END $$;

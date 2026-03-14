-- Migration 019c: Resolve cross-layer table name collisions
-- Finding: F-1.3 (CRITICAL) — 3 table names collide across schemas
-- Remediation: GSIB Data Model Audit 2026-03
--
-- Renames:
--   l3.stress_test_result       → l3.stress_test_result_calc
--   l3.data_quality_score_snapshot → l3.data_quality_score_calc
--   l2.metric_threshold         → l2.metric_threshold_snapshot

SET search_path TO l1, l2, l3, public;

-- 1. l3.stress_test_result → l3.stress_test_result_calc
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l3' AND table_name = 'stress_test_result'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l3' AND table_name = 'stress_test_result_calc'
  ) THEN
    ALTER TABLE l3.stress_test_result RENAME TO stress_test_result_calc;
    RAISE NOTICE 'Renamed l3.stress_test_result → stress_test_result_calc';
  ELSE
    RAISE NOTICE 'Skipped l3.stress_test_result rename (already done or source missing)';
  END IF;
END $$;

-- 2. l3.data_quality_score_snapshot → l3.data_quality_score_calc
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l3' AND table_name = 'data_quality_score_snapshot'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l3' AND table_name = 'data_quality_score_calc'
  ) THEN
    ALTER TABLE l3.data_quality_score_snapshot RENAME TO data_quality_score_calc;
    RAISE NOTICE 'Renamed l3.data_quality_score_snapshot → data_quality_score_calc';
  ELSE
    RAISE NOTICE 'Skipped l3.data_quality_score_snapshot rename (already done or source missing)';
  END IF;
END $$;

-- 3. l2.metric_threshold → l2.metric_threshold_snapshot
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l2' AND table_name = 'metric_threshold'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'l2' AND table_name = 'metric_threshold_snapshot'
  ) THEN
    ALTER TABLE l2.metric_threshold RENAME TO metric_threshold_snapshot;
    RAISE NOTICE 'Renamed l2.metric_threshold → metric_threshold_snapshot';
  ELSE
    RAISE NOTICE 'Skipped l2.metric_threshold rename (already done or source missing)';
  END IF;
END $$;

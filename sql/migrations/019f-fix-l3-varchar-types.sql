-- Migration 019f: Fix VARCHAR types for numeric fields in L3
-- Finding: F-2.5 (MEDIUM) — VARCHAR used for numeric/boolean fields
-- Remediation: GSIB Data Model Audit 2026-03

SET search_path TO l1, l2, l3, public;

-- limit_tier_status_matrix.counterparty_count_change: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.limit_tier_status_matrix ALTER COLUMN counterparty_count_change TYPE INTEGER USING counterparty_count_change::INTEGER;
  RAISE NOTICE 'Fixed limit_tier_status_matrix.counterparty_count_change → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- limit_tier_status_matrix.risk_score: VARCHAR → NUMERIC(10,4)
DO $$ BEGIN
  ALTER TABLE l3.limit_tier_status_matrix ALTER COLUMN risk_score TYPE NUMERIC(10,4) USING risk_score::NUMERIC(10,4);
  RAISE NOTICE 'Fixed limit_tier_status_matrix.risk_score → NUMERIC(10,4)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- deal_pipeline_stage_summary.avg_expected_coverage_ratio: VARCHAR → NUMERIC(10,6)
DO $$ BEGIN
  ALTER TABLE l3.deal_pipeline_stage_summary ALTER COLUMN avg_expected_coverage_ratio TYPE NUMERIC(10,6) USING avg_expected_coverage_ratio::NUMERIC(10,6);
  RAISE NOTICE 'Fixed deal_pipeline_stage_summary.avg_expected_coverage_ratio → NUMERIC(10,6)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- data_quality_score_summary.total_dq_issues: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.data_quality_score_summary ALTER COLUMN total_dq_issues TYPE INTEGER USING total_dq_issues::INTEGER;
  RAISE NOTICE 'Fixed data_quality_score_summary.total_dq_issues → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- facility_detail_snapshot.days_remaining: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.facility_detail_snapshot ALTER COLUMN days_remaining TYPE INTEGER USING days_remaining::INTEGER;
  RAISE NOTICE 'Fixed facility_detail_snapshot.days_remaining → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- facility_detail_snapshot.facility_duration_days: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.facility_detail_snapshot ALTER COLUMN facility_duration_days TYPE INTEGER USING facility_duration_days::INTEGER;
  RAISE NOTICE 'Fixed facility_detail_snapshot.facility_duration_days → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- facility_detail_snapshot.is_deteriorated: VARCHAR → BOOLEAN
DO $$ BEGIN
  ALTER TABLE l3.facility_detail_snapshot ALTER COLUMN is_deteriorated TYPE BOOLEAN USING (is_deteriorated IN ('true', 'Y', '1', 'yes'));
  RAISE NOTICE 'Fixed facility_detail_snapshot.is_deteriorated → BOOLEAN';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- amendment_detail.amendment_aging_days: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.amendment_detail ALTER COLUMN amendment_aging_days TYPE INTEGER USING amendment_aging_days::INTEGER;
  RAISE NOTICE 'Fixed amendment_detail.amendment_aging_days → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.rank_within_entity: VARCHAR → INTEGER
DO $$ BEGIN
  ALTER TABLE l3.fr2590_counterparty_aggregate ALTER COLUMN rank_within_entity TYPE INTEGER USING rank_within_entity::INTEGER;
  RAISE NOTICE 'Fixed fr2590_counterparty_aggregate.rank_within_entity → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped: %', SQLERRM;
END $$;

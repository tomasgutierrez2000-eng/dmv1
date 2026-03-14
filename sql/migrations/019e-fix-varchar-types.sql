-- Migration 019e: Fix VARCHAR types for numeric estimates in L2
-- Finding: F-2.3 (HIGH) — VARCHAR(100) used for numeric fields
-- Remediation: GSIB Data Model Audit 2026-03

SET search_path TO l1, l2, public;

-- position.pd_estimate: VARCHAR(100) → NUMERIC(10,6)
DO $$ BEGIN
  ALTER TABLE l2.position ALTER COLUMN pd_estimate TYPE NUMERIC(10,6) USING pd_estimate::NUMERIC(10,6);
  RAISE NOTICE 'Fixed position.pd_estimate → NUMERIC(10,6)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped position.pd_estimate: %', SQLERRM;
END $$;

-- position.lgd_estimate: VARCHAR(100) → NUMERIC(10,6)
DO $$ BEGIN
  ALTER TABLE l2.position ALTER COLUMN lgd_estimate TYPE NUMERIC(10,6) USING lgd_estimate::NUMERIC(10,6);
  RAISE NOTICE 'Fixed position.lgd_estimate → NUMERIC(10,6)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped position.lgd_estimate: %', SQLERRM;
END $$;

-- position_detail.pfe: VARCHAR(100) → NUMERIC(20,4)
DO $$ BEGIN
  ALTER TABLE l2.position_detail ALTER COLUMN pfe TYPE NUMERIC(20,4) USING pfe::NUMERIC(20,4);
  RAISE NOTICE 'Fixed position_detail.pfe → NUMERIC(20,4)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped position_detail.pfe: %', SQLERRM;
END $$;

-- position_detail.unrealized_gain_loss: VARCHAR(100) → NUMERIC(20,4)
DO $$ BEGIN
  ALTER TABLE l2.position_detail ALTER COLUMN unrealized_gain_loss TYPE NUMERIC(20,4) USING unrealized_gain_loss::NUMERIC(20,4);
  RAISE NOTICE 'Fixed position_detail.unrealized_gain_loss → NUMERIC(20,4)';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped position_detail.unrealized_gain_loss: %', SQLERRM;
END $$;

-- deal_pipeline_fact.expected_tenor_months: VARCHAR(255) → INTEGER
DO $$ BEGIN
  ALTER TABLE l2.deal_pipeline_fact ALTER COLUMN expected_tenor_months TYPE INTEGER USING expected_tenor_months::INTEGER;
  RAISE NOTICE 'Fixed deal_pipeline_fact.expected_tenor_months → INTEGER';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped deal_pipeline_fact.expected_tenor_months: %', SQLERRM;
END $$;

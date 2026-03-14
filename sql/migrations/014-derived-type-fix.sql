-- Migration 014: Fix run_version_id type in L3 derived tables
-- Changes VARCHAR(64) → BIGINT to match l1.run_control.run_version_id
-- Also adds governance columns (model_version, run_id, created_by, updated_ts)

SET search_path TO l1, l2, l3, public;

-- Phase 1: Type fix — run_version_id VARCHAR(64) → BIGINT
ALTER TABLE l3.facility_derived     ALTER COLUMN run_version_id TYPE BIGINT USING run_version_id::BIGINT;
ALTER TABLE l3.counterparty_derived ALTER COLUMN run_version_id TYPE BIGINT USING run_version_id::BIGINT;
ALTER TABLE l3.desk_derived         ALTER COLUMN run_version_id TYPE BIGINT USING run_version_id::BIGINT;
ALTER TABLE l3.portfolio_derived    ALTER COLUMN run_version_id TYPE BIGINT USING run_version_id::BIGINT;
ALTER TABLE l3.segment_derived      ALTER COLUMN run_version_id TYPE BIGINT USING run_version_id::BIGINT;

-- Phase 2: Add governance columns to derived tables
DO $$ BEGIN ALTER TABLE l3.facility_derived     ADD COLUMN model_version VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.facility_derived     ADD COLUMN run_id VARCHAR(64); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.facility_derived     ADD COLUMN created_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.facility_derived     ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE l3.counterparty_derived ADD COLUMN model_version VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.counterparty_derived ADD COLUMN run_id VARCHAR(64); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.counterparty_derived ADD COLUMN created_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.counterparty_derived ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE l3.desk_derived         ADD COLUMN model_version VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.desk_derived         ADD COLUMN run_id VARCHAR(64); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.desk_derived         ADD COLUMN created_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.desk_derived         ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE l3.portfolio_derived    ADD COLUMN model_version VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.portfolio_derived    ADD COLUMN run_id VARCHAR(64); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.portfolio_derived    ADD COLUMN created_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.portfolio_derived    ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE l3.segment_derived      ADD COLUMN model_version VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.segment_derived      ADD COLUMN run_id VARCHAR(64); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.segment_derived      ADD COLUMN created_by VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE l3.segment_derived      ADD COLUMN updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

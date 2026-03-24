-- Migration 037: Position FK constraints + FFIEC overdue bucket alignment
--
-- 1. Add 5 CRITICAL missing FK constraints on l2.position:
--    counterparty_id, legal_entity_id, ultimate_parent_id,
--    credit_agreement_id, netting_set_id
--
-- 2. Align position_detail overdue buckets to 5-bucket FFIEC standard:
--    Legacy 3-bucket (0-30, 31-60, 61-90+) →
--    FFIEC 5-bucket (current, 1-29, 30-59, 60-89, 90+)
--
-- Idempotent: safe to re-run

SET search_path TO l1, l2, public;

-- =============================================================================
-- Part 1: Missing FK constraints on l2.position
-- =============================================================================

-- CRITICAL: Counterparty FK — required for SCCL, large exposure aggregation
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- CRITICAL: Legal Entity FK — required for entity-level capital, resolution planning
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- CRITICAL: Ultimate Parent FK — required for consolidated SCCL group exposure (Reg YY)
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_ultimate_parent_id"
    FOREIGN KEY ("ultimate_parent_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- HIGH: Credit Agreement FK — required for agreement-level netting and collateral
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- HIGH: Netting Set FK — required for SA-CCR derivatives exposure calculation
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================================
-- Part 2: FFIEC 5-bucket overdue alignment on l2.position_detail
-- =============================================================================
-- Legacy: overdue_amt_0_30, overdue_amt_31_60, overdue_amt_61_90_plus (3 buckets)
-- FFIEC:  current (0 DPD), 1-29 DPD, 30-59 DPD, 60-89 DPD, 90+ DPD (5 buckets)
--
-- Strategy: Add the 5 FFIEC columns, migrate data from legacy columns, keep legacy
-- columns as deprecated (non-breaking change for existing queries).

-- Add FFIEC-standard columns
DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD COLUMN "overdue_amt_current" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD COLUMN "overdue_amt_1_29" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD COLUMN "overdue_amt_30_59" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD COLUMN "overdue_amt_60_89" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD COLUMN "overdue_amt_90_plus" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrate data from legacy 3-bucket to FFIEC 5-bucket (aging model)
-- Each bucket = amount of receivables overdue in that time band.
-- A position at DPD=60 has aged through 0-30 AND 31-60 AND 61-90 bands.
-- DPD determines which bands are populated (cumulative up to current DPD).
UPDATE "l2"."position_detail"
SET
  "overdue_amt_current" = CASE
    WHEN COALESCE("days_past_due", 0) = 0 THEN "overdue_amt_0_30"
    ELSE 0
  END,
  "overdue_amt_1_29" = CASE
    WHEN COALESCE("days_past_due", 0) >= 1 THEN "overdue_amt_0_30"
    ELSE 0
  END,
  "overdue_amt_30_59" = CASE
    WHEN COALESCE("days_past_due", 0) >= 30 THEN "overdue_amt_31_60"
    ELSE 0
  END,
  "overdue_amt_60_89" = CASE
    WHEN COALESCE("days_past_due", 0) >= 60 THEN "overdue_amt_61_90_plus"
    ELSE 0
  END,
  "overdue_amt_90_plus" = CASE
    WHEN COALESCE("days_past_due", 0) >= 90 THEN "overdue_amt_61_90_plus"
    ELSE 0
  END
WHERE "overdue_amt_0_30" IS NOT NULL;

-- Add comments documenting the deprecation
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_0_30"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_current + overdue_amt_1_29 instead.';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_31_60"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_30_59 instead.';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_61_90_plus"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_60_89 + overdue_amt_90_plus instead.';

-- FFIEC bucket comments
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_current"
  IS 'FFIEC: 0 DPD — performing, no delinquency';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_1_29"
  IS 'FFIEC: 1-29 DPD — early delinquency detection';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_30_59"
  IS 'FFIEC: 30-59 DPD — past due, not yet classified';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_60_89"
  IS 'FFIEC: 60-89 DPD — substandard trigger';
COMMENT ON COLUMN "l2"."position_detail"."overdue_amt_90_plus"
  IS 'FFIEC: 90+ DPD — non-accrual / default trigger';

-- =============================================================================
-- Part 3: FFIEC 5-bucket alignment on l2.facility_delinquency_snapshot
-- =============================================================================
-- Same legacy 3-bucket pattern as position_detail.

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD COLUMN "overdue_amt_current" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD COLUMN "overdue_amt_1_29" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD COLUMN "overdue_amt_30_59" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD COLUMN "overdue_amt_60_89" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD COLUMN "overdue_amt_90_plus" NUMERIC(18,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrate using aging model (same logic as position_detail)
UPDATE "l2"."facility_delinquency_snapshot"
SET
  "overdue_amt_current" = CASE
    WHEN COALESCE("days_past_due", 0) = 0 THEN "overdue_amt_0_30"
    ELSE 0
  END,
  "overdue_amt_1_29" = CASE
    WHEN COALESCE("days_past_due", 0) >= 1 THEN "overdue_amt_0_30"
    ELSE 0
  END,
  "overdue_amt_30_59" = CASE
    WHEN COALESCE("days_past_due", 0) >= 30 THEN "overdue_amt_31_60"
    ELSE 0
  END,
  "overdue_amt_60_89" = CASE
    WHEN COALESCE("days_past_due", 0) >= 60 THEN "overdue_amt_61_90_plus"
    ELSE 0
  END,
  "overdue_amt_90_plus" = CASE
    WHEN COALESCE("days_past_due", 0) >= 90 THEN "overdue_amt_61_90_plus"
    ELSE 0
  END
WHERE "overdue_amt_0_30" IS NOT NULL;

-- Deprecation comments
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_0_30"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_current + overdue_amt_1_29 instead.';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_31_60"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_30_59 instead.';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_61_90_plus"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_60_89 + overdue_amt_90_plus instead.';

COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_current"
  IS 'FFIEC: 0 DPD — performing, no delinquency';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_1_29"
  IS 'FFIEC: 1-29 DPD — early delinquency detection';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_30_59"
  IS 'FFIEC: 30-59 DPD — past due, not yet classified';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_60_89"
  IS 'FFIEC: 60-89 DPD — substandard trigger';
COMMENT ON COLUMN "l2"."facility_delinquency_snapshot"."overdue_amt_90_plus"
  IS 'FFIEC: 90+ DPD — non-accrual / default trigger';

-- =============================================================================
-- Part 4: FFIEC 5-bucket alignment on l3.lob_delinquency_summary
-- =============================================================================
-- L3 aggregate table — add FFIEC columns for when data is populated.
-- No data migration needed (table is empty; L3 calc engine will populate).

DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD COLUMN "overdue_amt_current" NUMERIC(20,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD COLUMN "overdue_amt_1_29" NUMERIC(20,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD COLUMN "overdue_amt_30_59" NUMERIC(20,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD COLUMN "overdue_amt_60_89" NUMERIC(20,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD COLUMN "overdue_amt_90_plus" NUMERIC(20,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Deprecation comments
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_0_30"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_current + overdue_amt_1_29 instead.';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_31_60"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_30_59 instead.';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_61_90_plus"
  IS 'DEPRECATED: Legacy 3-bucket. Use overdue_amt_60_89 + overdue_amt_90_plus instead.';

COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_current"
  IS 'FFIEC: 0 DPD — performing, no delinquency';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_1_29"
  IS 'FFIEC: 1-29 DPD — early delinquency detection';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_30_59"
  IS 'FFIEC: 30-59 DPD — past due, not yet classified';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_60_89"
  IS 'FFIEC: 60-89 DPD — substandard trigger';
COMMENT ON COLUMN "l3"."lob_delinquency_summary"."overdue_amt_90_plus"
  IS 'FFIEC: 90+ DPD — non-accrual / default trigger';

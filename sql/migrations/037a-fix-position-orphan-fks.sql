-- Migration 037a: Fix orphaned FK values on l2.position so constraints can be applied
--
-- Position rows from product-table seed data reference credit_agreement_ids and
-- netting_set_ids that don't exist in parent tables. NULL these out (positions
-- without agreements/netting sets are valid — they're just unlinked).
-- Then apply the FK constraints that failed silently in 037.
--
-- Idempotent: safe to re-run

SET search_path TO l1, l2, public;

-- Fix orphaned credit_agreement_id values
UPDATE "l2"."position"
SET "credit_agreement_id" = NULL
WHERE "credit_agreement_id" IS NOT NULL
  AND "credit_agreement_id" NOT IN (
    SELECT "credit_agreement_id" FROM "l2"."credit_agreement_master"
  );

-- Fix orphaned netting_set_id values
UPDATE "l2"."position"
SET "netting_set_id" = NULL
WHERE "netting_set_id" IS NOT NULL
  AND "netting_set_id" NOT IN (
    SELECT "netting_set_id" FROM "l2"."netting_set"
  );

-- Now apply the two FK constraints that failed in 037
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Migration 011c: Wire FK constraints for 5 orphan L1 dimension tables
-- These L1 dims had no inbound FK references from L2/L3, making them
-- unreachable in the data model. Each constraint links a child column
-- back to the parent dim's PK.
-- Idempotent: each ALTER wrapped in DO $$ ... EXCEPTION block.

SET search_path TO l1, l2, l3, public;

-- 1. dpd_bucket_dim (PK: dpd_bucket_code)
--    l2.facility_delinquency_snapshot.dpd_bucket_code → l1.dpd_bucket_dim.dpd_bucket_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_fds_dpd_bucket"
    FOREIGN KEY ("dpd_bucket_code")
    REFERENCES "l1"."dpd_bucket_dim" ("dpd_bucket_code");
  RAISE NOTICE 'Added FK fk_fds_dpd_bucket on l2.facility_delinquency_snapshot.dpd_bucket_code';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK fk_fds_dpd_bucket: %', SQLERRM;
END $$;

-- 2. limit_status_dim (PK: limit_status_code)
--    l2.facility_exposure_snapshot.limit_status_code → l1.limit_status_dim.limit_status_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_fes_limit_status"
    FOREIGN KEY ("limit_status_code")
    REFERENCES "l1"."limit_status_dim" ("limit_status_code");
  RAISE NOTICE 'Added FK fk_fes_limit_status on l2.facility_exposure_snapshot.limit_status_code';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK fk_fes_limit_status: %', SQLERRM;
END $$;

-- 3. origination_date_bucket_dim (PK: origination_bucket_code)
--    l3.facility_detail_snapshot.origination_bucket_code → l1.origination_date_bucket_dim.origination_bucket_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_fdetail_orig_bucket"
    FOREIGN KEY ("origination_bucket_code")
    REFERENCES "l1"."origination_date_bucket_dim" ("origination_bucket_code");
  RAISE NOTICE 'Added FK fk_fdetail_orig_bucket on l3.facility_detail_snapshot.origination_bucket_code';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK fk_fdetail_orig_bucket: %', SQLERRM;
END $$;

-- 4. rating_change_status_dim (PK: rating_change_status_code)
--    l3.counterparty_rating_calc.rating_change_status_code → l1.rating_change_status_dim.rating_change_status_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_rating_calc"
    ADD CONSTRAINT "fk_crc_rating_change_status"
    FOREIGN KEY ("rating_change_status_code")
    REFERENCES "l1"."rating_change_status_dim" ("rating_change_status_code");
  RAISE NOTICE 'Added FK fk_crc_rating_change_status on l3.counterparty_rating_calc.rating_change_status_code';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK fk_crc_rating_change_status: %', SQLERRM;
END $$;

-- 5. utilization_status_dim (PK: utilization_status_code)
--    l3.facility_exposure_calc.utilization_status_code → l1.utilization_status_dim.utilization_status_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_calc"
    ADD CONSTRAINT "fk_fec_util_status"
    FOREIGN KEY ("utilization_status_code")
    REFERENCES "l1"."utilization_status_dim" ("utilization_status_code");
  RAISE NOTICE 'Added FK fk_fec_util_status on l3.facility_exposure_calc.utilization_status_code';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK fk_fec_util_status: %', SQLERRM;
END $$;

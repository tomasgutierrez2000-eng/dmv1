-- L3 Foreign Key Constraints
-- Generated from data-dictionary.json (21 relationships)
-- Idempotent: safe to re-run (uses EXCEPTION WHEN OTHERS)
--
-- To apply: psql -f sql/fk/fk-l3.sql

SET search_path TO l1, l2, l3, public;

DO $$ BEGIN
  ALTER TABLE "l3"."capital_binding_constraint"
    ADD CONSTRAINT "fk_capital_binding_constraint_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_capital_consumption"
    ADD CONSTRAINT "fk_counterparty_capital_consumption_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_capital_consumption"
    ADD CONSTRAINT "fk_counterparty_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_risk_rating_tier_code"
    FOREIGN KEY ("risk_rating_tier_code")
    REFERENCES "l1"."risk_rating_tier_dim" ("tier_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_rating_calc"
    ADD CONSTRAINT "fk_counterparty_rating_calc_rating_change_status_code"
    FOREIGN KEY ("rating_change_status_code")
    REFERENCES "l1"."rating_change_status_dim" ("rating_change_status_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."desk_capital_consumption"
    ADD CONSTRAINT "fk_desk_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."desk_capital_consumption"
    ADD CONSTRAINT "fk_desk_capital_consumption_org_unit_id"
    FOREIGN KEY ("org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."ecl_provision_calc"
    ADD CONSTRAINT "fk_ecl_provision_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_origination_bucket_code"
    FOREIGN KEY ("origination_bucket_code")
    REFERENCES "l1"."origination_date_bucket_dim" ("origination_bucket_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_calc"
    ADD CONSTRAINT "fk_facility_exposure_calc_utilization_status_code"
    FOREIGN KEY ("utilization_status_code")
    REFERENCES "l1"."utilization_status_dim" ("utilization_status_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."facility_rwa_calc"
    ADD CONSTRAINT "fk_facility_rwa_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_segment_capital_consumption_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_segment_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_segment_capital_consumption_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Migration 008b: FK constraints for L2 tables
-- Auto-generated from data dictionary relationships.
-- Each constraint wrapped in DO $$ for idempotency.
-- Total constraints: 159

SET search_path TO l1, l2, public;

-- amendment_change_detail.amendment_id → amendment_event.amendment_id
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_change_detail"
    ADD CONSTRAINT "fk_amendment_change_detail_amendment_id"
    FOREIGN KEY ("amendment_id")
    REFERENCES "l2"."amendment_event" ("amendment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_change_detail', 'amendment_id', SQLERRM;
END $$;

-- amendment_event.amendment_status_code → amendment_status_dim.amendment_status_code
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_amendment_status_code"
    FOREIGN KEY ("amendment_status_code")
    REFERENCES "l1"."amendment_status_dim" ("amendment_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_event', 'amendment_status_code', SQLERRM;
END $$;

-- amendment_event.amendment_type_code → amendment_type_dim.amendment_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_amendment_type_code"
    FOREIGN KEY ("amendment_type_code")
    REFERENCES "l1"."amendment_type_dim" ("amendment_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_event', 'amendment_type_code', SQLERRM;
END $$;

-- amendment_event.credit_agreement_id → credit_agreement_master.credit_agreement_id
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_event', 'credit_agreement_id', SQLERRM;
END $$;

-- amendment_event.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_event', 'facility_id', SQLERRM;
END $$;

-- cash_flow.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."cash_flow"
    ADD CONSTRAINT "fk_cash_flow_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'cash_flow', 'currency_code', SQLERRM;
END $$;

-- cash_flow.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."cash_flow"
    ADD CONSTRAINT "fk_cash_flow_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'cash_flow', 'facility_id', SQLERRM;
END $$;

-- collateral_asset_master.collateral_type_id → collateral_type.collateral_type_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_asset_master', 'collateral_type_id', SQLERRM;
END $$;

-- collateral_asset_master.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_asset_master', 'counterparty_id', SQLERRM;
END $$;

-- collateral_asset_master.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_asset_master', 'country_code', SQLERRM;
END $$;

-- collateral_asset_master.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_asset_master', 'currency_code', SQLERRM;
END $$;

-- collateral_asset_master.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_asset_master', 'legal_entity_id', SQLERRM;
END $$;

-- collateral_link.collateral_asset_id → collateral_asset_master.collateral_asset_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_link"
    ADD CONSTRAINT "fk_collateral_link_collateral_asset_id"
    FOREIGN KEY ("collateral_asset_id")
    REFERENCES "l2"."collateral_asset_master" ("collateral_asset_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_link', 'collateral_asset_id', SQLERRM;
END $$;

-- collateral_link.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_link"
    ADD CONSTRAINT "fk_collateral_link_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_link', 'source_system_id', SQLERRM;
END $$;

-- collateral_snapshot.collateral_asset_id → collateral_asset_master.collateral_asset_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_collateral_asset_id"
    FOREIGN KEY ("collateral_asset_id")
    REFERENCES "l2"."collateral_asset_master" ("collateral_asset_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_snapshot', 'collateral_asset_id', SQLERRM;
END $$;

-- collateral_snapshot.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_snapshot', 'source_system_id', SQLERRM;
END $$;

-- control_relationship.parent_counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."control_relationship"
    ADD CONSTRAINT "fk_control_relationship_parent_counterparty_id"
    FOREIGN KEY ("parent_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'control_relationship', 'parent_counterparty_id', SQLERRM;
END $$;

-- control_relationship.subsidiary_counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."control_relationship"
    ADD CONSTRAINT "fk_control_relationship_subsidiary_counterparty_id"
    FOREIGN KEY ("subsidiary_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'control_relationship', 'subsidiary_counterparty_id', SQLERRM;
END $$;

-- counterparty.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty', 'country_code', SQLERRM;
END $$;

-- counterparty.entity_type_code → entity_type_dim.entity_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_entity_type_code"
    FOREIGN KEY ("entity_type_code")
    REFERENCES "l1"."entity_type_dim" ("entity_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty', 'entity_type_code', SQLERRM;
END $$;

-- counterparty.industry_id → industry_dim.industry_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_industry_id"
    FOREIGN KEY ("industry_id")
    REFERENCES "l1"."industry_dim" ("industry_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty', 'industry_id', SQLERRM;
END $$;

-- counterparty_financial_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_financial_snapshot"
    ADD CONSTRAINT "fk_counterparty_financial_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_financial_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_financial_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_financial_snapshot"
    ADD CONSTRAINT "fk_counterparty_financial_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_financial_snapshot', 'currency_code', SQLERRM;
END $$;

-- counterparty_hierarchy.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_hierarchy', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_hierarchy.immediate_parent_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_immediate_parent_id"
    FOREIGN KEY ("immediate_parent_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_hierarchy', 'immediate_parent_id', SQLERRM;
END $$;

-- counterparty_hierarchy.ultimate_parent_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_ultimate_parent_id"
    FOREIGN KEY ("ultimate_parent_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_hierarchy', 'ultimate_parent_id', SQLERRM;
END $$;

-- counterparty_rating_observation.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_observation', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_rating_observation.rating_grade_id → rating_grade_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_grade_id_rating_grade"
    FOREIGN KEY ("rating_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_observation', 'rating_grade_id', SQLERRM;
END $$;

-- counterparty_rating_observation.rating_source_id → rating_source.rating_source_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_source_id"
    FOREIGN KEY ("rating_source_id")
    REFERENCES "l1"."rating_source" ("rating_source_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_observation', 'rating_source_id', SQLERRM;
END $$;

-- credit_agreement_counterparty_participation.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_credit_agreement_counterparty_participation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_counterparty_participation', 'counterparty_id', SQLERRM;
END $$;

-- credit_agreement_counterparty_participation.counterparty_role_code → counterparty_role_dim.counterparty_role_code
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_ca_cp_part_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_counterparty_participation', 'counterparty_role_code', SQLERRM;
END $$;

-- credit_agreement_counterparty_participation.credit_agreement_id → credit_agreement_master.credit_agreement_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_ca_cp_part_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_counterparty_participation', 'credit_agreement_id', SQLERRM;
END $$;

-- credit_agreement_master.borrower_counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_borrower_counterparty_id"
    FOREIGN KEY ("borrower_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_master', 'borrower_counterparty_id', SQLERRM;
END $$;

-- credit_agreement_master.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_master', 'currency_code', SQLERRM;
END $$;

-- credit_agreement_master.lender_legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_lender_legal_entity_id"
    FOREIGN KEY ("lender_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_agreement_master', 'lender_legal_entity_id', SQLERRM;
END $$;

-- credit_event.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event', 'counterparty_id', SQLERRM;
END $$;

-- credit_event.default_definition_id → default_definition_dim.default_definition_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_default_definition_id"
    FOREIGN KEY ("default_definition_id")
    REFERENCES "l1"."default_definition_dim" ("default_definition_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event', 'default_definition_id', SQLERRM;
END $$;

-- credit_event_facility_link.credit_event_id → credit_event.credit_event_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_event_facility_link"
    ADD CONSTRAINT "fk_credit_event_facility_link_credit_event_id"
    FOREIGN KEY ("credit_event_id")
    REFERENCES "l2"."credit_event" ("credit_event_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_facility_link', 'credit_event_id', SQLERRM;
END $$;

-- credit_event_facility_link.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."credit_event_facility_link"
    ADD CONSTRAINT "fk_credit_event_facility_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_facility_link', 'facility_id', SQLERRM;
END $$;

-- crm_protection_master.beneficiary_legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_beneficiary_legal_entity_id"
    FOREIGN KEY ("beneficiary_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_protection_master', 'beneficiary_legal_entity_id', SQLERRM;
END $$;

-- crm_protection_master.crm_type_code → crm_type_dim.crm_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_protection_master', 'crm_type_code', SQLERRM;
END $$;

-- crm_protection_master.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_protection_master', 'currency_code', SQLERRM;
END $$;

-- csa_master.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."csa_master"
    ADD CONSTRAINT "fk_csa_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'csa_master', 'counterparty_id', SQLERRM;
END $$;

-- deal_pipeline_fact.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_fact', 'counterparty_id', SQLERRM;
END $$;

-- deal_pipeline_fact.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_fact', 'currency_code', SQLERRM;
END $$;

-- economic_interdependence_relationship.counterparty_id_1 → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_counterparty_id_1"
    FOREIGN KEY ("counterparty_id_1")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'economic_interdependence_relationship', 'counterparty_id_1', SQLERRM;
END $$;

-- economic_interdependence_relationship.counterparty_id_2 → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_counterparty_id_2"
    FOREIGN KEY ("counterparty_id_2")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'economic_interdependence_relationship', 'counterparty_id_2', SQLERRM;
END $$;

-- economic_interdependence_relationship.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'economic_interdependence_relationship', 'source_system_id', SQLERRM;
END $$;

-- exception_event.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event', 'counterparty_id', SQLERRM;
END $$;

-- exception_event.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event', 'facility_id', SQLERRM;
END $$;

-- exposure_counterparty_attribution.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_counterparty_attribution', 'counterparty_id', SQLERRM;
END $$;

-- exposure_counterparty_attribution.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_counterparty_attribution', 'currency_code', SQLERRM;
END $$;

-- exposure_counterparty_attribution.exposure_type_id → exposure_type_dim.exposure_type_id
DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_exposure_type_id"
    FOREIGN KEY ("exposure_type_id")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_counterparty_attribution', 'exposure_type_id', SQLERRM;
END $$;

-- facility_counterparty_participation.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_counterparty_participation', 'counterparty_id', SQLERRM;
END $$;

-- facility_counterparty_participation.counterparty_role_code → counterparty_role_dim.counterparty_role_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_counterparty_participation', 'counterparty_role_code', SQLERRM;
END $$;

-- facility_counterparty_participation.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_counterparty_participation', 'facility_id', SQLERRM;
END $$;

-- facility_credit_approval.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_credit_approval"
    ADD CONSTRAINT "fk_facility_credit_approval_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_credit_approval', 'counterparty_id', SQLERRM;
END $$;

-- facility_credit_approval.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_credit_approval"
    ADD CONSTRAINT "fk_facility_credit_approval_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_credit_approval', 'facility_id', SQLERRM;
END $$;

-- facility_delinquency_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_delinquency_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_exposure_snapshot.exposure_type_id → exposure_type_dim.exposure_type_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_exposure_type_id"
    FOREIGN KEY ("exposure_type_id")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'exposure_type_id', SQLERRM;
END $$;

-- facility_exposure_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_exposure_snapshot.internal_risk_rating_bucket_code → internal_risk_rating_bucket_dim.internal_risk_rating_bucket_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_internal_risk_rating_bucket_code"
    FOREIGN KEY ("internal_risk_rating_bucket_code")
    REFERENCES "l1"."internal_risk_rating_bucket_dim" ("internal_risk_rating_bucket_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'internal_risk_rating_bucket_code', SQLERRM;
END $$;

-- facility_exposure_snapshot.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'source_system_id', SQLERRM;
END $$;

-- facility_financial_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_financial_snapshot"
    ADD CONSTRAINT "fk_facility_financial_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_financial_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_lender_allocation.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_lender_allocation"
    ADD CONSTRAINT "fk_facility_lender_allocation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_lender_allocation', 'facility_id', SQLERRM;
END $$;

-- facility_lender_allocation.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_lender_allocation"
    ADD CONSTRAINT "fk_facility_lender_allocation_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_lender_allocation', 'legal_entity_id', SQLERRM;
END $$;

-- facility_lob_attribution.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_lob_attribution"
    ADD CONSTRAINT "fk_facility_lob_attribution_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_lob_attribution', 'facility_id', SQLERRM;
END $$;

-- facility_lob_attribution.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_lob_attribution"
    ADD CONSTRAINT "fk_facility_lob_attribution_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_lob_attribution', 'lob_segment_id', SQLERRM;
END $$;

-- facility_master.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'counterparty_id', SQLERRM;
END $$;

-- facility_master.credit_agreement_id → credit_agreement_master.credit_agreement_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'credit_agreement_id', SQLERRM;
END $$;

-- facility_master.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'currency_code', SQLERRM;
END $$;

-- facility_master.ledger_account_id → ledger_account_dim.ledger_account_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_ledger_account_id"
    FOREIGN KEY ("ledger_account_id")
    REFERENCES "l1"."ledger_account_dim" ("ledger_account_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'ledger_account_id', SQLERRM;
END $$;

-- facility_master.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'lob_segment_id', SQLERRM;
END $$;

-- facility_master.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'portfolio_id', SQLERRM;
END $$;

-- facility_master.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'product_node_id', SQLERRM;
END $$;

-- facility_master.rate_index_id → interest_rate_index_dim.rate_index_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_rate_index_id"
    FOREIGN KEY ("rate_index_id")
    REFERENCES "l1"."interest_rate_index_dim" ("rate_index_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_master', 'rate_index_id', SQLERRM;
END $$;

-- facility_pricing_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_pricing_snapshot.rate_index_id → interest_rate_index_dim.rate_index_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_rate_index_id"
    FOREIGN KEY ("rate_index_id")
    REFERENCES "l1"."interest_rate_index_dim" ("rate_index_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_snapshot', 'rate_index_id', SQLERRM;
END $$;

-- facility_profitability_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_profitability_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_profitability_snapshot.ledger_account_id → ledger_account_dim.ledger_account_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_ledger_account_id"
    FOREIGN KEY ("ledger_account_id")
    REFERENCES "l1"."ledger_account_dim" ("ledger_account_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_profitability_snapshot', 'ledger_account_id', SQLERRM;
END $$;

-- facility_risk_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_risk_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- facility_risk_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_risk_snapshot', 'currency_code', SQLERRM;
END $$;

-- facility_risk_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_risk_snapshot', 'facility_id', SQLERRM;
END $$;

-- financial_metric_observation.context_id → context_dim.context_id
DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_context_id"
    FOREIGN KEY ("context_id")
    REFERENCES "l1"."context_dim" ("context_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'financial_metric_observation', 'context_id', SQLERRM;
END $$;

-- financial_metric_observation.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'financial_metric_observation', 'counterparty_id', SQLERRM;
END $$;

-- financial_metric_observation.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'financial_metric_observation', 'facility_id', SQLERRM;
END $$;

-- financial_metric_observation.metric_definition_id → metric_definition_dim.metric_definition_id
DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_metric_definition_id"
    FOREIGN KEY ("metric_definition_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_definition_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'financial_metric_observation', 'metric_definition_id', SQLERRM;
END $$;

-- fx_rate.from_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."fx_rate"
    ADD CONSTRAINT "fk_fx_rate_from_currency_code"
    FOREIGN KEY ("from_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fx_rate', 'from_currency_code', SQLERRM;
END $$;

-- fx_rate.to_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."fx_rate"
    ADD CONSTRAINT "fk_fx_rate_to_currency_code"
    FOREIGN KEY ("to_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fx_rate', 'to_currency_code', SQLERRM;
END $$;

-- instrument_master.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l2"."instrument_master"
    ADD CONSTRAINT "fk_instrument_master_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'instrument_master', 'country_code', SQLERRM;
END $$;

-- instrument_master.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."instrument_master"
    ADD CONSTRAINT "fk_instrument_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'instrument_master', 'currency_code', SQLERRM;
END $$;

-- legal_entity.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity"
    ADD CONSTRAINT "fk_legal_entity_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity', 'country_code', SQLERRM;
END $$;

-- legal_entity_hierarchy.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity_hierarchy"
    ADD CONSTRAINT "fk_legal_entity_hierarchy_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_hierarchy', 'legal_entity_id', SQLERRM;
END $$;

-- legal_entity_hierarchy.parent_legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity_hierarchy"
    ADD CONSTRAINT "fk_legal_entity_hierarchy_parent_legal_entity_id"
    FOREIGN KEY ("parent_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_hierarchy', 'parent_legal_entity_id', SQLERRM;
END $$;

-- limit_contribution_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_contribution_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- limit_contribution_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_contribution_snapshot', 'currency_code', SQLERRM;
END $$;

-- limit_contribution_snapshot.limit_rule_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_contribution_snapshot', 'limit_rule_id', SQLERRM;
END $$;

-- limit_utilization_event.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."limit_utilization_event"
    ADD CONSTRAINT "fk_limit_utilization_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_event', 'counterparty_id', SQLERRM;
END $$;

-- limit_utilization_event.limit_rule_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l2"."limit_utilization_event"
    ADD CONSTRAINT "fk_limit_utilization_event_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_event', 'limit_rule_id', SQLERRM;
END $$;

-- margin_agreement.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."margin_agreement"
    ADD CONSTRAINT "fk_margin_agreement_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'margin_agreement', 'counterparty_id', SQLERRM;
END $$;

-- netting_agreement.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."netting_agreement"
    ADD CONSTRAINT "fk_netting_agreement_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_agreement', 'counterparty_id', SQLERRM;
END $$;

-- netting_set.netting_agreement_id → netting_agreement.netting_agreement_id
DO $$ BEGIN
  ALTER TABLE "l2"."netting_set"
    ADD CONSTRAINT "fk_netting_set_netting_agreement_id"
    FOREIGN KEY ("netting_agreement_id")
    REFERENCES "l2"."netting_agreement" ("netting_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set', 'netting_agreement_id', SQLERRM;
END $$;

-- netting_set_exposure_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_exposure_snapshot"
    ADD CONSTRAINT "fk_netting_set_exposure_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_exposure_snapshot', 'currency_code', SQLERRM;
END $$;

-- netting_set_exposure_snapshot.netting_set_id → netting_set.netting_set_id
DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_exposure_snapshot"
    ADD CONSTRAINT "fk_netting_set_exposure_snapshot_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_exposure_snapshot', 'netting_set_id', SQLERRM;
END $$;

-- netting_set_link.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_link"
    ADD CONSTRAINT "fk_netting_set_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_link', 'facility_id', SQLERRM;
END $$;

-- netting_set_link.netting_set_id → netting_set.netting_set_id
DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_link"
    ADD CONSTRAINT "fk_netting_set_link_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_link', 'netting_set_id', SQLERRM;
END $$;

-- position.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'currency_code', SQLERRM;
END $$;

-- position.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'facility_id', SQLERRM;
END $$;

-- position.instrument_id → instrument_master.instrument_id
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'instrument_id', SQLERRM;
END $$;

-- position.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'product_node_id', SQLERRM;
END $$;

-- position.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'source_system_id', SQLERRM;
END $$;

-- position_detail.position_id → position.position_id
DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD CONSTRAINT "fk_position_detail_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position_detail', 'position_id', SQLERRM;
END $$;

-- protection_link.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."protection_link"
    ADD CONSTRAINT "fk_protection_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'protection_link', 'facility_id', SQLERRM;
END $$;

-- protection_link.protection_id → crm_protection_master.protection_id
DO $$ BEGIN
  ALTER TABLE "l2"."protection_link"
    ADD CONSTRAINT "fk_protection_link_protection_id"
    FOREIGN KEY ("protection_id")
    REFERENCES "l2"."crm_protection_master" ("protection_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'protection_link', 'protection_id', SQLERRM;
END $$;

-- risk_flag.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."risk_flag"
    ADD CONSTRAINT "fk_risk_flag_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_flag', 'counterparty_id', SQLERRM;
END $$;

-- risk_flag.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."risk_flag"
    ADD CONSTRAINT "fk_risk_flag_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_flag', 'facility_id', SQLERRM;
END $$;

-- risk_mitigant_link.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_link"
    ADD CONSTRAINT "fk_risk_mitigant_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_mitigant_link', 'facility_id', SQLERRM;
END $$;

-- risk_mitigant_link.risk_mitigant_id → risk_mitigant_master.risk_mitigant_id
DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_link"
    ADD CONSTRAINT "fk_risk_mitigant_link_risk_mitigant_id"
    FOREIGN KEY ("risk_mitigant_id")
    REFERENCES "l2"."risk_mitigant_master" ("risk_mitigant_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_mitigant_link', 'risk_mitigant_id', SQLERRM;
END $$;

-- risk_mitigant_master.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_master"
    ADD CONSTRAINT "fk_risk_mitigant_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_mitigant_master', 'counterparty_id', SQLERRM;
END $$;

-- risk_mitigant_master.risk_mitigant_subtype_code → risk_mitigant_type_dim.risk_mitigant_subtype_code
DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_master"
    ADD CONSTRAINT "fk_risk_mitigant_master_risk_mitigant_subtype_code"
    FOREIGN KEY ("risk_mitigant_subtype_code")
    REFERENCES "l1"."risk_mitigant_type_dim" ("risk_mitigant_subtype_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_mitigant_master', 'risk_mitigant_subtype_code', SQLERRM;
END $$;

-- stress_test_breach.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach', 'counterparty_id', SQLERRM;
END $$;

-- stress_test_breach.limit_rule_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach', 'limit_rule_id', SQLERRM;
END $$;

-- stress_test_breach.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach', 'scenario_id', SQLERRM;
END $$;

-- credit_event.credit_event_type_code → credit_event_type_dim.credit_event_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_credit_event_type_code"
    FOREIGN KEY ("credit_event_type_code")
    REFERENCES "l1"."credit_event_type_dim" ("credit_event_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event', 'credit_event_type_code', SQLERRM;
END $$;

-- facility_delinquency_snapshot.credit_status_code → credit_status_dim.credit_status_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_credit_status_code"
    FOREIGN KEY ("credit_status_code")
    REFERENCES "l1"."credit_status_dim" ("credit_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_delinquency_snapshot', 'credit_status_code', SQLERRM;
END $$;

-- facility_pricing_snapshot.pricing_tier → pricing_tier_dim.pricing_tier_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_pricing_tier"
    FOREIGN KEY ("pricing_tier")
    REFERENCES "l1"."pricing_tier_dim" ("pricing_tier_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_snapshot', 'pricing_tier', SQLERRM;
END $$;

-- position.position_currency → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_position_currency"
    FOREIGN KEY ("position_currency")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'position_currency', SQLERRM;
END $$;

-- position.exposure_type_code → exposure_type_dim.exposure_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_exposure_type_code"
    FOREIGN KEY ("exposure_type_code")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'exposure_type_code', SQLERRM;
END $$;

-- position.credit_status_code → credit_status_dim.credit_status_code
DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_credit_status_code"
    FOREIGN KEY ("credit_status_code")
    REFERENCES "l1"."credit_status_dim" ("credit_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'position', 'credit_status_code', SQLERRM;
END $$;

-- exposure_counterparty_attribution.counterparty_role_code → counterparty_role_dim.counterparty_role_code
DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_counterparty_attribution', 'counterparty_role_code', SQLERRM;
END $$;

-- facility_exposure_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'currency_code', SQLERRM;
END $$;

-- facility_exposure_snapshot.fr2590_category_code → fr2590_category_dim.fr2590_category_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'fr2590_category_code', SQLERRM;
END $$;

-- facility_exposure_snapshot.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'product_node_id', SQLERRM;
END $$;

-- facility_exposure_snapshot.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_snapshot', 'lob_segment_id', SQLERRM;
END $$;

-- collateral_snapshot.crm_type_code → crm_type_dim.crm_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_snapshot', 'crm_type_code', SQLERRM;
END $$;

-- cash_flow.maturity_bucket_id → maturity_bucket_dim.maturity_bucket_id
DO $$ BEGIN
  ALTER TABLE "l2"."cash_flow"
    ADD CONSTRAINT "fk_cash_flow_maturity_bucket_id"
    FOREIGN KEY ("maturity_bucket_id")
    REFERENCES "l1"."maturity_bucket_dim" ("maturity_bucket_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'cash_flow', 'maturity_bucket_id', SQLERRM;
END $$;

-- facility_delinquency_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_delinquency_snapshot', 'currency_code', SQLERRM;
END $$;

-- facility_pricing_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_snapshot', 'currency_code', SQLERRM;
END $$;

-- facility_profitability_snapshot.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_profitability_snapshot', 'base_currency_code', SQLERRM;
END $$;

-- amendment_change_detail.change_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."amendment_change_detail"
    ADD CONSTRAINT "fk_amendment_change_detail_change_currency_code"
    FOREIGN KEY ("change_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_change_detail', 'change_currency_code', SQLERRM;
END $$;

-- stress_test_breach.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach', 'lob_segment_id', SQLERRM;
END $$;

-- deal_pipeline_fact.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_fact', 'lob_segment_id', SQLERRM;
END $$;

-- counterparty_rating_observation.rating_grade_id → rating_scale_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_grade_id_rating_scale"
    FOREIGN KEY ("rating_grade_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_observation', 'rating_grade_id', SQLERRM;
END $$;

-- exception_event.limit_rule_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event', 'limit_rule_id', SQLERRM;
END $$;

-- exception_event.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event', 'lob_segment_id', SQLERRM;
END $$;

-- payment_ledger.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'payment_ledger', 'counterparty_id', SQLERRM;
END $$;

-- payment_ledger.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'payment_ledger', 'facility_id', SQLERRM;
END $$;

-- payment_ledger.position_id → position.position_id
DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'payment_ledger', 'position_id', SQLERRM;
END $$;

-- payment_ledger.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'payment_ledger', 'currency_code', SQLERRM;
END $$;

-- ecl_staging_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_staging_snapshot', 'facility_id', SQLERRM;
END $$;

-- ecl_staging_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l1"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_staging_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- ecl_staging_snapshot.ecl_stage_code → ecl_stage_dim.ecl_stage_code
DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_ecl_stage_code"
    FOREIGN KEY ("ecl_stage_code")
    REFERENCES "l1"."ecl_stage_dim" ("ecl_stage_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_staging_snapshot', 'ecl_stage_code', SQLERRM;
END $$;

-- ecl_staging_snapshot.model_code → impairment_model_dim.model_code
DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_model_code"
    FOREIGN KEY ("model_code")
    REFERENCES "l1"."impairment_model_dim" ("model_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_staging_snapshot', 'model_code', SQLERRM;
END $$;

-- watchlist_entry.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."watchlist_entry"
    ADD CONSTRAINT "fk_watchlist_entry_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l1"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'watchlist_entry', 'counterparty_id', SQLERRM;
END $$;

-- watchlist_entry.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."watchlist_entry"
    ADD CONSTRAINT "fk_watchlist_entry_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'watchlist_entry', 'facility_id', SQLERRM;
END $$;

-- watchlist_entry.watchlist_category_code → watchlist_category_dim.watchlist_category_code
DO $$ BEGIN
  ALTER TABLE "l2"."watchlist_entry"
    ADD CONSTRAINT "fk_watchlist_entry_watchlist_category_code"
    FOREIGN KEY ("watchlist_category_code")
    REFERENCES "l1"."watchlist_category_dim" ("watchlist_category_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'watchlist_entry', 'watchlist_category_code', SQLERRM;
END $$;

-- forbearance_event.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l2"."forbearance_event"
    ADD CONSTRAINT "fk_forbearance_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'forbearance_event', 'facility_id', SQLERRM;
END $$;

-- forbearance_event.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l2"."forbearance_event"
    ADD CONSTRAINT "fk_forbearance_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l1"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'forbearance_event', 'counterparty_id', SQLERRM;
END $$;

-- forbearance_event.forbearance_type_code → forbearance_type_dim.forbearance_type_code
DO $$ BEGIN
  ALTER TABLE "l2"."forbearance_event"
    ADD CONSTRAINT "fk_forbearance_event_forbearance_type_code"
    FOREIGN KEY ("forbearance_type_code")
    REFERENCES "l1"."forbearance_type_dim" ("forbearance_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'forbearance_event', 'forbearance_type_code', SQLERRM;
END $$;

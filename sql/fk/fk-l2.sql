-- L2 Foreign Key Constraints
-- Generated from data-dictionary.json (172 relationships)
-- Idempotent: safe to re-run (uses EXCEPTION WHEN OTHERS)
--
-- To apply: psql -f sql/fk/fk-l2.sql

SET search_path TO l1, l2, public;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_change_detail"
    ADD CONSTRAINT "fk_amendment_change_detail_amendment_id"
    FOREIGN KEY ("amendment_id")
    REFERENCES "l2"."amendment_event" ("amendment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_change_detail"
    ADD CONSTRAINT "fk_amendment_change_detail_change_currency_code"
    FOREIGN KEY ("change_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_amendment_status_code"
    FOREIGN KEY ("amendment_status_code")
    REFERENCES "l1"."amendment_status_dim" ("amendment_status_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_amendment_type_code"
    FOREIGN KEY ("amendment_type_code")
    REFERENCES "l1"."amendment_type_dim" ("amendment_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."amendment_event"
    ADD CONSTRAINT "fk_amendment_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."capital_position_snapshot"
    ADD CONSTRAINT "fk_capital_position_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."capital_position_snapshot"
    ADD CONSTRAINT "fk_capital_position_snapshot_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_link"
    ADD CONSTRAINT "fk_collateral_link_collateral_asset_id"
    FOREIGN KEY ("collateral_asset_id")
    REFERENCES "l2"."collateral_asset_master" ("collateral_asset_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_link"
    ADD CONSTRAINT "fk_collateral_link_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_collateral_asset_id"
    FOREIGN KEY ("collateral_asset_id")
    REFERENCES "l2"."collateral_asset_master" ("collateral_asset_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."contract_master"
    ADD CONSTRAINT "fk_contract_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."contract_master"
    ADD CONSTRAINT "fk_contract_master_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."contract_master"
    ADD CONSTRAINT "fk_contract_master_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."contract_master"
    ADD CONSTRAINT "fk_contract_master_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."control_relationship"
    ADD CONSTRAINT "fk_control_relationship_parent_counterparty_id"
    FOREIGN KEY ("parent_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."control_relationship"
    ADD CONSTRAINT "fk_control_relationship_subsidiary_counterparty_id"
    FOREIGN KEY ("subsidiary_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_duns_number"
    FOREIGN KEY ("duns_number")
    REFERENCES "l1"."duns_entity_dim" ("duns_number");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_pricing_tier_code"
    FOREIGN KEY ("pricing_tier_code")
    REFERENCES "l1"."pricing_tier_dim" ("pricing_tier_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_financial_snapshot"
    ADD CONSTRAINT "fk_counterparty_financial_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_financial_snapshot"
    ADD CONSTRAINT "fk_counterparty_financial_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_immediate_parent_id"
    FOREIGN KEY ("immediate_parent_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_hierarchy"
    ADD CONSTRAINT "fk_counterparty_hierarchy_ultimate_parent_id"
    FOREIGN KEY ("ultimate_parent_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_grade_id"
    FOREIGN KEY ("rating_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_source_id"
    FOREIGN KEY ("rating_source_id")
    REFERENCES "l1"."rating_source" ("rating_source_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_credit_agreement_counterparty_participation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_ca_cp_part_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_counterparty_participation"
    ADD CONSTRAINT "fk_ca_cp_part_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_borrower_counterparty_id"
    FOREIGN KEY ("borrower_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_agreement_master"
    ADD CONSTRAINT "fk_credit_agreement_master_lender_legal_entity_id"
    FOREIGN KEY ("lender_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_credit_event_type_code"
    FOREIGN KEY ("credit_event_type_code")
    REFERENCES "l1"."credit_event_type_dim" ("credit_event_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_event"
    ADD CONSTRAINT "fk_credit_event_default_definition_id"
    FOREIGN KEY ("default_definition_id")
    REFERENCES "l1"."default_definition_dim" ("default_definition_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_event_facility_link"
    ADD CONSTRAINT "fk_credit_event_facility_link_credit_event_id"
    FOREIGN KEY ("credit_event_id")
    REFERENCES "l2"."credit_event" ("credit_event_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."credit_event_facility_link"
    ADD CONSTRAINT "fk_credit_event_facility_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_beneficiary_legal_entity_id"
    FOREIGN KEY ("beneficiary_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."crm_protection_master"
    ADD CONSTRAINT "fk_crm_protection_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."csa_master"
    ADD CONSTRAINT "fk_csa_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deal_pipeline_fact"
    ADD CONSTRAINT "fk_deal_pipeline_fact_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."duns_entity_observation"
    ADD CONSTRAINT "fk_duns_entity_observation_duns_number"
    FOREIGN KEY ("duns_number")
    REFERENCES "l1"."duns_entity_dim" ("duns_number");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_ecl_stage_code"
    FOREIGN KEY ("ecl_stage_code")
    REFERENCES "l1"."ecl_stage_dim" ("ecl_stage_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."ecl_staging_snapshot"
    ADD CONSTRAINT "fk_ecl_staging_snapshot_model_code"
    FOREIGN KEY ("model_code")
    REFERENCES "l1"."impairment_model_dim" ("model_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_counterparty_id_1"
    FOREIGN KEY ("counterparty_id_1")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_counterparty_id_2"
    FOREIGN KEY ("counterparty_id_2")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."economic_interdependence_relationship"
    ADD CONSTRAINT "fk_economic_interdependence_relationship_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exception_event"
    ADD CONSTRAINT "fk_exception_event_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_counterparty_role_code"
    FOREIGN KEY ("counterparty_role_code")
    REFERENCES "l1"."counterparty_role_dim" ("counterparty_role_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_counterparty_participation"
    ADD CONSTRAINT "fk_facility_counterparty_participation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_credit_approval"
    ADD CONSTRAINT "fk_facility_credit_approval_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_credit_approval"
    ADD CONSTRAINT "fk_facility_credit_approval_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_credit_status_code"
    FOREIGN KEY ("credit_status_code")
    REFERENCES "l1"."credit_status_dim" ("credit_status_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_dpd_bucket_code"
    FOREIGN KEY ("dpd_bucket_code")
    REFERENCES "l1"."dpd_bucket_dim" ("dpd_bucket_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_delinquency_snapshot"
    ADD CONSTRAINT "fk_facility_delinquency_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_internal_risk_rating_bucket_code"
    FOREIGN KEY ("internal_risk_rating_bucket_code")
    REFERENCES "l1"."internal_risk_rating_bucket_dim" ("internal_risk_rating_bucket_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_financial_snapshot"
    ADD CONSTRAINT "fk_facility_financial_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_lender_allocation"
    ADD CONSTRAINT "fk_facility_lender_allocation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_lender_allocation"
    ADD CONSTRAINT "fk_facility_lender_allocation_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_lob_attribution"
    ADD CONSTRAINT "fk_facility_lob_attribution_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_ledger_account_id"
    FOREIGN KEY ("ledger_account_id")
    REFERENCES "l1"."ledger_account_dim" ("ledger_account_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_master"
    ADD CONSTRAINT "fk_facility_master_rate_index_id"
    FOREIGN KEY ("rate_index_id")
    REFERENCES "l1"."interest_rate_index_dim" ("rate_index_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_pricing_snapshot"
    ADD CONSTRAINT "fk_facility_pricing_snapshot_rate_index_id"
    FOREIGN KEY ("rate_index_id")
    REFERENCES "l1"."interest_rate_index_dim" ("rate_index_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_profitability_snapshot"
    ADD CONSTRAINT "fk_facility_profitability_snapshot_ledger_account_id"
    FOREIGN KEY ("ledger_account_id")
    REFERENCES "l1"."ledger_account_dim" ("ledger_account_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_risk_snapshot"
    ADD CONSTRAINT "fk_facility_risk_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_context_id"
    FOREIGN KEY ("context_id")
    REFERENCES "l1"."context_dim" ("context_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."financial_metric_observation"
    ADD CONSTRAINT "fk_financial_metric_observation_metric_definition_id"
    FOREIGN KEY ("metric_definition_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_definition_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."forbearance_event"
    ADD CONSTRAINT "fk_forbearance_event_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."forbearance_event"
    ADD CONSTRAINT "fk_forbearance_event_forbearance_type_code"
    FOREIGN KEY ("forbearance_type_code")
    REFERENCES "l1"."forbearance_type_dim" ("forbearance_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."fx_rate"
    ADD CONSTRAINT "fk_fx_rate_from_currency_code"
    FOREIGN KEY ("from_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."fx_rate"
    ADD CONSTRAINT "fk_fx_rate_to_currency_code"
    FOREIGN KEY ("to_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."gl_account_balance_snapshot"
    ADD CONSTRAINT "fk_gl_account_balance_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."gl_account_balance_snapshot"
    ADD CONSTRAINT "fk_gl_account_balance_snapshot_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."gl_journal_entry"
    ADD CONSTRAINT "fk_gl_journal_entry_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."gl_journal_entry"
    ADD CONSTRAINT "fk_gl_journal_entry_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."gl_journal_entry"
    ADD CONSTRAINT "fk_gl_journal_entry_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."instrument_master"
    ADD CONSTRAINT "fk_instrument_master_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."instrument_master"
    ADD CONSTRAINT "fk_instrument_master_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity"
    ADD CONSTRAINT "fk_legal_entity_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity_hierarchy"
    ADD CONSTRAINT "fk_legal_entity_hierarchy_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."legal_entity_hierarchy"
    ADD CONSTRAINT "fk_legal_entity_hierarchy_parent_legal_entity_id"
    FOREIGN KEY ("parent_legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_assignment_snapshot"
    ADD CONSTRAINT "fk_limit_assignment_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_assignment_snapshot"
    ADD CONSTRAINT "fk_limit_assignment_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_assignment_snapshot"
    ADD CONSTRAINT "fk_limit_assignment_snapshot_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_contribution_snapshot"
    ADD CONSTRAINT "fk_limit_contribution_snapshot_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_utilization_event"
    ADD CONSTRAINT "fk_limit_utilization_event_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."limit_utilization_event"
    ADD CONSTRAINT "fk_limit_utilization_event_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."margin_agreement"
    ADD CONSTRAINT "fk_margin_agreement_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_agreement"
    ADD CONSTRAINT "fk_netting_agreement_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_set"
    ADD CONSTRAINT "fk_netting_set_netting_agreement_id"
    FOREIGN KEY ("netting_agreement_id")
    REFERENCES "l2"."netting_agreement" ("netting_agreement_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_exposure_snapshot"
    ADD CONSTRAINT "fk_netting_set_exposure_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_link"
    ADD CONSTRAINT "fk_netting_set_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_link"
    ADD CONSTRAINT "fk_netting_set_link_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."payment_ledger"
    ADD CONSTRAINT "fk_payment_ledger_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_position_currency"
    FOREIGN KEY ("position_currency")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position_detail"
    ADD CONSTRAINT "fk_position_detail_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."protection_link"
    ADD CONSTRAINT "fk_protection_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."protection_link"
    ADD CONSTRAINT "fk_protection_link_protection_id"
    FOREIGN KEY ("protection_id")
    REFERENCES "l2"."crm_protection_master" ("protection_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_flag"
    ADD CONSTRAINT "fk_risk_flag_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_flag"
    ADD CONSTRAINT "fk_risk_flag_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_link"
    ADD CONSTRAINT "fk_risk_mitigant_link_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_link"
    ADD CONSTRAINT "fk_risk_mitigant_link_risk_mitigant_id"
    FOREIGN KEY ("risk_mitigant_id")
    REFERENCES "l2"."risk_mitigant_master" ("risk_mitigant_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_master"
    ADD CONSTRAINT "fk_risk_mitigant_master_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."risk_mitigant_master"
    ADD CONSTRAINT "fk_risk_mitigant_master_risk_mitigant_subtype_code"
    FOREIGN KEY ("risk_mitigant_subtype_code")
    REFERENCES "l1"."risk_mitigant_type_dim" ("risk_mitigant_subtype_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stress_test_breach"
    ADD CONSTRAINT "fk_stress_test_breach_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."watchlist_entry"
    ADD CONSTRAINT "fk_watchlist_entry_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."watchlist_entry"
    ADD CONSTRAINT "fk_watchlist_entry_watchlist_category_code"
    FOREIGN KEY ("watchlist_category_code")
    REFERENCES "l1"."watchlist_category_dim" ("watchlist_category_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_asset_master"
    ADD CONSTRAINT "fk_collateral_asset_master_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_entity_type_code"
    FOREIGN KEY ("entity_type_code")
    REFERENCES "l1"."entity_type_dim" ("entity_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty"
    ADD CONSTRAINT "fk_counterparty_industry_id"
    FOREIGN KEY ("industry_id")
    REFERENCES "l1"."industry_dim" ("industry_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."exposure_counterparty_attribution"
    ADD CONSTRAINT "fk_exposure_counterparty_attribution_exposure_type_id"
    FOREIGN KEY ("exposure_type_id")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_exposure_type_id"
    FOREIGN KEY ("exposure_type_id")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_lob_attribution"
    ADD CONSTRAINT "fk_facility_lob_attribution_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."netting_set_exposure_snapshot"
    ADD CONSTRAINT "fk_netting_set_exposure_snapshot_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_exposure_type_code"
    FOREIGN KEY ("exposure_type_code")
    REFERENCES "l1"."exposure_type_dim" ("exposure_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_credit_status_code"
    FOREIGN KEY ("credit_status_code")
    REFERENCES "l1"."credit_status_dim" ("credit_status_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."facility_exposure_snapshot"
    ADD CONSTRAINT "fk_facility_exposure_snapshot_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."collateral_snapshot"
    ADD CONSTRAINT "fk_collateral_snapshot_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."counterparty_rating_observation"
    ADD CONSTRAINT "fk_counterparty_rating_observation_rating_grade_id"
    FOREIGN KEY ("rating_grade_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

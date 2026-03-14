-- L1 Foreign Key Constraints
-- Generated from data-dictionary.json (76 relationships)
-- Idempotent: safe to re-run (uses EXCEPTION WHEN OTHERS)
--
-- To apply: psql -f sql/fk/fk-l1.sql

SET search_path TO l1, public;

DO $$ BEGIN
  ALTER TABLE "l1"."capital_allocation"
    ADD CONSTRAINT "fk_capital_allocation_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_maturity_bucket_id"
    FOREIGN KEY ("maturity_bucket_id")
    REFERENCES "l1"."maturity_bucket_dim" ("maturity_bucket_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_portfolio"
    ADD CONSTRAINT "fk_collateral_portfolio_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."collateral_portfolio"
    ADD CONSTRAINT "fk_collateral_portfolio_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."date_time_dim"
    ADD CONSTRAINT "fk_date_time_dim_date_id"
    FOREIGN KEY ("date_id")
    REFERENCES "l1"."date_dim" ("date_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_business_taxonomy"
    ADD CONSTRAINT "fk_enterprise_business_taxonomy_parent_segment_id"
    FOREIGN KEY ("parent_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_product_taxonomy"
    ADD CONSTRAINT "fk_enterprise_product_taxonomy_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."equity_allocation_config"
    ADD CONSTRAINT "fk_equity_allocation_config_managed_segment_id"
    FOREIGN KEY ("managed_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."industry_dim"
    ADD CONSTRAINT "fk_industry_dim_parent_industry_id"
    FOREIGN KEY ("parent_industry_id")
    REFERENCES "l1"."industry_dim" ("industry_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."instrument_identifier"
    ADD CONSTRAINT "fk_instrument_identifier_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."instrument_identifier"
    ADD CONSTRAINT "fk_instrument_identifier_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."interest_rate_index_dim"
    ADD CONSTRAINT "fk_interest_rate_index_dim_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."ledger_account_dim"
    ADD CONSTRAINT "fk_ledger_account_dim_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."ledger_account_dim"
    ADD CONSTRAINT "fk_ledger_account_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."limit_threshold"
    ADD CONSTRAINT "fk_limit_threshold_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."metric_threshold"
    ADD CONSTRAINT "fk_metric_threshold_metric_definition_id"
    FOREIGN KEY ("metric_definition_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_definition_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."model_registry_dim"
    ADD CONSTRAINT "fk_model_registry_dim_owner_org_unit_id"
    FOREIGN KEY ("owner_org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_parent_org_unit_id"
    FOREIGN KEY ("parent_org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."portfolio_dim"
    ADD CONSTRAINT "fk_portfolio_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."portfolio_dim"
    ADD CONSTRAINT "fk_portfolio_dim_parent_portfolio_id"
    FOREIGN KEY ("parent_portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_grade_dim"
    ADD CONSTRAINT "fk_rating_grade_dim_rating_scale_id"
    FOREIGN KEY ("rating_scale_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_scale_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_grade_dim"
    ADD CONSTRAINT "fk_rating_grade_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_internal_grade_id"
    FOREIGN KEY ("internal_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_model_id"
    FOREIGN KEY ("model_id")
    REFERENCES "l1"."model_registry_dim" ("model_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_scale_id"
    FOREIGN KEY ("rating_scale_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_scale_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_source_id"
    FOREIGN KEY ("rating_source_id")
    REFERENCES "l1"."rating_source" ("rating_source_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reconciliation_control"
    ADD CONSTRAINT "fk_reconciliation_control_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."region_dim"
    ADD CONSTRAINT "fk_region_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_capital_basis_dim"
    ADD CONSTRAINT "fk_regulatory_capital_basis_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_capital_requirement"
    ADD CONSTRAINT "fk_regulatory_capital_requirement_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_capital_requirement"
    ADD CONSTRAINT "fk_regulatory_capital_requirement_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_capital_requirement"
    ADD CONSTRAINT "fk_regulatory_capital_requirement_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_mapping"
    ADD CONSTRAINT "fk_regulatory_mapping_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_mapping"
    ADD CONSTRAINT "fk_regulatory_mapping_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_calculation_rule_id"
    FOREIGN KEY ("calculation_rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_report_id"
    FOREIGN KEY ("report_id")
    REFERENCES "l1"."report_registry" ("report_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."report_registry"
    ADD CONSTRAINT "fk_report_registry_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_functional_currency_code"
    FOREIGN KEY ("functional_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."risk_mitigant_type_dim"
    ADD CONSTRAINT "fk_risk_mitigant_type_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."run_control"
    ADD CONSTRAINT "fk_run_control_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_sccl_group_id"
    FOREIGN KEY ("sccl_group_id")
    REFERENCES "l1"."sccl_counterparty_group" ("sccl_group_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."validation_check_registry"
    ADD CONSTRAINT "fk_validation_check_registry_check_rule_id"
    FOREIGN KEY ("check_rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."limit_rule"
    ADD CONSTRAINT "fk_limit_rule_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_business_taxonomy"
    ADD CONSTRAINT "fk_enterprise_business_taxonomy_parent"
    FOREIGN KEY ("parent")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_product_taxonomy"
    ADD CONSTRAINT "fk_enterprise_product_taxonomy_parent"
    FOREIGN KEY ("parent")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_grade_code"
    FOREIGN KEY ("rating_grade_code")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_scenario_end_date"
    FOREIGN KEY ("scenario_end_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_scenario_start_date"
    FOREIGN KEY ("scenario_start_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_period_end_date"
    FOREIGN KEY ("period_end_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_period_start_date"
    FOREIGN KEY ("period_start_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_regulator_code"
    FOREIGN KEY ("regulator_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_report_code"
    FOREIGN KEY ("report_code")
    REFERENCES "l1"."report_registry" ("report_code");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."reconciliation_control"
    ADD CONSTRAINT "fk_reconciliation_control_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l1"."run_control"
    ADD CONSTRAINT "fk_run_control_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Migration 008a: FK constraints for L1 tables
-- Auto-generated from data dictionary relationships.
-- Each constraint wrapped in DO $$ for idempotency.
-- Total constraints: 70

-- collateral_eligibility_dim.collateral_type_id → collateral_type.collateral_type_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_eligibility_dim', 'collateral_type_id', SQLERRM;
END $$;

-- collateral_eligibility_dim.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_eligibility_dim', 'jurisdiction_code', SQLERRM;
END $$;

-- collateral_eligibility_dim.regulatory_capital_basis_id → regulatory_capital_basis_dim.regulatory_capital_basis_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_eligibility_dim"
    ADD CONSTRAINT "fk_collateral_eligibility_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_eligibility_dim', 'regulatory_capital_basis_id', SQLERRM;
END $$;

-- collateral_haircut_dim.collateral_type_id → collateral_type.collateral_type_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_haircut_dim', 'collateral_type_id', SQLERRM;
END $$;

-- collateral_haircut_dim.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_haircut_dim', 'jurisdiction_code', SQLERRM;
END $$;

-- collateral_haircut_dim.maturity_bucket_id → maturity_bucket_dim.maturity_bucket_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_maturity_bucket_id"
    FOREIGN KEY ("maturity_bucket_id")
    REFERENCES "l1"."maturity_bucket_dim" ("maturity_bucket_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_haircut_dim', 'maturity_bucket_id', SQLERRM;
END $$;

-- collateral_haircut_dim.regulatory_capital_basis_id → regulatory_capital_basis_dim.regulatory_capital_basis_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_haircut_dim"
    ADD CONSTRAINT "fk_collateral_haircut_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_haircut_dim', 'regulatory_capital_basis_id', SQLERRM;
END $$;

-- collateral_portfolio.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_portfolio"
    ADD CONSTRAINT "fk_collateral_portfolio_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio', 'lob_segment_id', SQLERRM;
END $$;

-- collateral_portfolio.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l1"."collateral_portfolio"
    ADD CONSTRAINT "fk_collateral_portfolio_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio', 'portfolio_id', SQLERRM;
END $$;

-- crm_eligibility_dim.crm_type_code → crm_type_dim.crm_type_code
DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_crm_type_code"
    FOREIGN KEY ("crm_type_code")
    REFERENCES "l1"."crm_type_dim" ("crm_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_eligibility_dim', 'crm_type_code', SQLERRM;
END $$;

-- crm_eligibility_dim.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_eligibility_dim', 'jurisdiction_code', SQLERRM;
END $$;

-- crm_eligibility_dim.regulatory_capital_basis_id → regulatory_capital_basis_dim.regulatory_capital_basis_id
DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_regulatory_capital_basis_id"
    FOREIGN KEY ("regulatory_capital_basis_id")
    REFERENCES "l1"."regulatory_capital_basis_dim" ("regulatory_capital_basis_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_eligibility_dim', 'regulatory_capital_basis_id', SQLERRM;
END $$;

-- crm_eligibility_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."crm_eligibility_dim"
    ADD CONSTRAINT "fk_crm_eligibility_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_eligibility_dim', 'source_system_id', SQLERRM;
END $$;

-- date_time_dim.date_id → date_dim.date_id
DO $$ BEGIN
  ALTER TABLE "l1"."date_time_dim"
    ADD CONSTRAINT "fk_date_time_dim_date_id"
    FOREIGN KEY ("date_id")
    REFERENCES "l1"."date_dim" ("date_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'date_time_dim', 'date_id', SQLERRM;
END $$;

-- industry_dim.parent_industry_id → industry_dim.industry_id
DO $$ BEGIN
  ALTER TABLE "l1"."industry_dim"
    ADD CONSTRAINT "fk_industry_dim_parent_industry_id"
    FOREIGN KEY ("parent_industry_id")
    REFERENCES "l1"."industry_dim" ("industry_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'industry_dim', 'parent_industry_id', SQLERRM;
END $$;

-- instrument_identifier.instrument_id → instrument_master.instrument_id
DO $$ BEGIN
  ALTER TABLE "l1"."instrument_identifier"
    ADD CONSTRAINT "fk_instrument_identifier_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'instrument_identifier', 'instrument_id', SQLERRM;
END $$;

-- instrument_identifier.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."instrument_identifier"
    ADD CONSTRAINT "fk_instrument_identifier_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'instrument_identifier', 'source_system_id', SQLERRM;
END $$;

-- limit_threshold.limit_rule_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l1"."limit_threshold"
    ADD CONSTRAINT "fk_limit_threshold_limit_rule_id"
    FOREIGN KEY ("limit_rule_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_threshold', 'limit_rule_id', SQLERRM;
END $$;

-- metric_threshold.metric_definition_id → metric_definition_dim.metric_definition_id
DO $$ BEGIN
  ALTER TABLE "l1"."metric_threshold"
    ADD CONSTRAINT "fk_metric_threshold_metric_definition_id"
    FOREIGN KEY ("metric_definition_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_definition_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_threshold', 'metric_definition_id', SQLERRM;
END $$;

-- rating_grade_dim.rating_scale_id → rating_scale_dim.rating_scale_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_grade_dim"
    ADD CONSTRAINT "fk_rating_grade_dim_rating_scale_id"
    FOREIGN KEY ("rating_scale_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_scale_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_grade_dim', 'rating_scale_id', SQLERRM;
END $$;

-- rating_mapping.internal_grade_id → rating_grade_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_internal_grade_id"
    FOREIGN KEY ("internal_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'internal_grade_id', SQLERRM;
END $$;

-- rating_mapping.rating_scale_id → rating_scale_dim.rating_scale_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_scale_id"
    FOREIGN KEY ("rating_scale_id")
    REFERENCES "l1"."rating_scale_dim" ("rating_scale_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'rating_scale_id', SQLERRM;
END $$;

-- rating_mapping.rating_source_id → rating_source.rating_source_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_source_id"
    FOREIGN KEY ("rating_source_id")
    REFERENCES "l1"."rating_source" ("rating_source_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'rating_source_id', SQLERRM;
END $$;

-- reconciliation_control.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."reconciliation_control"
    ADD CONSTRAINT "fk_reconciliation_control_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reconciliation_control', 'source_system_id', SQLERRM;
END $$;

-- regulatory_mapping.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_mapping"
    ADD CONSTRAINT "fk_regulatory_mapping_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_mapping', 'jurisdiction_code', SQLERRM;
END $$;

-- report_cell_definition.report_id → report_registry.report_id
DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_report_id"
    FOREIGN KEY ("report_id")
    REFERENCES "l1"."report_registry" ("report_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_definition', 'report_id', SQLERRM;
END $$;

-- reporting_entity_dim.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_entity_dim', 'legal_entity_id', SQLERRM;
END $$;

-- run_control.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."run_control"
    ADD CONSTRAINT "fk_run_control_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'run_control', 'source_system_id', SQLERRM;
END $$;

-- sccl_counterparty_group_member.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group_member', 'counterparty_id', SQLERRM;
END $$;

-- sccl_counterparty_group_member.sccl_group_id → sccl_counterparty_group.sccl_group_id
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_sccl_group_id"
    FOREIGN KEY ("sccl_group_id")
    REFERENCES "l1"."sccl_counterparty_group" ("sccl_group_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group_member', 'sccl_group_id', SQLERRM;
END $$;

-- scenario_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'scenario_dim', 'source_system_id', SQLERRM;
END $$;

-- validation_check_registry.check_rule_id → rule_registry.rule_id
DO $$ BEGIN
  ALTER TABLE "l1"."validation_check_registry"
    ADD CONSTRAINT "fk_validation_check_registry_check_rule_id"
    FOREIGN KEY ("check_rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'validation_check_registry', 'check_rule_id', SQLERRM;
END $$;

-- sccl_counterparty_group.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group', 'as_of_date', SQLERRM;
END $$;

-- sccl_counterparty_group.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group', 'jurisdiction_code', SQLERRM;
END $$;

-- sccl_counterparty_group.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group"
    ADD CONSTRAINT "fk_sccl_counterparty_group_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group', 'run_version_id', SQLERRM;
END $$;

-- sccl_counterparty_group_member.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."sccl_counterparty_group_member"
    ADD CONSTRAINT "fk_sccl_counterparty_group_member_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'sccl_counterparty_group_member', 'source_system_id', SQLERRM;
END $$;

-- risk_mitigant_type_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."risk_mitigant_type_dim"
    ADD CONSTRAINT "fk_risk_mitigant_type_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_mitigant_type_dim', 'source_system_id', SQLERRM;
END $$;

-- limit_rule.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."limit_rule"
    ADD CONSTRAINT "fk_limit_rule_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_rule', 'lob_segment_id', SQLERRM;
END $$;

-- reporting_entity_dim.functional_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_functional_currency_code"
    FOREIGN KEY ("functional_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_entity_dim', 'functional_currency_code', SQLERRM;
END $$;

-- reporting_entity_dim.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_entity_dim"
    ADD CONSTRAINT "fk_reporting_entity_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_entity_dim', 'jurisdiction_code', SQLERRM;
END $$;

-- org_unit_dim.parent_org_unit_id → org_unit_dim.org_unit_id
DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_parent_org_unit_id"
    FOREIGN KEY ("parent_org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'org_unit_dim', 'parent_org_unit_id', SQLERRM;
END $$;

-- org_unit_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'org_unit_dim', 'source_system_id', SQLERRM;
END $$;

-- org_unit_dim.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."org_unit_dim"
    ADD CONSTRAINT "fk_org_unit_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'org_unit_dim', 'lob_segment_id', SQLERRM;
END $$;

-- enterprise_business_taxonomy.parent → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_business_taxonomy"
    ADD CONSTRAINT "fk_enterprise_business_taxonomy_parent"
    FOREIGN KEY ("parent")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'enterprise_business_taxonomy', 'parent', SQLERRM;
END $$;

-- enterprise_product_taxonomy.parent → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_product_taxonomy"
    ADD CONSTRAINT "fk_enterprise_product_taxonomy_parent"
    FOREIGN KEY ("parent")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'enterprise_product_taxonomy', 'parent', SQLERRM;
END $$;

-- enterprise_product_taxonomy.fr2590_category_code → fr2590_category_dim.fr2590_category_code
DO $$ BEGIN
  ALTER TABLE "l1"."enterprise_product_taxonomy"
    ADD CONSTRAINT "fk_enterprise_product_taxonomy_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'enterprise_product_taxonomy', 'fr2590_category_code', SQLERRM;
END $$;

-- portfolio_dim.parent_portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l1"."portfolio_dim"
    ADD CONSTRAINT "fk_portfolio_dim_parent_portfolio_id"
    FOREIGN KEY ("parent_portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_dim', 'parent_portfolio_id', SQLERRM;
END $$;

-- portfolio_dim.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."portfolio_dim"
    ADD CONSTRAINT "fk_portfolio_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_dim', 'lob_segment_id', SQLERRM;
END $$;

-- rating_grade_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_grade_dim"
    ADD CONSTRAINT "fk_rating_grade_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_grade_dim', 'source_system_id', SQLERRM;
END $$;

-- rating_mapping.model_id → model_registry_dim.model_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_model_id"
    FOREIGN KEY ("model_id")
    REFERENCES "l1"."model_registry_dim" ("model_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'model_id', SQLERRM;
END $$;

-- rating_mapping.rating_grade_code → rating_grade_dim.rating_grade_code
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_rating_grade_code"
    FOREIGN KEY ("rating_grade_code")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'rating_grade_code', SQLERRM;
END $$;

-- rating_mapping.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."rating_mapping"
    ADD CONSTRAINT "fk_rating_mapping_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_mapping', 'source_system_id', SQLERRM;
END $$;

-- scenario_dim.scenario_end_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_scenario_end_date"
    FOREIGN KEY ("scenario_end_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'scenario_dim', 'scenario_end_date', SQLERRM;
END $$;

-- scenario_dim.scenario_start_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."scenario_dim"
    ADD CONSTRAINT "fk_scenario_dim_scenario_start_date"
    FOREIGN KEY ("scenario_start_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'scenario_dim', 'scenario_start_date', SQLERRM;
END $$;

-- interest_rate_index_dim.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l1"."interest_rate_index_dim"
    ADD CONSTRAINT "fk_interest_rate_index_dim_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'interest_rate_index_dim', 'currency_code', SQLERRM;
END $$;

-- ledger_account_dim.lob_segment_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l1"."ledger_account_dim"
    ADD CONSTRAINT "fk_ledger_account_dim_lob_segment_id"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ledger_account_dim', 'lob_segment_id', SQLERRM;
END $$;

-- ledger_account_dim.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l1"."ledger_account_dim"
    ADD CONSTRAINT "fk_ledger_account_dim_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ledger_account_dim', 'currency_code', SQLERRM;
END $$;

-- reporting_calendar_dim.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_calendar_dim', 'as_of_date', SQLERRM;
END $$;

-- reporting_calendar_dim.period_end_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_period_end_date"
    FOREIGN KEY ("period_end_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_calendar_dim', 'period_end_date', SQLERRM;
END $$;

-- reporting_calendar_dim.period_start_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_period_start_date"
    FOREIGN KEY ("period_start_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_calendar_dim', 'period_start_date', SQLERRM;
END $$;

-- reporting_calendar_dim.regulator_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."reporting_calendar_dim"
    ADD CONSTRAINT "fk_reporting_calendar_dim_regulator_code"
    FOREIGN KEY ("regulator_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reporting_calendar_dim', 'regulator_code', SQLERRM;
END $$;

-- region_dim.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."region_dim"
    ADD CONSTRAINT "fk_region_dim_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'region_dim', 'source_system_id', SQLERRM;
END $$;

-- regulatory_capital_basis_dim.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_capital_basis_dim"
    ADD CONSTRAINT "fk_regulatory_capital_basis_dim_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_capital_basis_dim', 'jurisdiction_code', SQLERRM;
END $$;

-- regulatory_mapping.source_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l1"."regulatory_mapping"
    ADD CONSTRAINT "fk_regulatory_mapping_source_system_id"
    FOREIGN KEY ("source_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_mapping', 'source_system_id', SQLERRM;
END $$;

-- report_cell_definition.calculation_rule_id → rule_registry.rule_id
DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_calculation_rule_id"
    FOREIGN KEY ("calculation_rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_definition', 'calculation_rule_id', SQLERRM;
END $$;

-- report_cell_definition.report_code → report_registry.report_code
DO $$ BEGIN
  ALTER TABLE "l1"."report_cell_definition"
    ADD CONSTRAINT "fk_report_cell_definition_report_code"
    FOREIGN KEY ("report_code")
    REFERENCES "l1"."report_registry" ("report_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_definition', 'report_code', SQLERRM;
END $$;

-- model_registry_dim.owner_org_unit_id → org_unit_dim.org_unit_id
DO $$ BEGIN
  ALTER TABLE "l1"."model_registry_dim"
    ADD CONSTRAINT "fk_model_registry_dim_owner_org_unit_id"
    FOREIGN KEY ("owner_org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'model_registry_dim', 'owner_org_unit_id', SQLERRM;
END $$;

-- reconciliation_control.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l1"."reconciliation_control"
    ADD CONSTRAINT "fk_reconciliation_control_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'reconciliation_control', 'run_version_id', SQLERRM;
END $$;

-- report_registry.jurisdiction_code → regulatory_jurisdiction.jurisdiction_code
DO $$ BEGIN
  ALTER TABLE "l1"."report_registry"
    ADD CONSTRAINT "fk_report_registry_jurisdiction_code"
    FOREIGN KEY ("jurisdiction_code")
    REFERENCES "l1"."regulatory_jurisdiction" ("jurisdiction_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_registry', 'jurisdiction_code', SQLERRM;
END $$;

-- run_control.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l1"."run_control"
    ADD CONSTRAINT "fk_run_control_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'run_control', 'as_of_date', SQLERRM;
END $$;

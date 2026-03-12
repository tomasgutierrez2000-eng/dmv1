-- Migration 008c: FK constraints for L3 tables
-- Auto-generated from data dictionary relationships.
-- Each constraint wrapped in DO $$ for idempotency.
-- Total constraints: 264

SET search_path TO l1, l2, l3, public;

-- calc_audit_log.run_id → calc_run.run_id
DO $$ BEGIN
  ALTER TABLE "l3"."calc_audit_log"
    ADD CONSTRAINT "fk_calc_audit_log_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'calc_audit_log', 'run_id', SQLERRM;
END $$;

-- calc_validation_result.run_id → calc_run.run_id
DO $$ BEGIN
  ALTER TABLE "l3"."calc_validation_result"
    ADD CONSTRAINT "fk_calc_validation_result_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'calc_validation_result', 'run_id', SQLERRM;
END $$;

-- metric_result.run_id → calc_run.run_id
DO $$ BEGIN
  ALTER TABLE "l3"."metric_result"
    ADD CONSTRAINT "fk_metric_result_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_result', 'run_id', SQLERRM;
END $$;

-- exposure_metric_cube.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'run_version_id', SQLERRM;
END $$;

-- exposure_metric_cube.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'scenario_id', SQLERRM;
END $$;

-- exposure_metric_cube.org_unit_id → org_unit_dim.org_unit_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_org_unit_id"
    FOREIGN KEY ("org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'org_unit_id', SQLERRM;
END $$;

-- exposure_metric_cube.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'portfolio_id', SQLERRM;
END $$;

-- exposure_metric_cube.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'country_code', SQLERRM;
END $$;

-- exposure_metric_cube.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'currency_code', SQLERRM;
END $$;

-- exposure_metric_cube.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'base_currency_code', SQLERRM;
END $$;

-- risk_metric_cube.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'run_version_id', SQLERRM;
END $$;

-- risk_metric_cube.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'scenario_id', SQLERRM;
END $$;

-- risk_metric_cube.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'portfolio_id', SQLERRM;
END $$;

-- risk_metric_cube.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'currency_code', SQLERRM;
END $$;

-- risk_metric_cube.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'base_currency_code', SQLERRM;
END $$;

-- risk_metric_cube.model_id → model_registry_dim.model_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_model_id"
    FOREIGN KEY ("model_id")
    REFERENCES "l1"."model_registry_dim" ("model_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'model_id', SQLERRM;
END $$;

-- risk_metric_cube.rating_grade_id → rating_grade_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_rating_grade_id"
    FOREIGN KEY ("rating_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'rating_grade_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'run_version_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'scenario_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.sccl_group_id → sccl_counterparty_group.sccl_group_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_sccl_group_id"
    FOREIGN KEY ("sccl_group_id")
    REFERENCES "l1"."sccl_counterparty_group" ("sccl_group_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'sccl_group_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'country_code', SQLERRM;
END $$;

-- counterparty_exposure_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'base_currency_code', SQLERRM;
END $$;

-- counterparty_exposure_summary.region_code → region_dim.region_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_region_code"
    FOREIGN KEY ("region_code")
    REFERENCES "l1"."region_dim" ("region_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'region_code', SQLERRM;
END $$;

-- counterparty_exposure_summary.industry_code → industry_dim.industry_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_industry_code"
    FOREIGN KEY ("industry_code")
    REFERENCES "l1"."industry_dim" ("industry_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'industry_code', SQLERRM;
END $$;

-- facility_exposure_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'run_version_id', SQLERRM;
END $$;

-- facility_exposure_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'scenario_id', SQLERRM;
END $$;

-- facility_exposure_summary.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'portfolio_id', SQLERRM;
END $$;

-- facility_exposure_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'base_currency_code', SQLERRM;
END $$;

-- portfolio_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'run_version_id', SQLERRM;
END $$;

-- portfolio_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'scenario_id', SQLERRM;
END $$;

-- portfolio_summary.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'portfolio_id', SQLERRM;
END $$;

-- portfolio_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'base_currency_code', SQLERRM;
END $$;

-- crm_allocation_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'run_version_id', SQLERRM;
END $$;

-- crm_allocation_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'scenario_id', SQLERRM;
END $$;

-- crm_allocation_summary.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'currency_code', SQLERRM;
END $$;

-- crm_allocation_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'base_currency_code', SQLERRM;
END $$;

-- crm_allocation_summary.risk_mitigant_subtype_code → risk_mitigant_type_dim.risk_mitigant_subtype_code
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_risk_mitigant_subtype_code"
    FOREIGN KEY ("risk_mitigant_subtype_code")
    REFERENCES "l1"."risk_mitigant_type_dim" ("risk_mitigant_subtype_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'risk_mitigant_subtype_code', SQLERRM;
END $$;

-- collateral_portfolio_valuation.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'run_version_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'scenario_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'portfolio_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.collateral_type_id → collateral_type.collateral_type_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_collateral_type_id"
    FOREIGN KEY ("collateral_type_id")
    REFERENCES "l1"."collateral_type" ("collateral_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'collateral_type_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'base_currency_code', SQLERRM;
END $$;

-- limit_current_state.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'run_version_id', SQLERRM;
END $$;

-- limit_current_state.limit_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_limit_currency_code"
    FOREIGN KEY ("limit_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'limit_currency_code', SQLERRM;
END $$;

-- limit_utilization_timeseries.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_utilization_timeseries"
    ADD CONSTRAINT "fk_limit_utilization_timeseries_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_timeseries', 'run_version_id', SQLERRM;
END $$;

-- limit_utilization_timeseries.limit_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."limit_utilization_timeseries"
    ADD CONSTRAINT "fk_limit_utilization_timeseries_limit_currency_code"
    FOREIGN KEY ("limit_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_timeseries', 'limit_currency_code', SQLERRM;
END $$;

-- limit_attribution_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'run_version_id', SQLERRM;
END $$;

-- limit_attribution_summary.portfolio_id → portfolio_dim.portfolio_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'portfolio_id', SQLERRM;
END $$;

-- limit_attribution_summary.org_unit_id → org_unit_dim.org_unit_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_org_unit_id"
    FOREIGN KEY ("org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'org_unit_id', SQLERRM;
END $$;

-- limit_breach_fact.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_breach_fact"
    ADD CONSTRAINT "fk_limit_breach_fact_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_breach_fact', 'run_version_id', SQLERRM;
END $$;

-- credit_event_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'run_version_id', SQLERRM;
END $$;

-- credit_event_summary.credit_event_type_id → credit_event_type_dim.credit_event_type_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_credit_event_type_id"
    FOREIGN KEY ("credit_event_type_id")
    REFERENCES "l1"."credit_event_type_dim" ("credit_event_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'credit_event_type_id', SQLERRM;
END $$;

-- credit_event_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'base_currency_code', SQLERRM;
END $$;

-- rating_migration_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'run_version_id', SQLERRM;
END $$;

-- rating_migration_summary.rating_source_id → rating_source.rating_source_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_rating_source_id"
    FOREIGN KEY ("rating_source_id")
    REFERENCES "l1"."rating_source" ("rating_source_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'rating_source_id', SQLERRM;
END $$;

-- rating_migration_summary.from_rating_grade_id → rating_grade_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_from_rating_grade_id"
    FOREIGN KEY ("from_rating_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'from_rating_grade_id', SQLERRM;
END $$;

-- rating_migration_summary.to_rating_grade_id → rating_grade_dim.rating_grade_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_to_rating_grade_id"
    FOREIGN KEY ("to_rating_grade_id")
    REFERENCES "l1"."rating_grade_dim" ("rating_grade_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'to_rating_grade_id', SQLERRM;
END $$;

-- rating_migration_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'base_currency_code', SQLERRM;
END $$;

-- default_loss_recovery_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'run_version_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'base_currency_code', SQLERRM;
END $$;

-- report_run.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_run"
    ADD CONSTRAINT "fk_report_run_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_run', 'run_version_id', SQLERRM;
END $$;

-- report_run.report_code → report_registry.report_code
DO $$ BEGIN
  ALTER TABLE "l3"."report_run"
    ADD CONSTRAINT "fk_report_run_report_code"
    FOREIGN KEY ("report_code")
    REFERENCES "l1"."report_registry" ("report_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_run', 'report_code', SQLERRM;
END $$;

-- report_run.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_run"
    ADD CONSTRAINT "fk_report_run_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_run', 'scenario_id', SQLERRM;
END $$;

-- report_run.produced_by_system_id → source_system_registry.source_system_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_run"
    ADD CONSTRAINT "fk_report_run_produced_by_system_id"
    FOREIGN KEY ("produced_by_system_id")
    REFERENCES "l1"."source_system_registry" ("source_system_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_run', 'produced_by_system_id', SQLERRM;
END $$;

-- report_cell_value.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_value"
    ADD CONSTRAINT "fk_report_cell_value_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_value', 'report_run_id', SQLERRM;
END $$;

-- report_cell_value.cell_id → report_cell_definition.cell_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_value"
    ADD CONSTRAINT "fk_report_cell_value_cell_id"
    FOREIGN KEY ("cell_id")
    REFERENCES "l1"."report_cell_definition" ("cell_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_value', 'cell_id', SQLERRM;
END $$;

-- report_cell_value.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_value"
    ADD CONSTRAINT "fk_report_cell_value_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_value', 'currency_code', SQLERRM;
END $$;

-- report_cell_value.calculation_rule_id → rule_registry.rule_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_value"
    ADD CONSTRAINT "fk_report_cell_value_calculation_rule_id"
    FOREIGN KEY ("calculation_rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_value', 'calculation_rule_id', SQLERRM;
END $$;

-- report_cell_contribution_fact.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'report_run_id', SQLERRM;
END $$;

-- report_cell_contribution_fact.cell_id → report_cell_definition.cell_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_cell_id"
    FOREIGN KEY ("cell_id")
    REFERENCES "l1"."report_cell_definition" ("cell_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'cell_id', SQLERRM;
END $$;

-- report_cell_contribution_fact.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'currency_code', SQLERRM;
END $$;

-- report_cell_contribution_fact.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'base_currency_code', SQLERRM;
END $$;

-- report_cell_contribution_fact.rule_id → rule_registry.rule_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_rule_id"
    FOREIGN KEY ("rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'rule_id', SQLERRM;
END $$;

-- report_cell_rule_execution.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_rule_execution"
    ADD CONSTRAINT "fk_report_cell_rule_execution_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_rule_execution', 'report_run_id', SQLERRM;
END $$;

-- report_cell_rule_execution.cell_id → report_cell_definition.cell_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_rule_execution"
    ADD CONSTRAINT "fk_report_cell_rule_execution_cell_id"
    FOREIGN KEY ("cell_id")
    REFERENCES "l1"."report_cell_definition" ("cell_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_rule_execution', 'cell_id', SQLERRM;
END $$;

-- report_cell_rule_execution.rule_id → rule_registry.rule_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_rule_execution"
    ADD CONSTRAINT "fk_report_cell_rule_execution_rule_id"
    FOREIGN KEY ("rule_id")
    REFERENCES "l1"."rule_registry" ("rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_rule_execution', 'rule_id', SQLERRM;
END $$;

-- report_validation_result.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_validation_result"
    ADD CONSTRAINT "fk_report_validation_result_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_validation_result', 'report_run_id', SQLERRM;
END $$;

-- report_validation_result.validation_check_id → validation_check_registry.validation_check_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_validation_result"
    ADD CONSTRAINT "fk_report_validation_result_validation_check_id"
    FOREIGN KEY ("validation_check_id")
    REFERENCES "l1"."validation_check_registry" ("validation_check_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_validation_result', 'validation_check_id', SQLERRM;
END $$;

-- report_validation_result.cell_id → report_cell_definition.cell_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_validation_result"
    ADD CONSTRAINT "fk_report_validation_result_cell_id"
    FOREIGN KEY ("cell_id")
    REFERENCES "l1"."report_cell_definition" ("cell_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_validation_result', 'cell_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'report_run_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.position_id → position.position_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'position_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'country_code', SQLERRM;
END $$;

-- fr2590_position_snapshot.currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_currency_code"
    FOREIGN KEY ("currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'currency_code', SQLERRM;
END $$;

-- fr2590_position_snapshot.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'base_currency_code', SQLERRM;
END $$;

-- fr2590_position_snapshot.mdrm_id → regulatory_mapping.mdrm_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_mdrm_id"
    FOREIGN KEY ("mdrm_id")
    REFERENCES "l1"."regulatory_mapping" ("mdrm_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'mdrm_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.fr2590_category_code → fr2590_category_dim.fr2590_category_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'fr2590_category_code', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.report_run_id → report_run.report_run_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_report_run_id"
    FOREIGN KEY ("report_run_id")
    REFERENCES "l3"."report_run" ("report_run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'report_run_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'country_code', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'base_currency_code', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.fr2590_category_code → fr2590_category_dim.fr2590_category_code
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_fr2590_category_code"
    FOREIGN KEY ("fr2590_category_code")
    REFERENCES "l1"."fr2590_category_dim" ("fr2590_category_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'fr2590_category_code', SQLERRM;
END $$;

-- lob_exposure_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_exposure_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'scenario_id', SQLERRM;
END $$;

-- lob_exposure_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_profitability_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_profitability_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_profitability_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_profitability_summary.period_start_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_period_start_date"
    FOREIGN KEY ("period_start_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'period_start_date', SQLERRM;
END $$;

-- lob_profitability_summary.period_end_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_period_end_date"
    FOREIGN KEY ("period_end_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'period_end_date', SQLERRM;
END $$;

-- lob_pricing_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_pricing_summary"
    ADD CONSTRAINT "fk_lob_pricing_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_pricing_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_pricing_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_pricing_summary"
    ADD CONSTRAINT "fk_lob_pricing_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_pricing_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_pricing_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_pricing_summary"
    ADD CONSTRAINT "fk_lob_pricing_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_pricing_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_delinquency_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD CONSTRAINT "fk_lob_delinquency_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_delinquency_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_delinquency_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD CONSTRAINT "fk_lob_delinquency_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_delinquency_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_delinquency_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD CONSTRAINT "fk_lob_delinquency_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_delinquency_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_profitability_allocation_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_allocation_summary"
    ADD CONSTRAINT "fk_lob_profitability_allocation_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_allocation_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_profitability_allocation_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_allocation_summary"
    ADD CONSTRAINT "fk_lob_profitability_allocation_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_allocation_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_profitability_allocation_summary.allocation_dim_id → region_dim.region_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_allocation_summary"
    ADD CONSTRAINT "fk_lob_profitability_allocation_summary_allocation_dim_id"
    FOREIGN KEY ("allocation_dim_id")
    REFERENCES "l1"."region_dim" ("region_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_allocation_summary', 'allocation_dim_id', SQLERRM;
END $$;

-- deal_pipeline_stage_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."deal_pipeline_stage_summary"
    ADD CONSTRAINT "fk_deal_pipeline_stage_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_stage_summary', 'run_version_id', SQLERRM;
END $$;

-- deal_pipeline_stage_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."deal_pipeline_stage_summary"
    ADD CONSTRAINT "fk_deal_pipeline_stage_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_stage_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_credit_quality_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_credit_quality_summary"
    ADD CONSTRAINT "fk_lob_credit_quality_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_credit_quality_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_credit_quality_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_credit_quality_summary"
    ADD CONSTRAINT "fk_lob_credit_quality_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_credit_quality_summary', 'as_of_date', SQLERRM;
END $$;

-- kpi_period_summary.kpi_code → metric_definition_dim.metric_code
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_kpi_code"
    FOREIGN KEY ("kpi_code")
    REFERENCES "l1"."metric_definition_dim" ("metric_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'kpi_code', SQLERRM;
END $$;

-- kpi_period_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'as_of_date', SQLERRM;
END $$;

-- kpi_period_summary.prior_as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_prior_as_of_date"
    FOREIGN KEY ("prior_as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'prior_as_of_date', SQLERRM;
END $$;

-- kpi_period_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'scenario_id', SQLERRM;
END $$;

-- kpi_period_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'base_currency_code', SQLERRM;
END $$;

-- kpi_period_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'run_version_id', SQLERRM;
END $$;

-- risk_appetite_metric_state.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_appetite_metric_state"
    ADD CONSTRAINT "fk_risk_appetite_metric_state_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_appetite_metric_state', 'run_version_id', SQLERRM;
END $$;

-- risk_appetite_metric_state.metric_id → metric_definition_dim.metric_code
DO $$ BEGIN
  ALTER TABLE "l3"."risk_appetite_metric_state"
    ADD CONSTRAINT "fk_risk_appetite_metric_state_metric_id"
    FOREIGN KEY ("metric_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_appetite_metric_state', 'metric_id', SQLERRM;
END $$;

-- risk_appetite_metric_state.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."risk_appetite_metric_state"
    ADD CONSTRAINT "fk_risk_appetite_metric_state_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_appetite_metric_state', 'base_currency_code', SQLERRM;
END $$;

-- executive_highlight_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."executive_highlight_summary"
    ADD CONSTRAINT "fk_executive_highlight_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'executive_highlight_summary', 'run_version_id', SQLERRM;
END $$;

-- executive_highlight_summary.source_metric_id → metric_definition_dim.metric_code
DO $$ BEGIN
  ALTER TABLE "l3"."executive_highlight_summary"
    ADD CONSTRAINT "fk_executive_highlight_summary_source_metric_id"
    FOREIGN KEY ("source_metric_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'executive_highlight_summary', 'source_metric_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'run_version_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.country_code → country_dim.country_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_country_code"
    FOREIGN KEY ("country_code")
    REFERENCES "l1"."country_dim" ("country_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'country_code', SQLERRM;
END $$;

-- counterparty_detail_snapshot.region_code → region_dim.region_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_region_code"
    FOREIGN KEY ("region_code")
    REFERENCES "l1"."region_dim" ("region_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'region_code', SQLERRM;
END $$;

-- counterparty_detail_snapshot.industry_code → industry_dim.industry_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_industry_code"
    FOREIGN KEY ("industry_code")
    REFERENCES "l1"."industry_dim" ("industry_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'industry_code', SQLERRM;
END $$;

-- counterparty_detail_snapshot.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'base_currency_code', SQLERRM;
END $$;

-- limit_tier_status_matrix.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_tier_status_matrix"
    ADD CONSTRAINT "fk_limit_tier_status_matrix_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_tier_status_matrix', 'run_version_id', SQLERRM;
END $$;

-- limit_tier_status_matrix.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."limit_tier_status_matrix"
    ADD CONSTRAINT "fk_limit_tier_status_matrix_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_tier_status_matrix', 'base_currency_code', SQLERRM;
END $$;

-- limit_counterparty_movement.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_counterparty_movement"
    ADD CONSTRAINT "fk_limit_counterparty_movement_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_counterparty_movement', 'run_version_id', SQLERRM;
END $$;

-- data_quality_score_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_score_summary"
    ADD CONSTRAINT "fk_data_quality_score_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_score_summary', 'run_version_id', SQLERRM;
END $$;

-- legal_entity_risk_profile.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."legal_entity_risk_profile"
    ADD CONSTRAINT "fk_legal_entity_risk_profile_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_risk_profile', 'run_version_id', SQLERRM;
END $$;

-- legal_entity_risk_profile.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."legal_entity_risk_profile"
    ADD CONSTRAINT "fk_legal_entity_risk_profile_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_risk_profile', 'base_currency_code', SQLERRM;
END $$;

-- data_quality_attribute_score.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_attribute_score"
    ADD CONSTRAINT "fk_data_quality_attribute_score_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_attribute_score', 'run_version_id', SQLERRM;
END $$;

-- data_quality_trend.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_trend"
    ADD CONSTRAINT "fk_data_quality_trend_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_trend', 'run_version_id', SQLERRM;
END $$;

-- stress_test_result_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result_summary"
    ADD CONSTRAINT "fk_stress_test_result_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result_summary', 'run_version_id', SQLERRM;
END $$;

-- stress_test_result_summary.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result_summary"
    ADD CONSTRAINT "fk_stress_test_result_summary_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result_summary', 'scenario_id', SQLERRM;
END $$;

-- stress_test_result_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result_summary"
    ADD CONSTRAINT "fk_stress_test_result_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result_summary', 'base_currency_code', SQLERRM;
END $$;

-- stress_test_breach_detail.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_breach_detail"
    ADD CONSTRAINT "fk_stress_test_breach_detail_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach_detail', 'run_version_id', SQLERRM;
END $$;

-- stress_test_breach_detail.scenario_id → scenario_dim.scenario_id
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_breach_detail"
    ADD CONSTRAINT "fk_stress_test_breach_detail_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach_detail', 'scenario_id', SQLERRM;
END $$;

-- regulatory_compliance_state.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."regulatory_compliance_state"
    ADD CONSTRAINT "fk_regulatory_compliance_state_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_compliance_state', 'run_version_id', SQLERRM;
END $$;

-- regulatory_compliance_state.metric_id → metric_definition_dim.metric_code
DO $$ BEGIN
  ALTER TABLE "l3"."regulatory_compliance_state"
    ADD CONSTRAINT "fk_regulatory_compliance_state_metric_id"
    FOREIGN KEY ("metric_id")
    REFERENCES "l1"."metric_definition_dim" ("metric_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_compliance_state', 'metric_id', SQLERRM;
END $$;

-- regulatory_compliance_state.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."regulatory_compliance_state"
    ADD CONSTRAINT "fk_regulatory_compliance_state_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_compliance_state', 'base_currency_code', SQLERRM;
END $$;

-- facility_timeline_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_timeline_summary"
    ADD CONSTRAINT "fk_facility_timeline_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_timeline_summary', 'run_version_id', SQLERRM;
END $$;

-- facility_timeline_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_timeline_summary"
    ADD CONSTRAINT "fk_facility_timeline_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_timeline_summary', 'base_currency_code', SQLERRM;
END $$;

-- amendment_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_summary"
    ADD CONSTRAINT "fk_amendment_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_summary', 'run_version_id', SQLERRM;
END $$;

-- amendment_summary.amendment_type_code → amendment_type_dim.amendment_type_code
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_summary"
    ADD CONSTRAINT "fk_amendment_summary_amendment_type_code"
    FOREIGN KEY ("amendment_type_code")
    REFERENCES "l1"."amendment_type_dim" ("amendment_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_summary', 'amendment_type_code', SQLERRM;
END $$;

-- amendment_summary.amendment_status_code → amendment_status_dim.amendment_status_code
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_summary"
    ADD CONSTRAINT "fk_amendment_summary_amendment_status_code"
    FOREIGN KEY ("amendment_status_code")
    REFERENCES "l1"."amendment_status_dim" ("amendment_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_summary', 'amendment_status_code', SQLERRM;
END $$;

-- amendment_detail.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'run_version_id', SQLERRM;
END $$;

-- amendment_detail.amendment_event_id → amendment_event.amendment_event_id
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_amendment_event_id"
    FOREIGN KEY ("amendment_event_id")
    REFERENCES "l2"."amendment_event" ("amendment_event_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'amendment_event_id', SQLERRM;
END $$;

-- amendment_detail.amendment_type_code → amendment_type_dim.amendment_type_code
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_amendment_type_code"
    FOREIGN KEY ("amendment_type_code")
    REFERENCES "l1"."amendment_type_dim" ("amendment_type_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'amendment_type_code', SQLERRM;
END $$;

-- amendment_detail.amendment_status_code → amendment_status_dim.amendment_status_code
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_amendment_status_code"
    FOREIGN KEY ("amendment_status_code")
    REFERENCES "l1"."amendment_status_dim" ("amendment_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'amendment_status_code', SQLERRM;
END $$;

-- facility_detail_snapshot.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'run_version_id', SQLERRM;
END $$;

-- facility_detail_snapshot.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'base_currency_code', SQLERRM;
END $$;

-- lob_risk_ratio_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_risk_ratio_summary"
    ADD CONSTRAINT "fk_lob_risk_ratio_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_risk_ratio_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_risk_ratio_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_risk_ratio_summary"
    ADD CONSTRAINT "fk_lob_risk_ratio_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_risk_ratio_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_risk_ratio_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_risk_ratio_summary"
    ADD CONSTRAINT "fk_lob_risk_ratio_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_risk_ratio_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_deterioration_summary.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_deterioration_summary"
    ADD CONSTRAINT "fk_lob_deterioration_summary_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_deterioration_summary', 'run_version_id', SQLERRM;
END $$;

-- lob_deterioration_summary.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_deterioration_summary"
    ADD CONSTRAINT "fk_lob_deterioration_summary_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_deterioration_summary', 'as_of_date', SQLERRM;
END $$;

-- lob_deterioration_summary.base_currency_code → currency_dim.currency_code
DO $$ BEGIN
  ALTER TABLE "l3"."lob_deterioration_summary"
    ADD CONSTRAINT "fk_lob_deterioration_summary_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_deterioration_summary', 'base_currency_code', SQLERRM;
END $$;

-- lob_rating_distribution.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_rating_distribution"
    ADD CONSTRAINT "fk_lob_rating_distribution_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_rating_distribution', 'run_version_id', SQLERRM;
END $$;

-- lob_rating_distribution.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_rating_distribution"
    ADD CONSTRAINT "fk_lob_rating_distribution_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_rating_distribution', 'as_of_date', SQLERRM;
END $$;

-- lob_top_contributors.run_version_id → run_control.run_version_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_top_contributors"
    ADD CONSTRAINT "fk_lob_top_contributors_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_top_contributors', 'run_version_id', SQLERRM;
END $$;

-- lob_top_contributors.as_of_date → date_dim.calendar_date
DO $$ BEGIN
  ALTER TABLE "l3"."lob_top_contributors"
    ADD CONSTRAINT "fk_lob_top_contributors_as_of_date"
    FOREIGN KEY ("as_of_date")
    REFERENCES "l1"."date_dim" ("calendar_date");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_top_contributors', 'as_of_date', SQLERRM;
END $$;

-- exposure_metric_cube.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'product_node_id', SQLERRM;
END $$;

-- exposure_metric_cube.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'lob_node_id', SQLERRM;
END $$;

-- risk_metric_cube.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'product_node_id', SQLERRM;
END $$;

-- risk_metric_cube.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'lob_node_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'lob_node_id', SQLERRM;
END $$;

-- facility_exposure_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'lob_node_id', SQLERRM;
END $$;

-- portfolio_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'lob_node_id', SQLERRM;
END $$;

-- crm_allocation_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'lob_node_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'lob_node_id', SQLERRM;
END $$;

-- limit_current_state.limit_definition_id → limit_rule.limit_rule_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_limit_definition_id"
    FOREIGN KEY ("limit_definition_id")
    REFERENCES "l1"."limit_rule" ("limit_rule_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'limit_definition_id', SQLERRM;
END $$;

-- limit_current_state.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'lob_node_id', SQLERRM;
END $$;

-- limit_utilization_timeseries.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_utilization_timeseries"
    ADD CONSTRAINT "fk_limit_utilization_timeseries_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_timeseries', 'lob_node_id', SQLERRM;
END $$;

-- limit_attribution_summary.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'product_node_id', SQLERRM;
END $$;

-- limit_attribution_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'lob_node_id', SQLERRM;
END $$;

-- limit_breach_fact.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_breach_fact"
    ADD CONSTRAINT "fk_limit_breach_fact_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_breach_fact', 'lob_node_id', SQLERRM;
END $$;

-- credit_event_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'lob_node_id', SQLERRM;
END $$;

-- rating_migration_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'lob_node_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'lob_node_id', SQLERRM;
END $$;

-- report_cell_contribution_fact.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'lob_node_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'product_node_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'lob_node_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.product_node_id → enterprise_product_taxonomy.product_node_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'product_node_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'lob_node_id', SQLERRM;
END $$;

-- lob_exposure_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_profitability_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_pricing_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_pricing_summary"
    ADD CONSTRAINT "fk_lob_pricing_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_pricing_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_delinquency_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD CONSTRAINT "fk_lob_delinquency_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_delinquency_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_profitability_allocation_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_allocation_summary"
    ADD CONSTRAINT "fk_lob_profitability_allocation_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_allocation_summary', 'lob_node_id', SQLERRM;
END $$;

-- deal_pipeline_stage_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."deal_pipeline_stage_summary"
    ADD CONSTRAINT "fk_deal_pipeline_stage_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_stage_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_credit_quality_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_credit_quality_summary"
    ADD CONSTRAINT "fk_lob_credit_quality_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_credit_quality_summary', 'lob_node_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'lob_node_id', SQLERRM;
END $$;

-- stress_test_breach_detail.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_breach_detail"
    ADD CONSTRAINT "fk_stress_test_breach_detail_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach_detail', 'lob_node_id', SQLERRM;
END $$;

-- lob_risk_ratio_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_risk_ratio_summary"
    ADD CONSTRAINT "fk_lob_risk_ratio_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_risk_ratio_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_deterioration_summary.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_deterioration_summary"
    ADD CONSTRAINT "fk_lob_deterioration_summary_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_deterioration_summary', 'lob_node_id', SQLERRM;
END $$;

-- lob_rating_distribution.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_rating_distribution"
    ADD CONSTRAINT "fk_lob_rating_distribution_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_rating_distribution', 'lob_node_id', SQLERRM;
END $$;

-- lob_top_contributors.lob_node_id → enterprise_business_taxonomy.managed_segment_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_top_contributors"
    ADD CONSTRAINT "fk_lob_top_contributors_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_top_contributors', 'lob_node_id', SQLERRM;
END $$;

-- exposure_metric_cube.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'legal_entity_id', SQLERRM;
END $$;

-- exposure_metric_cube.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'counterparty_id', SQLERRM;
END $$;

-- exposure_metric_cube.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'facility_id', SQLERRM;
END $$;

-- exposure_metric_cube.instrument_id → instrument_master.instrument_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'instrument_id', SQLERRM;
END $$;

-- exposure_metric_cube.netting_set_id → netting_set.netting_set_id
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'netting_set_id', SQLERRM;
END $$;

-- risk_metric_cube.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'legal_entity_id', SQLERRM;
END $$;

-- risk_metric_cube.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'counterparty_id', SQLERRM;
END $$;

-- risk_metric_cube.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'facility_id', SQLERRM;
END $$;

-- risk_metric_cube.instrument_id → instrument_master.instrument_id
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'instrument_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'legal_entity_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'counterparty_id', SQLERRM;
END $$;

-- facility_exposure_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'legal_entity_id', SQLERRM;
END $$;

-- facility_exposure_summary.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'facility_id', SQLERRM;
END $$;

-- facility_exposure_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'counterparty_id', SQLERRM;
END $$;

-- portfolio_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'legal_entity_id', SQLERRM;
END $$;

-- crm_allocation_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'legal_entity_id', SQLERRM;
END $$;

-- crm_allocation_summary.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'facility_id', SQLERRM;
END $$;

-- crm_allocation_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'counterparty_id', SQLERRM;
END $$;

-- crm_allocation_summary.netting_set_id → netting_set.netting_set_id
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'netting_set_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'legal_entity_id', SQLERRM;
END $$;

-- limit_current_state.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'legal_entity_id', SQLERRM;
END $$;

-- limit_utilization_timeseries.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_utilization_timeseries"
    ADD CONSTRAINT "fk_limit_utilization_timeseries_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_timeseries', 'legal_entity_id', SQLERRM;
END $$;

-- limit_attribution_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'legal_entity_id', SQLERRM;
END $$;

-- limit_attribution_summary.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'facility_id', SQLERRM;
END $$;

-- limit_attribution_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'counterparty_id', SQLERRM;
END $$;

-- limit_breach_fact.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_breach_fact"
    ADD CONSTRAINT "fk_limit_breach_fact_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_breach_fact', 'legal_entity_id', SQLERRM;
END $$;

-- credit_event_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'legal_entity_id', SQLERRM;
END $$;

-- credit_event_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'counterparty_id', SQLERRM;
END $$;

-- credit_event_summary.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'facility_id', SQLERRM;
END $$;

-- rating_migration_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'legal_entity_id', SQLERRM;
END $$;

-- rating_migration_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'counterparty_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'legal_entity_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'counterparty_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'facility_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'legal_entity_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'facility_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.instrument_id → instrument_master.instrument_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_instrument_id"
    FOREIGN KEY ("instrument_id")
    REFERENCES "l2"."instrument_master" ("instrument_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'instrument_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'counterparty_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'legal_entity_id', SQLERRM;
END $$;

-- lob_exposure_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'legal_entity_id', SQLERRM;
END $$;

-- kpi_period_summary.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'legal_entity_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.parent_counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_parent_counterparty_id"
    FOREIGN KEY ("parent_counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'parent_counterparty_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'legal_entity_id', SQLERRM;
END $$;

-- limit_tier_status_matrix.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_tier_status_matrix"
    ADD CONSTRAINT "fk_limit_tier_status_matrix_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_tier_status_matrix', 'legal_entity_id', SQLERRM;
END $$;

-- limit_counterparty_movement.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_counterparty_movement"
    ADD CONSTRAINT "fk_limit_counterparty_movement_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_counterparty_movement', 'legal_entity_id', SQLERRM;
END $$;

-- limit_counterparty_movement.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."limit_counterparty_movement"
    ADD CONSTRAINT "fk_limit_counterparty_movement_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_counterparty_movement', 'counterparty_id', SQLERRM;
END $$;

-- legal_entity_risk_profile.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."legal_entity_risk_profile"
    ADD CONSTRAINT "fk_legal_entity_risk_profile_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_risk_profile', 'legal_entity_id', SQLERRM;
END $$;

-- data_quality_trend.legal_entity_id → legal_entity.legal_entity_id
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_trend"
    ADD CONSTRAINT "fk_data_quality_trend_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_trend', 'legal_entity_id', SQLERRM;
END $$;

-- amendment_detail.credit_agreement_id → credit_agreement_master.credit_agreement_id
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'credit_agreement_id', SQLERRM;
END $$;

-- facility_detail_snapshot.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'facility_id', SQLERRM;
END $$;

-- facility_detail_snapshot.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'counterparty_id', SQLERRM;
END $$;

-- facility_detail_snapshot.risk_rating_tier_code → risk_rating_tier_dim.tier_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_risk_rating_tier_code"
    FOREIGN KEY ("risk_rating_tier_code")
    REFERENCES "l1"."risk_rating_tier_dim" ("tier_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'risk_rating_tier_code', SQLERRM;
END $$;

-- facility_detail_snapshot.utilization_status_code → utilization_status_dim.utilization_status_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_utilization_status_code"
    FOREIGN KEY ("utilization_status_code")
    REFERENCES "l1"."utilization_status_dim" ("utilization_status_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'utilization_status_code', SQLERRM;
END $$;

-- facility_detail_snapshot.pricing_tier_code → pricing_tier_dim.pricing_tier_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_pricing_tier_code"
    FOREIGN KEY ("pricing_tier_code")
    REFERENCES "l1"."pricing_tier_dim" ("pricing_tier_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'pricing_tier_code', SQLERRM;
END $$;

-- facility_detail_snapshot.dpd_bucket_code → dpd_bucket_dim.dpd_bucket_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_dpd_bucket_code"
    FOREIGN KEY ("dpd_bucket_code")
    REFERENCES "l1"."dpd_bucket_dim" ("dpd_bucket_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'dpd_bucket_code', SQLERRM;
END $$;

-- facility_detail_snapshot.origination_bucket_code → origination_date_bucket_dim.origination_bucket_code
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_origination_bucket_code"
    FOREIGN KEY ("origination_bucket_code")
    REFERENCES "l1"."origination_date_bucket_dim" ("origination_bucket_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'origination_bucket_code', SQLERRM;
END $$;

-- lob_top_contributors.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."lob_top_contributors"
    ADD CONSTRAINT "fk_lob_top_contributors_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_top_contributors', 'counterparty_id', SQLERRM;
END $$;

-- facility_risk_calc.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_risk_calc"
    ADD CONSTRAINT "fk_facility_risk_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_risk_calc', 'facility_id', SQLERRM;
END $$;

-- netting_set_exposure_calc.netting_set_id → netting_set.netting_set_id
DO $$ BEGIN
  ALTER TABLE "l3"."netting_set_exposure_calc"
    ADD CONSTRAINT "fk_netting_set_exposure_calc_netting_set_id"
    FOREIGN KEY ("netting_set_id")
    REFERENCES "l2"."netting_set" ("netting_set_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_exposure_calc', 'netting_set_id', SQLERRM;
END $$;

-- facility_detail_snapshot.maturity_bucket_id → maturity_bucket_dim.maturity_bucket_id
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_maturity_bucket_id"
    FOREIGN KEY ("maturity_bucket_id")
    REFERENCES "l1"."maturity_bucket_dim" ("maturity_bucket_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'maturity_bucket_id', SQLERRM;
END $$;

-- ecl_provision_calc.facility_id → facility_master.facility_id
DO $$ BEGIN
  ALTER TABLE "l3"."ecl_provision_calc"
    ADD CONSTRAINT "fk_ecl_provision_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_provision_calc', 'facility_id', SQLERRM;
END $$;

-- ecl_provision_calc.counterparty_id → counterparty.counterparty_id
DO $$ BEGIN
  ALTER TABLE "l3"."ecl_provision_calc"
    ADD CONSTRAINT "fk_ecl_provision_calc_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l1"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_provision_calc', 'counterparty_id', SQLERRM;
END $$;

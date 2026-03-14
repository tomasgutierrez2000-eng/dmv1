-- Migration 016: FK constraint remediation for L3 tables
-- Adds FKs for tables missing from 008c, derived tables, capital table merge,
-- and run_id FKs for all tables receiving the new governance column.
-- Idempotent: safe to re-run

SET search_path TO l1, l2, l3, public;

-- ============================================================================
-- GROUP A: Calculation Infrastructure
-- ============================================================================

-- calc_run.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."calc_run"
    ADD CONSTRAINT "fk_calc_run_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'calc_run', 'run_version_id', SQLERRM;
END $$;

-- metric_value_fact.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."metric_value_fact"
    ADD CONSTRAINT "fk_metric_value_fact_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_value_fact', 'run_version_id', SQLERRM;
END $$;

-- metric_value_fact.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."metric_value_fact"
    ADD CONSTRAINT "fk_metric_value_fact_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_value_fact', 'facility_id', SQLERRM;
END $$;

-- metric_value_fact.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."metric_value_fact"
    ADD CONSTRAINT "fk_metric_value_fact_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_value_fact', 'counterparty_id', SQLERRM;
END $$;

-- metric_value_fact.portfolio_id → l1.portfolio_dim(portfolio_id)
DO $$ BEGIN
  ALTER TABLE "l3"."metric_value_fact"
    ADD CONSTRAINT "fk_metric_value_fact_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_value_fact', 'portfolio_id', SQLERRM;
END $$;

-- ============================================================================
-- GROUP B: Calculated Overlay Tables
-- ============================================================================

-- facility_exposure_calc.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_calc"
    ADD CONSTRAINT "fk_facility_exposure_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_calc', 'facility_id', SQLERRM;
END $$;

-- facility_financial_calc.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_financial_calc"
    ADD CONSTRAINT "fk_facility_financial_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_financial_calc', 'facility_id', SQLERRM;
END $$;

-- counterparty_rating_calc.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_rating_calc"
    ADD CONSTRAINT "fk_counterparty_rating_calc_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_calc', 'counterparty_id', SQLERRM;
END $$;

-- facility_pricing_calc.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_pricing_calc"
    ADD CONSTRAINT "fk_facility_pricing_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_calc', 'facility_id', SQLERRM;
END $$;

-- collateral_calc.collateral_asset_id → l2.collateral_asset(collateral_asset_id)
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_calc"
    ADD CONSTRAINT "fk_collateral_calc_collateral_asset_id"
    FOREIGN KEY ("collateral_asset_id")
    REFERENCES "l2"."collateral_asset" ("collateral_asset_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_calc', 'collateral_asset_id', SQLERRM;
END $$;

-- cash_flow_calc.cash_flow_id → l2.cash_flow(cash_flow_id)
DO $$ BEGIN
  ALTER TABLE "l3"."cash_flow_calc"
    ADD CONSTRAINT "fk_cash_flow_calc_cash_flow_id"
    FOREIGN KEY ("cash_flow_id")
    REFERENCES "l2"."cash_flow" ("cash_flow_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'cash_flow_calc', 'cash_flow_id', SQLERRM;
END $$;

-- facility_stress_test_calc.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_stress_test_calc"
    ADD CONSTRAINT "fk_facility_stress_test_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_stress_test_calc', 'facility_id', SQLERRM;
END $$;

-- facility_stress_test_calc.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_stress_test_calc"
    ADD CONSTRAINT "fk_facility_stress_test_calc_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_stress_test_calc', 'counterparty_id', SQLERRM;
END $$;

-- facility_stress_test_calc.scenario_id → l1.scenario_dim(scenario_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_stress_test_calc"
    ADD CONSTRAINT "fk_facility_stress_test_calc_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_stress_test_calc', 'scenario_id', SQLERRM;
END $$;

-- gl_account_balance_calc.ledger_account_id → l2.gl_account(ledger_account_id)
DO $$ BEGIN
  ALTER TABLE "l3"."gl_account_balance_calc"
    ADD CONSTRAINT "fk_gl_account_balance_calc_ledger_account_id"
    FOREIGN KEY ("ledger_account_id")
    REFERENCES "l2"."gl_account" ("ledger_account_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'gl_account_balance_calc', 'ledger_account_id', SQLERRM;
END $$;

-- ecl_allowance_movement.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."ecl_allowance_movement"
    ADD CONSTRAINT "fk_ecl_allowance_movement_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_allowance_movement', 'legal_entity_id', SQLERRM;
END $$;

-- watchlist_movement_summary.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."watchlist_movement_summary"
    ADD CONSTRAINT "fk_watchlist_movement_summary_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'watchlist_movement_summary', 'legal_entity_id', SQLERRM;
END $$;

-- stress_test_result.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result"
    ADD CONSTRAINT "fk_stress_test_result_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result', 'facility_id', SQLERRM;
END $$;

-- stress_test_result.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result"
    ADD CONSTRAINT "fk_stress_test_result_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result', 'counterparty_id', SQLERRM;
END $$;

-- stress_test_result.scenario_id → l1.scenario_dim(scenario_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result"
    ADD CONSTRAINT "fk_stress_test_result_scenario_id"
    FOREIGN KEY ("scenario_id")
    REFERENCES "l1"."scenario_dim" ("scenario_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result', 'scenario_id', SQLERRM;
END $$;

-- ============================================================================
-- GROUP C: Capital Tables (canonical location for FKs from migration 002)
-- ============================================================================

-- facility_rwa_calc.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_rwa_calc"
    ADD CONSTRAINT "fk_facility_rwa_calc_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_rwa_calc', 'facility_id', SQLERRM;
END $$;

-- capital_binding_constraint.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."capital_binding_constraint"
    ADD CONSTRAINT "fk_capital_binding_constraint_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'capital_binding_constraint', 'legal_entity_id', SQLERRM;
END $$;

-- facility_capital_consumption.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_capital_consumption', 'facility_id', SQLERRM;
END $$;

-- facility_capital_consumption.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_capital_consumption', 'legal_entity_id', SQLERRM;
END $$;

-- facility_capital_consumption.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_capital_consumption', 'counterparty_id', SQLERRM;
END $$;

-- facility_capital_consumption.basel_exposure_type_id → l1.basel_exposure_type_dim(basel_exposure_type_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_capital_consumption', 'basel_exposure_type_id', SQLERRM;
END $$;

-- counterparty_capital_consumption.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_capital_consumption"
    ADD CONSTRAINT "fk_counterparty_capital_consumption_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_capital_consumption', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_capital_consumption.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_capital_consumption"
    ADD CONSTRAINT "fk_counterparty_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_capital_consumption', 'legal_entity_id', SQLERRM;
END $$;

-- desk_capital_consumption.org_unit_id → l1.org_unit_dim(org_unit_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_capital_consumption"
    ADD CONSTRAINT "fk_desk_capital_consumption_org_unit_id"
    FOREIGN KEY ("org_unit_id")
    REFERENCES "l1"."org_unit_dim" ("org_unit_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_capital_consumption', 'org_unit_id', SQLERRM;
END $$;

-- desk_capital_consumption.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_capital_consumption"
    ADD CONSTRAINT "fk_desk_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_capital_consumption', 'legal_entity_id', SQLERRM;
END $$;

-- portfolio_capital_consumption.portfolio_id → l1.portfolio_dim(portfolio_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_portfolio_id"
    FOREIGN KEY ("portfolio_id")
    REFERENCES "l1"."portfolio_dim" ("portfolio_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_capital_consumption', 'portfolio_id', SQLERRM;
END $$;

-- portfolio_capital_consumption.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_capital_consumption', 'legal_entity_id', SQLERRM;
END $$;

-- portfolio_capital_consumption.basel_exposure_type_id → l1.basel_exposure_type_dim(basel_exposure_type_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_basel_exposure_type_id"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_capital_consumption', 'basel_exposure_type_id', SQLERRM;
END $$;

-- segment_capital_consumption.lob_segment_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_seg_cap_consumption_lob_seg"
    FOREIGN KEY ("lob_segment_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_capital_consumption', 'lob_segment_id', SQLERRM;
END $$;

-- segment_capital_consumption.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_segment_capital_consumption_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_capital_consumption', 'legal_entity_id', SQLERRM;
END $$;

-- segment_capital_consumption.basel_exposure_type_id → l1.basel_exposure_type_dim(basel_exposure_type_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_seg_cap_consumption_basel"
    FOREIGN KEY ("basel_exposure_type_id")
    REFERENCES "l1"."basel_exposure_type_dim" ("basel_exposure_type_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_capital_consumption', 'basel_exposure_type_id', SQLERRM;
END $$;

-- capital_position_calc.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."capital_position_calc"
    ADD CONSTRAINT "fk_capital_position_calc_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'capital_position_calc', 'legal_entity_id', SQLERRM;
END $$;

-- counterparty_financial_calc.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_financial_calc"
    ADD CONSTRAINT "fk_counterparty_financial_calc_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_financial_calc', 'counterparty_id', SQLERRM;
END $$;

-- exception_event_calc.exception_id → l2.exception_event(exception_id)
DO $$ BEGIN
  ALTER TABLE "l3"."exception_event_calc"
    ADD CONSTRAINT "fk_exception_event_calc_exception_id"
    FOREIGN KEY ("exception_id")
    REFERENCES "l2"."exception_event" ("exception_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event_calc', 'exception_id', SQLERRM;
END $$;

-- ============================================================================
-- GROUP D: Derived Tables (key IDs only)
-- ============================================================================

-- facility_derived.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'run_version_id', SQLERRM;
END $$;

-- facility_derived.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'facility_id', SQLERRM;
END $$;

-- facility_derived.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'counterparty_id', SQLERRM;
END $$;

-- facility_derived.credit_agreement_id → l2.credit_agreement_master(credit_agreement_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'credit_agreement_id', SQLERRM;
END $$;

-- facility_derived.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'legal_entity_id', SQLERRM;
END $$;

-- facility_derived.lob_node_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'lob_node_id', SQLERRM;
END $$;

-- facility_derived.base_currency_code → l1.currency_dim(currency_code)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'base_currency_code', SQLERRM;
END $$;

-- counterparty_derived.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'run_version_id', SQLERRM;
END $$;

-- counterparty_derived.facility_id → l2.facility_master(facility_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_facility_id"
    FOREIGN KEY ("facility_id")
    REFERENCES "l2"."facility_master" ("facility_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'facility_id', SQLERRM;
END $$;

-- counterparty_derived.counterparty_id → l2.counterparty(counterparty_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'counterparty_id', SQLERRM;
END $$;

-- counterparty_derived.credit_agreement_id → l2.credit_agreement_master(credit_agreement_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_credit_agreement_id"
    FOREIGN KEY ("credit_agreement_id")
    REFERENCES "l2"."credit_agreement_master" ("credit_agreement_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'credit_agreement_id', SQLERRM;
END $$;

-- counterparty_derived.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'legal_entity_id', SQLERRM;
END $$;

-- counterparty_derived.lob_node_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'lob_node_id', SQLERRM;
END $$;

-- counterparty_derived.base_currency_code → l1.currency_dim(currency_code)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'base_currency_code', SQLERRM;
END $$;

-- desk_derived.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_derived"
    ADD CONSTRAINT "fk_desk_derived_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_derived', 'run_version_id', SQLERRM;
END $$;

-- desk_derived.lob_node_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_derived"
    ADD CONSTRAINT "fk_desk_derived_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_derived', 'lob_node_id', SQLERRM;
END $$;

-- desk_derived.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_derived"
    ADD CONSTRAINT "fk_desk_derived_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_derived', 'legal_entity_id', SQLERRM;
END $$;

-- desk_derived.base_currency_code → l1.currency_dim(currency_code)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_derived"
    ADD CONSTRAINT "fk_desk_derived_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_derived', 'base_currency_code', SQLERRM;
END $$;

-- portfolio_derived.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_derived"
    ADD CONSTRAINT "fk_portfolio_derived_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_derived', 'run_version_id', SQLERRM;
END $$;

-- portfolio_derived.lob_node_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_derived"
    ADD CONSTRAINT "fk_portfolio_derived_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_derived', 'lob_node_id', SQLERRM;
END $$;

-- portfolio_derived.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_derived"
    ADD CONSTRAINT "fk_portfolio_derived_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_derived', 'legal_entity_id', SQLERRM;
END $$;

-- portfolio_derived.base_currency_code → l1.currency_dim(currency_code)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_derived"
    ADD CONSTRAINT "fk_portfolio_derived_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_derived', 'base_currency_code', SQLERRM;
END $$;

-- segment_derived.run_version_id → l1.run_control(run_version_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_derived"
    ADD CONSTRAINT "fk_segment_derived_run_version_id"
    FOREIGN KEY ("run_version_id")
    REFERENCES "l1"."run_control" ("run_version_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_derived', 'run_version_id', SQLERRM;
END $$;

-- segment_derived.lob_node_id → l1.enterprise_business_taxonomy(managed_segment_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_derived"
    ADD CONSTRAINT "fk_segment_derived_lob_node_id"
    FOREIGN KEY ("lob_node_id")
    REFERENCES "l1"."enterprise_business_taxonomy" ("managed_segment_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_derived', 'lob_node_id', SQLERRM;
END $$;

-- segment_derived.legal_entity_id → l2.legal_entity(legal_entity_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_derived"
    ADD CONSTRAINT "fk_segment_derived_legal_entity_id"
    FOREIGN KEY ("legal_entity_id")
    REFERENCES "l2"."legal_entity" ("legal_entity_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_derived', 'legal_entity_id', SQLERRM;
END $$;

-- segment_derived.base_currency_code → l1.currency_dim(currency_code)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_derived"
    ADD CONSTRAINT "fk_segment_derived_base_currency_code"
    FOREIGN KEY ("base_currency_code")
    REFERENCES "l1"."currency_dim" ("currency_code");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_derived', 'base_currency_code', SQLERRM;
END $$;

-- ============================================================================
-- GROUP E: run_id FK for all tables with new run_id column
-- ============================================================================

-- amendment_detail.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_detail"
    ADD CONSTRAINT "fk_amendment_detail_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_detail', 'run_id', SQLERRM;
END $$;

-- amendment_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."amendment_summary"
    ADD CONSTRAINT "fk_amendment_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'amendment_summary', 'run_id', SQLERRM;
END $$;

-- capital_binding_constraint.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."capital_binding_constraint"
    ADD CONSTRAINT "fk_capital_binding_constraint_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'capital_binding_constraint', 'run_id', SQLERRM;
END $$;

-- capital_position_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."capital_position_calc"
    ADD CONSTRAINT "fk_capital_position_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'capital_position_calc', 'run_id', SQLERRM;
END $$;

-- cash_flow_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."cash_flow_calc"
    ADD CONSTRAINT "fk_cash_flow_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'cash_flow_calc', 'run_id', SQLERRM;
END $$;

-- collateral_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_calc"
    ADD CONSTRAINT "fk_collateral_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_calc', 'run_id', SQLERRM;
END $$;

-- collateral_portfolio_valuation.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."collateral_portfolio_valuation"
    ADD CONSTRAINT "fk_collateral_portfolio_valuation_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'collateral_portfolio_valuation', 'run_id', SQLERRM;
END $$;

-- counterparty_capital_consumption.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_capital_consumption"
    ADD CONSTRAINT "fk_counterparty_capital_consumption_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_capital_consumption', 'run_id', SQLERRM;
END $$;

-- counterparty_detail_snapshot.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_detail_snapshot"
    ADD CONSTRAINT "fk_counterparty_detail_snapshot_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_detail_snapshot', 'run_id', SQLERRM;
END $$;

-- counterparty_exposure_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_exposure_summary"
    ADD CONSTRAINT "fk_counterparty_exposure_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_exposure_summary', 'run_id', SQLERRM;
END $$;

-- counterparty_financial_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_financial_calc"
    ADD CONSTRAINT "fk_counterparty_financial_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_financial_calc', 'run_id', SQLERRM;
END $$;

-- counterparty_rating_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_rating_calc"
    ADD CONSTRAINT "fk_counterparty_rating_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_rating_calc', 'run_id', SQLERRM;
END $$;

-- credit_event_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."credit_event_summary"
    ADD CONSTRAINT "fk_credit_event_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'credit_event_summary', 'run_id', SQLERRM;
END $$;

-- crm_allocation_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."crm_allocation_summary"
    ADD CONSTRAINT "fk_crm_allocation_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'crm_allocation_summary', 'run_id', SQLERRM;
END $$;

-- data_quality_attribute_score.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_attribute_score"
    ADD CONSTRAINT "fk_data_quality_attribute_score_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_attribute_score', 'run_id', SQLERRM;
END $$;

-- data_quality_score_snapshot.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_score_snapshot"
    ADD CONSTRAINT "fk_data_quality_score_snapshot_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_score_snapshot', 'run_id', SQLERRM;
END $$;

-- data_quality_score_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_score_summary"
    ADD CONSTRAINT "fk_data_quality_score_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_score_summary', 'run_id', SQLERRM;
END $$;

-- data_quality_trend.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."data_quality_trend"
    ADD CONSTRAINT "fk_data_quality_trend_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'data_quality_trend', 'run_id', SQLERRM;
END $$;

-- deal_pipeline_stage_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."deal_pipeline_stage_summary"
    ADD CONSTRAINT "fk_deal_pipeline_stage_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'deal_pipeline_stage_summary', 'run_id', SQLERRM;
END $$;

-- default_loss_recovery_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."default_loss_recovery_summary"
    ADD CONSTRAINT "fk_default_loss_recovery_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'default_loss_recovery_summary', 'run_id', SQLERRM;
END $$;

-- desk_capital_consumption.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_capital_consumption"
    ADD CONSTRAINT "fk_desk_capital_consumption_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_capital_consumption', 'run_id', SQLERRM;
END $$;

-- ecl_allowance_movement.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."ecl_allowance_movement"
    ADD CONSTRAINT "fk_ecl_allowance_movement_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_allowance_movement', 'run_id', SQLERRM;
END $$;

-- ecl_provision_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."ecl_provision_calc"
    ADD CONSTRAINT "fk_ecl_provision_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'ecl_provision_calc', 'run_id', SQLERRM;
END $$;

-- exception_event_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."exception_event_calc"
    ADD CONSTRAINT "fk_exception_event_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exception_event_calc', 'run_id', SQLERRM;
END $$;

-- executive_highlight_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."executive_highlight_summary"
    ADD CONSTRAINT "fk_executive_highlight_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'executive_highlight_summary', 'run_id', SQLERRM;
END $$;

-- exposure_metric_cube.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."exposure_metric_cube"
    ADD CONSTRAINT "fk_exposure_metric_cube_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'exposure_metric_cube', 'run_id', SQLERRM;
END $$;

-- facility_capital_consumption.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_capital_consumption"
    ADD CONSTRAINT "fk_facility_capital_consumption_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_capital_consumption', 'run_id', SQLERRM;
END $$;

-- facility_detail_snapshot.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_detail_snapshot"
    ADD CONSTRAINT "fk_facility_detail_snapshot_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_detail_snapshot', 'run_id', SQLERRM;
END $$;

-- facility_exposure_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_calc"
    ADD CONSTRAINT "fk_facility_exposure_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_calc', 'run_id', SQLERRM;
END $$;

-- facility_exposure_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_exposure_summary"
    ADD CONSTRAINT "fk_facility_exposure_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_exposure_summary', 'run_id', SQLERRM;
END $$;

-- facility_financial_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_financial_calc"
    ADD CONSTRAINT "fk_facility_financial_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_financial_calc', 'run_id', SQLERRM;
END $$;

-- facility_pricing_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_pricing_calc"
    ADD CONSTRAINT "fk_facility_pricing_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_pricing_calc', 'run_id', SQLERRM;
END $$;

-- facility_risk_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_risk_calc"
    ADD CONSTRAINT "fk_facility_risk_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_risk_calc', 'run_id', SQLERRM;
END $$;

-- facility_rwa_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_rwa_calc"
    ADD CONSTRAINT "fk_facility_rwa_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_rwa_calc', 'run_id', SQLERRM;
END $$;

-- facility_stress_test_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_stress_test_calc"
    ADD CONSTRAINT "fk_facility_stress_test_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_stress_test_calc', 'run_id', SQLERRM;
END $$;

-- facility_timeline_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_timeline_summary"
    ADD CONSTRAINT "fk_facility_timeline_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_timeline_summary', 'run_id', SQLERRM;
END $$;

-- fr2590_counterparty_aggregate.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_counterparty_aggregate"
    ADD CONSTRAINT "fk_fr2590_counterparty_aggregate_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_counterparty_aggregate', 'run_id', SQLERRM;
END $$;

-- fr2590_position_snapshot.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."fr2590_position_snapshot"
    ADD CONSTRAINT "fk_fr2590_position_snapshot_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'fr2590_position_snapshot', 'run_id', SQLERRM;
END $$;

-- gl_account_balance_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."gl_account_balance_calc"
    ADD CONSTRAINT "fk_gl_account_balance_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'gl_account_balance_calc', 'run_id', SQLERRM;
END $$;

-- kpi_period_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."kpi_period_summary"
    ADD CONSTRAINT "fk_kpi_period_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'kpi_period_summary', 'run_id', SQLERRM;
END $$;

-- legal_entity_risk_profile.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."legal_entity_risk_profile"
    ADD CONSTRAINT "fk_legal_entity_risk_profile_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'legal_entity_risk_profile', 'run_id', SQLERRM;
END $$;

-- limit_attribution_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_attribution_summary"
    ADD CONSTRAINT "fk_limit_attribution_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_attribution_summary', 'run_id', SQLERRM;
END $$;

-- limit_breach_fact.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_breach_fact"
    ADD CONSTRAINT "fk_limit_breach_fact_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_breach_fact', 'run_id', SQLERRM;
END $$;

-- limit_counterparty_movement.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_counterparty_movement"
    ADD CONSTRAINT "fk_limit_counterparty_movement_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_counterparty_movement', 'run_id', SQLERRM;
END $$;

-- limit_current_state.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_current_state"
    ADD CONSTRAINT "fk_limit_current_state_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_current_state', 'run_id', SQLERRM;
END $$;

-- limit_tier_status_matrix.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_tier_status_matrix"
    ADD CONSTRAINT "fk_limit_tier_status_matrix_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_tier_status_matrix', 'run_id', SQLERRM;
END $$;

-- limit_utilization_timeseries.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."limit_utilization_timeseries"
    ADD CONSTRAINT "fk_limit_utilization_timeseries_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'limit_utilization_timeseries', 'run_id', SQLERRM;
END $$;

-- lob_credit_quality_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_credit_quality_summary"
    ADD CONSTRAINT "fk_lob_credit_quality_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_credit_quality_summary', 'run_id', SQLERRM;
END $$;

-- lob_delinquency_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_delinquency_summary"
    ADD CONSTRAINT "fk_lob_delinquency_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_delinquency_summary', 'run_id', SQLERRM;
END $$;

-- lob_deterioration_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_deterioration_summary"
    ADD CONSTRAINT "fk_lob_deterioration_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_deterioration_summary', 'run_id', SQLERRM;
END $$;

-- lob_exposure_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_exposure_summary"
    ADD CONSTRAINT "fk_lob_exposure_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_exposure_summary', 'run_id', SQLERRM;
END $$;

-- lob_pricing_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_pricing_summary"
    ADD CONSTRAINT "fk_lob_pricing_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_pricing_summary', 'run_id', SQLERRM;
END $$;

-- lob_profitability_allocation_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_allocation_summary"
    ADD CONSTRAINT "fk_lob_profitability_allocation_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_allocation_summary', 'run_id', SQLERRM;
END $$;

-- lob_profitability_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_profitability_summary"
    ADD CONSTRAINT "fk_lob_profitability_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_profitability_summary', 'run_id', SQLERRM;
END $$;

-- lob_rating_distribution.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_rating_distribution"
    ADD CONSTRAINT "fk_lob_rating_distribution_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_rating_distribution', 'run_id', SQLERRM;
END $$;

-- lob_risk_ratio_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_risk_ratio_summary"
    ADD CONSTRAINT "fk_lob_risk_ratio_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_risk_ratio_summary', 'run_id', SQLERRM;
END $$;

-- lob_top_contributors.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."lob_top_contributors"
    ADD CONSTRAINT "fk_lob_top_contributors_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'lob_top_contributors', 'run_id', SQLERRM;
END $$;

-- metric_value_fact.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."metric_value_fact"
    ADD CONSTRAINT "fk_metric_value_fact_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'metric_value_fact', 'run_id', SQLERRM;
END $$;

-- netting_set_exposure_calc.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."netting_set_exposure_calc"
    ADD CONSTRAINT "fk_netting_set_exposure_calc_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'netting_set_exposure_calc', 'run_id', SQLERRM;
END $$;

-- portfolio_capital_consumption.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_capital_consumption"
    ADD CONSTRAINT "fk_portfolio_capital_consumption_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_capital_consumption', 'run_id', SQLERRM;
END $$;

-- portfolio_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_summary"
    ADD CONSTRAINT "fk_portfolio_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_summary', 'run_id', SQLERRM;
END $$;

-- rating_migration_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."rating_migration_summary"
    ADD CONSTRAINT "fk_rating_migration_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'rating_migration_summary', 'run_id', SQLERRM;
END $$;

-- regulatory_compliance_state.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."regulatory_compliance_state"
    ADD CONSTRAINT "fk_regulatory_compliance_state_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'regulatory_compliance_state', 'run_id', SQLERRM;
END $$;

-- report_cell_contribution_fact.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_contribution_fact"
    ADD CONSTRAINT "fk_report_cell_contribution_fact_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_contribution_fact', 'run_id', SQLERRM;
END $$;

-- report_cell_rule_execution.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_rule_execution"
    ADD CONSTRAINT "fk_report_cell_rule_execution_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_rule_execution', 'run_id', SQLERRM;
END $$;

-- report_cell_value.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."report_cell_value"
    ADD CONSTRAINT "fk_report_cell_value_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_cell_value', 'run_id', SQLERRM;
END $$;

-- report_run.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."report_run"
    ADD CONSTRAINT "fk_report_run_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_run', 'run_id', SQLERRM;
END $$;

-- report_validation_result.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."report_validation_result"
    ADD CONSTRAINT "fk_report_validation_result_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'report_validation_result', 'run_id', SQLERRM;
END $$;

-- risk_appetite_metric_state.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."risk_appetite_metric_state"
    ADD CONSTRAINT "fk_risk_appetite_metric_state_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_appetite_metric_state', 'run_id', SQLERRM;
END $$;

-- risk_metric_cube.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."risk_metric_cube"
    ADD CONSTRAINT "fk_risk_metric_cube_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'risk_metric_cube', 'run_id', SQLERRM;
END $$;

-- segment_capital_consumption.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_capital_consumption"
    ADD CONSTRAINT "fk_segment_capital_consumption_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_capital_consumption', 'run_id', SQLERRM;
END $$;

-- stress_test_breach_detail.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_breach_detail"
    ADD CONSTRAINT "fk_stress_test_breach_detail_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_breach_detail', 'run_id', SQLERRM;
END $$;

-- stress_test_result.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result"
    ADD CONSTRAINT "fk_stress_test_result_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result', 'run_id', SQLERRM;
END $$;

-- stress_test_result_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."stress_test_result_summary"
    ADD CONSTRAINT "fk_stress_test_result_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'stress_test_result_summary', 'run_id', SQLERRM;
END $$;

-- watchlist_movement_summary.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."watchlist_movement_summary"
    ADD CONSTRAINT "fk_watchlist_movement_summary_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'watchlist_movement_summary', 'run_id', SQLERRM;
END $$;

-- facility_derived.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."facility_derived"
    ADD CONSTRAINT "fk_facility_derived_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'facility_derived', 'run_id', SQLERRM;
END $$;

-- counterparty_derived.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."counterparty_derived"
    ADD CONSTRAINT "fk_counterparty_derived_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'counterparty_derived', 'run_id', SQLERRM;
END $$;

-- desk_derived.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."desk_derived"
    ADD CONSTRAINT "fk_desk_derived_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'desk_derived', 'run_id', SQLERRM;
END $$;

-- portfolio_derived.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."portfolio_derived"
    ADD CONSTRAINT "fk_portfolio_derived_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'portfolio_derived', 'run_id', SQLERRM;
END $$;

-- segment_derived.run_id → l3.calc_run(run_id)
DO $$ BEGIN
  ALTER TABLE "l3"."segment_derived"
    ADD CONSTRAINT "fk_segment_derived_run_id"
    FOREIGN KEY ("run_id")
    REFERENCES "l3"."calc_run" ("run_id");
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK on %.%: %', 'segment_derived', 'run_id', SQLERRM;
END $$;

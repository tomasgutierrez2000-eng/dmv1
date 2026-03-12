-- L3 Data Model DDL
-- Generated from data dictionary (viz cache)
-- Target: PostgreSQL

CREATE SCHEMA IF NOT EXISTS l3;
SET search_path TO l1, l2, l3, public;


-- exposure_metric_cube (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."exposure_metric_cube" (
    "exposure_metric_cube_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "org_unit_id" BIGINT,
    "portfolio_id" BIGINT,
    "product_node_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "instrument_id" BIGINT,
    "netting_set_id" BIGINT,
    "country_code" VARCHAR(30),
    "currency_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "exposure_type_code" VARCHAR(30),
    "gross_exposure_amt" NUMERIC(20,4),
    "net_exposure_amt" NUMERIC(20,4),
    "drawn_amt" NUMERIC(20,4),
    "undrawn_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "secured_amt" NUMERIC(20,4),
    "unsecured_residual_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "hierarchy_id" BIGINT,
    "attribution_pct" NUMERIC(10,6),
    PRIMARY KEY ("exposure_metric_cube_sk")
);

-- risk_metric_cube (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."risk_metric_cube" (
    "risk_metric_cube_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "portfolio_id" BIGINT,
    "product_node_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "instrument_id" BIGINT,
    "currency_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "model_id" BIGINT,
    "rating_grade_id" BIGINT,
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "ead_amt" NUMERIC(20,4),
    "expected_loss_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "rwa_amt" NUMERIC(20,4),
    "capital_req_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "hierarchy_id" BIGINT,
    "rwa_density_pct" NUMERIC(10,6),
    PRIMARY KEY ("risk_metric_cube_sk")
);

-- counterparty_exposure_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."counterparty_exposure_summary" (
    "counterparty_exposure_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "counterparty_id" BIGINT,
    "sccl_group_id" BIGINT,
    "country_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "total_gross_exposure_amt" NUMERIC(20,4),
    "total_net_exposure_amt" NUMERIC(20,4),
    "total_ead_amt" NUMERIC(20,4),
    "secured_amt" NUMERIC(20,4),
    "unsecured_residual_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "hierarchy_id" BIGINT,
    "has_cross_entity_flag" BOOLEAN,
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "cross_entity_entity_count" INTEGER,
    "is_parent_flag" BOOLEAN,
    "total_committed_amt" NUMERIC(20,4),
    "total_outstanding_amt" NUMERIC(20,4),
    "prior_period_gross_exposure_amt" NUMERIC(20,4),
    "exposure_change_pct" NUMERIC(10,6),
    "avg_pd_pct" NUMERIC(10,6),
    "avg_lgd_pct" NUMERIC(10,6),
    "expected_loss_amt" NUMERIC(20,4),
    "credit_limit_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "headroom_amt" NUMERIC(20,4),
    "risk_tier_code" VARCHAR(30),
    "limit_status_code" VARCHAR(30),
    "region_code" VARCHAR(30),
    "industry_code" VARCHAR(30),
    "rwa_amt" NUMERIC(20,4),
    "rwa_density_pct" NUMERIC(10,6),
    "total_cross_entity_exposure_usd" NUMERIC(18,2),
    PRIMARY KEY ("counterparty_exposure_summary_sk")
);

-- facility_exposure_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."facility_exposure_summary" (
    "facility_exposure_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "portfolio_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "outstanding_amt" NUMERIC(20,4),
    "undrawn_commitment_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "secured_amt" NUMERIC(20,4),
    "unsecured_residual_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "attribution_pct" NUMERIC(10,6),
    "is_syndicated_flag" BOOLEAN,
    "has_amendment_flag" BOOLEAN,
    "amendment_type_code" VARCHAR(30),
    "amendment_status_code" VARCHAR(30),
    PRIMARY KEY ("facility_exposure_summary_sk")
);

-- portfolio_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."portfolio_summary" (
    "portfolio_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "portfolio_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "total_gross_exposure_amt" NUMERIC(20,4),
    "total_ead_amt" NUMERIC(20,4),
    "total_expected_loss_amt" NUMERIC(20,4),
    "avg_pd_pct" NUMERIC(10,6),
    "avg_lgd_pct" NUMERIC(10,6),
    "total_rwa_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "rwa_density_pct" NUMERIC(10,6),
    PRIMARY KEY ("portfolio_summary_sk")
);

-- crm_allocation_summary (Credit Risk Mitigation (CRM))
CREATE TABLE IF NOT EXISTS "l3"."crm_allocation_summary" (
    "crm_allocation_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "crm_type_code" VARCHAR(30),
    "allocation_target_level" VARCHAR(255),
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "netting_set_id" BIGINT,
    "crm_id" BIGINT,
    "currency_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "crm_market_value_amt" NUMERIC(20,4),
    "haircut_pct" NUMERIC(10,6),
    "crm_recognized_amt" NUMERIC(20,4),
    "allocated_amt" NUMERIC(20,4),
    "allocation_method_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "risk_mitigant_id" BIGINT,
    "risk_mitigant_subtype_code" VARCHAR(30),
    "parent_group_code" VARCHAR(30),
    PRIMARY KEY ("crm_allocation_summary_sk")
);

-- collateral_portfolio_valuation (Credit Risk Mitigation (CRM))
CREATE TABLE IF NOT EXISTS "l3"."collateral_portfolio_valuation" (
    "collateral_portfolio_valuation_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "portfolio_id" BIGINT,
    "collateral_type_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "collateral_market_value_amt" NUMERIC(20,4),
    "collateral_recognized_amt" NUMERIC(20,4),
    "asset_count" INTEGER,
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "parent_group_code" VARCHAR(30),
    PRIMARY KEY ("collateral_portfolio_valuation_sk")
);

-- limit_current_state (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_current_state" (
    "limit_current_state_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_ts" TIMESTAMP,
    "legal_entity_id" BIGINT,
    "limit_definition_id" BIGINT,
    "limit_assignment_id" BIGINT,
    "limit_currency_code" VARCHAR(30),
    "limit_amt" NUMERIC(20,4),
    "utilized_amt" NUMERIC(20,4),
    "available_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "status_code" VARCHAR(30),
    "last_breach_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "hierarchy_id" BIGINT,
    "last_status_change_ts" TIMESTAMP,
    "status_last_changed_event_id" BIGINT,
    "classification_code" VARCHAR(30),
    "velocity_30d_pct" NUMERIC(10,6),
    "velocity_90d_pct" NUMERIC(10,6),
    "prior_period_status_code" VARCHAR(30),
    "utilization_tier_code" VARCHAR(30),
    PRIMARY KEY ("limit_current_state_sk")
);

-- limit_utilization_timeseries (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_utilization_timeseries" (
    "limit_utilization_timeseries_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_ts" TIMESTAMP,
    "legal_entity_id" BIGINT,
    "limit_assignment_id" BIGINT,
    "limit_currency_code" VARCHAR(30),
    "utilized_amt" NUMERIC(20,4),
    "available_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    PRIMARY KEY ("limit_utilization_timeseries_sk")
);

-- limit_attribution_summary (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_attribution_summary" (
    "limit_attribution_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_ts" TIMESTAMP,
    "legal_entity_id" BIGINT,
    "limit_assignment_id" BIGINT,
    "contributor_level" VARCHAR(255),
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "portfolio_id" BIGINT,
    "product_node_id" BIGINT,
    "org_unit_id" BIGINT,
    "contribution_amt" NUMERIC(20,4),
    "contribution_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "hierarchy_id" BIGINT,
    PRIMARY KEY ("limit_attribution_summary_sk")
);

-- limit_breach_fact (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_breach_fact" (
    "limit_breach_fact_sk" BIGSERIAL NOT NULL,
    "breach_id" BIGINT,
    "run_version_id" BIGINT,
    "limit_assignment_id" BIGINT,
    "legal_entity_id" BIGINT,
    "breach_ts" TIMESTAMP,
    "severity_code" VARCHAR(30),
    "breach_amount" NUMERIC(20,4),
    "status_code" VARCHAR(30),
    "resolved_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    PRIMARY KEY ("limit_breach_fact_sk")
);

-- credit_event_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS "l3"."credit_event_summary" (
    "credit_event_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "credit_event_type_id" BIGINT,
    "event_count" INTEGER,
    "default_flag" BOOLEAN,
    "charge_off_amt" NUMERIC(20,4),
    "recovery_amt" NUMERIC(20,4),
    "net_loss_amt" NUMERIC(20,4),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "impacted_facility_count" INTEGER,
    "event_summary_text" TEXT,
    "event_short_name" VARCHAR(500),
    "event_risk_rating" VARCHAR(255),
    "estimated_exposure_impact_amt" NUMERIC(20,4),
    PRIMARY KEY ("credit_event_summary_sk")
);

-- rating_migration_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS "l3"."rating_migration_summary" (
    "rating_migration_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "counterparty_id" BIGINT,
    "rating_source_id" BIGINT,
    "from_rating_grade_id" BIGINT,
    "to_rating_grade_id" BIGINT,
    "migration_count" INTEGER,
    "exposure_at_migration_amt" NUMERIC(20,4),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    PRIMARY KEY ("rating_migration_summary_sk")
);

-- default_loss_recovery_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS "l3"."default_loss_recovery_summary" (
    "default_loss_recovery_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "default_exposure_amt" NUMERIC(20,4),
    "charge_off_amt" NUMERIC(20,4),
    "recovery_amt" NUMERIC(20,4),
    "realized_lgd_pct" NUMERIC(10,6),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    PRIMARY KEY ("default_loss_recovery_summary_sk")
);

-- report_run (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."report_run" (
    "report_run_sk" BIGSERIAL NOT NULL,
    "report_run_id" BIGINT,
    "run_version_id" BIGINT,
    "report_code" VARCHAR(30),
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "status_code" VARCHAR(30),
    "started_ts" TIMESTAMP,
    "completed_ts" TIMESTAMP,
    "produced_by_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("report_run_sk")
);

-- report_cell_value (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."report_cell_value" (
    "report_cell_value_sk" BIGSERIAL NOT NULL,
    "report_run_id" BIGINT,
    "cell_id" BIGINT,
    "value_amt" NUMERIC(20,4),
    "currency_code" VARCHAR(30),
    "unit_code" VARCHAR(30),
    "value_precision" VARCHAR(255),
    "calculation_rule_id" BIGINT,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("report_cell_value_sk")
);

-- report_cell_contribution_fact (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."report_cell_contribution_fact" (
    "report_cell_contribution_fact_sk" BIGSERIAL NOT NULL,
    "contribution_id" BIGINT,
    "report_run_id" BIGINT,
    "cell_id" BIGINT,
    "source_record_type_code" VARCHAR(30),
    "source_record_id" BIGINT,
    "contribution_amt" NUMERIC(20,4),
    "currency_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "rule_id" BIGINT,
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    PRIMARY KEY ("report_cell_contribution_fact_sk")
);

-- report_cell_rule_execution (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."report_cell_rule_execution" (
    "report_cell_rule_execution_sk" BIGSERIAL NOT NULL,
    "report_run_id" BIGINT,
    "cell_id" BIGINT,
    "rule_id" BIGINT,
    "rule_version" VARCHAR(255),
    "status_code" VARCHAR(30),
    "started_ts" TIMESTAMP,
    "ended_ts" TIMESTAMP,
    "input_record_count" INTEGER,
    "output_value_amt" NUMERIC(20,4),
    "error_message" VARCHAR(255),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("report_cell_rule_execution_sk")
);

-- report_validation_result (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."report_validation_result" (
    "report_validation_result_sk" BIGSERIAL NOT NULL,
    "validation_result_id" BIGINT,
    "report_run_id" BIGINT,
    "validation_check_id" BIGINT,
    "cell_id" BIGINT,
    "severity_code" VARCHAR(30),
    "result_flag" BOOLEAN,
    "threshold_value" NUMERIC(12,6),
    "observed_value" NUMERIC(12,6),
    "message" VARCHAR(255),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("report_validation_result_sk")
);

-- fr2590_position_snapshot (FR 2590 Helper Artifacts)
CREATE TABLE IF NOT EXISTS "l3"."fr2590_position_snapshot" (
    "fr2590_position_snapshot_sk" BIGSERIAL NOT NULL,
    "report_run_id" BIGINT,
    "position_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "instrument_id" BIGINT,
    "product_node_id" BIGINT,
    "country_code" VARCHAR(30),
    "currency_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "mdrm_id" VARCHAR(64),
    "mapped_schedule_code" VARCHAR(30),
    "mapped_line_id" VARCHAR(64),
    "mapped_column_id" VARCHAR(64),
    "amount_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "fr2590_category_code" VARCHAR(30),
    PRIMARY KEY ("fr2590_position_snapshot_sk")
);

-- fr2590_counterparty_aggregate (FR 2590 Helper Artifacts)
CREATE TABLE IF NOT EXISTS "l3"."fr2590_counterparty_aggregate" (
    "fr2590_counterparty_aggregate_sk" BIGSERIAL NOT NULL,
    "report_run_id" BIGINT,
    "counterparty_id" BIGINT,
    "legal_entity_id" BIGINT,
    "as_of_date" DATE,
    "product_node_id" BIGINT,
    "country_code" VARCHAR(30),
    "base_currency_code" VARCHAR(30),
    "total_amount_amt" NUMERIC(20,4),
    "rank_within_entity" VARCHAR(255),
    "is_top_counterparty_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "lob_node_id" BIGINT,
    "fr2590_category_code" VARCHAR(30),
    PRIMARY KEY ("fr2590_counterparty_aggregate_sk")
);

-- lob_exposure_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_exposure_summary" (
    "lob_exposure_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "facility_count" INTEGER,
    "counterparty_count" INTEGER,
    "gross_exposure_amt" NUMERIC(20,4),
    "net_exposure_amt" NUMERIC(20,4),
    "drawn_amt" NUMERIC(20,4),
    "undrawn_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_loss_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "avg_pd_pct" NUMERIC(10,6),
    "avg_lgd_pct" NUMERIC(10,6),
    "limit_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "breach_count" INTEGER,
    "npl_exposure_amt" NUMERIC(20,4),
    "npl_ratio_pct" NUMERIC(10,6),
    "prior_period_gross_exposure_amt" NUMERIC(20,4),
    "exposure_change_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "result_status_code" VARCHAR(30),
    "scenario_scope_desc" TEXT,
    "coverage_ratio_pct" NUMERIC(10,6),
    "total_crm_amt" NUMERIC(20,4),
    "rwa_density_pct" NUMERIC(10,6),
    PRIMARY KEY ("lob_exposure_summary_sk")
);

-- lob_profitability_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_profitability_summary" (
    "lob_profitability_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "period_start_date" DATE,
    "period_end_date" DATE,
    "periodicity_code" VARCHAR(30),
    "total_revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "net_interest_income_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "avg_total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "prior_period_total_revenue_amt" NUMERIC(20,4),
    "revenue_change_pct" NUMERIC(10,6),
    "prior_period_net_income_amt" NUMERIC(20,4),
    "net_income_change_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "return_on_rwa_pct" NUMERIC(10,6),
    PRIMARY KEY ("lob_profitability_summary_sk")
);

-- lob_pricing_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_pricing_summary" (
    "lob_pricing_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "avg_spread_bps" NUMERIC(10,4),
    "avg_base_rate_pct" NUMERIC(10,6),
    "avg_all_in_rate_pct" NUMERIC(10,6),
    "internal_spread_threshold_bps" NUMERIC(10,4),
    "spread_vs_threshold_bps" NUMERIC(10,4),
    "below_threshold_facility_count" INTEGER,
    "documented_exception_count" INTEGER,
    "prior_period_avg_spread_bps" NUMERIC(10,4),
    "avg_spread_change_bps" NUMERIC(10,4),
    "weighted_avg_fee_rate_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("lob_pricing_summary_sk")
);

-- lob_delinquency_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_delinquency_summary" (
    "lob_delinquency_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "base_currency_code" VARCHAR(30),
    "total_overdue_amt" NUMERIC(20,4),
    "delinquent_facility_count" INTEGER,
    "delinquent_counterparty_count" INTEGER,
    "total_outstanding_exposure_amt" NUMERIC(20,4),
    "delinquency_rate_pct" NUMERIC(10,6),
    "prior_period_total_overdue_amt" NUMERIC(20,4),
    "overdue_change_pct" NUMERIC(10,6),
    "prior_period_delinquency_rate_pct" NUMERIC(10,6),
    "delinquency_rate_change_pct" NUMERIC(10,6),
    "delinquent_loan_count" INTEGER,
    "overdue_amt_0_30" NUMERIC(20,4),
    "overdue_amt_31_60" NUMERIC(20,4),
    "overdue_amt_61_90_plus" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("lob_delinquency_summary_sk")
);

-- lob_profitability_allocation_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_profitability_allocation_summary" (
    "lob_profitability_allocation_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "allocation_dim_type" VARCHAR(255),
    "allocation_dim_id" BIGINT,
    "allocation_dim_name" VARCHAR(500),
    "allocation_pct" NUMERIC(10,6),
    "exposure_amt" NUMERIC(20,4),
    "total_revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "roe_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "nim_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("lob_profitability_allocation_summary_sk")
);

-- deal_pipeline_stage_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."deal_pipeline_stage_summary" (
    "deal_pipeline_stage_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "pipeline_stage_code" VARCHAR(30),
    "deal_count" INTEGER,
    "expected_exposure_amt" NUMERIC(20,4),
    "expected_collateral_value_amt" NUMERIC(20,4),
    "avg_expected_spread_bps" NUMERIC(10,4),
    "avg_expected_coverage_ratio" VARCHAR(255),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("deal_pipeline_stage_summary_sk")
);

-- lob_credit_quality_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_credit_quality_summary" (
    "lob_credit_quality_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "avg_internal_risk_rating" VARCHAR(255),
    "prior_period_avg_internal_risk_rating" VARCHAR(255),
    "avg_internal_risk_rating_change" VARCHAR(255),
    "dscr_value" NUMERIC(12,6),
    "dcsr_value" NUMERIC(12,6),
    "rwa_density_pct" NUMERIC(10,6),
    "rating_downgrade_count" INTEGER,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "external_downgrade_count" INTEGER,
    "internal_downgrade_count" INTEGER,
    "criticized_portfolio_count" INTEGER,
    "criticized_exposure_amt" NUMERIC(20,4),
    "deteriorated_deal_count" INTEGER,
    "doi_pct" NUMERIC(10,6),
    PRIMARY KEY ("lob_credit_quality_summary_sk")
);

-- kpi_period_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."kpi_period_summary" (
    "kpi_period_summary_sk" BIGSERIAL NOT NULL,
    "kpi_code" VARCHAR(30),
    "as_of_date" DATE,
    "prior_as_of_date" DATE,
    "scenario_id" BIGINT,
    "legal_entity_id" BIGINT,
    "current_value" NUMERIC(12,6),
    "prior_value" NUMERIC(12,6),
    "change_value" NUMERIC(12,6),
    "change_pct" NUMERIC(10,6),
    "unit_of_measure" VARCHAR(255),
    "base_currency_code" VARCHAR(30),
    "run_version_id" BIGINT,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("kpi_period_summary_sk")
);

-- risk_appetite_metric_state (Executive Dashboard)
CREATE TABLE IF NOT EXISTS "l3"."risk_appetite_metric_state" (
    "risk_appetite_metric_state_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "metric_id" VARCHAR(64),
    "metric_name" VARCHAR(500),
    "metric_description" TEXT,
    "metric_classification" VARCHAR(255),
    "limit_type_code" VARCHAR(30),
    "current_value" NUMERIC(12,6),
    "limit_value" NUMERIC(12,6),
    "inner_threshold_value" NUMERIC(12,6),
    "outer_threshold_value" NUMERIC(12,6),
    "utilization_pct" NUMERIC(10,6),
    "status_code" VARCHAR(30),
    "velocity_30d_pct" NUMERIC(10,6),
    "velocity_90d_pct" NUMERIC(10,6),
    "immediate_action_text" TEXT,
    "report_frequency_code" VARCHAR(30),
    "report_deadline_date" DATE,
    "metric_owner" VARCHAR(255),
    "first_lod_sponsor" VARCHAR(255),
    "second_lod_sponsor" VARCHAR(255),
    "last_metric_updated_ts" TIMESTAMP,
    "last_threshold_updated_ts" TIMESTAMP,
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("risk_appetite_metric_state_sk")
);

-- executive_highlight_summary (Executive Dashboard)
CREATE TABLE IF NOT EXISTS "l3"."executive_highlight_summary" (
    "executive_highlight_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "highlight_seq" INTEGER,
    "highlight_category" VARCHAR(255),
    "highlight_text" TEXT,
    "driver_text" TEXT,
    "action_required_text" TEXT,
    "icon_code" VARCHAR(30),
    "severity_code" VARCHAR(30),
    "source_metric_id" VARCHAR(64),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("executive_highlight_summary_sk")
);

-- counterparty_detail_snapshot (Counterparty Analytics)
CREATE TABLE IF NOT EXISTS "l3"."counterparty_detail_snapshot" (
    "counterparty_detail_snapshot_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "counterparty_id" BIGINT,
    "counterparty_name" VARCHAR(500),
    "is_parent_flag" BOOLEAN,
    "parent_counterparty_id" BIGINT,
    "parent_counterparty_name" VARCHAR(500),
    "legal_entity_id" BIGINT,
    "country_code" VARCHAR(30),
    "region_code" VARCHAR(30),
    "industry_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "internal_risk_rating" VARCHAR(255),
    "external_risk_rating" VARCHAR(255),
    "counterparty_type" VARCHAR(255),
    "total_gross_exposure_amt" NUMERIC(20,4),
    "total_net_exposure_amt" NUMERIC(20,4),
    "total_committed_amt" NUMERIC(20,4),
    "total_outstanding_amt" NUMERIC(20,4),
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "expected_loss_amt" NUMERIC(20,4),
    "credit_limit_amt" NUMERIC(20,4),
    "utilized_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "headroom_amt" NUMERIC(20,4),
    "risk_tier_code" VARCHAR(30),
    "limit_status_code" VARCHAR(30),
    "facility_count" INTEGER,
    "crm_type" VARCHAR(255),
    "prior_period_gross_exposure_amt" NUMERIC(20,4),
    "exposure_change_pct" NUMERIC(10,6),
    "base_currency_code" VARCHAR(30),
    "lob_node_id" BIGINT,
    "created_ts" TIMESTAMP,
    "rwa_amt" NUMERIC(20,4),
    "rwa_density_pct" NUMERIC(10,6),
    PRIMARY KEY ("counterparty_detail_snapshot_sk")
);

-- limit_tier_status_matrix (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_tier_status_matrix" (
    "limit_tier_status_matrix_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "risk_tier_code" VARCHAR(30),
    "limit_status_code" VARCHAR(30),
    "counterparty_count" INTEGER,
    "prior_period_counterparty_count" INTEGER,
    "counterparty_count_change" VARCHAR(255),
    "total_utilized_exposure_amt" NUMERIC(20,4),
    "total_headroom_amt" NUMERIC(20,4),
    "risk_score" VARCHAR(255),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("limit_tier_status_matrix_sk")
);

-- limit_counterparty_movement (Limits & Appetite)
CREATE TABLE IF NOT EXISTS "l3"."limit_counterparty_movement" (
    "limit_counterparty_movement_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "risk_tier_code" VARCHAR(30),
    "limit_status_code" VARCHAR(30),
    "counterparty_id" BIGINT,
    "movement_type" VARCHAR(255),
    "prior_limit_status_code" VARCHAR(30),
    "counterparty_name" VARCHAR(500),
    "gross_exposure_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("limit_counterparty_movement_sk")
);

-- data_quality_score_summary (Data Quality)
CREATE TABLE IF NOT EXISTS "l3"."data_quality_score_summary" (
    "data_quality_score_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "dimension_type" VARCHAR(255),
    "dimension_id" BIGINT,
    "dimension_name" VARCHAR(500),
    "data_quality_score_pct" NUMERIC(10,6),
    "prior_period_dq_score_pct" NUMERIC(10,6),
    "dq_score_change_pct" NUMERIC(10,6),
    "total_dq_issues" VARCHAR(255),
    "reconciliation_break_count" INTEGER,
    "prior_period_recon_break_count" INTEGER,
    "leading_issue_type" VARCHAR(255),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("data_quality_score_summary_sk")
);

-- legal_entity_risk_profile (Legal Entity Analytics)
CREATE TABLE IF NOT EXISTS "l3"."legal_entity_risk_profile" (
    "legal_entity_risk_profile_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "le_classification" VARCHAR(255),
    "gross_exposure_amt" NUMERIC(20,4),
    "net_exposure_amt" NUMERIC(20,4),
    "has_cross_entity_flag" BOOLEAN,
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "facility_count" INTEGER,
    "liquidity_ratio_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "avg_pd_pct" NUMERIC(10,6),
    "avg_lgd_pct" NUMERIC(10,6),
    "expected_loss_amt" NUMERIC(20,4),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "rwa_amt" NUMERIC(20,4),
    "rwa_density_pct" NUMERIC(10,6),
    PRIMARY KEY ("legal_entity_risk_profile_sk")
);

-- data_quality_attribute_score (Data Quality)
CREATE TABLE IF NOT EXISTS "l3"."data_quality_attribute_score" (
    "data_quality_attribute_score_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "attribute_name" VARCHAR(500),
    "data_quality_score_pct" NUMERIC(10,6),
    "dq_issue_count" INTEGER,
    "impact_pct" NUMERIC(10,6),
    "impacted_reports" VARCHAR(255),
    "rank_order" INTEGER,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("data_quality_attribute_score_sk")
);

-- data_quality_trend (Data Quality)
CREATE TABLE IF NOT EXISTS "l3"."data_quality_trend" (
    "data_quality_trend_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "legal_entity_id" BIGINT,
    "data_quality_score_pct" NUMERIC(10,6),
    "reconciliation_break_count" INTEGER,
    "total_dq_issues" VARCHAR(255),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("data_quality_trend_sk")
);

-- stress_test_result_summary (Stress Testing)
CREATE TABLE IF NOT EXISTS "l3"."stress_test_result_summary" (
    "stress_test_result_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "scenario_name" VARCHAR(500),
    "scenario_type" VARCHAR(255),
    "scenario_description" TEXT,
    "scope_description" TEXT,
    "total_exposure_amt" NUMERIC(20,4),
    "expected_loss_amt" NUMERIC(20,4),
    "capital_impact_pct" NUMERIC(10,6),
    "total_breach_count" INTEGER,
    "critical_breach_count" INTEGER,
    "high_breach_count" INTEGER,
    "moderate_breach_count" INTEGER,
    "low_breach_count" INTEGER,
    "result_status_code" VARCHAR(30),
    "last_tested_date" DATE,
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("stress_test_result_summary_sk")
);

-- stress_test_breach_detail (Stress Testing)
CREATE TABLE IF NOT EXISTS "l3"."stress_test_breach_detail" (
    "stress_test_breach_detail_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "scenario_id" BIGINT,
    "breach_seq" INTEGER,
    "lob_node_id" BIGINT,
    "lob_name" VARCHAR(500),
    "breach_severity" VARCHAR(255),
    "control_description" TEXT,
    "control_owner_name" VARCHAR(500),
    "exception_description" TEXT,
    "expected_loss_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("stress_test_breach_detail_sk")
);

-- regulatory_compliance_state (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS "l3"."regulatory_compliance_state" (
    "regulatory_compliance_state_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "metric_id" VARCHAR(64),
    "metric_name" VARCHAR(500),
    "current_value" NUMERIC(12,6),
    "regulatory_threshold" VARCHAR(255),
    "variance_value" NUMERIC(12,6),
    "compliance_status" VARCHAR(255),
    "prior_period_value" NUMERIC(12,6),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("regulatory_compliance_state_sk")
);

-- facility_timeline_summary (Facility Analytics)
CREATE TABLE IF NOT EXISTS "l3"."facility_timeline_summary" (
    "facility_timeline_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "timeline_month" VARCHAR(255),
    "timeline_type" VARCHAR(255),
    "facility_count" INTEGER,
    "total_exposure_amt" NUMERIC(20,4),
    "cumulative_exposure_change_amt" NUMERIC(20,4),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_timeline_summary_sk")
);

-- amendment_summary (Amendment Analytics)
CREATE TABLE IF NOT EXISTS "l3"."amendment_summary" (
    "amendment_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "amendment_type_code" VARCHAR(30),
    "amendment_type_name" VARCHAR(500),
    "amendment_status_code" VARCHAR(30),
    "amendment_status_name" VARCHAR(500),
    "credit_agreement_count" INTEGER,
    "total_exposure_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("amendment_summary_sk")
);

-- amendment_detail (Amendment Analytics)
CREATE TABLE IF NOT EXISTS "l3"."amendment_detail" (
    "amendment_detail_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "amendment_event_id" BIGINT,
    "credit_agreement_id" BIGINT,
    "obligor_name" VARCHAR(500),
    "amendment_type_code" VARCHAR(30),
    "amendment_description" TEXT,
    "original_value" NUMERIC(12,6),
    "amended_value" NUMERIC(12,6),
    "amendment_start_date" DATE,
    "amendment_status_code" VARCHAR(30),
    "amendment_aging_days" VARCHAR(255),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("amendment_detail_sk")
);

-- facility_detail_snapshot (Facility Analytics)
CREATE TABLE IF NOT EXISTS "l3"."facility_detail_snapshot" (
    "facility_detail_snapshot_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "facility_id" BIGINT,
    "facility_type" VARCHAR(255),
    "facility_purpose_desc" TEXT,
    "lob_l1_name" VARCHAR(500),
    "lob_l2_name" VARCHAR(500),
    "portfolio_name" VARCHAR(500),
    "product_name" VARCHAR(500),
    "region_name" VARCHAR(500),
    "counterparty_id" BIGINT,
    "counterparty_name" VARCHAR(500),
    "committed_amt" NUMERIC(20,4),
    "utilized_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "coverage_ratio_pct" NUMERIC(10,6),
    "effective_date" DATE,
    "maturity_date" DATE,
    "days_remaining" VARCHAR(255),
    "facility_duration_days" VARCHAR(255),
    "status_code" VARCHAR(30),
    "is_syndicated_flag" BOOLEAN,
    "interest_rate_pct" NUMERIC(10,6),
    "rate_type" VARCHAR(255),
    "all_in_rate_pct" NUMERIC(10,6),
    "interest_rate_spread_bps" NUMERIC(10,4),
    "interest_rate_index" VARCHAR(255),
    "rate_cap_pct" NUMERIC(10,6),
    "payment_frequency" VARCHAR(255),
    "prepayment_penalty_desc" TEXT,
    "has_amendment_flag" BOOLEAN,
    "amendment_count" INTEGER,
    "facility_active_flag" BOOLEAN,
    "maturity_date_bucket" VARCHAR(20),
    "origination_date_bucket" VARCHAR(20),
    "effective_date_bucket" VARCHAR(20),
    "bank_share_pct" NUMERIC(10,4),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "is_deteriorated" VARCHAR(64),
    "risk_rating_tier_code" VARCHAR(20),
    "utilization_status_code" VARCHAR(20),
    "pricing_tier_code" VARCHAR(20),
    "dpd_bucket_code" VARCHAR(20),
    "origination_bucket_code" VARCHAR(20),
    "maturity_bucket_id" BIGINT,
    PRIMARY KEY ("facility_detail_snapshot_sk")
);

-- lob_risk_ratio_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_risk_ratio_summary" (
    "lob_risk_ratio_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "fccr_value" NUMERIC(12,6),
    "lcr_pct" NUMERIC(10,6),
    "capital_adequacy_ratio_pct" NUMERIC(10,6),
    "tangible_net_worth_amt" NUMERIC(20,4),
    "cash_interest_expense_amt" NUMERIC(20,4),
    "exception_rate_pct" NUMERIC(10,6),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("lob_risk_ratio_summary_sk")
);

-- lob_deterioration_summary (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_deterioration_summary" (
    "lob_deterioration_summary_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "deteriorated_deal_count" INTEGER,
    "deteriorated_deal_exposure_amt" NUMERIC(20,4),
    "deteriorated_deal_pct" NUMERIC(10,6),
    "criticized_portfolio_count" INTEGER,
    "criticized_exposure_amt" NUMERIC(20,4),
    "doi_pct" NUMERIC(10,6),
    "internal_downgrade_count" INTEGER,
    "external_downgrade_count" INTEGER,
    "total_rating_change_count" INTEGER,
    "prior_period_deteriorated_count" INTEGER,
    "deterioration_change_pct" NUMERIC(10,6),
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("lob_deterioration_summary_sk")
);

-- lob_rating_distribution (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_rating_distribution" (
    "lob_rating_distribution_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "rating_bucket_code" VARCHAR(30),
    "rating_bucket_name" VARCHAR(500),
    "counterparty_count" INTEGER,
    "exposure_amt" NUMERIC(20,4),
    "bucket_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("lob_rating_distribution_sk")
);

-- lob_top_contributors (Business Segment Summary)
CREATE TABLE IF NOT EXISTS "l3"."lob_top_contributors" (
    "lob_top_contributors_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT,
    "rank_order" INTEGER,
    "contributor_type" VARCHAR(255),
    "counterparty_id" BIGINT,
    "counterparty_name" VARCHAR(500),
    "exposure_amt" NUMERIC(20,4),
    "utilization_pct" NUMERIC(10,6),
    "contribution_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("lob_top_contributors_sk")
);

-- metric_value_fact (Dashboard Consumption)
CREATE TABLE IF NOT EXISTS "l3"."metric_value_fact" (
    "metric_value_fact_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "metric_id" VARCHAR(64),
    "variant_id" VARCHAR(64),
    "aggregation_level" VARCHAR(30),
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "desk_id" BIGINT,
    "portfolio_id" BIGINT,
    "lob_id" BIGINT,
    "value" NUMERIC(20,6),
    "unit" VARCHAR(30),
    "display_format" VARCHAR(64),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("metric_value_fact_sk")
);

-- calc_audit_log (Uncategorized)
CREATE TABLE IF NOT EXISTS "l3"."calc_audit_log" (
    "audit_id" BIGINT NOT NULL,
    "run_id" VARCHAR(64),
    "metric_id" VARCHAR(64),
    "metric_version" VARCHAR(20),
    "aggregation_level" VARCHAR(30),
    "status" VARCHAR(20),
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "duration_ms" BIGINT,
    "rows_returned" INTEGER,
    "rows_written" INTEGER,
    "sql_executed" TEXT,
    "sql_hash" VARCHAR(64),
    "source_tables" text[],
    "source_row_counts" VARCHAR(64),
    "bind_params" VARCHAR(64),
    "error_message" TEXT,
    "error_code" VARCHAR(30),
    "error_detail" TEXT,
    "dependency_chain" text[],
    PRIMARY KEY ("audit_id")
);

-- calc_run (Uncategorized)
CREATE TABLE IF NOT EXISTS "l3"."calc_run" (
    "run_id" VARCHAR(64) NOT NULL,
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "prior_as_of_date" DATE,
    "base_currency_code" VARCHAR(10),
    "mode" VARCHAR(20),
    "status" VARCHAR(20),
    "metrics_requested" INTEGER,
    "metrics_succeeded" INTEGER,
    "metrics_failed" INTEGER,
    "metrics_skipped" INTEGER,
    "total_rows_written" BIGINT,
    "started_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "duration_ms" BIGINT,
    "triggered_by" VARCHAR(200),
    "cli_args" TEXT,
    "engine_version" VARCHAR(30),
    "git_sha" VARCHAR(40),
    "error_summary" TEXT,
    "config_snapshot" VARCHAR(64),
    PRIMARY KEY ("run_id")
);

-- calc_validation_result (Uncategorized)
CREATE TABLE IF NOT EXISTS "l3"."calc_validation_result" (
    "validation_id" BIGINT NOT NULL,
    "run_id" VARCHAR(64),
    "metric_id" VARCHAR(64),
    "rule_id" BIGINT,
    "rule_type" VARCHAR(30),
    "severity" VARCHAR(10),
    "status" VARCHAR(10),
    "aggregation_level" VARCHAR(30),
    "dimension_key" VARCHAR(128),
    "expected_value" NUMERIC(20,6),
    "actual_value" NUMERIC(20,6),
    "tolerance" NUMERIC(20,6),
    "message" TEXT,
    "detail" VARCHAR(64),
    "checked_at" TIMESTAMP,
    PRIMARY KEY ("validation_id")
);

-- metric_result (Uncategorized)
CREATE TABLE IF NOT EXISTS "l3"."metric_result" (
    "result_id" BIGINT NOT NULL,
    "run_id" VARCHAR(64),
    "run_version_id" BIGINT,
    "as_of_date" DATE,
    "metric_id" VARCHAR(64),
    "metric_version" VARCHAR(20),
    "aggregation_level" VARCHAR(30),
    "dimension_key" VARCHAR(128),
    "dimension_label" VARCHAR(500),
    "metric_value" NUMERIC(20,6),
    "unit_type" VARCHAR(30),
    "display_format" VARCHAR(64),
    "base_currency_code" VARCHAR(10),
    "scenario_id" BIGINT,
    "formula_hash" VARCHAR(64),
    "source_row_count" INTEGER,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("result_id")
);

-- facility_risk_calc (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."facility_risk_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "ead_amt" NUMERIC(20,4),
    "expected_loss_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "exposure_at_default" NUMERIC(20,4),
    "lgd_estimate" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- netting_set_exposure_calc (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS "l3"."netting_set_exposure_calc" (
    "netting_set_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "netted_exposure_amount" NUMERIC(20,4),
    "netting_benefit_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("netting_set_id", "as_of_date")
);

-- facility_exposure_calc (Exposure & Risk Metrics)
-- Calculated overlay for l2.facility_exposure_snapshot
CREATE TABLE IF NOT EXISTS "l3"."facility_exposure_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "days_until_maturity" INTEGER,
    "rwa_amt" NUMERIC(20,4),
    "utilization_status_code" VARCHAR(20),
    "risk_rating_tier_code" VARCHAR(20),
    "limit_status_code" VARCHAR(20),
    "coverage_ratio_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "undrawn_amt" NUMERIC(20,4),
    "net_exposure_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_financial_calc (Facility Analytics)
-- Calculated overlay for l2.facility_financial_snapshot
CREATE TABLE IF NOT EXISTS "l3"."facility_financial_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "dscr_value" NUMERIC(12,6),
    "dscr" NUMERIC(10,6),
    "ltv_pct" NUMERIC(10,6),
    "net_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "revenue_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "fee_rate_pct" NUMERIC(10,6),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),
    "interest_coverage_ratio" NUMERIC(10,6),
    "debt_yield_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- counterparty_rating_calc (Credit Events & Performance)
-- Calculated overlay for l2.counterparty_rating_observation
CREATE TABLE IF NOT EXISTS "l3"."counterparty_rating_calc" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "rating_type" VARCHAR(30),
    "risk_rating_change_steps" INTEGER,
    "rating_change_status_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("counterparty_id", "as_of_date", "rating_type")
);

-- facility_pricing_calc (Facility Analytics)
-- Calculated overlay for l2.facility_pricing_snapshot
CREATE TABLE IF NOT EXISTS "l3"."facility_pricing_calc" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "pricing_exception_flag" BOOLEAN,
    "pricing_tier_code" VARCHAR(20),
    "fee_rate_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- collateral_calc (Credit Risk Mitigation (CRM))
-- Calculated overlay for l2.collateral_snapshot
CREATE TABLE IF NOT EXISTS "l3"."collateral_calc" (
    "collateral_asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "allocated_amount_usd" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("collateral_asset_id", "as_of_date")
);

-- data_quality_score_snapshot (Data Quality)
CREATE TABLE IF NOT EXISTS "l3"."data_quality_score_snapshot" (
    "table_name" VARCHAR(100) NOT NULL,
    "as_of_date" DATE NOT NULL,
    "completeness_score_pct" NUMERIC(10,6),
    "accuracy_score_pct" NUMERIC(10,6),
    "timeliness_score_pct" NUMERIC(10,6),
    "overall_dq_score_pct" NUMERIC(10,6),
    "total_row_count" INTEGER,
    "null_field_count" INTEGER,
    "anomaly_count" INTEGER,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("table_name", "as_of_date")
);

-- stress_test_result (Stress Testing)
CREATE TABLE IF NOT EXISTS "l3"."stress_test_result" (
    "stress_test_result_id" BIGSERIAL NOT NULL,
    "position_id" BIGINT,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "scenario_id" BIGINT,
    "as_of_date" DATE,
    "stressed_exposure_amt" NUMERIC(20,4),
    "stressed_expected_loss" NUMERIC(20,4),
    "capital_impact_pct" NUMERIC(10,6),
    "currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("stress_test_result_id")
);

-- gl_account_balance_calc (General Ledger)
CREATE TABLE IF NOT EXISTS "l3"."gl_account_balance_calc" (
    "ledger_account_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "ending_balance_net_amt" NUMERIC(20,4),
    "period_net_activity_amt" NUMERIC(20,4),
    "balance_change_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("ledger_account_id", "as_of_date")
);

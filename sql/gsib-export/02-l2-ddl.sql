-- L2 Data Model DDL
-- Generated from data dictionary (viz cache)
-- Target: PostgreSQL

CREATE SCHEMA IF NOT EXISTS l2;
SET search_path TO l1, l2, public;


-- position (Position Core)
CREATE TABLE IF NOT EXISTS "l2"."position" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE,
    "facility_id" BIGINT,
    "instrument_id" BIGINT,
    "balance_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "accrued_interest_amt" NUMERIC(18,2),
    "book_value_amt" NUMERIC(18,2),
    "contractual_maturity_date" DATE,
    "counterparty_id" BIGINT,
    "credit_agreement_id" BIGINT,
    "credit_status_code" VARCHAR(20),
    "effective_date" DATE,
    "exposure_type_code" VARCHAR(20),
    "external_risk_rating" VARCHAR(100),
    "internal_risk_rating" VARCHAR(100),
    "legal_entity_id" BIGINT,
    "lgd_estimate" VARCHAR(100),
    "market_value_amt" NUMERIC(18,2),
    "netting_set_id" BIGINT,
    "notional_amount" NUMERIC(18,2),
    "pd_estimate" VARCHAR(100),
    "position_currency" VARCHAR(100),
    "trading_banking_book_flag" BOOLEAN,
    "ultimate_parent_id" BIGINT,
    "product_node_id" BIGINT,
    "product_code" VARCHAR(50),
    PRIMARY KEY ("position_id")
);

-- position_detail (Position Detail)
CREATE TABLE IF NOT EXISTS "l2"."position_detail" (
    "position_detail_id" BIGINT NOT NULL,
    "position_id" BIGINT,
    "as_of_date" DATE,
    "detail_type" VARCHAR(50),
    "amount" NUMERIC(18,2),
    "maturity_date" DATE,
    "cash_leg_amount" NUMERIC(18,2),
    "ccf" NUMERIC(5,4),
    "current_balance" NUMERIC(18,2),
    "days_past_due" INTEGER,
    "delinquency_status" VARCHAR(30),
    "derivative_type" VARCHAR(50),
    "fair_value" NUMERIC(18,2),
    "funded_amount" NUMERIC(18,2),
    "haircut_applied_pct" NUMERIC(10,4),
    "insured_balance" NUMERIC(18,2),
    "interest_rate" NUMERIC(8,6),
    "mark_to_market" NUMERIC(18,2),
    "origination_date" DATE,
    "pfe" VARCHAR(100),
    "quantity" INTEGER,
    "rate_index" NUMERIC(10,4),
    "rate_type" VARCHAR(64),
    "replacement_cost" NUMERIC(18,2),
    "sft_type" VARCHAR(50),
    "spread_bps" NUMERIC(8,2),
    "total_commitment" NUMERIC(18,2),
    "unfunded_amount" NUMERIC(18,2),
    "unrealized_gain_loss" VARCHAR(100),
    "product_node_id" BIGINT,
    "exposure_type_code" VARCHAR(20),
    "notional_amount" NUMERIC(18,2),
    "credit_conversion_factor" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "risk_weight_pct" NUMERIC(10,6),
    "delinquent_payment_flag" BOOLEAN,
    "overdue_amt_0_30" NUMERIC(18,2),
    "overdue_amt_31_60" NUMERIC(18,2),
    "overdue_amt_61_90_plus" NUMERIC(18,2),
    PRIMARY KEY ("position_detail_id")
);

-- exposure_counterparty_attribution (Exposure)
CREATE TABLE IF NOT EXISTS "l2"."exposure_counterparty_attribution" (
    "attribution_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "exposure_type_id" BIGINT,
    "counterparty_id" BIGINT,
    "exposure_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "attributed_exposure_usd" NUMERIC(18,2),
    "attribution_pct" NUMERIC(10,4),
    "counterparty_role_code" VARCHAR(20),
    "facility_id" BIGINT,
    "is_risk_shifted_flag" BOOLEAN,
    "risk_shifted_from_counterparty_id" BIGINT,
    PRIMARY KEY ("attribution_id", "as_of_date")
);

-- facility_exposure_snapshot (Exposure)
CREATE TABLE IF NOT EXISTS "l2"."facility_exposure_snapshot" (
    "facility_id" BIGINT,
    "as_of_date" DATE,
    "exposure_type_id" BIGINT,
    "drawn_amount" NUMERIC(18,2),
    "committed_amount" NUMERIC(18,2),
    "undrawn_amount" NUMERIC(18,2),
    "source_system_id" BIGINT,
    "counterparty_id" BIGINT,
    "coverage_ratio_pct" NUMERIC(10,4),
    "currency_code" VARCHAR(20),
    "exposure_amount_local" NUMERIC(18,2),
    "facility_exposure_id" BIGINT NOT NULL,
    "fr2590_category_code" VARCHAR(20),
    "gross_exposure_usd" NUMERIC(18,2),
    "legal_entity_id" BIGINT,
    "lob_segment_id" BIGINT,
    "net_exposure_usd" NUMERIC(18,2),
    "product_node_id" BIGINT,
    "outstanding_balance_amt" NUMERIC(18,2),
    "undrawn_commitment_amt" NUMERIC(18,2),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "days_until_maturity" INTEGER,
    "limit_status_code" VARCHAR(50),
    "rwa_amt" NUMERIC(18,2),
    "internal_risk_rating_bucket_code" VARCHAR(20),
    "total_collateral_mv_usd" NUMERIC(18,2),
    "bank_share_pct" NUMERIC(10,4),
    PRIMARY KEY ("facility_exposure_id")
);

-- netting_set_exposure_snapshot (Exposure)
CREATE TABLE IF NOT EXISTS "l2"."netting_set_exposure_snapshot" (
    "netting_set_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "netted_exposure_amount" NUMERIC(18,2),
    "gross_exposure_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "collateral_held_usd" NUMERIC(18,2),
    "counterparty_id" BIGINT,
    "gross_mtm_usd" NUMERIC(18,2),
    "legal_entity_id" BIGINT,
    "netting_set_exposure_id" BIGINT,
    "pfe_usd" NUMERIC(18,2),
    "netting_benefit_amt" NUMERIC(18,2),
    PRIMARY KEY ("netting_set_id", "as_of_date")
);

-- facility_lob_attribution (Business Segment Attribution)
CREATE TABLE IF NOT EXISTS "l2"."facility_lob_attribution" (
    "attribution_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "as_of_date" DATE,
    "lob_segment_id" BIGINT,
    "attribution_pct" NUMERIC(10,4),
    "attributed_amount" NUMERIC(18,2),
    "attribution_amount_usd" NUMERIC(18,2),
    "attribution_type" VARCHAR(50),
    "lob_node_id" BIGINT,
    "hierarchy_id" VARCHAR(64),
    PRIMARY KEY ("attribution_id")
);

-- collateral_snapshot (CRM)
CREATE TABLE IF NOT EXISTS "l2"."collateral_snapshot" (
    "collateral_asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "valuation_amount" NUMERIC(18,2),
    "haircut_pct" NUMERIC(10,4),
    "eligible_collateral_amount" NUMERIC(18,2),
    "source_system_id" BIGINT,
    "allocated_amount_usd" NUMERIC(18,2),
    "collateral_snapshot_id" BIGINT,
    "counterparty_id" BIGINT,
    "crm_type_code" VARCHAR(20),
    "current_valuation_usd" NUMERIC(18,2),
    "facility_id" BIGINT,
    "mitigant_group_code" VARCHAR(20),
    "mitigant_subtype" VARCHAR(100),
    "original_valuation_usd" NUMERIC(18,2),
    "risk_shifting_flag" BOOLEAN,
    PRIMARY KEY ("collateral_asset_id", "as_of_date")
);

-- cash_flow (Cash Flows)
CREATE TABLE IF NOT EXISTS "l2"."cash_flow" (
    "cash_flow_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "cash_flow_date" DATE,
    "cash_flow_type" VARCHAR(50),
    "amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "as_of_date" DATE,
    "contractual_amt" NUMERIC(18,2),
    "contractual_amt_usd" NUMERIC(18,2),
    "counterparty_id" BIGINT,
    "flow_date" DATE,
    "flow_direction" VARCHAR(100),
    "flow_id" BIGINT,
    "flow_type" VARCHAR(50),
    "position_id" BIGINT,
    PRIMARY KEY ("cash_flow_id")
);

-- facility_delinquency_snapshot (Financial Metrics)
CREATE TABLE IF NOT EXISTS "l2"."facility_delinquency_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "credit_status_code" VARCHAR(30),
    "days_past_due" INTEGER,
    "watch_list_flag" BOOLEAN,
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "days_past_due_max" INTEGER,
    "delinquency_bucket_code" VARCHAR(20),
    "delinquency_snapshot_id" BIGINT,
    "delinquency_status_code" VARCHAR(20),
    "last_payment_received_date" DATE,
    "overdue_interest_amt" NUMERIC(18,2),
    "overdue_principal_amt" NUMERIC(18,2),
    "delinquent_payment_flag" BOOLEAN,
    "overdue_amt_0_30" NUMERIC(18,2),
    "overdue_amt_31_60" NUMERIC(18,2),
    "overdue_amt_61_90_plus" NUMERIC(18,2),
    "dpd_bucket_code" VARCHAR(20),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_pricing_snapshot (Financial Metrics)
CREATE TABLE IF NOT EXISTS "l2"."facility_pricing_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "spread_bps" NUMERIC(10,2),
    "rate_index_id" BIGINT,
    "all_in_rate_pct" NUMERIC(10,4),
    "floor_pct" NUMERIC(10,4),
    "base_rate_pct" NUMERIC(10,4),
    "currency_code" VARCHAR(20),
    "facility_pricing_id" BIGINT,
    "min_spread_threshold_bps" NUMERIC(8,2),
    "payment_frequency" VARCHAR(30),
    "prepayment_penalty_flag" BOOLEAN,
    "rate_cap_pct" NUMERIC(10,4),
    "rate_index_code" VARCHAR(20),
    "pricing_exception_flag" BOOLEAN,
    "fee_rate_pct" NUMERIC(10,6),
    "cost_of_funds_pct" NUMERIC(10,6),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_profitability_snapshot (Financial Metrics)
CREATE TABLE IF NOT EXISTS "l2"."facility_profitability_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "nii_ytd" NUMERIC(18,2),
    "fee_income_ytd" NUMERIC(18,2),
    "ledger_account_id" BIGINT,
    "allocated_equity_amt" NUMERIC(18,2),
    "avg_earning_assets_amt" NUMERIC(18,2),
    "base_currency_code" VARCHAR(20),
    "fee_income_amt" NUMERIC(18,2),
    "interest_expense_amt" NUMERIC(18,2),
    "interest_income_amt" NUMERIC(18,2),
    "profitability_snapshot_id" BIGINT,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- limit_contribution_snapshot (Limits)
CREATE TABLE IF NOT EXISTS "l2"."limit_contribution_snapshot" (
    "limit_rule_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "contribution_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "contribution_amount_usd" NUMERIC(18,2),
    "contribution_id" BIGINT,
    "contribution_pct" NUMERIC(10,4),
    "facility_id" BIGINT,
    PRIMARY KEY ("limit_rule_id", "counterparty_id", "as_of_date")
);

-- limit_utilization_event (Limits)
CREATE TABLE IF NOT EXISTS "l2"."limit_utilization_event" (
    "limit_rule_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "counterparty_id" BIGINT,
    "utilized_amount" NUMERIC(18,2),
    "available_amount" NUMERIC(18,2),
    "reporting_ts" TIMESTAMP,
    "utilization_event_id" BIGINT,
    "utilized_amount_usd" NUMERIC(18,2),
    PRIMARY KEY ("limit_rule_id", "as_of_date")
);

-- limit_assignment_snapshot (Limits)
CREATE TABLE IF NOT EXISTS "l2"."limit_assignment_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "limit_rule_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "limit_amt" NUMERIC(20,4),
    "assigned_date" DATE,
    "expiry_date" DATE,
    "status_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "limit_rule_id", "as_of_date")
);

-- amendment_change_detail (Amendments)
CREATE TABLE IF NOT EXISTS "l2"."amendment_change_detail" (
    "change_detail_id" BIGINT NOT NULL,
    "amendment_id" BIGINT,
    "change_type" VARCHAR(50),
    "old_value" TEXT,
    "new_value" TEXT,
    "amendment_event_id" BIGINT,
    "change_currency_code" VARCHAR(20),
    "change_field_name" VARCHAR(200),
    "change_seq" BIGINT,
    PRIMARY KEY ("change_detail_id")
);

-- amendment_event (Amendments)
CREATE TABLE IF NOT EXISTS "l2"."amendment_event" (
    "amendment_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "credit_agreement_id" BIGINT,
    "amendment_type_code" VARCHAR(20),
    "amendment_status_code" VARCHAR(20),
    "effective_date" DATE,
    "event_ts" TIMESTAMP,
    "amendment_description" VARCHAR(2000),
    "amendment_event_id" BIGINT,
    "amendment_status" VARCHAR(30),
    "amendment_subtype" VARCHAR(100),
    "amendment_type" VARCHAR(50),
    "as_of_date" DATE,
    "completed_date" DATE,
    "counterparty_id" BIGINT,
    "identified_date" DATE,
    "last_updated_ts" TIMESTAMP,
    PRIMARY KEY ("amendment_id")
);

-- credit_event (Credit Events)
CREATE TABLE IF NOT EXISTS "l2"."credit_event" (
    "credit_event_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "credit_event_type_code" VARCHAR(30),
    "event_date" DATE,
    "event_ts" TIMESTAMP,
    "default_definition_id" BIGINT,
    "as_of_date" DATE,
    "event_risk_rating" VARCHAR(100),
    "event_status" VARCHAR(30),
    "event_summary" VARCHAR(2000),
    "loss_amount_usd" NUMERIC(18,2),
    "recovery_amount_usd" NUMERIC(18,2),
    PRIMARY KEY ("credit_event_id")
);

-- credit_event_facility_link (Credit Events)
CREATE TABLE IF NOT EXISTS "l2"."credit_event_facility_link" (
    "link_id" BIGINT NOT NULL,
    "credit_event_id" BIGINT,
    "facility_id" BIGINT,
    "exposure_at_default" NUMERIC(18,2),
    "as_of_date" DATE,
    "estimated_loss_usd" NUMERIC(18,2),
    "impact_pct" NUMERIC(10,4),
    PRIMARY KEY ("link_id")
);

-- stress_test_breach (Stress Testing)
CREATE TABLE IF NOT EXISTS "l2"."stress_test_breach" (
    "breach_id" BIGINT NOT NULL,
    "scenario_id" BIGINT,
    "as_of_date" DATE,
    "limit_rule_id" BIGINT,
    "counterparty_id" BIGINT,
    "breach_amount" NUMERIC(18,2),
    "breach_amount_usd" NUMERIC(18,2),
    "breach_severity" VARCHAR(100),
    "control_description" VARCHAR(2000),
    "control_owner" VARCHAR(100),
    "failure_description" VARCHAR(2000),
    "lob_segment_id" BIGINT,
    "stress_test_result_id" BIGINT,
    PRIMARY KEY ("breach_id")
);

-- stress_test_result (Stress Testing)
CREATE TABLE IF NOT EXISTS "l2"."stress_test_result" (
    "result_id" BIGINT NOT NULL,
    "scenario_id" BIGINT,
    "as_of_date" DATE,
    "result_description" VARCHAR(500),
    "loss_amount" NUMERIC(18,2),
    "capital_impact" NUMERIC(18,2),
    "result_status" VARCHAR(50),
    "scenario_type" VARCHAR(50),
    PRIMARY KEY ("result_id")
);

-- deal_pipeline_fact (Deal Pipeline)
CREATE TABLE IF NOT EXISTS "l2"."deal_pipeline_fact" (
    "pipeline_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "stage_code" VARCHAR(50),
    "proposed_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "expected_all_in_rate_pct" NUMERIC(10,4),
    "expected_close_date" DATE,
    "expected_committed_amt" NUMERIC(18,2),
    "expected_coverage_ratio" NUMERIC(10,4),
    "expected_exposure_amt" NUMERIC(18,2),
    "expected_internal_risk_grade" VARCHAR(255),
    "expected_spread_bps" NUMERIC(8,2),
    "expected_tenor_months" VARCHAR(255),
    "facility_id" BIGINT,
    "lob_segment_id" BIGINT,
    "pipeline_deal_id" BIGINT,
    "pipeline_stage" VARCHAR(100),
    "pipeline_status" VARCHAR(30),
    "record_level_code" VARCHAR(20),
    PRIMARY KEY ("pipeline_id")
);

-- counterparty_rating_observation (Ratings)
CREATE TABLE IF NOT EXISTS "l2"."counterparty_rating_observation" (
    "observation_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "rating_grade_id" BIGINT,
    "rating_source_id" BIGINT,
    "is_internal_flag" BOOLEAN,
    "pd_implied" VARCHAR(100),
    "prior_rating_value" VARCHAR(20),
    "rating_agency" VARCHAR(100),
    "rating_date" DATE,
    "rating_type" VARCHAR(50),
    "rating_value" VARCHAR(20),
    "risk_rating_status" VARCHAR(30),
    "risk_rating_change_steps" INTEGER,
    PRIMARY KEY ("observation_id")
);

-- financial_metric_observation (Metrics)
CREATE TABLE IF NOT EXISTS "l2"."financial_metric_observation" (
    "observation_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "as_of_date" DATE,
    "metric_definition_id" BIGINT,
    "value" NUMERIC(18,4),
    "context_id" BIGINT,
    "credit_agreement_id" BIGINT,
    "metric_category" VARCHAR(50),
    "metric_code" VARCHAR(20),
    "metric_name" VARCHAR(200),
    "metric_value" NUMERIC(18,4),
    "metric_value_usd" NUMERIC(18,2),
    "period_end_date" DATE,
    PRIMARY KEY ("observation_id")
);

-- metric_threshold (Limits & Thresholds)
CREATE TABLE IF NOT EXISTS "l2"."metric_threshold" (
    "threshold_id" BIGINT NOT NULL,
    "metric_definition_id" BIGINT,
    "as_of_date" DATE,
    "threshold_value" NUMERIC(18,4),
    "threshold_type" VARCHAR(50),
    PRIMARY KEY ("threshold_id")
);

-- exception_event (Exceptions)
CREATE TABLE IF NOT EXISTS "l2"."exception_event" (
    "exception_id" BIGINT NOT NULL,
    "as_of_date" DATE,
    "exception_type" VARCHAR(50),
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "raised_ts" TIMESTAMP,
    "resolved_ts" TIMESTAMP,
    "actual_remediation_date" DATE,
    "approver" VARCHAR(100),
    "breach_amount_usd" NUMERIC(18,2),
    "breach_pct" NUMERIC(10,4),
    "days_open" INTEGER,
    "exception_description" VARCHAR(2000),
    "exception_owner" VARCHAR(100),
    "exception_severity" VARCHAR(100),
    "exception_status" VARCHAR(30),
    "exception_value" NUMERIC(18,4),
    "identified_date" DATE,
    "limit_rule_id" BIGINT,
    "lob_segment_id" BIGINT,
    "lod_sponsor" VARCHAR(100),
    "metric_threshold_id" BIGINT,
    "remediation_plan" VARCHAR(2000),
    "target_remediation_date" DATE,
    "threshold_value" NUMERIC(18,4),
    PRIMARY KEY ("exception_id")
);

-- risk_flag (Risk Monitoring)
CREATE TABLE IF NOT EXISTS "l2"."risk_flag" (
    "risk_flag_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "flag_type" VARCHAR(50),
    "as_of_date" DATE,
    "raised_ts" TIMESTAMP,
    "cleared_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "flag_code" VARCHAR(50),
    "flag_description" VARCHAR(2000),
    "flag_scope" VARCHAR(30),
    "flag_severity" VARCHAR(100),
    "flag_trigger_value" NUMERIC(18,4),
    PRIMARY KEY ("risk_flag_id")
);

-- data_quality_score_snapshot (Data Quality)
CREATE TABLE IF NOT EXISTS "l2"."data_quality_score_snapshot" (
    "score_id" BIGINT NOT NULL,
    "as_of_date" DATE,
    "dimension_name" VARCHAR(100),
    "completeness_pct" NUMERIC(10,4),
    "validity_pct" NUMERIC(10,4),
    "overall_score" NUMERIC(10,4),
    "target_table" VARCHAR(100),
    "issue_count" INTEGER,
    PRIMARY KEY ("score_id")
);

-- facility_financial_snapshot (Financial Metrics)
CREATE TABLE IF NOT EXISTS "l2"."facility_financial_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "noi_amt" NUMERIC(18,2),
    "total_debt_service_amt" NUMERIC(18,2),
    "revenue_amt" NUMERIC(18,2),
    "operating_expense_amt" NUMERIC(18,2),
    "ebitda_amt" NUMERIC(18,2),
    "interest_expense_amt" NUMERIC(18,2),
    "principal_payment_amt" NUMERIC(18,2),
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "reporting_period" VARCHAR(20),
    "financial_snapshot_id" BIGINT,
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "net_income_amt" NUMERIC(18,2),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- counterparty_financial_snapshot (Financial Metrics)
CREATE TABLE IF NOT EXISTS "l2"."counterparty_financial_snapshot" (
    "financial_snapshot_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "reporting_period" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "revenue_amt" NUMERIC(18,2),
    "operating_expense_amt" NUMERIC(18,2),
    "net_income_amt" NUMERIC(18,2),
    "interest_expense_amt" NUMERIC(18,2),
    "tax_expense_amt" NUMERIC(18,2),
    "depreciation_amt" NUMERIC(18,2),
    "amortization_amt" NUMERIC(18,2),
    "total_assets_amt" NUMERIC(18,2),
    "total_liabilities_amt" NUMERIC(18,2),
    "shareholders_equity_amt" NUMERIC(18,2),
    "ebitda_amt" NUMERIC(18,2),
    "noi_amt" NUMERIC(18,2),
    "total_debt_service_amt" NUMERIC(18,2),
    "tangible_net_worth_usd" NUMERIC(18,2),
    "expected_drawdown_amt" NUMERIC(18,2),
    "fee_income_amt" NUMERIC(18,2),
    PRIMARY KEY ("financial_snapshot_id")
);

-- facility_risk_snapshot (Risk Monitoring)
CREATE TABLE IF NOT EXISTS "l2"."facility_risk_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "counterparty_id" BIGINT,
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "ccf" NUMERIC(6,4),
    "ead_amt" NUMERIC(18,2),
    "expected_loss_amt" NUMERIC(18,2),
    "rwa_amt" NUMERIC(18,2),
    "risk_weight_pct" NUMERIC(10,6),
    "internal_risk_rating" VARCHAR(100),
    "currency_code" VARCHAR(20),
    "expected_loss_rate_pct" NUMERIC(10,6),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_credit_approval (Approvals)
CREATE TABLE IF NOT EXISTS "l2"."facility_credit_approval" (
    "approval_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "approval_status" VARCHAR(30),
    "approval_date" DATE,
    "approved_amount" NUMERIC(18,2),
    "exception_flag" BOOLEAN,
    "exception_type" VARCHAR(50),
    "exception_type_code" VARCHAR(30),
    "exception_severity" VARCHAR(30),
    "exception_reason" VARCHAR(500),
    "approved_by" VARCHAR(100),
    "expiry_date" DATE,
    PRIMARY KEY ("approval_id")
);

-- counterparty (Business Entity)
CREATE TABLE IF NOT EXISTS "l2"."counterparty" (
    "counterparty_id" BIGINT NOT NULL,
    "legal_name" VARCHAR(200),
    "counterparty_type" VARCHAR(50),
    "country_code" VARCHAR(20),
    "entity_type_code" VARCHAR(20),
    "industry_id" BIGINT,
    "basel_asset_class" VARCHAR(50),
    "basel_risk_grade" VARCHAR(100),
    "call_report_counterparty_type" VARCHAR(50),
    "country_of_domicile" INTEGER,
    "country_of_incorporation" INTEGER,
    "country_of_risk" INTEGER,
    "external_rating_fitch" VARCHAR(255),
    "external_rating_moodys" VARCHAR(255),
    "external_rating_sp" VARCHAR(100),
    "fr2590_counterparty_type" VARCHAR(50),
    "internal_risk_rating" VARCHAR(100),
    "is_affiliated_flag" BOOLEAN,
    "is_central_counterparty_flag" BOOLEAN,
    "is_financial_institution_flag" BOOLEAN,
    "is_insider_flag" BOOLEAN,
    "is_multilateral_dev_bank_flag" BOOLEAN,
    "is_parent_flag" BOOLEAN,
    "is_public_sector_entity_flag" BOOLEAN,
    "is_regulated_entity_flag" BOOLEAN,
    "is_sovereign_flag" BOOLEAN,
    "lei_code" VARCHAR(50),
    "lgd_unsecured" NUMERIC(10,6),
    "pd_annual" NUMERIC(10,6),
    "regulatory_counterparty_type" VARCHAR(50),
    "updated_ts" TIMESTAMP,
    "y14_obligor_type" VARCHAR(50),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "region_code" VARCHAR(20),
    "revenue_amt" NUMERIC(18,2),
    PRIMARY KEY ("counterparty_id")
);

-- legal_entity (Business Entity)
CREATE TABLE IF NOT EXISTS "l2"."legal_entity" (
    "legal_entity_id" BIGINT NOT NULL,
    "legal_name" VARCHAR(200),
    "legal_entity_name" VARCHAR(200),
    "country_code" VARCHAR(20),
    "active_flag" BOOLEAN,
    "entity_type_code" VARCHAR(20),
    "functional_currency_code" VARCHAR(20),
    "institution_id" BIGINT,
    "is_reporting_entity_flag" BOOLEAN,
    "lei_code" VARCHAR(50),
    "primary_regulator" VARCHAR(100),
    "rssd_id" BIGINT,
    "short_name" VARCHAR(200),
    "tax_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("legal_entity_id")
);

-- instrument_master (Financial)
CREATE TABLE IF NOT EXISTS "l2"."instrument_master" (
    "instrument_id" BIGINT NOT NULL,
    "country_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "active_flag" BOOLEAN,
    "coupon_frequency" VARCHAR(30),
    "coupon_rate" NUMERIC(10,4),
    "instrument_name" VARCHAR(200),
    "instrument_type" VARCHAR(50),
    "is_callable_flag" BOOLEAN,
    "is_convertible_flag" BOOLEAN,
    "issue_date" DATE,
    "issuer_counterparty_id" BIGINT,
    "maturity_date" DATE,
    "product_id" BIGINT,
    "seniority" VARCHAR(100),
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("instrument_id")
);

-- credit_agreement_master (Business Entity)
CREATE TABLE IF NOT EXISTS "l2"."credit_agreement_master" (
    "credit_agreement_id" BIGINT NOT NULL,
    "borrower_counterparty_id" BIGINT,
    "lender_legal_entity_id" BIGINT,
    "currency_code" VARCHAR(20),
    "agreement_type" VARCHAR(50),
    "origination_date" DATE,
    "maturity_date" DATE,
    "status_code" VARCHAR(20),
    "agreement_reference" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("credit_agreement_id")
);

-- facility_master (Business Entity)
CREATE TABLE IF NOT EXISTS "l2"."facility_master" (
    "facility_id" BIGINT NOT NULL,
    "credit_agreement_id" BIGINT,
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "facility_name" VARCHAR(200),
    "facility_type" VARCHAR(50),
    "facility_status" VARCHAR(30),
    "committed_facility_amt" NUMERIC(18,2),
    "origination_date" DATE,
    "maturity_date" DATE,
    "portfolio_id" BIGINT,
    "industry_code" VARCHAR(20),
    "lob_segment_id" BIGINT,
    "product_node_id" BIGINT,
    "rate_index_id" BIGINT,
    "ledger_account_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "all_in_rate_pct" NUMERIC(10,4),
    "amortization_type" VARCHAR(50),
    "created_by" VARCHAR(100),
    "day_count_convention" VARCHAR(20),
    "facility_reference" VARCHAR(100),
    "interest_rate_reference" VARCHAR(20),
    "interest_rate_spread_bps" NUMERIC(8,2),
    "interest_rate_type" VARCHAR(20),
    "next_repricing_date" DATE,
    "payment_frequency" VARCHAR(30),
    "prepayment_penalty_flag" BOOLEAN,
    "product_id" BIGINT,
    "rate_cap_pct" NUMERIC(10,4),
    "rate_floor_pct" NUMERIC(10,4),
    "region_code" VARCHAR(20),
    "revolving_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "revenue_amt" NUMERIC(18,2),
    PRIMARY KEY ("facility_id")
);

-- contract_master (Financial)
CREATE TABLE IF NOT EXISTS "l2"."contract_master" (
    "contract_id" BIGINT NOT NULL,
    "contract_type" VARCHAR(50),
    "contract_status" VARCHAR(30),
    "effective_start_date" DATE,
    "contract_end_date" DATE,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "instrument_id" BIGINT,
    "legal_entity_id" BIGINT,
    "netting_set_id" BIGINT,
    "product_node_id" BIGINT,
    "source_record_id" BIGINT,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("contract_id")
);

-- netting_agreement (Netting)
CREATE TABLE IF NOT EXISTS "l2"."netting_agreement" (
    "netting_agreement_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "governing_law" VARCHAR(100),
    "is_bankruptcy_remote_flag" BOOLEAN,
    "is_enforceable_flag" BOOLEAN,
    "legal_entity_id" BIGINT,
    "margin_frequency" VARCHAR(30),
    "minimum_transfer_amount" NUMERIC(18,2),
    "netting_agreement_type" VARCHAR(50),
    "netting_set_id" BIGINT,
    "source_system_id" BIGINT,
    "threshold_amount" NUMERIC(18,2),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("netting_agreement_id")
);

-- netting_set (Netting)
CREATE TABLE IF NOT EXISTS "l2"."netting_set" (
    "netting_set_id" BIGINT NOT NULL,
    "netting_agreement_id" BIGINT,
    "active_flag" BOOLEAN,
    "counterparty_id" BIGINT,
    "governing_law" VARCHAR(100),
    "is_enforceable_flag" BOOLEAN,
    "legal_entity_id" BIGINT,
    "master_agreement_reference" VARCHAR(255),
    "netting_set_type" VARCHAR(50),
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("netting_set_id")
);

-- netting_set_link (Netting)
CREATE TABLE IF NOT EXISTS "l2"."netting_set_link" (
    "netting_set_link_id" BIGINT NOT NULL,
    "netting_set_id" BIGINT,
    "facility_id" BIGINT,
    "anchor_id" BIGINT,
    "anchor_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("netting_set_link_id")
);

-- csa_master (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."csa_master" (
    "csa_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "csa_type" VARCHAR(50),
    "currency_code" VARCHAR(20),
    "eligible_collateral_desc" VARCHAR(255),
    "governing_law" VARCHAR(100),
    "independent_amount" NUMERIC(18,2),
    "margin_frequency" VARCHAR(30),
    "minimum_transfer_amount" NUMERIC(18,2),
    "netting_set_id" BIGINT,
    "threshold_amount" NUMERIC(18,2),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("csa_id")
);

-- margin_agreement (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."margin_agreement" (
    "margin_agreement_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "csa_id" BIGINT,
    "currency_code" VARCHAR(20),
    "im_amount" NUMERIC(18,2),
    "loaded_ts" TIMESTAMP,
    "margin_model" VARCHAR(100),
    "netting_set_id" BIGINT,
    "source_system_id" BIGINT,
    "vm_amount" NUMERIC(18,2),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("margin_agreement_id")
);

-- collateral_asset_master (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."collateral_asset_master" (
    "collateral_asset_id" BIGINT NOT NULL,
    "collateral_type_id" BIGINT,
    "counterparty_id" BIGINT,
    "country_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "legal_entity_id" BIGINT,
    "charge_type" VARCHAR(50),
    "collateral_asset_type" VARCHAR(50),
    "collateral_id" BIGINT,
    "collateral_status" VARCHAR(30),
    "description" VARCHAR(2000),
    "insurance_expiry_date" DATE,
    "insurance_flag" BOOLEAN,
    "lien_priority" INTEGER,
    "location_country_code" VARCHAR(20),
    "location_description" VARCHAR(2000),
    "maturity_date" DATE,
    "original_cost" NUMERIC(18,2),
    "regulatory_eligible_flag" BOOLEAN,
    "revaluation_frequency" VARCHAR(255),
    "source_record_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "valuation_currency_code" VARCHAR(20),
    "vintage_date" DATE,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("collateral_asset_id")
);

-- collateral_link (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."collateral_link" (
    "collateral_link_id" BIGINT NOT NULL,
    "collateral_asset_id" BIGINT,
    "anchor_id" BIGINT,
    "anchor_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "link_type_code" VARCHAR(20),
    "pledged_amount" NUMERIC(18,2),
    "pledged_currency_code" VARCHAR(20),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("collateral_link_id")
);

-- crm_protection_master (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."crm_protection_master" (
    "protection_id" BIGINT NOT NULL,
    "crm_type_code" VARCHAR(20),
    "beneficiary_legal_entity_id" BIGINT,
    "currency_code" VARCHAR(20),
    "notional_amount" NUMERIC(18,2),
    "maturity_date" DATE,
    "enforceable_flag" BOOLEAN,
    "coverage_pct" NUMERIC(10,4),
    "governing_law_jurisdiction_id" BIGINT,
    "protection_provider_counterparty_id" BIGINT,
    "protection_reference" VARCHAR(100),
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("protection_id")
);

-- protection_link (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."protection_link" (
    "protection_link_id" BIGINT NOT NULL,
    "protection_id" BIGINT,
    "facility_id" BIGINT,
    "allocated_amount" NUMERIC(18,2),
    "allocated_currency_code" VARCHAR(20),
    "allocation_pct" NUMERIC(10,4),
    "anchor_id" BIGINT,
    "anchor_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("protection_link_id")
);

-- risk_mitigant_master (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."risk_mitigant_master" (
    "risk_mitigant_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "risk_mitigant_subtype_code" VARCHAR(20),
    "collateral_asset_id" BIGINT,
    "description" VARCHAR(2000),
    "effective_from_date" DATE,
    "effective_to_date" DATE,
    "is_active_flag" BOOLEAN,
    "mitigant_source_type" VARCHAR(50),
    "protection_id" BIGINT,
    "provider_counterparty_id" BIGINT,
    "source_record_id" BIGINT,
    "source_system_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("risk_mitigant_id")
);

-- risk_mitigant_link (Collateral & CRM)
CREATE TABLE IF NOT EXISTS "l2"."risk_mitigant_link" (
    "risk_mitigant_link_id" BIGINT NOT NULL,
    "risk_mitigant_id" BIGINT,
    "facility_id" BIGINT,
    "anchor_id" BIGINT,
    "anchor_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("risk_mitigant_link_id")
);

-- counterparty_hierarchy (Hierarchy)
CREATE TABLE IF NOT EXISTS "l2"."counterparty_hierarchy" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "immediate_parent_id" BIGINT,
    "ultimate_parent_id" BIGINT,
    "ownership_pct" NUMERIC(10,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("counterparty_id", "as_of_date")
);

-- legal_entity_hierarchy (Hierarchy)
CREATE TABLE IF NOT EXISTS "l2"."legal_entity_hierarchy" (
    "hierarchy_id" BIGINT NOT NULL,
    "legal_entity_id" BIGINT,
    "parent_legal_entity_id" BIGINT,
    "as_of_date" DATE,
    "consolidation_method" VARCHAR(100),
    "hierarchy_level" VARCHAR(100),
    "hierarchy_path" VARCHAR(100),
    "ownership_pct" NUMERIC(10,4),
    "ultimate_parent_legal_entity_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("hierarchy_id")
);

-- control_relationship (Hierarchy)
CREATE TABLE IF NOT EXISTS "l2"."control_relationship" (
    "control_relationship_id" BIGINT NOT NULL,
    "parent_counterparty_id" BIGINT,
    "subsidiary_counterparty_id" BIGINT,
    "control_type_code" VARCHAR(50),
    "controlled_counterparty_id" BIGINT,
    "controller_counterparty_id" BIGINT,
    "ownership_pct" NUMERIC(10,4),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("control_relationship_id")
);

-- economic_interdependence_relationship (Hierarchy)
CREATE TABLE IF NOT EXISTS "l2"."economic_interdependence_relationship" (
    "econ_interdep_relationship_id" BIGINT NOT NULL,
    "counterparty_id_1" BIGINT,
    "counterparty_id_2" BIGINT,
    "source_system_id" BIGINT,
    "interdependence_strength_score" NUMERIC(5,2),
    "interdependence_type_code" VARCHAR(20),
    "rationale" VARCHAR(255),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("econ_interdep_relationship_id")
);

-- credit_agreement_counterparty_participation (Counterparty Participation)
CREATE TABLE IF NOT EXISTS "l2"."credit_agreement_counterparty_participation" (
    "agreement_participation_id" BIGINT NOT NULL,
    "credit_agreement_id" BIGINT,
    "counterparty_id" BIGINT,
    "counterparty_role_code" VARCHAR(20),
    "is_primary_flag" BOOLEAN,
    "participation_pct" NUMERIC(10,4),
    "source_record_id" BIGINT,
    "role_priority_rank" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("agreement_participation_id")
);

-- facility_counterparty_participation (Counterparty Participation)
CREATE TABLE IF NOT EXISTS "l2"."facility_counterparty_participation" (
    "facility_participation_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "counterparty_role_code" VARCHAR(20),
    "is_primary_flag" BOOLEAN,
    "participation_pct" NUMERIC(10,4),
    "role_priority_rank" VARCHAR(100),
    "source_record_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("facility_participation_id")
);

-- facility_lender_allocation (Counterparty Participation)
CREATE TABLE IF NOT EXISTS "l2"."facility_lender_allocation" (
    "lender_allocation_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "legal_entity_id" BIGINT,
    "bank_share_pct" NUMERIC(10,4),
    "bank_commitment_amt" NUMERIC(18,2),
    "allocation_role" VARCHAR(50),
    "is_lead_flag" BOOLEAN,
    "source_record_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    PRIMARY KEY ("lender_allocation_id")
);

-- fx_rate (Market Data)
CREATE TABLE IF NOT EXISTS "l2"."fx_rate" (
    "fx_rate_id" BIGINT NOT NULL,
    "as_of_date" DATE,
    "from_currency_code" VARCHAR(20),
    "to_currency_code" VARCHAR(20),
    "rate" NUMERIC(18,10),
    "rate_type" VARCHAR(50),
    "effective_ts" TIMESTAMP,
    "loaded_ts" TIMESTAMP,
    "provider" VARCHAR(100),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("fx_rate_id")
);

-- payment_ledger (Payments)
CREATE TABLE IF NOT EXISTS "l2"."payment_ledger" (
    "payment_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "contract_id" BIGINT,
    "position_id" BIGINT,
    "payment_amount_due" NUMERIC(18,2),
    "payment_due_date" DATE,
    "payment_amount_made" NUMERIC(18,2),
    "payment_date" DATE,
    "fee_due_amt" NUMERIC(18,2),
    "payment_applied_amt" NUMERIC(18,2),
    "applied_date" DATE,
    "payment_status" VARCHAR(30),
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("payment_id")
);

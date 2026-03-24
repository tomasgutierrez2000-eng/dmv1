-- L1 Data Model DDL
-- Generated from data dictionary (viz cache)
-- Target: PostgreSQL

CREATE SCHEMA IF NOT EXISTS l1;

-- entity_type_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."entity_type_dim" (
    "entity_type_code" VARCHAR(20) NOT NULL,
    "entity_type_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "is_financial_institution_flag" BOOLEAN,
    "is_sovereign_flag" BOOLEAN,
    "regulatory_counterparty_class" VARCHAR(50),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("entity_type_code")
);

-- counterparty_role_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."counterparty_role_dim" (
    "counterparty_role_code" VARCHAR(20) NOT NULL,
    "role_name" VARCHAR(200),
    "role_category" VARCHAR(50),
    "is_risk_bearing_flag" BOOLEAN,
    "description" VARCHAR(2000),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("counterparty_role_code")
);

-- sccl_counterparty_group (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."sccl_counterparty_group" (
    "sccl_group_id" BIGINT NOT NULL,
    "group_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "as_of_date" DATE,
    "created_by" VARCHAR(100),
    "grouping_basis" VARCHAR(100),
    "jurisdiction_code" VARCHAR(20),
    "run_version_id" BIGINT,
    "sccl_group_name" VARCHAR(200),
    "ultimate_parent_counterparty_id" BIGINT,
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("sccl_group_id")
);

-- sccl_counterparty_group_member (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."sccl_counterparty_group_member" (
    "member_id" BIGINT NOT NULL,
    "sccl_group_id" BIGINT,
    "counterparty_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "effective_end_date" DATE,
    "effective_start_date" DATE,
    "is_included_flag" BOOLEAN,
    "member_role_code" VARCHAR(20),
    "ownership_pct" NUMERIC(10,6),
    "sccl_group_member_id" BIGINT,
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("member_id")
);

-- instrument_identifier (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."instrument_identifier" (
    "instrument_id" BIGINT NOT NULL,
    "id_type" VARCHAR(20) NOT NULL,
    "effective_start_date" DATE NOT NULL,
    "effective_end_date" DATE,
    "id_value" VARCHAR(100),
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "is_primary_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("instrument_id", "id_type", "effective_start_date")
);

-- collateral_eligibility_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."collateral_eligibility_dim" (
    "collateral_eligibility_id" BIGINT NOT NULL,
    "collateral_type_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_eligible_flag" BOOLEAN,
    "jurisdiction_code" VARCHAR(20),
    "regulatory_capital_basis_id" BIGINT,
    "haircut_method" VARCHAR(100),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("collateral_eligibility_id")
);

-- collateral_haircut_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."collateral_haircut_dim" (
    "collateral_haircut_id" BIGINT NOT NULL,
    "collateral_type_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "haircut_pct" NUMERIC(10,6),
    "jurisdiction_code" VARCHAR(20),
    "maturity_bucket_id" BIGINT,
    "regulatory_capital_basis_id" BIGINT,
    "volatility_adjustment_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("collateral_haircut_id")
);

-- collateral_type (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."collateral_type" (
    "collateral_type_id" BIGINT NOT NULL,
    "name" VARCHAR(200),
    "collateral_category" VARCHAR(50),
    "description" VARCHAR(2000),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "basel_rwa_weight" VARCHAR(100),
    "hqla_level" VARCHAR(100),
    "is_eligible_crm_flag" BOOLEAN,
    "is_financial_collateral_flag" BOOLEAN,
    "minimum_holding_period_days" INTEGER,
    "risk_mitigant_subtype_code" VARCHAR(20),
    "standard_haircut_pct" NUMERIC(10,6),
    "volatility_adjustment_pct" NUMERIC(10,6),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("collateral_type_id")
);

-- crm_eligibility_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."crm_eligibility_dim" (
    "crm_eligibility_id" BIGINT NOT NULL,
    "crm_type_code" VARCHAR(20),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_eligible_flag" BOOLEAN,
    "jurisdiction_code" VARCHAR(20),
    "regulatory_capital_basis_id" BIGINT,
    "source_system_id" BIGINT,
    "eligibility_conditions" VARCHAR(255),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("crm_eligibility_id")
);

-- crm_type_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."crm_type_dim" (
    "crm_type_code" VARCHAR(20) NOT NULL,
    "crm_type_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "basel_recognition_method" VARCHAR(255),
    "crm_category" VARCHAR(50),
    "is_eligible_flag" BOOLEAN,
    "risk_mitigant_subtype_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("crm_type_code")
);

-- risk_mitigant_type_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."risk_mitigant_type_dim" (
    "risk_mitigant_subtype_code" VARCHAR(20) NOT NULL,
    "subtype_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "display_order" INTEGER,
    "is_eligible_flag" BOOLEAN,
    "mitigant_category" VARCHAR(50),
    "parent_group_code" VARCHAR(20),
    "parent_group_name" VARCHAR(200),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("risk_mitigant_subtype_code")
);

-- limit_rule (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."limit_rule" (
    "limit_rule_id" BIGINT NOT NULL,
    "rule_code" VARCHAR(50),
    "rule_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "counterparty_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "inner_threshold_pct" NUMERIC(10,6),
    "limit_amount_usd" NUMERIC(18,2),
    "limit_scope" VARCHAR(30),
    "limit_type" VARCHAR(30),
    "lob_segment_id" BIGINT,
    "outer_threshold_pct" NUMERIC(10,6),
    "risk_tier" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("limit_rule_id")
);

-- limit_threshold (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."limit_threshold" (
    "limit_threshold_id" BIGINT NOT NULL,
    "limit_rule_id" BIGINT,
    "threshold_value" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "direction" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "escalation_action" VARCHAR(100),
    "threshold_lower_abs" NUMERIC(18,2),
    "threshold_lower_pct" NUMERIC(10,6),
    "threshold_type" VARCHAR(50),
    "threshold_upper_abs" NUMERIC(18,2),
    "threshold_upper_pct" NUMERIC(10,6),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("limit_threshold_id")
);

-- reporting_entity_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."reporting_entity_dim" (
    "reporting_entity_id" BIGINT NOT NULL,
    "entity_code" VARCHAR(50),
    "entity_name" VARCHAR(200),
    "legal_entity_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "consolidation_basis" VARCHAR(50),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "functional_currency_code" VARCHAR(20),
    "is_current_flag" BOOLEAN,
    "jurisdiction_code" VARCHAR(20),
    "reporting_entity_code" VARCHAR(20),
    "reporting_entity_name" VARCHAR(200),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("reporting_entity_id")
);

-- org_unit_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."org_unit_dim" (
    "org_unit_id" BIGINT NOT NULL,
    "org_unit_code" VARCHAR(50),
    "org_unit_name" VARCHAR(200),
    "parent_org_unit_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "cost_center_code" VARCHAR(20),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "lob_segment_id" BIGINT,
    "manager_user_id" BIGINT,
    "org_unit_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("org_unit_id")
);

-- enterprise_business_taxonomy (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."enterprise_business_taxonomy" (
    "managed_segment_id" BIGINT NOT NULL,
    "segment_code" VARCHAR(50),
    "segment_name" VARCHAR(200),
    "parent_segment_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "change_event" VARCHAR(100),
    "comments" VARCHAR(2000),
    "create_update_date" DATE,
    "description" VARCHAR(2000),
    "effective_date" DATE,
    "long_description" VARCHAR(2000),
    "requestor" VARCHAR(100),
    "status" VARCHAR(30),
    "substatus" INTEGER,
    "substatus_effective_end_date" DATE,
    "tree_level" INTEGER,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("managed_segment_id")
);

-- enterprise_product_taxonomy (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."enterprise_product_taxonomy" (
    "product_node_id" BIGINT NOT NULL,
    "product_code" VARCHAR(50),
    "product_name" VARCHAR(200),
    "parent_node_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "change_event" VARCHAR(100),
    "comments" VARCHAR(2000),
    "create_update_date" DATE,
    "description" VARCHAR(2000),
    "effective_date" DATE,
    "fr2590_category_code" VARCHAR(30),
    "long_description" VARCHAR(2000),
    "requestor" VARCHAR(100),
    "status" VARCHAR(30),
    "substatus" INTEGER,
    "substatus_effective_end_date" DATE,
    "tree_level" INTEGER,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "is_on_balance_sheet_flag" BOOLEAN,
    "ccf_default_pct" NUMERIC(10,6),
    "risk_weight_default_pct" NUMERIC(10,6),
    "accounting_treatment_code" VARCHAR(30),
    PRIMARY KEY ("product_node_id")
);

-- collateral_portfolio (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."collateral_portfolio" (
    "collateral_portfolio_id" BIGINT NOT NULL,
    "portfolio_id" BIGINT,
    "description" VARCHAR(2000),
    "lob_segment_id" BIGINT,
    "is_active_flag" BOOLEAN,
    "portfolio_name_override" VARCHAR(255),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("collateral_portfolio_id")
);

-- portfolio_dim (Collateral & Risk Mitigation)
CREATE TABLE IF NOT EXISTS "l1"."portfolio_dim" (
    "portfolio_id" BIGINT NOT NULL,
    "portfolio_code" VARCHAR(50),
    "portfolio_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "lob_segment_id" BIGINT,
    "parent_portfolio_id" BIGINT,
    "portfolio_type" VARCHAR(50),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("portfolio_id")
);

-- fr2590_category_dim (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."fr2590_category_dim" (
    "fr2590_category_code" VARCHAR(30) NOT NULL,
    "category_name" VARCHAR(200),
    "definition" VARCHAR(100),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("fr2590_category_code")
);

-- rating_grade_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."rating_grade_dim" (
    "rating_grade_id" BIGINT NOT NULL,
    "rating_scale_id" BIGINT,
    "grade_code" VARCHAR(20),
    "grade_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_default_flag" BOOLEAN,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "lgd_downturn" NUMERIC(10,6),
    "pd_12m" NUMERIC(10,6),
    "rating_grade_code" VARCHAR(30),
    "rating_grade_name" VARCHAR(200),
    "rating_notch" VARCHAR(100),
    "rating_scale_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("rating_grade_id")
);

-- rating_mapping (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."rating_mapping" (
    "rating_mapping_id" BIGINT NOT NULL,
    "rating_scale_id" BIGINT,
    "rating_source_id" BIGINT,
    "external_rating" VARCHAR(50),
    "internal_grade_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "approved_by" VARCHAR(100),
    "approved_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "mapping_method" VARCHAR(100),
    "model_id" BIGINT,
    "rating_grade_code" VARCHAR(20),
    "source_rating_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("rating_mapping_id")
);

-- rating_scale_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."rating_scale_dim" (
    "rating_scale_id" BIGINT NOT NULL,
    "scale_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "is_default_flag" BOOLEAN,
    "display_color_hex" VARCHAR(100),
    "is_investment_grade_flag" BOOLEAN,
    "pd_implied" NUMERIC(10,6),
    "rating_grade_id" BIGINT,
    "rating_notch" VARCHAR(100),
    "rating_value" NUMERIC(18,4),
    "scale_type" VARCHAR(50),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("rating_scale_id")
);

-- rating_source (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."rating_source" (
    "rating_source_id" BIGINT NOT NULL,
    "source_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "priority_rank" INTEGER,
    "rating_source_name" VARCHAR(200),
    "rating_source_type" VARCHAR(50),
    "vendor_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("rating_source_id")
);

-- credit_event_type_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."credit_event_type_dim" (
    "credit_event_type_code" VARCHAR(30) NOT NULL,
    "credit_event_type_id" BIGINT,
    "credit_event_type_name" VARCHAR(200),
    "is_default_trigger_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("credit_event_type_code")
);

-- credit_status_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."credit_status_dim" (
    "credit_status_code" VARCHAR(30) NOT NULL,
    "credit_status_name" VARCHAR(200),
    "is_default_flag" BOOLEAN,
    "delinquency_bucket" VARCHAR(100),
    "status_category" VARCHAR(50),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("credit_status_code")
);

-- amendment_status_dim (Amendments & Forbearance)
CREATE TABLE IF NOT EXISTS "l1"."amendment_status_dim" (
    "amendment_status_code" VARCHAR(20) NOT NULL,
    "amendment_status_name" VARCHAR(200),
    "status_group" VARCHAR(100),
    "is_terminal_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("amendment_status_code")
);

-- amendment_type_dim (Amendments & Forbearance)
CREATE TABLE IF NOT EXISTS "l1"."amendment_type_dim" (
    "amendment_type_code" VARCHAR(20) NOT NULL,
    "amendment_type_name" VARCHAR(200),
    "description" VARCHAR(2000),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("amendment_type_code")
);

-- default_definition_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."default_definition_dim" (
    "default_definition_id" BIGINT NOT NULL,
    "default_definition_code" VARCHAR(20),
    "description" VARCHAR(2000),
    "jurisdiction_code" VARCHAR(20),
    "days_past_due_threshold" INTEGER,
    "is_credit_event_trigger_flag" BOOLEAN,
    "materiality_threshold_amt" NUMERIC(18,2),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("default_definition_id")
);

-- exposure_type_dim (Exposure & Position)
CREATE TABLE IF NOT EXISTS "l1"."exposure_type_dim" (
    "exposure_type_id" BIGINT NOT NULL,
    "exposure_type_code" VARCHAR(20),
    "exposure_type_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "basel_exposure_class" VARCHAR(100),
    "ccf_pct" NUMERIC(10,6),
    "is_off_balance_sheet_flag" BOOLEAN,
    "product_id" BIGINT,
    "sa_ccr_asset_class" VARCHAR(50),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("exposure_type_id")
);

-- scenario_dim (Stress Testing)
CREATE TABLE IF NOT EXISTS "l1"."scenario_dim" (
    "scenario_id" BIGINT NOT NULL,
    "scenario_code" VARCHAR(50),
    "scenario_name" VARCHAR(200),
    "scenario_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "description" VARCHAR(2000),
    "is_active_flag" BOOLEAN,
    "regulatory_scenario_code" VARCHAR(20),
    "scenario_end_date" DATE,
    "scenario_horizon_months" INTEGER,
    "scenario_start_date" DATE,
    "shock_parameters_json" VARCHAR(255),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("scenario_id")
);

-- context_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."context_dim" (
    "context_id" BIGINT NOT NULL,
    "context_domain" VARCHAR(100),
    "context_code" VARCHAR(20),
    "context_name" VARCHAR(200),
    "description" VARCHAR(2000),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("context_id")
);

-- interest_rate_index_dim (Financial Performance)
CREATE TABLE IF NOT EXISTS "l1"."interest_rate_index_dim" (
    "rate_index_id" BIGINT NOT NULL,
    "index_code" VARCHAR(50),
    "index_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "cessation_date" DATE,
    "compounding_method" VARCHAR(100),
    "currency_code" VARCHAR(20),
    "day_count_convention" VARCHAR(100),
    "fallback_spread_bps" NUMERIC(8,2),
    "fallback_to_index_id" BIGINT,
    "index_family" VARCHAR(100),
    "is_bmu_compliant_flag" BOOLEAN,
    "is_fallback_rate_flag" BOOLEAN,
    "publication_source" VARCHAR(100),
    "tenor_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("rate_index_id")
);

-- ledger_account_dim (Financial Performance)
CREATE TABLE IF NOT EXISTS "l1"."ledger_account_dim" (
    "ledger_account_id" BIGINT NOT NULL,
    "account_code" VARCHAR(50),
    "account_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "account_category" VARCHAR(50),
    "account_type" VARCHAR(20),
    "is_balance_sheet_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "currency_code" VARCHAR(20),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_reconciliation_account_flag" BOOLEAN,
    "legal_entity_id" BIGINT,
    "lob_segment_id" BIGINT,
    "parent_account_id" BIGINT,
    "regulatory_report_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "normal_balance_indicator" VARCHAR(2),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("ledger_account_id")
);

-- date_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."date_dim" (
    "date_id" BIGINT NOT NULL,
    "calendar_date" DATE,
    "calendar_year" INTEGER,
    "calendar_quarter" VARCHAR(100),
    "calendar_month" INTEGER,
    "day_of_month" INTEGER,
    "day_of_week" INTEGER,
    "day_name" VARCHAR(200),
    "fiscal_year" INTEGER,
    "fiscal_quarter" VARCHAR(100),
    "fiscal_month" INTEGER,
    "is_weekend_flag" BOOLEAN,
    "is_month_end_flag" BOOLEAN,
    "is_quarter_end_flag" BOOLEAN,
    "is_year_end_flag" BOOLEAN,
    "is_us_business_day_flag" BOOLEAN,
    "is_us_bank_holiday_flag" BOOLEAN,
    "date_day" INTEGER,
    "date_month" INTEGER,
    "date_quarter" VARCHAR(100),
    "date_year" INTEGER,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("date_id")
);

-- date_time_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."date_time_dim" (
    "date_time_id" BIGINT NOT NULL,
    "date_id" BIGINT,
    "timestamp_utc" TIMESTAMP,
    "hour_of_day" INTEGER,
    "minute_of_hour" INTEGER,
    "second_of_minute" INTEGER,
    "timezone_code" VARCHAR(20),
    "is_dst_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("date_time_id")
);

-- maturity_bucket_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."maturity_bucket_dim" (
    "maturity_bucket_id" BIGINT NOT NULL,
    "bucket_code" VARCHAR(20),
    "bucket_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "bucket_end_days" INTEGER,
    "bucket_start_days" INTEGER,
    "jurisdiction_code" VARCHAR(20),
    "regulatory_framework" VARCHAR(100),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("maturity_bucket_id")
);

-- reporting_calendar_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."reporting_calendar_dim" (
    "reporting_calendar_id" BIGINT NOT NULL,
    "calendar_code" VARCHAR(20),
    "calendar_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "as_of_date" DATE,
    "cutoff_ts" TIMESTAMP,
    "fiscal_quarter_date" DATE,
    "fiscal_year_date" DATE,
    "is_period_end_flag" BOOLEAN,
    "period_end_date" DATE,
    "period_start_date" DATE,
    "regulator_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("reporting_calendar_id")
);

-- country_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."country_dim" (
    "country_code" VARCHAR(20) NOT NULL,
    "country_name" VARCHAR(200),
    "is_active_flag" BOOLEAN,
    "region_code" VARCHAR(20),
    "basel_country_risk_weight" VARCHAR(255),
    "is_developed_market_flag" BOOLEAN,
    "is_fatf_high_risk_flag" BOOLEAN,
    "is_ofac_sanctioned_flag" BOOLEAN,
    "iso_alpha_3" VARCHAR(100),
    "iso_numeric" VARCHAR(100),
    "jurisdiction_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("country_code")
);

-- region_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."region_dim" (
    "region_code" VARCHAR(20) NOT NULL,
    "region_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "region_group_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("region_code")
);

-- currency_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."currency_dim" (
    "currency_code" VARCHAR(20) NOT NULL,
    "currency_name" VARCHAR(200),
    "currency_symbol" VARCHAR(100),
    "is_active_flag" BOOLEAN,
    "iso_numeric" VARCHAR(100),
    "minor_unit_decimals" INTEGER,
    "is_g10_currency_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("currency_code")
);

-- industry_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."industry_dim" (
    "industry_id" BIGINT NOT NULL,
    "industry_code" VARCHAR(20),
    "industry_name" VARCHAR(200),
    "industry_level" VARCHAR(100),
    "industry_standard" VARCHAR(100),
    "parent_industry_id" BIGINT,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("industry_id")
);

-- regulatory_capital_basis_dim (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."regulatory_capital_basis_dim" (
    "regulatory_capital_basis_id" BIGINT NOT NULL,
    "basis_code" VARCHAR(20),
    "basis_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "description" VARCHAR(2000),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "jurisdiction_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("regulatory_capital_basis_id")
);

-- regulatory_jurisdiction (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."regulatory_jurisdiction" (
    "jurisdiction_code" VARCHAR(20) NOT NULL,
    "jurisdiction_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "jurisdiction_id" BIGINT,
    "primary_regulator" VARCHAR(100),
    "regulatory_framework" VARCHAR(100),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("jurisdiction_code")
);

-- regulatory_mapping (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."regulatory_mapping" (
    "regulatory_mapping_id" BIGINT NOT NULL,
    "mapping_code" VARCHAR(50),
    "jurisdiction_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "calculation_rule_id" BIGINT,
    "effective_end_date" DATE,
    "effective_start_date" DATE,
    "line_item_code" VARCHAR(20),
    "mapping_id" BIGINT,
    "mdrm_id" BIGINT,
    "metric_name" VARCHAR(200),
    "notes" VARCHAR(2000),
    "relationship_type" VARCHAR(50),
    "report_code" VARCHAR(20),
    "schedule_code" VARCHAR(20),
    "source_mdrm_code" VARCHAR(20),
    "source_report_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "target_mdrm_code" VARCHAR(20),
    "target_report_code" VARCHAR(20),
    "tolerance_pct" NUMERIC(10,6),
    "transformation_rule" VARCHAR(100),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("regulatory_mapping_id")
);

-- report_cell_definition (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."report_cell_definition" (
    "report_cell_id" BIGINT NOT NULL,
    "report_id" BIGINT,
    "cell_code" VARCHAR(50),
    "cell_definition" TEXT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "calculation_rule_id" BIGINT,
    "cell_datatype" VARCHAR(100),
    "cell_id" BIGINT,
    "cell_name" VARCHAR(200),
    "is_derived_flag" BOOLEAN,
    "line_item_code" VARCHAR(20),
    "report_code" VARCHAR(20),
    "schedule_code" VARCHAR(20),
    "uom" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("report_cell_id")
);

-- model_registry_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."model_registry_dim" (
    "model_id" BIGINT NOT NULL,
    "model_code" VARCHAR(50),
    "model_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "documentation_url" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "model_type" VARCHAR(50),
    "model_version" VARCHAR(100),
    "owner_org_unit_id" BIGINT,
    "is_regulatory_approved_flag" BOOLEAN,
    "validation_status" VARCHAR(30),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    PRIMARY KEY ("model_id")
);

-- rule_registry (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."rule_registry" (
    "rule_id" BIGINT NOT NULL,
    "rule_code" VARCHAR(50),
    "rule_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "approved_by" VARCHAR(100),
    "approved_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "input_variables" VARCHAR(100),
    "output_variable" VARCHAR(100),
    "rule_expression" VARCHAR(100),
    "rule_type" VARCHAR(50),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("rule_id")
);

-- reconciliation_control (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."reconciliation_control" (
    "reconciliation_control_id" BIGINT NOT NULL,
    "control_name" VARCHAR(200),
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "actual_value" NUMERIC(18,4),
    "check_name" VARCHAR(200),
    "check_type" VARCHAR(50),
    "executed_ts" TIMESTAMP,
    "expected_value" NUMERIC(18,4),
    "owner_id" BIGINT,
    "recon_id" BIGINT,
    "remediation_ticket_id" BIGINT,
    "report_code" VARCHAR(20),
    "run_version_id" BIGINT,
    "status" VARCHAR(30),
    "tolerance_value" NUMERIC(18,4),
    "variance_value" NUMERIC(18,4),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("reconciliation_control_id")
);

-- report_registry (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."report_registry" (
    "report_id" BIGINT NOT NULL,
    "report_code" VARCHAR(50),
    "report_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "is_active_flag" BOOLEAN,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "frequency" VARCHAR(30),
    "jurisdiction_code" VARCHAR(20),
    "regulator_code" VARCHAR(20),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("report_id")
);

-- run_control (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."run_control" (
    "run_control_id" BIGINT NOT NULL,
    "run_name" VARCHAR(200),
    "as_of_date" DATE,
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "certified_by" VARCHAR(100),
    "certified_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "cutoff_ts" TIMESTAMP,
    "notes" VARCHAR(2000),
    "run_version_id" BIGINT,
    "status" VARCHAR(30),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("run_control_id")
);

-- source_system_registry (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."source_system_registry" (
    "source_system_id" BIGINT NOT NULL,
    "source_system_name" VARCHAR(200),
    "data_domain" VARCHAR(100),
    "ingestion_frequency" VARCHAR(30),
    "system_owner" VARCHAR(100),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("source_system_id")
);

-- validation_check_registry (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."validation_check_registry" (
    "check_id" BIGINT NOT NULL,
    "check_name" VARCHAR(200),
    "check_type" VARCHAR(50),
    "check_rule_id" BIGINT,
    "target_table" VARCHAR(100),
    "target_column" VARCHAR(100),
    "severity" VARCHAR(100),
    "owner_id" BIGINT,
    "is_active_flag" BOOLEAN,
    "validation_check_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("check_id")
);

-- metric_definition_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."metric_definition_dim" (
    "metric_definition_id" BIGINT NOT NULL,
    "metric_code" VARCHAR(50),
    "metric_name" VARCHAR(200),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "calculation_rule_id" BIGINT,
    "definition_text" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_active_flag" BOOLEAN,
    "metric_domain" VARCHAR(100),
    "periodicity_code" VARCHAR(20),
    "source_system_id" BIGINT,
    "unit_of_measure" VARCHAR(100),
    "version" VARCHAR(100),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("metric_definition_id")
);

-- internal_risk_rating_bucket_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."internal_risk_rating_bucket_dim" (
    "internal_risk_rating_bucket_code" VARCHAR(50) NOT NULL,
    "bucket_name" VARCHAR(200),
    "rating_score_min" INTEGER,
    "rating_score_max" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("internal_risk_rating_bucket_code")
);

-- pricing_tier_dim (Financial Performance)
CREATE TABLE IF NOT EXISTS "l1"."pricing_tier_dim" (
    "pricing_tier_code" VARCHAR(20) NOT NULL,
    "tier_name" VARCHAR(200),
    "tier_ordinal" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "spread_min_bps" NUMERIC(10,4),
    "spread_max_bps" NUMERIC(10,4),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("pricing_tier_code")
);

-- metric_threshold (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."metric_threshold" (
    "threshold_id" BIGINT NOT NULL,
    "metric_definition_id" BIGINT,
    "threshold_type" VARCHAR(50),
    "threshold_value" NUMERIC(18,4),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_active_flag" BOOLEAN,
    "inner_threshold_pct" NUMERIC(10,6),
    "last_threshold_updated_date" DATE,
    "limit_type" VARCHAR(50),
    "limit_value" NUMERIC(18,4),
    "lod1_sponsor" VARCHAR(100),
    "lod2_sponsor" VARCHAR(100),
    "metric_category" VARCHAR(50),
    "metric_code" VARCHAR(20),
    "metric_description" VARCHAR(2000),
    "metric_id_display" VARCHAR(100),
    "metric_name" VARCHAR(200),
    "metric_owner" VARCHAR(100),
    "metric_threshold_id" BIGINT,
    "outer_threshold_pct" NUMERIC(10,6),
    "report_deadline" VARCHAR(100),
    "report_frequency" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("threshold_id")
);

-- risk_rating_tier_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."risk_rating_tier_dim" (
    "tier_code" VARCHAR(20) NOT NULL,
    "tier_name" VARCHAR(200),
    "pd_min_pct" NUMERIC(10,6),
    "pd_max_pct" NUMERIC(10,6),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("tier_code")
);

-- dpd_bucket_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."dpd_bucket_dim" (
    "dpd_bucket_code" VARCHAR(20) NOT NULL,
    "bucket_name" VARCHAR(200),
    "dpd_min" INTEGER,
    "dpd_max" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("dpd_bucket_code")
);

-- utilization_status_dim (Financial Performance)
CREATE TABLE IF NOT EXISTS "l1"."utilization_status_dim" (
    "utilization_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "utilization_min_pct" NUMERIC(10,6),
    "utilization_max_pct" NUMERIC(10,6),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("utilization_status_code")
);

-- origination_date_bucket_dim (Data Quality & Infrastructure)
CREATE TABLE IF NOT EXISTS "l1"."origination_date_bucket_dim" (
    "origination_bucket_code" VARCHAR(20) NOT NULL,
    "bucket_name" VARCHAR(200),
    "months_since_origination_min" INTEGER,
    "months_since_origination_max" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("origination_bucket_code")
);

-- capital_allocation (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."capital_allocation" (
    "node_id" BIGINT NOT NULL,
    "node_type" VARCHAR(30) NOT NULL,
    "as_of_date" DATE NOT NULL,
    "legal_entity_id" BIGINT NOT NULL,
    "allocated_capital_amt" NUMERIC(20,4),
    "capital_allocation_pct" NUMERIC(10,6),
    "required_capital_pct" NUMERIC(10,6),
    "allocated_equity_amt" NUMERIC(20,4),
    "equity_allocation_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "record_source" VARCHAR(100),
    PRIMARY KEY ("node_id", "node_type", "as_of_date", "legal_entity_id")
);

-- limit_status_dim (Limits & Risk Appetite)
CREATE TABLE IF NOT EXISTS "l1"."limit_status_dim" (
    "limit_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "severity_ordinal" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("limit_status_code")
);

-- rating_change_status_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."rating_change_status_dim" (
    "rating_change_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "direction" VARCHAR(20),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("rating_change_status_code")
);

-- duns_entity_dim (Counterparty & Entity)
CREATE TABLE IF NOT EXISTS "l1"."duns_entity_dim" (
    "duns_number" VARCHAR(9) NOT NULL,
    "business_name" VARCHAR(500),
    "trade_style_name" VARCHAR(500),
    "sic_code" VARCHAR(10),
    "naics_code" VARCHAR(10),
    "duns_country_code" VARCHAR(3),
    "dnb_rating" VARCHAR(10),
    "is_out_of_business_flag" BOOLEAN,
    "last_updated_date" DATE,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("duns_number")
);

-- ecl_stage_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."ecl_stage_dim" (
    "ecl_stage_code" VARCHAR(20) NOT NULL,
    "stage_name" VARCHAR(500),
    "description" VARCHAR(500),
    "ifrs9_stage_mapping" VARCHAR(500),
    "cecl_equivalent" VARCHAR(500),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("ecl_stage_code")
);

-- forbearance_type_dim (Amendments & Forbearance)
CREATE TABLE IF NOT EXISTS "l1"."forbearance_type_dim" (
    "forbearance_type_code" VARCHAR(20) NOT NULL,
    "type_name" VARCHAR(500),
    "description" VARCHAR(500),
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("forbearance_type_code")
);

-- impairment_model_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."impairment_model_dim" (
    "model_code" VARCHAR(20) NOT NULL,
    "model_name" VARCHAR(500),
    "regulatory_framework" VARCHAR(500),
    "description" VARCHAR(500),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("model_code")
);

-- watchlist_category_dim (Credit Risk & Ratings)
CREATE TABLE IF NOT EXISTS "l1"."watchlist_category_dim" (
    "watchlist_category_code" VARCHAR(20) NOT NULL,
    "category_name" VARCHAR(500),
    "description" VARCHAR(500),
    "severity_ordinal" INTEGER,
    "display_order" INTEGER,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("watchlist_category_code")
);

-- equity_allocation_config (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."equity_allocation_config" (
    "equity_allocation_id" BIGINT NOT NULL,
    "managed_segment_id" BIGINT,
    "legal_entity_id" BIGINT,
    "effective_date" DATE,
    "equity_allocation_amt" NUMERIC(20,4),
    "currency_code" VARCHAR(20),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "record_source" VARCHAR(100),
    PRIMARY KEY ("equity_allocation_id")
);

-- basel_exposure_type_dim (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."basel_exposure_type_dim" (
    "basel_exposure_type_id" BIGINT NOT NULL,
    "exposure_type_code" VARCHAR(30),
    "exposure_type_name" VARCHAR(200),
    "description" VARCHAR(2000),
    "std_risk_weight_pct" NUMERIC(10,6),
    "erba_risk_weight_pct" NUMERIC(10,6),
    "asset_class_group" VARCHAR(100),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "record_source" VARCHAR(100),
    PRIMARY KEY ("basel_exposure_type_id")
);

-- regulatory_capital_requirement (Regulatory & Capital)
CREATE TABLE IF NOT EXISTS "l1"."regulatory_capital_requirement" (
    "legal_entity_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "regulatory_capital_basis_id" BIGINT NOT NULL,
    "min_cet1_ratio_pct" NUMERIC(10,6),
    "min_tier1_ratio_pct" NUMERIC(10,6),
    "min_total_capital_ratio_pct" NUMERIC(10,6),
    "min_leverage_ratio_pct" NUMERIC(10,6),
    "min_slr_pct" NUMERIC(10,6),
    "stress_capital_buffer_pct" NUMERIC(10,6),
    "gsib_surcharge_pct" NUMERIC(10,6),
    "countercyclical_buffer_pct" NUMERIC(10,6),
    "total_cet1_req_pct" NUMERIC(10,6),
    "total_tier1_req_pct" NUMERIC(10,6),
    "total_capital_req_pct" NUMERIC(10,6),
    "total_leverage_req_pct" NUMERIC(10,6),
    "total_slr_req_pct" NUMERIC(10,6),
    "tlac_risk_based_req_pct" NUMERIC(10,6),
    "tlac_leverage_req_pct" NUMERIC(10,6),
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "record_source" VARCHAR(100),
    PRIMARY KEY ("legal_entity_id", "as_of_date", "regulatory_capital_basis_id")
);

-- customer_counterparty_map (Uncategorized)
CREATE TABLE IF NOT EXISTS "l1"."customer_counterparty_map" (
    "customer_counterparty_map_id" BIGINT NOT NULL,
    "source_system_id" BIGINT,
    "source_customer_id" VARCHAR(64),
    "counterparty_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("customer_counterparty_map_id")
);

-- facility_type_dim (Uncategorized)
CREATE TABLE IF NOT EXISTS "l1"."facility_type_dim" (
    "facility_type_id" BIGINT NOT NULL,
    "facility_type_code" VARCHAR(30),
    "facility_type_name" VARCHAR(200),
    "description" VARCHAR(2000),
    "is_off_balance_sheet_flag" BOOLEAN,
    "regulatory_ccf_pct" NUMERIC(10,6),
    "product_category" VARCHAR(50),
    "is_revolving_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    PRIMARY KEY ("facility_type_id")
);

-- product_subtype_dim (Uncategorized)
CREATE TABLE IF NOT EXISTS "l1"."product_subtype_dim" (
    "product_subtype_id" BIGINT NOT NULL,
    "product_subtype_code" VARCHAR(30),
    "product_subtype_name" VARCHAR(200),
    "product_node_id" BIGINT,
    "product_category" VARCHAR(64),
    "is_active_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("product_subtype_id")
);

-- Foreign Key Constraints (L1)

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
  ALTER TABLE "l1"."customer_counterparty_map"
    ADD CONSTRAINT "fk_customer_counterparty_map_counterparty_id"
    FOREIGN KEY ("counterparty_id")
    REFERENCES "l2"."counterparty" ("counterparty_id");
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
  ALTER TABLE "l1"."product_subtype_dim"
    ADD CONSTRAINT "fk_product_subtype_dim_product_node_id"
    FOREIGN KEY ("product_node_id")
    REFERENCES "l1"."enterprise_product_taxonomy" ("product_node_id");
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

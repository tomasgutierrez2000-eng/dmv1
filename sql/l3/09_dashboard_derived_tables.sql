-- L3 Dashboard Consumption Derived Tables
-- Consolidated wide tables per rollup level for CRO dashboard single-source reads.
-- T67-T71: facility_derived, counterparty_derived, desk_derived, portfolio_derived, segment_derived

SET search_path TO l1, l2, l3, public;

--------------------------------------------------------------------------------
-- T67: facility_derived
-- Grain: one row per facility per date per run
-- Consolidates all dashboard metrics at the facility level
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "l3"."facility_derived" (
    -- PK & grain
    "facility_derived_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,

    -- Denormalized reference fields (from L1/L2)
    "counterparty_id" BIGINT,
    "legal_name" VARCHAR(500),
    "credit_agreement_id" BIGINT,
    "facility_name" VARCHAR(500),
    "facility_type" VARCHAR(64),
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "lob_node_id" BIGINT,
    "lob_l1_name" VARCHAR(500),
    "lob_l2_name" VARCHAR(500),
    "lob_l3_name" VARCHAR(500),
    "country_name" VARCHAR(500),
    "region_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "product_code" VARCHAR(30),
    "maturity_date" DATE,
    "origination_date" DATE,
    "contract_origination_date" DATE,
    "effective_date" DATE,
    "pricing_tier_code" VARCHAR(30),
    "fr2590_category_code" VARCHAR(30),
    "participating_counterparty_ids" VARCHAR(500),

    -- Flag fields
    "is_active_flag" BOOLEAN,
    "facility_active_flag" BOOLEAN,
    "is_syndicated_flag" BOOLEAN,
    "is_deteriorated_flag" BOOLEAN,
    "delinquent_payment_flag" BOOLEAN,
    "has_cross_entity_flag" BOOLEAN,
    "pricing_exception_flag" BOOLEAN,

    -- Status / bucketing
    "amendment_event_id" BIGINT,
    "amendment_status_name" VARCHAR(500),
    "amendment_type_code" VARCHAR(30),
    "utilization_status_code" VARCHAR(30),
    "dpd_bucket_code" VARCHAR(30),
    "maturity_bucket_id" VARCHAR(64),
    "origination_bucket_code" VARCHAR(30),
    "exception_status" VARCHAR(64),
    "risk_mitigant_subtype_code" VARCHAR(30),
    "mitigant_category" VARCHAR(64),
    "criticized_portfolio_count" INTEGER,

    -- Exposure & position amounts
    "committed_amt" NUMERIC(20,4),
    "outstanding_amt" NUMERIC(20,4),
    "unfunded_amt" NUMERIC(20,4),
    "allocated_capital_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_drawdown_amt" NUMERIC(20,4),
    "principal_payment_amt" NUMERIC(20,4),
    "current_valuation_amt" NUMERIC(20,4),
    "original_valuation_amt" NUMERIC(20,4),
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "contractual_cashflow_amt" NUMERIC(20,4),
    "number_of_loans" INTEGER,

    -- Risk metrics
    "expected_loss_amt" NUMERIC(20,4),
    "lgd_estimate_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_overdue_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "expected_loss_rate_pct" NUMERIC(10,6),
    "delinquency_rate_pct" NUMERIC(10,6),
    "rwa_density_pct" NUMERIC(10,6),
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),

    -- Pricing
    "all_in_rate_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "fee_rate_pct" NUMERIC(10,6),
    "spread_bps" NUMERIC(10,4),
    "cost_of_funds_amt" NUMERIC(20,4),
    "allocation_pct" NUMERIC(10,6),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),

    -- Profitability
    "revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "operating_expense_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "fees_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "return_on_rwa_pct" NUMERIC(10,6),

    -- Tenor
    "expected_tenor_months" NUMERIC(12,6),
    "days_until_maturity" INTEGER,

    -- Governance
    "model_version" VARCHAR(50),
    "run_id" VARCHAR(64),
    "created_by" VARCHAR(100),

    -- System
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("facility_derived_sk")
);


--------------------------------------------------------------------------------
-- T68: counterparty_derived
-- Grain: one row per facility x counterparty per date per run
-- Consolidates all dashboard metrics at the counterparty level
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "l3"."counterparty_derived" (
    -- PK & grain
    "counterparty_derived_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "facility_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,

    -- Denormalized reference fields (from L1/L2)
    "legal_name" VARCHAR(500),
    "credit_agreement_id" BIGINT,
    "facility_name" VARCHAR(500),
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "lob_node_id" BIGINT,
    "lob_l1_name" VARCHAR(500),
    "lob_l2_name" VARCHAR(500),
    "lob_l3_name" VARCHAR(500),
    "country_name" VARCHAR(500),
    "region_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "product_code" VARCHAR(30),
    "maturity_date" DATE,
    "effective_date" DATE,
    "pricing_tier_code" VARCHAR(30),
    "participating_counterparty_ids" VARCHAR(500),

    -- Flag fields
    "is_active_flag" BOOLEAN,
    "is_deteriorated_flag" BOOLEAN,
    "delinquent_payment_flag" BOOLEAN,
    "has_cross_entity_flag" BOOLEAN,

    -- Status / bucketing
    "amendment_status_name" VARCHAR(500),
    "utilization_status_code" VARCHAR(30),
    "dpd_bucket_code" VARCHAR(30),
    "criticized_portfolio_count" INTEGER,

    -- Counterparty-level risk fields (not at facility level)
    "risk_rating_tier_code" VARCHAR(30),
    "external_risk_rating" VARCHAR(255),
    "internal_risk_rating" VARCHAR(255),
    "limit_status_code" VARCHAR(30),
    "internal_risk_rating_bucket_code" VARCHAR(30),
    "ext_risk_rating_status" VARCHAR(64),
    "ext_risk_rating_change_steps" INTEGER,
    "int_risk_rating_status" VARCHAR(64),
    "int_risk_rating_change_steps" INTEGER,

    -- Exposure & position amounts
    "committed_amt" NUMERIC(20,4),
    "outstanding_amt" NUMERIC(20,4),
    "unfunded_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_drawdown_amt" NUMERIC(20,4),
    "current_valuation_amt" NUMERIC(20,4),
    "original_valuation_amt" NUMERIC(20,4),
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "contractual_cashflow_amt" NUMERIC(20,4),
    "limit_amt" NUMERIC(20,4),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,

    -- Risk metrics
    "expected_loss_amt" NUMERIC(20,4),
    "lgd_estimate_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_overdue_amt" NUMERIC(20,4),
    "tangible_net_worth_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "expected_loss_rate_pct" NUMERIC(10,6),
    "delinquency_rate_pct" NUMERIC(10,6),
    "rwa_density_pct" NUMERIC(10,6),
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "committed_to_limit_utilization_pct" NUMERIC(10,6),
    "exception_rate_pct" NUMERIC(10,6),
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "fccr_value" NUMERIC(12,6),

    -- Pricing
    "all_in_rate_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "spread_bps" NUMERIC(10,4),
    "cost_of_funds_amt" NUMERIC(20,4),
    "allocation_pct" NUMERIC(10,6),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),

    -- Profitability
    "revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "operating_expense_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "fees_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "return_on_rwa_pct" NUMERIC(10,6),

    -- Tenor
    "expected_tenor_months" NUMERIC(12,6),

    -- Governance
    "model_version" VARCHAR(50),
    "run_id" VARCHAR(64),
    "created_by" VARCHAR(100),

    -- System
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("counterparty_derived_sk")
);


--------------------------------------------------------------------------------
-- T69: desk_derived
-- Grain: one row per L3 LoB (Desk) per date per run
-- lob_node_id references enterprise_business_taxonomy.managed_segment_id
-- where tree_level = L3 (Desk)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "l3"."desk_derived" (
    -- PK & grain
    "desk_derived_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,

    -- Denormalized reference fields
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "lob_l1_name" VARCHAR(500),
    "lob_l2_name" VARCHAR(500),
    "lob_l3_name" VARCHAR(500),
    "region_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "product_code" VARCHAR(30),
    "facility_type" VARCHAR(64),

    -- Flag fields
    "is_deteriorated_flag" BOOLEAN,
    "delinquent_payment_flag" BOOLEAN,
    "pricing_exception_flag" BOOLEAN,

    -- Status / bucketing
    "amendment_status_name" VARCHAR(500),
    "amendment_type_code" VARCHAR(30),
    "utilization_status_code" VARCHAR(30),
    "dpd_bucket_code" VARCHAR(30),
    "maturity_bucket_id" VARCHAR(64),
    "origination_bucket_code" VARCHAR(30),
    "exception_status" VARCHAR(64),
    "risk_mitigant_subtype_code" VARCHAR(30),
    "mitigant_category" VARCHAR(64),
    "criticized_portfolio_count" INTEGER,

    -- Counterparty-level risk fields (also at desk level)
    "risk_rating_tier_code" VARCHAR(30),
    "external_risk_rating" VARCHAR(255),
    "internal_risk_rating" VARCHAR(255),
    "limit_status_code" VARCHAR(30),
    "internal_risk_rating_bucket_code" VARCHAR(30),
    "ext_risk_rating_status" VARCHAR(64),
    "ext_risk_rating_change_steps" INTEGER,
    "int_risk_rating_status" VARCHAR(64),
    "int_risk_rating_change_steps" INTEGER,

    -- Exposure & position amounts
    "committed_amt" NUMERIC(20,4),
    "outstanding_amt" NUMERIC(20,4),
    "unfunded_amt" NUMERIC(20,4),
    "allocated_capital_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_drawdown_amt" NUMERIC(20,4),
    "current_valuation_amt" NUMERIC(20,4),
    "original_valuation_amt" NUMERIC(20,4),
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "contractual_cashflow_amt" NUMERIC(20,4),
    "limit_amt" NUMERIC(20,4),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "facility_count" INTEGER,
    "counterparty_count" INTEGER,

    -- Risk metrics
    "expected_loss_amt" NUMERIC(20,4),
    "lgd_estimate_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_overdue_amt" NUMERIC(20,4),
    "tangible_net_worth_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "expected_loss_rate_pct" NUMERIC(10,6),
    "delinquency_rate_pct" NUMERIC(10,6),
    "rwa_density_pct" NUMERIC(10,6),
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "committed_to_limit_utilization_pct" NUMERIC(10,6),
    "exception_rate_pct" NUMERIC(10,6),
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "fccr_value" NUMERIC(12,6),
    "capital_adequacy_ratio_pct" NUMERIC(10,6),

    -- Pricing
    "all_in_rate_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "spread_bps" NUMERIC(10,4),
    "cost_of_funds_amt" NUMERIC(20,4),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),

    -- Profitability
    "revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "operating_expense_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "fees_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "return_on_rwa_pct" NUMERIC(10,6),

    -- Tenor
    "expected_tenor_months" NUMERIC(12,6),
    "days_until_maturity" INTEGER,
    "origination_date" DATE,

    -- Governance
    "model_version" VARCHAR(50),
    "run_id" VARCHAR(64),
    "created_by" VARCHAR(100),

    -- System
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("desk_derived_sk")
);


--------------------------------------------------------------------------------
-- T70: portfolio_derived
-- Grain: one row per L2 LoB (Portfolio) per date per run
-- lob_node_id references enterprise_business_taxonomy.managed_segment_id
-- where tree_level = L2 (Portfolio)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "l3"."portfolio_derived" (
    -- PK & grain
    "portfolio_derived_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,

    -- Denormalized reference fields
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "lob_l1_name" VARCHAR(500),
    "lob_l2_name" VARCHAR(500),
    "region_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "product_code" VARCHAR(30),
    "facility_type" VARCHAR(64),

    -- Flag fields
    "is_deteriorated_flag" BOOLEAN,
    "delinquent_payment_flag" BOOLEAN,
    "pricing_exception_flag" BOOLEAN,

    -- Status / bucketing
    "amendment_status_name" VARCHAR(500),
    "amendment_type_code" VARCHAR(30),
    "utilization_status_code" VARCHAR(30),
    "dpd_bucket_code" VARCHAR(30),
    "maturity_bucket_id" VARCHAR(64),
    "origination_bucket_code" VARCHAR(30),
    "exception_status" VARCHAR(64),
    "risk_mitigant_subtype_code" VARCHAR(30),
    "mitigant_category" VARCHAR(64),
    "criticized_portfolio_count" INTEGER,

    -- Counterparty-level risk fields (also at portfolio level)
    "risk_rating_tier_code" VARCHAR(30),
    "external_risk_rating" VARCHAR(255),
    "internal_risk_rating" VARCHAR(255),
    "limit_status_code" VARCHAR(30),
    "internal_risk_rating_bucket_code" VARCHAR(30),
    "ext_risk_rating_status" VARCHAR(64),
    "ext_risk_rating_change_steps" INTEGER,
    "int_risk_rating_status" VARCHAR(64),
    "int_risk_rating_change_steps" INTEGER,

    -- Exposure & position amounts
    "committed_amt" NUMERIC(20,4),
    "outstanding_amt" NUMERIC(20,4),
    "unfunded_amt" NUMERIC(20,4),
    "allocated_capital_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_drawdown_amt" NUMERIC(20,4),
    "current_valuation_amt" NUMERIC(20,4),
    "original_valuation_amt" NUMERIC(20,4),
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "contractual_cashflow_amt" NUMERIC(20,4),
    "limit_amt" NUMERIC(20,4),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "facility_count" INTEGER,
    "counterparty_count" INTEGER,

    -- Risk metrics
    "expected_loss_amt" NUMERIC(20,4),
    "lgd_estimate_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_overdue_amt" NUMERIC(20,4),
    "tangible_net_worth_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "expected_loss_rate_pct" NUMERIC(10,6),
    "delinquency_rate_pct" NUMERIC(10,6),
    "rwa_density_pct" NUMERIC(10,6),
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "committed_to_limit_utilization_pct" NUMERIC(10,6),
    "exception_rate_pct" NUMERIC(10,6),
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "fccr_value" NUMERIC(12,6),
    "capital_adequacy_ratio_pct" NUMERIC(10,6),

    -- Pricing
    "all_in_rate_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "spread_bps" NUMERIC(10,4),
    "cost_of_funds_amt" NUMERIC(20,4),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),

    -- Profitability
    "revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "operating_expense_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "fees_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "return_on_rwa_pct" NUMERIC(10,6),

    -- Tenor
    "expected_tenor_months" NUMERIC(12,6),

    -- Governance
    "model_version" VARCHAR(50),
    "run_id" VARCHAR(64),
    "created_by" VARCHAR(100),

    -- System
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("portfolio_derived_sk")
);


--------------------------------------------------------------------------------
-- T71: segment_derived
-- Grain: one row per L1 LoB (Business Segment / Department) per date per run
-- lob_node_id references enterprise_business_taxonomy.managed_segment_id
-- where tree_level = L1 (Department / Business Segment)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "l3"."segment_derived" (
    -- PK & grain
    "segment_derived_sk" BIGSERIAL NOT NULL,
    "run_version_id" BIGINT,
    "hierarchy_id" BIGINT,
    "lob_node_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,

    -- Denormalized reference fields
    "legal_entity_id" BIGINT,
    "legal_entity_name" VARCHAR(500),
    "lob_l1_name" VARCHAR(500),
    "region_code" VARCHAR(30),
    "industry_name" VARCHAR(500),
    "product_code" VARCHAR(30),
    "facility_type" VARCHAR(64),

    -- Flag fields
    "is_deteriorated_flag" BOOLEAN,
    "delinquent_payment_flag" BOOLEAN,
    "pricing_exception_flag" BOOLEAN,

    -- Status / bucketing
    "amendment_status_name" VARCHAR(500),
    "amendment_type_code" VARCHAR(30),
    "utilization_status_code" VARCHAR(30),
    "dpd_bucket_code" VARCHAR(30),
    "maturity_bucket_id" VARCHAR(64),
    "origination_bucket_code" VARCHAR(30),
    "exception_status" VARCHAR(64),
    "risk_mitigant_subtype_code" VARCHAR(30),
    "mitigant_category" VARCHAR(64),
    "criticized_portfolio_count" INTEGER,

    -- Counterparty-level risk fields (also at segment level)
    "risk_rating_tier_code" VARCHAR(30),
    "external_risk_rating" VARCHAR(255),
    "internal_risk_rating" VARCHAR(255),
    "limit_status_code" VARCHAR(30),
    "internal_risk_rating_bucket_code" VARCHAR(30),
    "ext_risk_rating_status" VARCHAR(64),
    "ext_risk_rating_change_steps" INTEGER,
    "int_risk_rating_status" VARCHAR(64),
    "int_risk_rating_change_steps" INTEGER,

    -- Exposure & position amounts
    "committed_amt" NUMERIC(20,4),
    "outstanding_amt" NUMERIC(20,4),
    "unfunded_amt" NUMERIC(20,4),
    "allocated_capital_amt" NUMERIC(20,4),
    "ead_amt" NUMERIC(20,4),
    "expected_drawdown_amt" NUMERIC(20,4),
    "current_valuation_amt" NUMERIC(20,4),
    "original_valuation_amt" NUMERIC(20,4),
    "cross_entity_exposure_amt" NUMERIC(20,4),
    "contractual_cashflow_amt" NUMERIC(20,4),
    "limit_amt" NUMERIC(20,4),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "facility_count" INTEGER,
    "counterparty_count" INTEGER,

    -- Risk metrics
    "expected_loss_amt" NUMERIC(20,4),
    "lgd_estimate_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_overdue_amt" NUMERIC(20,4),
    "tangible_net_worth_amt" NUMERIC(20,4),
    "risk_weight_pct" NUMERIC(10,6),
    "expected_loss_rate_pct" NUMERIC(10,6),
    "delinquency_rate_pct" NUMERIC(10,6),
    "rwa_density_pct" NUMERIC(10,6),
    "dscr_value" NUMERIC(12,6),
    "ltv_pct" NUMERIC(10,6),
    "utilization_pct" NUMERIC(10,6),
    "committed_to_limit_utilization_pct" NUMERIC(10,6),
    "exception_rate_pct" NUMERIC(10,6),
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "fccr_value" NUMERIC(12,6),
    "capital_adequacy_ratio_pct" NUMERIC(10,6),

    -- Pricing
    "all_in_rate_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "spread_bps" NUMERIC(10,4),
    "cost_of_funds_amt" NUMERIC(20,4),
    "interest_rate_sensitivity_pct" NUMERIC(10,6),

    -- Profitability
    "revenue_amt" NUMERIC(20,4),
    "net_income_amt" NUMERIC(20,4),
    "operating_expense_amt" NUMERIC(20,4),
    "interest_expense_amt" NUMERIC(20,4),
    "interest_income_amt" NUMERIC(20,4),
    "fees_income_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "allocated_equity_amt" NUMERIC(20,4),
    "avg_earning_assets_amt" NUMERIC(20,4),
    "nim_pct" NUMERIC(10,6),
    "roa_pct" NUMERIC(10,6),
    "roe_pct" NUMERIC(10,6),
    "return_on_rwa_pct" NUMERIC(10,6),

    -- Tenor
    "expected_tenor_months" NUMERIC(12,6),

    -- Governance
    "model_version" VARCHAR(50),
    "run_id" VARCHAR(64),
    "created_by" VARCHAR(100),

    -- System
    "base_currency_code" VARCHAR(30),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("segment_derived_sk")
);

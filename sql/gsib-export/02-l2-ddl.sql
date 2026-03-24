-- L2 Data Model DDL
-- Generated from data dictionary (viz cache)
-- Target: PostgreSQL

CREATE SCHEMA IF NOT EXISTS l2;
SET search_path TO l1, l2, public;


-- amendment_change_detail (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "event_ts" TIMESTAMP,
    PRIMARY KEY ("change_detail_id")
);

-- amendment_event (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("amendment_id")
);

-- borrowings_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."borrowings_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_intent" VARCHAR,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amortized_cost" NUMERIC(18,2),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "bs_amount" NUMERIC(20,4),
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "borrowing_date" DATE,
    "borrowing_term" VARCHAR,
    "carrying_value" NUMERIC(18,6),
    "charge_off_amount" NUMERIC(20,4),
    "collateral_value" NUMERIC(20,4),
    "committed_exposure_global" NUMERIC(18,2),
    "committed_exposure_global_fair_value" VARCHAR,
    "committed_exposure_global_par_value" VARCHAR,
    "counterparty_exposure_value" NUMERIC(20,4),
    "coupon_interest_payment_date" DATE,
    "cumulative_charge_offs" VARCHAR,
    "current_outstanding_balance" NUMERIC(18,2),
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value_amount" NUMERIC(18,2),
    "fair_value_measurements_level" VARCHAR,
    "fair_value_option_flag" VARCHAR,
    "forward_start_amount" NUMERIC(18,6),
    "funded_allowance_balance" NUMERIC(18,6),
    "funded_committed_exposure" NUMERIC(20,4),
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "indemnification_asset_amount" NUMERIC(18,6),
    "lendable_value" NUMERIC(20,4),
    "loss_write_down_amount" NUMERIC(20,4),
    "net_recovery_amount" NUMERIC(20,4),
    "original_amount" NUMERIC(18,2),
    "other_charge_off_amount" NUMERIC(18,2),
    "premium_discount_amount" NUMERIC(20,4),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "recoveries_amount" NUMERIC(20,4),
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "retained_earnings" NUMERIC(18,2),
    "settlement_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "unfunded_committed_exposure" NUMERIC(20,4),
    "unrealized_gain_loss" NUMERIC(20,4),
    "unused_commitment_exposure" NUMERIC(20,4),
    "utilized_exposure_global" NUMERIC(20,4),
    "utilized_exposure_global_fair_value" VARCHAR,
    "utilized_exposure_global_par_value" VARCHAR,
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- borrowings_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."borrowings_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "guarantor" VARCHAR,
    "guarantor_flag" VARCHAR,
    "guarantor_name" VARCHAR,
    "guarantor_type" VARCHAR,
    "isin" VARCHAR,
    "identifier_type" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "primary_monetization_channel" VARCHAR,
    "qmna_id" VARCHAR,
    "sedol" VARCHAR,
    "security_identifier" VARCHAR,
    "security_identifier_type" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stock_exchange_code" VARCHAR,
    "ticker_symbol" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- borrowings_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."borrowings_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "borrowing_id" VARCHAR,
    "borrowing_type" VARCHAR,
    "call_date" DATE,
    "commitment_type" VARCHAR,
    "convertible_flag" BOOLEAN,
    "currency_code" VARCHAR,
    "forward_start_date" DATE,
    "hedge_id" VARCHAR,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_type" VARCHAR,
    "interest_rate_variability" VARCHAR,
    "interest_reset_frequency" VARCHAR,
    "issue_date" DATE,
    "maturity_date" DATE,
    "maturity_optionality" VARCHAR,
    "put_date" DATE,
    "repayment_type" VARCHAR,
    "reporting_currency" VARCHAR,
    "repricing_date" DATE,
    "settlement_currency" VARCHAR,
    "transaction_currency" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- borrowings_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."borrowings_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "entity_internal_risk_rating" VARCHAR,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "guarantor_internal_risk_rating" VARCHAR,
    "internal_risk_rating" VARCHAR,
    "internal_risk_rating_description" VARCHAR,
    "loss_given_default_lgd" NUMERIC(18,6),
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "non_accrual_status" BOOLEAN,
    "non_accrual_date" DATE,
    "other_charge_off_amount_explanation" VARCHAR,
    "pledged_collateral_value" NUMERIC(20,4),
    "pledged_flag" BOOLEAN,
    "probability_of_default_pd" NUMERIC(18,6),
    "secured_flag" VARCHAR,
    "treasury_control_flag" BOOLEAN,
    "two_year_probability_of_default" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- capital_position_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."capital_position_snapshot" (
    "legal_entity_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "currency_code" VARCHAR(20),
    "cet1_ratio_pct" NUMERIC(10,6),
    "tier1_ratio_pct" NUMERIC(10,6),
    "total_capital_ratio_pct" NUMERIC(10,6),
    "tier1_leverage_ratio_pct" NUMERIC(10,6),
    "leverage_ratio_pct" NUMERIC(10,6),
    "tlac_ratio_pct" NUMERIC(10,6),
    "slr_pct" NUMERIC(10,6),
    "tier1_capital_amt" NUMERIC(20,4),
    "cet1_capital_amt" NUMERIC(20,4),
    "total_capital_amt" NUMERIC(20,4),
    "rwa_amt" NUMERIC(20,4),
    "total_assets_leverage_amt" NUMERIC(20,4),
    "total_leverage_exposure_amt" NUMERIC(20,4),
    "tlac_amt" NUMERIC(20,4),
    "rwa_std_amt" NUMERIC(20,4),
    "rwa_erba_amt" NUMERIC(20,4),
    "source_filing_code" VARCHAR(30),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("legal_entity_id", "as_of_date")
);

-- collateral_asset_master (Uncategorized)
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
    "is_insurance_flag" BOOLEAN,
    "lien_priority" INTEGER,
    "location_country_code" VARCHAR(20),
    "location_description" VARCHAR(2000),
    "maturity_date" DATE,
    "original_cost" NUMERIC(18,2),
    "is_regulatory_eligible_flag" BOOLEAN,
    "revaluation_frequency" VARCHAR(255),
    "source_record_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "valuation_currency_code" VARCHAR(20),
    "vintage_date" DATE,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "noi_at_origination_amt" NUMERIC(18,2),
    PRIMARY KEY ("collateral_asset_id")
);

-- collateral_link (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("collateral_link_id")
);

-- collateral_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."collateral_snapshot" (
    "collateral_asset_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "valuation_amount" NUMERIC(18,2),
    "haircut_pct" NUMERIC(10,6),
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
    "is_risk_shifting_flag" BOOLEAN,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    "noi_current_amt" NUMERIC(18,2),
    PRIMARY KEY ("collateral_asset_id", "as_of_date")
);

-- contract_master (Uncategorized)
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("contract_id")
);

-- control_relationship (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."control_relationship" (
    "control_relationship_id" BIGINT NOT NULL,
    "parent_counterparty_id" BIGINT,
    "subsidiary_counterparty_id" BIGINT,
    "control_type_code" VARCHAR(50),
    "controlled_counterparty_id" BIGINT,
    "controller_counterparty_id" BIGINT,
    "ownership_pct" NUMERIC(10,6),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("control_relationship_id")
);

-- counterparty (Uncategorized)
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
    "duns_number" VARCHAR(9),
    "duns_hq_number" VARCHAR(9),
    "duns_global_ultimate" VARCHAR(9),
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "pricing_tier_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("counterparty_id")
);

-- counterparty_financial_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."counterparty_financial_snapshot" (
    "financial_snapshot_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "reporting_period" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "revenue_amt" NUMERIC(18,2),
    "operating_expense_amt" NUMERIC(18,2),
    "interest_expense_amt" NUMERIC(18,2),
    "tax_expense_amt" NUMERIC(18,2),
    "depreciation_amt" NUMERIC(18,2),
    "amortization_amt" NUMERIC(18,2),
    "shareholders_equity_amt" NUMERIC(18,2),
    "ebitda_amt" NUMERIC(18,2),
    "noi_amt" NUMERIC(18,2),
    "tangible_net_worth_usd" NUMERIC(18,2),
    "expected_drawdown_amt" NUMERIC(18,2),
    "fee_income_amt" NUMERIC(18,2),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "total_assets_amt" NUMERIC(20,4),
    PRIMARY KEY ("financial_snapshot_id")
);

-- counterparty_hierarchy (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."counterparty_hierarchy" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "immediate_parent_id" BIGINT,
    "ultimate_parent_id" BIGINT,
    "ownership_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("counterparty_id", "as_of_date")
);

-- counterparty_rating_observation (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("observation_id")
);

-- credit_agreement_counterparty_participation (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."credit_agreement_counterparty_participation" (
    "agreement_participation_id" BIGINT NOT NULL,
    "credit_agreement_id" BIGINT,
    "counterparty_id" BIGINT,
    "counterparty_role_code" VARCHAR(20),
    "is_primary_flag" BOOLEAN,
    "participation_pct" NUMERIC(10,6),
    "source_record_id" BIGINT,
    "role_priority_rank" VARCHAR(100),
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("agreement_participation_id")
);

-- credit_agreement_master (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("credit_agreement_id")
);

-- credit_event (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("credit_event_id")
);

-- credit_event_facility_link (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."credit_event_facility_link" (
    "link_id" BIGINT NOT NULL,
    "credit_event_id" BIGINT,
    "facility_id" BIGINT,
    "ead_amt" NUMERIC(20,4),
    "as_of_date" DATE,
    "estimated_loss_usd" NUMERIC(18,2),
    "impact_pct" NUMERIC(10,6),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "event_ts" TIMESTAMP,
    PRIMARY KEY ("link_id")
);

-- crm_protection_master (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."crm_protection_master" (
    "protection_id" BIGINT NOT NULL,
    "crm_type_code" VARCHAR(20),
    "beneficiary_legal_entity_id" BIGINT,
    "currency_code" VARCHAR(20),
    "notional_amount" NUMERIC(18,2),
    "maturity_date" DATE,
    "is_enforceable_flag" BOOLEAN,
    "coverage_pct" NUMERIC(10,6),
    "governing_law_jurisdiction_id" BIGINT,
    "protection_provider_counterparty_id" BIGINT,
    "protection_reference" VARCHAR(100),
    "updated_ts" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("protection_id")
);

-- csa_master (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("csa_id")
);

-- deal_pipeline_fact (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."deal_pipeline_fact" (
    "pipeline_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "stage_code" VARCHAR(50),
    "proposed_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "expected_all_in_rate_pct" NUMERIC(10,6),
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("pipeline_id")
);

-- debt_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."debt_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_intent" VARCHAR,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amortized_cost" NUMERIC(18,2),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "bs_amount" NUMERIC(20,4),
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "carrying_value" NUMERIC(18,6),
    "charge_off_amount" NUMERIC(20,4),
    "committed_exposure_global" NUMERIC(18,2),
    "committed_exposure_global_fair_value" VARCHAR,
    "committed_exposure_global_par_value" VARCHAR,
    "counterparty_exposure_value" NUMERIC(20,4),
    "coupon_interest_payment_date" DATE,
    "cumulative_charge_offs" VARCHAR,
    "debt_redeemable_flag" BOOLEAN,
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value_amount" NUMERIC(18,2),
    "fair_value_measurement_level" VARCHAR,
    "fair_value_option_flag" VARCHAR,
    "forward_start_amount" NUMERIC(18,6),
    "funded_allowance_balance" NUMERIC(18,6),
    "funded_committed_exposure" NUMERIC(20,4),
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "indemnification_asset_amount" NUMERIC(18,6),
    "lendable_value" NUMERIC(20,4),
    "loss_write_down_amount" NUMERIC(20,4),
    "net_recovery_amount" NUMERIC(20,4),
    "number_of_originators" VARCHAR,
    "original_face_amount" NUMERIC(18,2),
    "other_charge_off_amount" NUMERIC(18,2),
    "outstanding_balance" NUMERIC(18,2),
    "premium_discount_amount" NUMERIC(20,4),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "recoveries_amount" NUMERIC(20,4),
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "retained_earnings" NUMERIC(18,2),
    "settlement_date" DATE,
    "transaction_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "unfunded_committed_exposure" NUMERIC(20,4),
    "unrealized_gain_loss" NUMERIC(20,4),
    "unused_commitment_exposure" NUMERIC(20,4),
    "utilized_exposure_global" NUMERIC(20,4),
    "utilized_exposure_global_fair_value" VARCHAR,
    "utilized_exposure_global_par_value" VARCHAR,
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- debt_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."debt_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "cusip" VARCHAR,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "isin" VARCHAR,
    "identifier_type" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "primary_monetization_channel" VARCHAR,
    "qmna_id" VARCHAR,
    "sedol" VARCHAR,
    "security_identifier" VARCHAR,
    "security_identifier_type" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stock_exchange_code" VARCHAR,
    "ticker_symbol" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- debt_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."debt_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "borrowing_type" VARCHAR,
    "call_date" DATE,
    "currency_code" VARCHAR,
    "debt_type" VARCHAR,
    "forward_start_date" DATE,
    "hedge_id" VARCHAR,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_type" VARCHAR,
    "issue_date" DATE,
    "maturity_date" DATE,
    "maturity_optionality" VARCHAR,
    "put_date" DATE,
    "remaining_maturity_days" INTEGER,
    "remaining_time_to_repricing" INTEGER,
    "reporting_currency" VARCHAR,
    "repricing_date" DATE,
    "repricing_date_interest_reset_date" DATE,
    "security_sub_type" VARCHAR,
    "security_type" VARCHAR,
    "settlement_currency" VARCHAR,
    "transaction_currency" VARCHAR,
    "transaction_id" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- debt_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."debt_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "entity_internal_risk_rating" VARCHAR,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "guarantor_internal_risk_rating" VARCHAR,
    "internal_risk_rating" VARCHAR,
    "internal_risk_rating_description" VARCHAR,
    "loss_given_default_lgd" NUMERIC(18,6),
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "non_accrual_status" BOOLEAN,
    "non_accrual_date" DATE,
    "other_charge_off_amount_explanation" VARCHAR,
    "pledged_flag" BOOLEAN,
    "probability_of_default_pd" NUMERIC(18,6),
    "treasury_control_flag" BOOLEAN,
    "two_year_probability_of_default" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- deposits_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."deposits_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_intent" VARCHAR,
    "accrued_dividend_amount" NUMERIC(18,2),
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "amortized_cost" NUMERIC(18,2),
    "amount_balance" NUMERIC(18,6),
    "bs_amount" NUMERIC(20,4),
    "book_value_amount" NUMERIC(18,6),
    "broker_intent" VARCHAR,
    "counterparty_exposure_value" NUMERIC(20,4),
    "current_balance" NUMERIC(18,2),
    "deposit_balance" NUMERIC(18,6),
    "early_withdrawn_amount" NUMERIC(18,2),
    "excess_operational_balance" NUMERIC(18,2),
    "fdic_insured_balance" NUMERIC(18,2),
    "fdic_insured_depository_institution_flag" BOOLEAN,
    "fair_value_amount" NUMERIC(18,2),
    "interest_balance" NUMERIC(18,2),
    "next_interest_payment_date" DATE,
    "original_balance" NUMERIC(18,2),
    "premium_discount_amount" NUMERIC(20,4),
    "tranche_amount" NUMERIC(18,6),
    "transaction_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "unamortized_discount_amount" NUMERIC(18,2),
    "unamortized_premium_amount" NUMERIC(18,2),
    "unrealized_gain_loss" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- deposits_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."deposits_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "account_status" VARCHAR,
    "account_status_description" VARCHAR,
    "acquisition_channel" VARCHAR,
    "acquisition_channel_description" VARCHAR,
    "affiliate_flag" BOOLEAN,
    "affiliate_transaction_flag" VARCHAR,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "customer_id" VARCHAR,
    "fdic_ownership_code" VARCHAR,
    "fdic_ownership_code_description" VARCHAR,
    "gl_account_number" INTEGER,
    "geographic_code" VARCHAR,
    "insurance_provider" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "notice_period" INTEGER,
    "preauthorized_transfer_accounts" BOOLEAN,
    "preferred_deposits" BOOLEAN,
    "primary_monetization_channel" VARCHAR,
    "source_system" VARCHAR,
    "source_system_description" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stability" VARCHAR,
    "subsidiary_type" VARCHAR,
    "trigger" BOOLEAN,
    "withdrawal_method" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- deposits_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."deposits_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "currency_code" VARCHAR,
    "currency_type" VARCHAR,
    "days_remaining_to_maturity" INTEGER,
    "deposit_account_type" VARCHAR,
    "deposit_id" VARCHAR,
    "ecr_implied_interest_rate" VARCHAR,
    "interest_bearing_flag" BOOLEAN,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_cap" VARCHAR,
    "interest_rate_floor" VARCHAR,
    "interest_rate_type" VARCHAR,
    "maturity_date" DATE,
    "maturity_optionality" VARCHAR,
    "optionality_type" VARCHAR,
    "optionality_type_description" VARCHAR,
    "original_maturity_date" DATE,
    "product_code" VARCHAR,
    "reporting_currency" VARCHAR,
    "reporting_date" DATE,
    "repricing_date" DATE,
    "repricing_date_interest_reset_date" DATE,
    "settlement_currency" VARCHAR,
    "snapshot_date" DATE,
    "transaction_currency" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- deposits_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."deposits_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "2052a_insured" VARCHAR,
    "automated_renewal_flag" BOOLEAN,
    "brokered_flag" BOOLEAN,
    "deposit_listing_service_flag" BOOLEAN,
    "ecr_flag" VARCHAR,
    "escrow_service_flag" VARCHAR,
    "latest_record" VARCHAR,
    "negotiable_flag" BOOLEAN,
    "operational_account_flag" VARCHAR,
    "operational_flag" BOOLEAN,
    "overdraft_flag" BOOLEAN,
    "rc_e_depositor_type" VARCHAR,
    "rc_e_depositor_type_description" VARCHAR,
    "reciprocal_flag" BOOLEAN,
    "relationship_flag" BOOLEAN,
    "stable_vs_less_stable_flag" VARCHAR,
    "sweep_flag" BOOLEAN,
    "tradable_flag" BOOLEAN,
    "trade_flag" VARCHAR,
    "transactional_account_flag" VARCHAR,
    "transactional_flag" BOOLEAN,
    "treasury_control_flag" BOOLEAN,
    "trigger_flag" VARCHAR,
    "unsettled_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- derivatives_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."derivatives_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_intent" VARCHAR,
    "accounting_intent_description" VARCHAR,
    "aggregate_gross_value" NUMERIC(20,4),
    "aggregate_net_value" NUMERIC(20,4),
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "asset_liability_flag" VARCHAR,
    "asset_liability_flag_description" VARCHAR,
    "bs_amount" NUMERIC(20,4),
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "carrying_value" NUMERIC(18,6),
    "charge_off_amount" NUMERIC(20,4),
    "collateral_fair_value" NUMERIC(20,4),
    "collateral_fair_value_amount_at_origination" NUMERIC(20,4),
    "conversion_factor_percentage" NUMERIC(10,6),
    "counterparty_exposure_value" NUMERIC(20,4),
    "cumulative_charge_offs" VARCHAR,
    "current_credit_exposure_amount" NUMERIC(20,4),
    "effective_multiplier" NUMERIC(10,6),
    "effective_notional_amount" NUMERIC(20,4),
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value" NUMERIC(18,2),
    "fair_value_far_leg" NUMERIC(20,4),
    "fair_value_near_leg" NUMERIC(20,4),
    "fair_value_measurement_level" VARCHAR,
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "gross_fair_value_amount" NUMERIC(20,4),
    "loss_write_down_amount" NUMERIC(20,4),
    "net_gross_ratio" NUMERIC(10,6),
    "net_recovery_amount" NUMERIC(20,4),
    "notional_amount" NUMERIC(18,2),
    "notional_amount_far_leg" NUMERIC(20,4),
    "notional_amount_near_leg" NUMERIC(20,4),
    "notional_amount_at_inception" NUMERIC(18,2),
    "number_of_units" VARCHAR,
    "other_charge_off_amount" NUMERIC(18,2),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "recoveries_amount" NUMERIC(20,4),
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "trading_intent" VARCHAR,
    "transaction_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- derivatives_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."derivatives_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "isda_id" VARCHAR,
    "identifier_type" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "performance_guarantee" BOOLEAN,
    "performance_guarantee_amount" NUMERIC(18,6),
    "primary_monetization_channel" VARCHAR,
    "qmna" BOOLEAN,
    "qmna_id" VARCHAR,
    "recognized_guarantee" BOOLEAN,
    "security_identifier" VARCHAR,
    "source_system" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "usd_conversion_rate" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- derivatives_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."derivatives_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "asset_liability_indicator" VARCHAR,
    "clearing_status" VARCHAR,
    "clearing_type_flag" VARCHAR,
    "clearing_type_flag_description" VARCHAR,
    "currency_code" VARCHAR,
    "currency_code_far_leg" VARCHAR,
    "currency_code_near_leg" VARCHAR,
    "derivative_direction" VARCHAR,
    "derivative_id" VARCHAR,
    "derivative_instrument_type" VARCHAR,
    "derivative_type" VARCHAR,
    "derivative_type_description" VARCHAR,
    "effective_maturity_date" DATE,
    "encumbrance_end_date" DATE,
    "forward_type" VARCHAR,
    "future_type" VARCHAR,
    "hedge_id" VARCHAR,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_type" VARCHAR,
    "is_hedge" BOOLEAN,
    "maturity_date" DATE,
    "maturity_date_optionality" DATE,
    "maturity_optionality" VARCHAR,
    "netting_set_status" VARCHAR,
    "otc_trade_flag" BOOLEAN,
    "option_type" VARCHAR,
    "product_domain" VARCHAR,
    "purchased_written_flag" VARCHAR,
    "purchased_written_flag_description" VARCHAR,
    "reference_entity" VARCHAR,
    "reporting_currency" VARCHAR,
    "reporting_currency_far_leg" VARCHAR,
    "reporting_currency_near_leg" VARCHAR,
    "repricing_date_interest_reset_date" DATE,
    "risk_type" VARCHAR,
    "settlement_currency" VARCHAR,
    "settlement_currency_near_leg" VARCHAR,
    "settlement_currency_far_leg" VARCHAR,
    "snapshot_date" DATE,
    "swap_fixed_flag" BOOLEAN,
    "swap_type" VARCHAR,
    "trade_capacity_code" VARCHAR,
    "trade_execution_type" VARCHAR,
    "tranche_level" VARCHAR,
    "transaction_currency" VARCHAR,
    "transaction_currency_far_leg" VARCHAR,
    "transaction_currency_near_leg" VARCHAR,
    "trigger_type" VARCHAR,
    "underlying_entity" VARCHAR,
    "underlying_risk_type" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- derivatives_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."derivatives_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "collateralization_type" VARCHAR,
    "eligible_collateral" NUMERIC(20,4),
    "eligible_im_non_cash" NUMERIC(20,4),
    "eligible_im_cash" NUMERIC(20,4),
    "eligible_vm_cash" NUMERIC(20,4),
    "eligible_vm_non_cash" NUMERIC(20,4),
    "encumbered_flag" BOOLEAN,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "ineligible_vm_cash" NUMERIC(20,4),
    "ineligible_vm_non_cash" NUMERIC(20,4),
    "ineligible_im_cash" NUMERIC(20,4),
    "ineligible_im_non_cash" NUMERIC(20,4),
    "latest_record" VARCHAR,
    "loss_given_default_lgd" NUMERIC(18,6),
    "market_risk_capital_category_indicator" VARCHAR,
    "market_risk_capital_category_indicator_description" VARCHAR,
    "market_risk_rule" BOOLEAN,
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "other_charge_off_amount_explanation" VARCHAR,
    "outstanding_collateral_amount" NUMERIC(18,2),
    "outstanding_collateral_amount_to_be_posted" NUMERIC(20,4),
    "outstanding_collateral_amount_to_be_received" NUMERIC(20,4),
    "pledged_flag" BOOLEAN,
    "potential_future_exposure_adjustment" NUMERIC(18,6),
    "potential_future_exposure_amount" NUMERIC(20,4),
    "probability_of_default_pd" NUMERIC(18,6),
    "reference_asset_credit_quality" VARCHAR,
    "reference_asset_credit_quality_description" VARCHAR,
    "secured_flag" VARCHAR,
    "treasury_control_flag" BOOLEAN,
    "two_year_probability_of_default" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- duns_entity_observation (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."duns_entity_observation" (
    "duns_number" VARCHAR(9) NOT NULL,
    "as_of_date" DATE NOT NULL,
    "paydex_score" INTEGER,
    "failure_score" INTEGER,
    "annual_revenue_amt" NUMERIC(20,4),
    "employee_count" INTEGER,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "record_source" VARCHAR(100),
    PRIMARY KEY ("duns_number", "as_of_date")
);

-- ecl_staging_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."ecl_staging_snapshot" (
    "ecl_staging_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "ecl_stage_code" VARCHAR(20),
    "prior_stage_code" VARCHAR(20),
    "stage_change_date" DATE,
    "stage_change_reason" VARCHAR(500),
    "model_code" VARCHAR(20),
    "days_past_due" INTEGER,
    "is_significant_increase_flag" BOOLEAN,
    "is_credit_impaired_flag" BOOLEAN,
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("ecl_staging_id")
);

-- economic_interdependence_relationship (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("econ_interdep_relationship_id")
);

-- equities_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."equities_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "bs_amount" NUMERIC(20,4),
    "carrying_value" NUMERIC(18,6),
    "cash_dividends" NUMERIC(18,2),
    "cash_dividends_declared_current_period" NUMERIC(18,6),
    "cash_dividends_paid_current_period" NUMERIC(18,6),
    "cash_dividends_paid_fiscal_ytd" NUMERIC(18,6),
    "counterparty_exposure_value" NUMERIC(20,4),
    "face_value" NUMERIC(18,2),
    "fair_value_amount" NUMERIC(18,2),
    "lendable_value" NUMERIC(20,4),
    "market_value" NUMERIC(18,2),
    "minority_interest_amount" NUMERIC(18,2),
    "number_of_units" VARCHAR,
    "number_of_shares" NUMERIC(18,2),
    "ownership_percentage" NUMERIC(18,6),
    "premium_value" NUMERIC(18,2),
    "retained_earnings" NUMERIC(18,2),
    "retained_earnings_brought_forward_start_of_fiscal_year" NUMERIC(18,6),
    "retained_earnings_cumulative_current_fiscal_year" NUMERIC(18,6),
    "transaction_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- equities_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."equities_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "cusip" VARCHAR,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stock_exchange_code" VARCHAR,
    "ticker_symbol" VARCHAR,
    "unpaid_share_capital" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- equities_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."equities_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "currency_code" VARCHAR,
    "equity_type" VARCHAR,
    "maturity_date" DATE,
    "reporting_currency" VARCHAR,
    "settlement_currency" VARCHAR,
    "transaction_currency" VARCHAR,
    "transaction_id" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- equities_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."equities_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "treasury_control_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- exception_event (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "event_ts" TIMESTAMP,
    PRIMARY KEY ("exception_id")
);

-- exposure_counterparty_attribution (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."exposure_counterparty_attribution" (
    "attribution_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "exposure_type_id" BIGINT,
    "counterparty_id" BIGINT,
    "exposure_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "attributed_exposure_usd" NUMERIC(18,2),
    "attribution_pct" NUMERIC(10,6),
    "counterparty_role_code" VARCHAR(20),
    "facility_id" BIGINT,
    "is_risk_shifted_flag" BOOLEAN,
    "risk_shifted_from_counterparty_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("attribution_id", "as_of_date")
);

-- facility_counterparty_participation (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_counterparty_participation" (
    "facility_participation_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "counterparty_role_code" VARCHAR(20),
    "is_primary_flag" BOOLEAN,
    "participation_pct" NUMERIC(10,6),
    "role_priority_rank" VARCHAR(100),
    "source_record_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_participation_id")
);

-- facility_credit_approval (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_credit_approval" (
    "approval_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "as_of_date" DATE,
    "approval_status" VARCHAR(30),
    "approval_date" DATE,
    "approved_amount" NUMERIC(18,2),
    "is_exception_flag" BOOLEAN,
    "exception_type" VARCHAR(50),
    "exception_type_code" VARCHAR(30),
    "exception_severity" VARCHAR(30),
    "exception_reason" VARCHAR(500),
    "approved_by" VARCHAR(100),
    "expiry_date" DATE,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("approval_id")
);

-- facility_delinquency_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_delinquency_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "credit_status_code" VARCHAR(30),
    "days_past_due" INTEGER,
    "is_watch_list_flag" BOOLEAN,
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "days_past_due_max" INTEGER,
    "delinquency_bucket_code" VARCHAR(20),
    "delinquency_snapshot_id" BIGINT,
    "delinquency_status_code" VARCHAR(20),
    "last_payment_received_date" DATE,
    "overdue_interest_amt" NUMERIC(18,2),
    "overdue_principal_amt" NUMERIC(18,2),
    "is_delinquent_payment_flag" BOOLEAN,
    "overdue_amt_0_30" NUMERIC(18,2),
    "overdue_amt_31_60" NUMERIC(18,2),
    "overdue_amt_61_90_plus" NUMERIC(18,2),
    "dpd_bucket_code" VARCHAR(20),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_exposure_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_exposure_snapshot" (
    "facility_id" BIGINT,
    "as_of_date" DATE,
    "exposure_type_id" BIGINT,
    "drawn_amount" NUMERIC(18,2),
    "committed_amount" NUMERIC(18,2),
    "undrawn_amount" NUMERIC(18,2),
    "source_system_id" BIGINT,
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "exposure_amount_local" NUMERIC(18,2),
    "facility_exposure_id" BIGINT NOT NULL,
    "fr2590_category_code" VARCHAR(20),
    "gross_exposure_usd" NUMERIC(18,2),
    "legal_entity_id" BIGINT,
    "lob_segment_id" BIGINT,
    "product_node_id" BIGINT,
    "outstanding_balance_amt" NUMERIC(18,2),
    "undrawn_commitment_amt" NUMERIC(18,2),
    "number_of_loans" INTEGER,
    "number_of_facilities" INTEGER,
    "days_until_maturity" INTEGER,
    "limit_status_code" VARCHAR(50),
    "internal_risk_rating_bucket_code" VARCHAR(20),
    "bank_share_pct" NUMERIC(10,6),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_exposure_id")
);

-- facility_financial_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_financial_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "operating_expense_amt" NUMERIC(18,2),
    "ebitda_amt" NUMERIC(18,2),
    "interest_expense_amt" NUMERIC(18,2),
    "principal_payment_amt" NUMERIC(18,2),
    "counterparty_id" BIGINT,
    "currency_code" VARCHAR(20),
    "reporting_period" VARCHAR(20),
    "financial_snapshot_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "net_income_amt" NUMERIC(20,4),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_lender_allocation (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_lender_allocation" (
    "lender_allocation_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "legal_entity_id" BIGINT,
    "bank_share_pct" NUMERIC(10,6),
    "bank_commitment_amt" NUMERIC(18,2),
    "allocation_role" VARCHAR(50),
    "is_lead_flag" BOOLEAN,
    "source_record_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("lender_allocation_id")
);

-- facility_lob_attribution (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_lob_attribution" (
    "attribution_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "as_of_date" DATE,
    "lob_segment_id" BIGINT,
    "attribution_pct" NUMERIC(10,6),
    "attributed_amount" NUMERIC(18,2),
    "attribution_amount_usd" NUMERIC(18,2),
    "attribution_type" VARCHAR(50),
    "lob_node_id" BIGINT,
    "hierarchy_id" VARCHAR(64),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("attribution_id")
);

-- facility_master (Uncategorized)
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
    "all_in_rate_pct" NUMERIC(10,6),
    "amortization_type" VARCHAR(50),
    "created_by" VARCHAR(100),
    "day_count_convention" VARCHAR(20),
    "facility_reference" VARCHAR(100),
    "interest_rate_reference" VARCHAR(20),
    "interest_rate_spread_bps" NUMERIC(8,2),
    "interest_rate_type" VARCHAR(20),
    "next_repricing_date" DATE,
    "payment_frequency" VARCHAR(30),
    "is_prepayment_penalty_flag" BOOLEAN,
    "product_id" BIGINT,
    "rate_cap_pct" NUMERIC(10,6),
    "rate_floor_pct" NUMERIC(10,6),
    "region_code" VARCHAR(20),
    "is_revolving_flag" BOOLEAN,
    "is_active_flag" BOOLEAN,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "facility_purpose_code" VARCHAR(30),
    "legal_entity_id" BIGINT,
    "profit_center_code" VARCHAR(30),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "facility_type_id" BIGINT,
    PRIMARY KEY ("facility_id")
);

-- facility_pricing_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_pricing_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "spread_bps" NUMERIC(10,2),
    "rate_index_id" BIGINT,
    "all_in_rate_pct" NUMERIC(10,6),
    "floor_pct" NUMERIC(10,6),
    "base_rate_pct" NUMERIC(10,6),
    "currency_code" VARCHAR(20),
    "facility_pricing_id" BIGINT,
    "min_spread_threshold_bps" NUMERIC(8,2),
    "payment_frequency" VARCHAR(30),
    "is_prepayment_penalty_flag" BOOLEAN,
    "rate_cap_pct" NUMERIC(10,6),
    "rate_index_code" VARCHAR(20),
    "is_pricing_exception_flag" BOOLEAN,
    "pricing_exception_status" VARCHAR(64),
    "fee_rate_pct" NUMERIC(10,6),
    "cost_of_funds_pct" NUMERIC(10,6),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_profitability_snapshot (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "currency_code" VARCHAR(20),
    "avg_nonearning_assets_amt" NUMERIC(18,2),
    "equity_allocation_pct" NUMERIC(10,6),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- facility_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."facility_risk_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "counterparty_id" BIGINT,
    "pd_pct" NUMERIC(10,6),
    "lgd_pct" NUMERIC(10,6),
    "ccf" NUMERIC(6,4),
    "internal_risk_rating" VARCHAR(100),
    "currency_code" VARCHAR(20),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "risk_weight_std_pct" NUMERIC(10,6),
    "risk_weight_erba_pct" NUMERIC(10,6),
    "is_defaulted_flag" BOOLEAN,
    "basel_exposure_type_id" BIGINT,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "defaulted_flag" BOOLEAN,
    PRIMARY KEY ("facility_id", "as_of_date")
);

-- financial_metric_observation (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("observation_id")
);

-- forbearance_event (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."forbearance_event" (
    "forbearance_event_id" BIGINT NOT NULL,
    "facility_id" BIGINT,
    "counterparty_id" BIGINT,
    "forbearance_type_code" VARCHAR(20),
    "event_date" DATE,
    "original_maturity_date" DATE,
    "modified_maturity_date" DATE,
    "original_rate_pct" NUMERIC(10,6),
    "modified_rate_pct" NUMERIC(10,6),
    "maturity_extension_months" INTEGER,
    "principal_forgiven_amt" NUMERIC(20,4),
    "currency_code" VARCHAR(20),
    "approval_date" DATE,
    "approved_by" VARCHAR(500),
    "as_of_date" DATE,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("forbearance_event_id")
);

-- fx_rate (Uncategorized)
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("fx_rate_id")
);

-- gl_account_balance_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."gl_account_balance_snapshot" (
    "ledger_account_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "begin_balance_dr_amt" NUMERIC(20,4),
    "begin_balance_cr_amt" NUMERIC(20,4),
    "period_activity_dr_amt" NUMERIC(20,4),
    "period_activity_cr_amt" NUMERIC(20,4),
    "ending_balance_dr_amt" NUMERIC(20,4),
    "ending_balance_cr_amt" NUMERIC(20,4),
    "currency_code" VARCHAR(30),
    "reporting_currency_amt" NUMERIC(20,4),
    "lob_segment_id" BIGINT,
    "org_unit_id" BIGINT,
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("ledger_account_id", "as_of_date")
);

-- gl_journal_entry (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."gl_journal_entry" (
    "journal_entry_id" BIGINT NOT NULL,
    "journal_batch_id" BIGINT,
    "ledger_account_id" BIGINT,
    "transaction_date" DATE,
    "posting_date" DATE,
    "transaction_code" VARCHAR(30),
    "transaction_desc" VARCHAR(500),
    "dr_cr_indicator" VARCHAR(30),
    "transaction_amt" NUMERIC(20,4),
    "transaction_currency_code" VARCHAR(30),
    "reporting_currency_amt" NUMERIC(20,4),
    "position_id" BIGINT,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "product_code" VARCHAR(30),
    "lob_segment_id" BIGINT,
    "org_unit_id" BIGINT,
    "source_system_id" BIGINT,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("journal_entry_id")
);

-- instrument_master (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."instrument_master" (
    "instrument_id" BIGINT NOT NULL,
    "country_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "is_active_flag" BOOLEAN,
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("instrument_id")
);

-- legal_entity (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."legal_entity" (
    "legal_entity_id" BIGINT NOT NULL,
    "legal_name" VARCHAR(200),
    "legal_entity_name" VARCHAR(200),
    "country_code" VARCHAR(20),
    "is_active_flag" BOOLEAN,
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("legal_entity_id")
);

-- legal_entity_hierarchy (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."legal_entity_hierarchy" (
    "hierarchy_id" BIGINT NOT NULL,
    "legal_entity_id" BIGINT,
    "parent_legal_entity_id" BIGINT,
    "as_of_date" DATE,
    "consolidation_method" VARCHAR(100),
    "hierarchy_level" VARCHAR(100),
    "hierarchy_path" VARCHAR(100),
    "ownership_pct" NUMERIC(10,6),
    "ultimate_parent_legal_entity_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("hierarchy_id")
);

-- limit_assignment_snapshot (Uncategorized)
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("facility_id", "limit_rule_id", "as_of_date")
);

-- limit_contribution_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."limit_contribution_snapshot" (
    "limit_rule_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "contribution_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "contribution_amount_usd" NUMERIC(18,2),
    "contribution_id" BIGINT,
    "contribution_pct" NUMERIC(10,6),
    "facility_id" BIGINT,
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("limit_rule_id", "counterparty_id", "as_of_date")
);

-- limit_utilization_event (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."limit_utilization_event" (
    "limit_rule_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "counterparty_id" BIGINT,
    "utilized_amount" NUMERIC(18,2),
    "available_amount" NUMERIC(18,2),
    "reporting_ts" TIMESTAMP,
    "utilization_event_id" BIGINT,
    "utilized_amount_usd" NUMERIC(18,2),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    "event_ts" TIMESTAMP,
    PRIMARY KEY ("limit_rule_id", "as_of_date")
);

-- loans_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."loans_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "asc326_20" INTEGER,
    "accounting_intent" VARCHAR,
    "accounting_intent_description" VARCHAR,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "acquired_loan" VARCHAR,
    "active_loan_as_of_month_end_flag" BOOLEAN,
    "actual_payment_amount" NUMERIC(18,2),
    "allowable_draw_period" INTEGER,
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amortized_cost" NUMERIC(18,2),
    "amortized_term" INTEGER,
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "bs_amount" NUMERIC(20,4),
    "bank_card_versus_charge_card" VARCHAR,
    "bankruptcy_chapter" VARCHAR,
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "carrying_value" NUMERIC(18,6),
    "charge_off_amount" NUMERIC(20,4),
    "charge_off_date" DATE,
    "city" VARCHAR,
    "collateral_market_value" NUMERIC(20,4),
    "commercial_lc_standby_amount" NUMERIC(18,6),
    "committed_exposure_global" NUMERIC(18,2),
    "committed_exposure_global_fair_value" VARCHAR,
    "committed_exposure_global_par_value" VARCHAR,
    "counterparty_exposure_value" NUMERIC(20,4),
    "coupon_interest_payment_date" DATE,
    "credit_and_charge_cards_total_open_accounts_end_of_period" INTEGER,
    "credit_enhanced_amount" NUMERIC(18,2),
    "cumulative_charge_offs" VARCHAR,
    "current_combined_ltv" NUMERIC(18,6),
    "current_credit_bureau_score_date" DATE,
    "current_occupancy" NUMERIC(18,6),
    "current_value" NUMERIC(18,2),
    "current_value_basis" VARCHAR,
    "data_file_reference" VARCHAR,
    "date_of_last_audit" DATE,
    "date_of_financials" DATE,
    "deferred_amount" NUMERIC(20,4),
    "deferred_fee" NUMERIC(18,6),
    "deferred_fee_aba" NUMERIC(18,6),
    "delinquent_amount_capitalized" NUMERIC(20,4),
    "disbursement_date" DATE,
    "disposition_schedule_shift" VARCHAR,
    "education_level_of_borrower" VARCHAR,
    "entity_serviced" VARCHAR,
    "entity_serviced_regulator" VARCHAR,
    "escrow_amount_current" NUMERIC(18,2),
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value_amount" NUMERIC(18,2),
    "fair_value_flag" BOOLEAN,
    "fair_value_measurement_level" VARCHAR,
    "financial_lc_standby_amount" NUMERIC(18,6),
    "first_mortgage_serviced_in_house" VARCHAR,
    "first_payment_date" DATE,
    "foreclosure_status" VARCHAR,
    "foreclosure_status_description" VARCHAR,
    "foreclosure_suspended" VARCHAR,
    "forward_contract_to_federal_agencies" BOOLEAN,
    "forward_start_amount" NUMERIC(18,6),
    "frequency_of_rate_reset" VARCHAR,
    "funded_allowance_balance" NUMERIC(18,6),
    "funded_committed_exposure" NUMERIC(20,4),
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "gross_origination_amount" NUMERIC(18,6),
    "income_documentation" VARCHAR,
    "income_documentation_description" VARCHAR,
    "indemnification_asset_amount" NUMERIC(18,6),
    "interest_only_term_original" INTEGER,
    "interest_only_at_origination" VARCHAR,
    "interest_only_in_reporting_month" VARCHAR,
    "interest_reserves" NUMERIC(20,4),
    "issue_date" DATE,
    "last_noi_date" DATE,
    "last_valuation_date" DATE,
    "legal_balance" NUMERIC(18,6),
    "lendable_value" NUMERIC(20,4),
    "locked_amount_amortizing_loc" NUMERIC(20,4),
    "locked_amount_interest_only_loc" NUMERIC(20,4),
    "loss_write_down_amount" NUMERIC(20,4),
    "lower_of_cost_or_market_flag_locom" VARCHAR,
    "mailing_city" VARCHAR,
    "minority_interest" NUMERIC(18,2),
    "monthly_draw_amount" NUMERIC(20,4),
    "mortgage_investor_sale_date" DATE,
    "most_recent_property_valuation_date" DATE,
    "net_income_current" NUMERIC(18,2),
    "net_income_prior_year" NUMERIC(18,2),
    "net_operating_income_noi_current" VARCHAR,
    "net_recovery_amount" NUMERIC(20,4),
    "next_payment_due_date" DATE,
    "original_combined_ltv" NUMERIC(18,6),
    "original_face_amount" NUMERIC(18,2),
    "original_ltv" NUMERIC(18,6),
    "original_loan_amount_disbursed" NUMERIC(20,4),
    "original_property_value" NUMERIC(20,4),
    "original_value_basis" VARCHAR,
    "original_value_basis_description" VARCHAR,
    "origination_amount" NUMERIC(20,4),
    "origination_amount_disbursed" NUMERIC(18,6),
    "other_charge_off_amount" NUMERIC(18,2),
    "outstanding_balance" NUMERIC(18,2),
    "outstanding_balance_fair_value" VARCHAR,
    "outstanding_balance_par_value" VARCHAR,
    "outstanding_principal_balance" NUMERIC(18,6),
    "payment_due_date" DATE,
    "performance_lc_standby_amount" NUMERIC(18,6),
    "portfolio_accounting_intent" VARCHAR,
    "pre_payment_penalty_term" INTEGER,
    "premium_discount_amount" NUMERIC(20,4),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "principal_and_interest_pandi_amount_current" NUMERIC(18,2),
    "principal_and_interest_pandi_amount_at_origination" NUMERIC(20,4),
    "purchase_account_adjustment_amount" NUMERIC(18,6),
    "purchased_credit_deteriorated_noncredit_discount" NUMERIC(18,2),
    "recourse" VARCHAR,
    "recourse_amount" NUMERIC(18,6),
    "recovery_amount" NUMERIC(20,4),
    "recovery_date" DATE,
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "refreshed_property_valuation_date" DATE,
    "repurchase_request_date" DATE,
    "retained_earnings" NUMERIC(18,2),
    "sales_price_of_property" NUMERIC(18,2),
    "servicing_transfer_date" DATE,
    "settlement_date" DATE,
    "settlement_negotiated_amount" NUMERIC(20,4),
    "total_assets_ta_current" NUMERIC(18,2),
    "total_assets_ta_prior_year" NUMERIC(18,2),
    "total_debt_at_involuntary_termination" NUMERIC(18,6),
    "total_debt_at_time_of_any_involuntary_termination" NUMERIC(20,4),
    "total_liabilities" NUMERIC(18,2),
    "transfer_risk_reserve_amount" NUMERIC(20,4),
    "usd_equivalent_amount" NUMERIC(20,4),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "unfunded_committed_exposure" NUMERIC(20,4),
    "unpaid_principal_balance" NUMERIC(20,4),
    "unpaid_principal_balance_net" NUMERIC(20,4),
    "unrealized_gain_loss" NUMERIC(20,4),
    "unused_commitment_exposure" NUMERIC(20,4),
    "utilized_exposure_global" NUMERIC(20,4),
    "utilized_exposure_global_fair_value" VARCHAR,
    "utilized_exposure_global_par_value" VARCHAR,
    "valuation_adjustment_amount" NUMERIC(20,4),
    "value_basis" VARCHAR,
    "value_at_origination" VARCHAR,
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- loans_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."loans_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "amortization" INTEGER,
    "cusip" VARCHAR,
    "call_report_code" VARCHAR,
    "cash_and_marketable_securities" NUMERIC(18,2),
    "census_tract" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "country" VARCHAR,
    "credit_facility_purpose" VARCHAR,
    "credit_facility_purpose_description" VARCHAR,
    "current_credit_bureau_score" INTEGER,
    "current_credit_bureau_score_vendor" VARCHAR,
    "current_credit_bureau_score_version" VARCHAR,
    "current_credit_limit" NUMERIC(18,2),
    "customer_id" VARCHAR,
    "debt_to_income_dti_back_end_at_origination" NUMERIC(20,4),
    "debt_to_income_dti_front_end_at_origination" NUMERIC(20,4),
    "domicile" VARCHAR,
    "domicile_issuer" VARCHAR,
    "domicile_ultimate_parent" VARCHAR,
    "entity_industry_code" VARCHAR,
    "entity_internal_id" VARCHAR,
    "entity_name" VARCHAR,
    "entity_type" VARCHAR,
    "facility_id" VARCHAR,
    "facility_status" VARCHAR,
    "facility_status_description" VARCHAR,
    "federal_guaranteed_amount" NUMERIC(20,4),
    "gl_account_number" INTEGER,
    "geographic_code" VARCHAR,
    "guarantor_flag" VARCHAR,
    "guarantor_internal_id" VARCHAR,
    "guarantor_name" VARCHAR,
    "guarantor_tin" VARCHAR,
    "guarantor_type" VARCHAR,
    "home_equity_line_type" VARCHAR,
    "isin" VARCHAR,
    "iso_country_code_issuer" VARCHAR,
    "iso_country_code_parent" VARCHAR,
    "identifier_type" VARCHAR,
    "industry_code" VARCHAR,
    "industry_code_type" VARCHAR,
    "interest_income_tax_status" VARCHAR,
    "internal_credit_facility_id" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "investor_type" VARCHAR,
    "investor_type_description" VARCHAR,
    "issuer_domicile" VARCHAR,
    "issuer_name" VARCHAR,
    "lc_standby_type" VARCHAR,
    "lease_type" VARCHAR,
    "legal_entity" VARCHAR,
    "legal_entity_domicile" VARCHAR,
    "legal_entity_id" VARCHAR,
    "line_of_business" VARCHAR,
    "line_re_age" VARCHAR,
    "line_of_business_description" VARCHAR,
    "liquidation_method" VARCHAR,
    "liquidation_method_description" VARCHAR,
    "liquidation_status" VARCHAR,
    "loan_line_owner" VARCHAR,
    "loan_extension" VARCHAR,
    "loan_source" VARCHAR,
    "loan_source_description" VARCHAR,
    "loan_status" VARCHAR,
    "loan_status_mba_method" VARCHAR,
    "loan_status_description" VARCHAR,
    "location" VARCHAR,
    "loss_mitigation_performance_status" VARCHAR,
    "loss_mitigation_performance_status_description" VARCHAR,
    "mailing_state" VARCHAR,
    "mailing_street_address" VARCHAR,
    "mailing_zip_code" VARCHAR,
    "mortgage_insurance_company" VARCHAR,
    "mortgage_insurance_company_description" VARCHAR,
    "mortgage_insurance_coverage_percent_at_origination" NUMERIC(18,6),
    "national_bank_rssd_id" INTEGER,
    "net_operating_income_at_origination" VARCHAR,
    "net_sales_current" NUMERIC(18,2),
    "net_sales_prior_year" NUMERIC(18,2),
    "obligor_internal_id" VARCHAR,
    "obligor_lei" VARCHAR,
    "obligor_name" VARCHAR,
    "occupancy" VARCHAR,
    "operating_income" NUMERIC(18,2),
    "original_internal_credit_facility_id" VARCHAR,
    "original_internal_identification" VARCHAR,
    "original_loan_line_commitment" NUMERIC(20,4),
    "original_loan_number" VARCHAR,
    "original_loan_term" NUMERIC(18,6),
    "original_loan_line_term" INTEGER,
    "original_previous_loan_number" VARCHAR,
    "origination_credit_bureau_score" INTEGER,
    "origination_credit_bureau_score_vendor" VARCHAR,
    "origination_credit_bureau_score_vendor_description" VARCHAR,
    "origination_credit_bureau_score_version" VARCHAR,
    "other_credit_facility_purpose_description" VARCHAR,
    "overdraft_type" VARCHAR,
    "pd_calculation_method" VARCHAR,
    "paid_in_full_coding" VARCHAR,
    "participation_interest" NUMERIC(18,6),
    "payment_type_at_the_end_of_draw_period" VARCHAR,
    "pledged_capacity_counterparty" VARCHAR,
    "portfolio_segment_id" VARCHAR,
    "previous_loan_number" VARCHAR,
    "primary_monetization_channel" VARCHAR,
    "primary_repayer_id" VARCHAR,
    "primary_source_of_repayment_psrlei" VARCHAR,
    "primary_source_of_repayment_lei_psrlei" VARCHAR,
    "principal_deferred" VARCHAR,
    "product_category_code" VARCHAR,
    "property_city" VARCHAR,
    "property_size" VARCHAR,
    "property_state" VARCHAR,
    "property_street_address" VARCHAR,
    "property_type" VARCHAR,
    "property_zip_code" VARCHAR,
    "purchased_credit_deteriorated_status" VARCHAR,
    "qmna_id" VARCHAR,
    "refreshed_dti_ratio_back_end" NUMERIC(10,6),
    "refreshed_dti_ratio_front_end" NUMERIC(10,6),
    "refreshed_property_valuation_method" VARCHAR,
    "related_party_transaction" VARCHAR,
    "remaining_term" INTEGER,
    "repurchase_type" VARCHAR,
    "repurchase_type_description" VARCHAR,
    "repurchased_from_federal_agencies" BOOLEAN,
    "risk_weight_issuer_domicile" VARCHAR,
    "sedol" VARCHAR,
    "snc_internal_credit_id" VARCHAR,
    "scorecard_methodology" VARCHAR,
    "security_identifier" VARCHAR,
    "security_identifier_type" VARCHAR,
    "short_term_debt" NUMERIC(18,2),
    "source_system" VARCHAR,
    "source_system_description" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stock_exchange_code" VARCHAR,
    "tin" VARCHAR,
    "tangible_assets" NUMERIC(18,2),
    "target_hold" NUMERIC(18,6),
    "ticker_symbol" VARCHAR,
    "unearned_income" NUMERIC(20,4),
    "unsettled_trades" NUMERIC(18,6),
    "zip_code" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- loans_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."loans_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "arm_index" VARCHAR,
    "arm_index_description" VARCHAR,
    "arm_initial_rate" NUMERIC(18,6),
    "arm_initial_rate_period" NUMERIC(10,6),
    "arm_lifetime_rate_cap" NUMERIC(18,6),
    "arm_lifetime_rate_floor" NUMERIC(18,6),
    "arm_margin_at_origination" NUMERIC(18,6),
    "arm_negative_amortization_pct_limit" NUMERIC(18,6),
    "arm_negative_amortization_limit" NUMERIC(18,6),
    "arm_payment_reset_frequency" INTEGER,
    "arm_periodic_interest_reset_period" INTEGER,
    "arm_periodic_pay_cap" NUMERIC(18,6),
    "arm_periodic_pay_floor" NUMERIC(18,6),
    "arm_periodic_rate_cap" NUMERIC(18,6),
    "arm_periodic_rate_floor" NUMERIC(18,6),
    "arm_rate_adjustment_month_day" NUMERIC(18,6),
    "anchor_tenant" VARCHAR,
    "balloon_flag" VARCHAR,
    "balloon_term" INTEGER,
    "cre_property_type" VARCHAR,
    "commitment_type" VARCHAR,
    "credit_card_type" VARCHAR,
    "credit_class" VARCHAR,
    "credit_class_description" VARCHAR,
    "credit_facility_currency" VARCHAR,
    "credit_facility_type" VARCHAR,
    "credit_facility_type_description" VARCHAR,
    "currency_code" VARCHAR,
    "current_interest_rate" NUMERIC(18,6),
    "current_maturity_date" DATE,
    "current_occupancy_date" DATE,
    "effective_maturity_date" DATE,
    "encumbrance_end_date" DATE,
    "extended_maturity_date" VARCHAR,
    "first_lien_loan_type" VARCHAR,
    "foreign_exchange_rate" NUMERIC(18,6),
    "forward_start_date" DATE,
    "hedge_id" VARCHAR,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_after_modification" NUMERIC(18,6),
    "interest_rate_before_modification" NUMERIC(18,6),
    "interest_rate_ceiling" VARCHAR,
    "interest_rate_floor" VARCHAR,
    "interest_rate_frozen" VARCHAR,
    "interest_rate_index" VARCHAR,
    "interest_rate_index_description" VARCHAR,
    "interest_rate_spread" VARCHAR,
    "interest_rate_type" VARCHAR,
    "interest_rate_variability" VARCHAR,
    "interest_type_current" VARCHAR,
    "interest_type_current_description" VARCHAR,
    "interest_type_conversion_duration" VARCHAR,
    "interest_type_conversion_duration_description" VARCHAR,
    "interest_type_at_origination" VARCHAR,
    "interest_type_at_origination_description" VARCHAR,
    "last_modified_date" DATE,
    "loan_closing_date" DATE,
    "loan_number" VARCHAR,
    "loan_purpose" VARCHAR,
    "loan_purpose_coding" VARCHAR,
    "loan_purpose_description" VARCHAR,
    "loan_type" VARCHAR,
    "loan_type_description" VARCHAR,
    "maturity_date" DATE,
    "maturity_date_optionality" DATE,
    "maturity_optionality" VARCHAR,
    "number_of_units" VARCHAR,
    "option_arm_flag" VARCHAR,
    "option_arm_in_reporting_month" VARCHAR,
    "optionality_type" VARCHAR,
    "original_interest_rate" NUMERIC(18,6),
    "original_property_valuation_method_description_appraisal_method" VARCHAR,
    "original_property_valuation_methodappraisal_method" VARCHAR,
    "origination_date" DATE,
    "other_credit_facility_type_description" VARCHAR,
    "product_code" VARCHAR,
    "product_type_current" VARCHAR,
    "product_type_current_description" VARCHAR,
    "product_type_origination" VARCHAR,
    "product_type_origination_description" VARCHAR,
    "property_valuation_method_at_origination_appraisal_method" VARCHAR,
    "refreshed_property_value" NUMERIC(18,2),
    "remaining_maturity_days" INTEGER,
    "remaining_time_to_repricing" INTEGER,
    "renewal_date" DATE,
    "repayment_start_date" DATE,
    "repayment_type" VARCHAR,
    "reporting_currency" VARCHAR,
    "repricing_date" DATE,
    "security_type" VARCHAR,
    "settlement_currency" VARCHAR,
    "snapshot_date" DATE,
    "transaction_currency" VARCHAR,
    "weighted_average_life" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- loans_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."loans_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "num_days_principal_or_interest_past_due" NUMERIC(20,4),
    "acl_flag" BOOLEAN,
    "accounts_payable_a_p_current" NUMERIC(18,2),
    "accounts_payable_a_p_prior_year" NUMERIC(18,2),
    "accounts_receivable_a_r_current" NUMERIC(18,2),
    "accounts_receivable_a_r_prior_year" NUMERIC(18,2),
    "accrual_status" VARCHAR,
    "accrual_status_description" VARCHAR,
    "acquired_flag" BOOLEAN,
    "additional_collateral" NUMERIC(18,2),
    "bankruptcy_flag" VARCHAR,
    "capital_expenditures" NUMERIC(18,2),
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "co_signer_flag" VARCHAR,
    "cohort_default_rate_cdr" VARCHAR,
    "collateral_type" VARCHAR,
    "commercial_loan_flag" VARCHAR,
    "conditionally_cancellable_flag" BOOLEAN,
    "conveyed_to_others_flag" BOOLEAN,
    "credit_line_closed_flag" VARCHAR,
    "credit_line_frozen_flag" VARCHAR,
    "cross_collateralized_loan_numbers" VARCHAR,
    "current_assets_current" NUMERIC(18,2),
    "current_assets_prior_year" NUMERIC(18,2),
    "current_liabilities_current" NUMERIC(18,2),
    "current_liabilities_prior_year" NUMERIC(18,2),
    "current_maturities_of_long_term_debt" NUMERIC(18,2),
    "deferment_flag" VARCHAR,
    "delinquency_flag" BOOLEAN,
    "delinquency_status" VARCHAR,
    "depreciation_and_amortization" NUMERIC(18,2),
    "disposition_flag" VARCHAR,
    "encumbered_flag" BOOLEAN,
    "entity_internal_risk_rating" VARCHAR,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "fixed_assets" NUMERIC(18,2),
    "forbearance_flag" VARCHAR,
    "foreclosure_referral_date" DATE,
    "foreclosure_sale_date" DATE,
    "forward_sale_agreement_flag" VARCHAR,
    "forward_start_indicator" VARCHAR,
    "grace_flag" VARCHAR,
    "guarantor_internal_risk_rating" VARCHAR,
    "hfi_fvo_hfs_indicator" VARCHAR,
    "hfi_fvo_hfs_indicator_description" VARCHAR,
    "interest_expense" NUMERIC(18,2),
    "interest_income_taxable_flag" BOOLEAN,
    "internal_rating" VARCHAR,
    "internal_risk_rating" VARCHAR,
    "internal_risk_rating_description" VARCHAR,
    "inventory_current" NUMERIC(18,2),
    "inventory_prior_year" NUMERIC(18,2),
    "involuntary_termination_date" DATE,
    "latest_record" VARCHAR,
    "letter_of_credit_flag" BOOLEAN,
    "leveraged_loan_flag" VARCHAR,
    "lien_position_description" VARCHAR,
    "lien_position_at_origination" VARCHAR,
    "lien_position_at_origination_description" VARCHAR,
    "line_reported_on_fr_y_9c_cre" VARCHAR,
    "line_reported_on_fr_y_9c_corporate" VARCHAR,
    "liquidation_date" DATE,
    "loan_close_to_open_conversion_flag" BOOLEAN,
    "loan_modifications_with_borrowers_under_financial_stress_date" DATE,
    "loan_modifications_to_borrowers_experiencing_financial_difficul" DATE,
    "loan_open_to_close_converted_flag" VARCHAR,
    "loan_open_to_closed_conversion_flag" BOOLEAN,
    "loan_transfer_to_hfs_flag" VARCHAR,
    "lockout_feature_flag" VARCHAR,
    "long_term_debt" NUMERIC(18,2),
    "loss_given_default_lgd" NUMERIC(18,6),
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "modification_flag" VARCHAR,
    "modification_type" VARCHAR,
    "modification_type_description" VARCHAR,
    "negative_amortization_flag" VARCHAR,
    "non_accrual_date" DATE,
    "non_purpose_lending_flag" BOOLEAN,
    "nonfinancial_equity_investment_flag" BOOLEAN,
    "other_charge_off_amount_explanation" VARCHAR,
    "other_modification_action_type" VARCHAR,
    "participation_flag" VARCHAR,
    "participation_indicator" VARCHAR,
    "participation_indicator_description" VARCHAR,
    "paycheck_protection_program_flag" BOOLEAN,
    "pledged_eligibility" BOOLEAN,
    "pledged_flag" BOOLEAN,
    "pledged_to" VARCHAR,
    "pre_payment_penalty_flag" VARCHAR,
    "prepayment_penalty_flag_corporate_and_cre" VARCHAR,
    "prepayment_penalty_flag_residential" VARCHAR,
    "prepayment_penalty_indicator_description" VARCHAR,
    "probability_of_default_pd" NUMERIC(18,6),
    "provision_for_credit_losses" NUMERIC(20,4),
    "purchased_credit_deteriorated_flag" VARCHAR,
    "rc_c_code" VARCHAR,
    "reo_disposition_date" DATE,
    "reo_flag" BOOLEAN,
    "recourse_flag" VARCHAR,
    "recourse_indicator" VARCHAR,
    "recourse_indicator_description" VARCHAR,
    "refreshed_cltv_after_modification" NUMERIC(18,6),
    "reg_o_flag" VARCHAR,
    "rehypothecation_eligibility_flag" VARCHAR,
    "remodified_flag" VARCHAR,
    "reported_as_bank_owned_flag" VARCHAR,
    "revolving_term_flag" VARCHAR,
    "revolving_flag" VARCHAR,
    "secured_flag" VARCHAR,
    "serviced_by_others_sbo_flag" VARCHAR,
    "special_purpose_entity_flag" VARCHAR,
    "step_modification_flag" VARCHAR,
    "syndicated_loan_flag" VARCHAR,
    "syndicated_loan_indicator" VARCHAR,
    "syndicated_loan_indicator_description" VARCHAR,
    "term_modification" VARCHAR,
    "third_party_sale_flag" VARCHAR,
    "treasury_control_flag" BOOLEAN,
    "troubled_debt_restructure_date" DATE,
    "troubled_debt_restructure_flag" VARCHAR,
    "two_year_probability_of_default" NUMERIC(18,6),
    "workout_type_completed" VARCHAR,
    "workout_type_completed_description" VARCHAR,
    "workout_type_started" VARCHAR,
    "workout_type_started_description" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- margin_agreement (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("margin_agreement_id")
);

-- netting_agreement (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("netting_agreement_id")
);

-- netting_set (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."netting_set" (
    "netting_set_id" BIGINT NOT NULL,
    "netting_agreement_id" BIGINT,
    "is_active_flag" BOOLEAN,
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("netting_set_id")
);

-- netting_set_exposure_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."netting_set_exposure_snapshot" (
    "netting_set_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "gross_exposure_amount" NUMERIC(18,2),
    "currency_code" VARCHAR(20),
    "collateral_held_usd" NUMERIC(18,2),
    "counterparty_id" BIGINT,
    "gross_mtm_usd" NUMERIC(18,2),
    "legal_entity_id" BIGINT,
    "netting_set_exposure_id" BIGINT,
    "pfe_usd" NUMERIC(18,2),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "record_hash" VARCHAR(64),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("netting_set_id", "as_of_date")
);

-- netting_set_link (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("netting_set_link_id")
);

-- offbs_commitments_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."offbs_commitments_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "charge_off_amount" NUMERIC(20,4),
    "committed_exposure_global" NUMERIC(18,2),
    "committed_exposure_global_fair_value" VARCHAR,
    "committed_exposure_global_par_value" VARCHAR,
    "counterparty_exposure_value" NUMERIC(20,4),
    "credit_conversion_factor" VARCHAR,
    "cumulative_charge_offs" VARCHAR,
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "funded_allowance_balance" NUMERIC(18,6),
    "funded_committed_exposure" NUMERIC(20,4),
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "loss_write_down_amount" NUMERIC(20,4),
    "net_recovery_amount" NUMERIC(20,4),
    "notional_amount" NUMERIC(18,2),
    "original_commitment_amount" NUMERIC(18,2),
    "other_charge_off_amount" NUMERIC(18,2),
    "outstanding_balance" NUMERIC(18,2),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "recoveries_amount" NUMERIC(20,4),
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "unfunded_amount" NUMERIC(20,4),
    "unused_commitment_exposure" NUMERIC(20,4),
    "utilized_exposure_global" NUMERIC(20,4),
    "utilized_exposure_global_fair_value" VARCHAR,
    "utilized_exposure_global_par_value" VARCHAR,
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- offbs_commitments_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."offbs_commitments_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "country_code" VARCHAR,
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "guarantee_flag" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "liquidity_facilities" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- offbs_commitments_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."offbs_commitments_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "commitment_id" VARCHAR,
    "commitment_type" VARCHAR,
    "currency_code" VARCHAR,
    "effective_date" DATE,
    "maturity_bucket" VARCHAR,
    "maturity_date" DATE,
    "maturity_optionality" VARCHAR,
    "off_balancesheet_product_type_exposures" VARCHAR,
    "reporting_currency" VARCHAR,
    "repricing_date_interest_reset_date" DATE,
    "settlement_currency" VARCHAR,
    "transaction_currency" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- offbs_commitments_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."offbs_commitments_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "entity_internal_risk_rating" VARCHAR,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "guarantor_internal_risk_rating" VARCHAR,
    "internal_risk_rating" VARCHAR,
    "internal_risk_rating_description" VARCHAR,
    "loss_given_default_lgd" NUMERIC(18,6),
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "other_charge_off_amount_explanation" VARCHAR,
    "probability_of_default_pd" NUMERIC(18,6),
    "treasury_control_flag" BOOLEAN,
    "two_year_probability_of_default" NUMERIC(18,6),
    "unconditionally_cancellable_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- payment_ledger (Uncategorized)
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("payment_id")
);

-- position (Uncategorized)
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
    "is_trading_banking_book_flag" BOOLEAN,
    "ultimate_parent_id" BIGINT,
    "product_node_id" BIGINT,
    "product_code" VARCHAR(50),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    "product_subtype_id" BIGINT,
    "customer_id" VARCHAR(64),
    "trade_date" DATE,
    "settlement_date" DATE,
    "is_hedging_flag" BOOLEAN,
    "accounting_classification_code" VARCHAR(30),
    "cost_center_id" BIGINT,
    PRIMARY KEY ("position_id")
);

-- position_detail (Uncategorized)
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
    "haircut_applied_pct" NUMERIC(10,6),
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
    "is_delinquent_payment_flag" BOOLEAN,
    "overdue_amt_0_30" NUMERIC(18,2),
    "overdue_amt_31_60" NUMERIC(18,2),
    "overdue_amt_61_90_plus" NUMERIC(18,2),
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("position_detail_id")
);

-- protection_link (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."protection_link" (
    "protection_link_id" BIGINT NOT NULL,
    "protection_id" BIGINT,
    "facility_id" BIGINT,
    "allocated_amount" NUMERIC(18,2),
    "allocated_currency_code" VARCHAR(20),
    "allocation_pct" NUMERIC(10,6),
    "anchor_id" BIGINT,
    "anchor_type" VARCHAR(50),
    "source_system_id" BIGINT,
    "effective_start_date" DATE,
    "effective_end_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("protection_link_id")
);

-- risk_flag (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("risk_flag_id")
);

-- risk_mitigant_link (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("risk_mitigant_link_id")
);

-- risk_mitigant_master (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."risk_mitigant_master" (
    "risk_mitigant_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "risk_mitigant_subtype_code" VARCHAR(20),
    "collateral_asset_id" BIGINT,
    "description" VARCHAR(2000),
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
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "load_batch_id" VARCHAR(100),
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("risk_mitigant_id")
);

-- securities_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."securities_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "asu_2017_12_hedge_designations" VARCHAR,
    "accounting_intent" VARCHAR,
    "accounting_intent_description" VARCHAR,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "acquisition_cost_usd_converted" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amortized_cost" NUMERIC(18,2),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "balance_sheet_amount" NUMERIC(20,4),
    "book_yield" NUMERIC(10,6),
    "carrying_value" NUMERIC(18,6),
    "charge_off_amount" NUMERIC(20,4),
    "collateral_fair_value_amount_at_origination" NUMERIC(20,4),
    "collateral_market_value" NUMERIC(20,4),
    "counterparty_exposure_value" NUMERIC(20,4),
    "coupon_int_pmt_date" DATE,
    "current_face_value" NUMERIC(18,6),
    "effective_portion_of_cumulative_gains_and_losses" NUMERIC(20,4),
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value_amount" NUMERIC(18,2),
    "fair_value_measurement_level" VARCHAR,
    "forward_start_amount" NUMERIC(18,6),
    "fund_asset_class" VARCHAR,
    "fwd_start_amount" NUMERIC(18,6),
    "fwd_start_mat_bucket" VARCHAR,
    "hedge_horizon" VARCHAR,
    "hedge_percentage" NUMERIC(10,6),
    "hedge_position_description" VARCHAR,
    "hedge_position" VARCHAR,
    "hedged_cash_flow" VARCHAR,
    "hedged_risk" VARCHAR,
    "hedging_instrument_at_fair_value" NUMERIC(20,4),
    "identifier_value" VARCHAR,
    "indemnification_asset_amount" NUMERIC(18,6),
    "lendable_value" NUMERIC(20,4),
    "market_value" NUMERIC(18,2),
    "option_exercised" VARCHAR,
    "option_exercised_status" VARCHAR,
    "original_balance" NUMERIC(18,2),
    "original_book_yield" NUMERIC(20,4),
    "original_face_value" NUMERIC(18,2),
    "price" NUMERIC(20,4),
    "principal_pmt_date" DATE,
    "purchase_date" DATE,
    "purchase_price" NUMERIC(20,4),
    "retained_earnings" NUMERIC(18,2),
    "securities_measurement_level" VARCHAR,
    "settlement_amount" NUMERIC(20,4),
    "settlement_date" DATE,
    "trade_date" DATE,
    "trade_price" NUMERIC(20,4),
    "trade_quantity" NUMERIC(20,4),
    "transaction_date" DATE,
    "transaction_price" NUMERIC(20,4),
    "transaction_price_usd_converted" NUMERIC(20,4),
    "transaction_quantity" NUMERIC(20,4),
    "usd_equivalent_amounts" NUMERIC(20,4),
    "unrealized_gain_loss" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- securities_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."securities_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "cusip" VARCHAR,
    "call_report_code" VARCHAR,
    "census_tract" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "country_code" VARCHAR,
    "customer_id" VARCHAR,
    "domicile" VARCHAR,
    "domicile_issuer" VARCHAR,
    "domicile_ultimate_parent" VARCHAR,
    "gl_account_number" INTEGER,
    "geographic_code" VARCHAR,
    "guarantee_flag" VARCHAR,
    "guarantor_id" VARCHAR,
    "guarantor_name" VARCHAR,
    "guarantor_type" VARCHAR,
    "isin" VARCHAR,
    "iso_country_code_issuer" VARCHAR,
    "iso_country_code_issuer_parent" VARCHAR,
    "iso_country_code_parent" VARCHAR,
    "identifier_type" VARCHAR,
    "interest_eligible" BOOLEAN,
    "internal_identifier" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "issuer_domicile" VARCHAR,
    "issuer_id" VARCHAR,
    "issuer_name" VARCHAR,
    "issuer_parent_name" VARCHAR,
    "issuer_type" VARCHAR,
    "legal_entity_domicile" VARCHAR,
    "legal_entity_id" VARCHAR,
    "municipal_bond_sector" VARCHAR,
    "percent_direct_encumbered" NUMERIC(10,6),
    "pledged_capacity_counterparty" VARCHAR,
    "primary_monetization_channel" VARCHAR,
    "property_city" VARCHAR,
    "property_state" VARCHAR,
    "property_street_address" VARCHAR,
    "property_zip_code" VARCHAR,
    "qmna_id" VARCHAR,
    "risk_weight_issuer_domicile" VARCHAR,
    "sedol" VARCHAR,
    "sector" VARCHAR,
    "security_description" VARCHAR,
    "security_identifier" VARCHAR,
    "security_identifier_type" VARCHAR,
    "security_name" VARCHAR,
    "security_status" VARCHAR,
    "settlement_convention" VARCHAR,
    "settlement_standard" BOOLEAN,
    "settlement_status" VARCHAR,
    "source_system" VARCHAR,
    "source_system_description" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "stock_exchange_code" VARCHAR,
    "ticker_symbol" VARCHAR,
    "trade_type_b_s" VARCHAR,
    "transaction_type" VARCHAR,
    "type_of_hedges" VARCHAR,
    "write_offs" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- securities_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."securities_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "activity_type" VARCHAR,
    "amortization_type" VARCHAR,
    "asset_liability_indicator" VARCHAR,
    "asset_liability_indicator_description" VARCHAR,
    "call_date" DATE,
    "ceiling_rate" NUMERIC(10,6),
    "coupon_dividend_rate" NUMERIC(20,4),
    "coupon_int_pmt_periodicity" VARCHAR,
    "currency_code" VARCHAR,
    "currency_of_issuance" VARCHAR,
    "currency_of_settlement" VARCHAR,
    "current_rate" NUMERIC(10,6),
    "effective_maturity_date" DATE,
    "encumbrance_end_date" DATE,
    "floor_rate" NUMERIC(10,6),
    "forward_start_date" DATE,
    "fund_name" VARCHAR,
    "fund_type" VARCHAR,
    "fund_type_description" VARCHAR,
    "fwd_start_mat_date" DATE,
    "hedged_interest_rate" VARCHAR,
    "hedging_id" VARCHAR,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_type" VARCHAR,
    "issue_date" DATE,
    "last_reprice" NUMERIC(20,4),
    "last_reprice_date" DATE,
    "maturity_date" DATE,
    "maturity_date_optionality" DATE,
    "maturity_optionality" VARCHAR,
    "mutual_fund_type" VARCHAR,
    "pricing_date" DATE,
    "principal_periodicity" VARCHAR,
    "product_code" VARCHAR,
    "put_date" DATE,
    "reporting_currency" VARCHAR,
    "repricing_date" DATE,
    "repricing_date_interest_reset_date" DATE,
    "security_sub_type" VARCHAR,
    "security_type" VARCHAR,
    "security_type_description" VARCHAR,
    "settlement_currency" VARCHAR,
    "settlement_type" VARCHAR,
    "sidedness" VARCHAR,
    "snapshot_date" DATE,
    "transaction_currency" VARCHAR,
    "unique_id" VARCHAR,
    "weighted_average_life" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- securities_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."securities_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "144a_flag" BOOLEAN,
    "direct_encumbrance_type" VARCHAR,
    "encumbered_flag" BOOLEAN,
    "latest_record" VARCHAR,
    "liquid_assets_collateral_level" VARCHAR,
    "non_accrual_status" BOOLEAN,
    "non_accrual_date" DATE,
    "performing_flag" BOOLEAN,
    "pledged_eligibility" BOOLEAN,
    "pledged_flag" BOOLEAN,
    "pledged_to" VARCHAR,
    "private_placement_flag" BOOLEAN,
    "rehypothecated" VARCHAR,
    "secured_flag" VARCHAR,
    "trade_failed_flag" BOOLEAN,
    "trade_long_short_flag" VARCHAR,
    "treasury_control" VARCHAR,
    "treasury_control_flag" BOOLEAN,
    "unencumbered" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- sft_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."sft_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_intent" VARCHAR,
    "accrued_interest_dividend_amount" NUMERIC(18,2),
    "accrued_interest_amount" NUMERIC(18,2),
    "allowance_balance" NUMERIC(20,4),
    "allowance_for_credit_losses_amount" NUMERIC(20,4),
    "amortized_cost" NUMERIC(18,2),
    "amount_of_allowance_for_credit_losses" NUMERIC(20,4),
    "bs_amount" NUMERIC(20,4),
    "bankruptcy_charge_off_amount" NUMERIC(18,2),
    "book_value_amount" NUMERIC(18,6),
    "cash_fair_value" NUMERIC(20,4),
    "charge_offs_amount" NUMERIC(20,4),
    "collateral_fair_value" NUMERIC(20,4),
    "collateral_fair_value_amount_at_as_of_date" NUMERIC(20,4),
    "collateral_fair_value_amount_at_origination" NUMERIC(20,4),
    "collateral_fair_value_at_reporting_date" NUMERIC(20,4),
    "collateral_fair_value_at_settlement_date" NUMERIC(20,4),
    "collateral_value_at_inception_date" NUMERIC(20,4),
    "collateral_value_at_reporting_date" NUMERIC(20,4),
    "contract_amount" NUMERIC(18,2),
    "contract_amount_at_inception_date" NUMERIC(20,4),
    "contract_amount_at_maturity_date" NUMERIC(20,4),
    "contract_amount_at_reporting_date" NUMERIC(20,4),
    "counterparty_exposure_value" NUMERIC(20,4),
    "coupon_interest_payment_date" DATE,
    "cumulative_charge_offs" VARCHAR,
    "exposure_at_default_ead" VARCHAR,
    "exposure_type" VARCHAR,
    "exposure_amount" NUMERIC(20,4),
    "fair_value_amount" NUMERIC(18,2),
    "fair_value_measurement_level" VARCHAR,
    "gross_contractual_charge_off_amount" NUMERIC(18,2),
    "indemnification_amount" NUMERIC(18,6),
    "indemnification_flag" BOOLEAN,
    "lendable_value" NUMERIC(20,4),
    "loss_write_down_amount" NUMERIC(20,4),
    "maturity_amount" NUMERIC(20,4),
    "net_recovery_amount" NUMERIC(20,4),
    "original_face_amount" NUMERIC(18,2),
    "other_charge_off_amount" NUMERIC(18,2),
    "paid_amount_at_inception_date" NUMERIC(18,6),
    "payable_amount_at_maturity_date" NUMERIC(18,6),
    "payable_amount_at_reporting_date" NUMERIC(18,6),
    "premium_discount_amount" NUMERIC(20,4),
    "principal_write_down_amount" NUMERIC(18,6),
    "principal_write_down" VARCHAR,
    "receivable_amount_at_maturity_date" NUMERIC(18,6),
    "receivable_amount_at_reporting_date" NUMERIC(18,6),
    "received_amount_at_initiation_date" NUMERIC(18,6),
    "recoveries_amount" NUMERIC(20,4),
    "recovery_ltd" NUMERIC(20,4),
    "recovery_mtd" NUMERIC(18,6),
    "recovery_qtd" NUMERIC(18,6),
    "settlement_date" DATE,
    "transaction_date" DATE,
    "usd_equivalent_amount" NUMERIC(20,4),
    "unfunded_allowance_balance" NUMERIC(18,6),
    "unfunded_committed_exposure" NUMERIC(20,4),
    "unrealized_gain_loss" NUMERIC(20,4),
    "write_down_to_fair_value_amount" NUMERIC(18,2),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- sft_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."sft_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "call_report_code" VARCHAR,
    "conduit_transaction_flag" BOOLEAN,
    "cost_center_id" NUMERIC(20,4),
    "counterparty_type" VARCHAR,
    "customer_id" VARCHAR,
    "gl_account_number" INTEGER,
    "internal_transaction_flag" VARCHAR,
    "legal_entity_id" VARCHAR,
    "primary_monetization_channel" VARCHAR,
    "qmna_netting_id" VARCHAR,
    "source_system_id" VARCHAR,
    "source_system_name" VARCHAR,
    "transaction_type" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- sft_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."sft_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "asset_liability_indicator" VARCHAR,
    "contract_initiation_date" DATE,
    "coupon_interest_periodicity" VARCHAR,
    "currency_code" VARCHAR,
    "effective_maturity_date" DATE,
    "encumbrance_end_date" DATE,
    "forward_start_date" DATE,
    "interest_rate" NUMERIC(18,6),
    "interest_rate_type" VARCHAR,
    "maturity_date" DATE,
    "maturity_date_optionality" DATE,
    "maturity_optionality" VARCHAR,
    "paid_instrument_type" VARCHAR,
    "principal_agent" VARCHAR,
    "principal_agent_indicator" VARCHAR,
    "qmna_flag" BOOLEAN,
    "received_instrument_type" VARCHAR,
    "report_applicability" VARCHAR,
    "reporting_currency" VARCHAR,
    "repricing_date_interest_reset_date" DATE,
    "right_to_offset_flag" VARCHAR,
    "sft_contract_id" VARCHAR,
    "sft_type" VARCHAR,
    "settlement_currency" VARCHAR,
    "transaction_currency" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- sft_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."sft_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "charge_off_due_to_bankruptcy_flag" VARCHAR,
    "converted" VARCHAR,
    "encumbered_flag" BOOLEAN,
    "encumbrance_flag" VARCHAR,
    "encumbrance_type" VARCHAR,
    "expected_loss_given_default_elgd" NUMERIC(18,6),
    "liquid_assets_collateral_level" VARCHAR,
    "loss_given_default_lgd" NUMERIC(18,6),
    "maximum_probability_of_default" NUMERIC(18,6),
    "minimum_probability_of_default" NUMERIC(18,6),
    "non_accrual_status" BOOLEAN,
    "other_charge_off_amount_explanation" VARCHAR,
    "pledged_flag" BOOLEAN,
    "probability_of_default_pd" NUMERIC(18,6),
    "rehypothecated" VARCHAR,
    "rehypothecated_flag" VARCHAR,
    "secured_flag" VARCHAR,
    "security_ownership_type" VARCHAR,
    "treasury_control" VARCHAR,
    "treasury_control_flag" BOOLEAN,
    "two_year_probability_of_default" NUMERIC(18,6),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- stock_accounting_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."stock_accounting_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "accounting_method" VARCHAR,
    "bs_amount" NUMERIC(20,4),
    "carrying_value" NUMERIC(18,6),
    "fair_value_amount" NUMERIC(18,2),
    "investment_type" VARCHAR,
    "market_value" NUMERIC(18,2),
    "number_of_units" VARCHAR,
    "number_of_shares" NUMERIC(18,2),
    "unrealized_gain_loss" NUMERIC(20,4),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- stock_classification_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."stock_classification_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "call_report_code" VARCHAR,
    "cost_center_id" NUMERIC(20,4),
    "customer_id" VARCHAR,
    "internal_transaction_flag" VARCHAR,
    "investee_industry_type" VARCHAR,
    "legal_entity_id" VARCHAR,
    "percentage_ownership_of_voting_stock" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- stock_indicative_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."stock_indicative_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "currency_code" VARCHAR,
    "maturity_date" DATE,
    "stock_position_id" VARCHAR,
    "stock_type" VARCHAR,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- stock_risk_snapshot (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."stock_risk_snapshot" (
    "position_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "treasury_control_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("position_id", "as_of_date")
);

-- stress_test_breach (Uncategorized)
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
    "updated_ts" TIMESTAMP,
    "created_ts" TIMESTAMP,
    "created_by" VARCHAR(100),
    "record_source" VARCHAR(100),
    "load_timestamp" TIMESTAMP,
    "currency_code" VARCHAR(20),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("breach_id")
);

-- watchlist_entry (Uncategorized)
CREATE TABLE IF NOT EXISTS "l2"."watchlist_entry" (
    "watchlist_entry_id" BIGINT NOT NULL,
    "counterparty_id" BIGINT,
    "facility_id" BIGINT,
    "watchlist_category_code" VARCHAR(20),
    "entry_date" DATE,
    "exit_date" DATE,
    "entry_reason" VARCHAR(500),
    "exit_reason" VARCHAR(500),
    "assigned_officer" VARCHAR(500),
    "review_frequency" VARCHAR(500),
    "next_review_date" DATE,
    "as_of_date" DATE,
    "is_current_flag" BOOLEAN,
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    "record_source" VARCHAR(100),
    "created_by" VARCHAR(100),
    "load_batch_id" VARCHAR(100),
    "source_system_id" BIGINT,
    "raw_record_id" VARCHAR(200),
    PRIMARY KEY ("watchlist_entry_id")
);

-- Foreign Key Constraints (L2)

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
  ALTER TABLE "l2"."borrowings_accounting_snapshot"
    ADD CONSTRAINT "fk_borrowings_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."borrowings_classification_snapshot"
    ADD CONSTRAINT "fk_borrowings_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."borrowings_indicative_snapshot"
    ADD CONSTRAINT "fk_borrowings_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."borrowings_risk_snapshot"
    ADD CONSTRAINT "fk_borrowings_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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
  ALTER TABLE "l2"."debt_accounting_snapshot"
    ADD CONSTRAINT "fk_debt_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."debt_classification_snapshot"
    ADD CONSTRAINT "fk_debt_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."debt_indicative_snapshot"
    ADD CONSTRAINT "fk_debt_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."debt_risk_snapshot"
    ADD CONSTRAINT "fk_debt_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deposits_accounting_snapshot"
    ADD CONSTRAINT "fk_deposits_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deposits_classification_snapshot"
    ADD CONSTRAINT "fk_deposits_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deposits_indicative_snapshot"
    ADD CONSTRAINT "fk_deposits_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."deposits_risk_snapshot"
    ADD CONSTRAINT "fk_deposits_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."derivatives_accounting_snapshot"
    ADD CONSTRAINT "fk_derivatives_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."derivatives_classification_snapshot"
    ADD CONSTRAINT "fk_derivatives_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."derivatives_indicative_snapshot"
    ADD CONSTRAINT "fk_derivatives_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."derivatives_risk_snapshot"
    ADD CONSTRAINT "fk_derivatives_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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
  ALTER TABLE "l2"."equities_accounting_snapshot"
    ADD CONSTRAINT "fk_equities_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."equities_classification_snapshot"
    ADD CONSTRAINT "fk_equities_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."equities_indicative_snapshot"
    ADD CONSTRAINT "fk_equities_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."equities_risk_snapshot"
    ADD CONSTRAINT "fk_equities_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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
    ADD CONSTRAINT "fk_facility_master_facility_type_id"
    FOREIGN KEY ("facility_type_id")
    REFERENCES "l1"."facility_type_dim" ("facility_type_id");
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
  ALTER TABLE "l2"."loans_accounting_snapshot"
    ADD CONSTRAINT "fk_loans_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."loans_classification_snapshot"
    ADD CONSTRAINT "fk_loans_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."loans_indicative_snapshot"
    ADD CONSTRAINT "fk_loans_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."loans_risk_snapshot"
    ADD CONSTRAINT "fk_loans_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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
  ALTER TABLE "l2"."offbs_commitments_accounting_snapshot"
    ADD CONSTRAINT "fk_offbs_commitments_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."offbs_commitments_classification_snapshot"
    ADD CONSTRAINT "fk_offbs_commitments_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."offbs_commitments_indicative_snapshot"
    ADD CONSTRAINT "fk_offbs_commitments_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."offbs_commitments_risk_snapshot"
    ADD CONSTRAINT "fk_offbs_commitments_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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
  ALTER TABLE "l2"."position"
    ADD CONSTRAINT "fk_position_product_subtype_id"
    FOREIGN KEY ("product_subtype_id")
    REFERENCES "l1"."product_subtype_dim" ("product_subtype_id");
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
  ALTER TABLE "l2"."securities_accounting_snapshot"
    ADD CONSTRAINT "fk_securities_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."securities_classification_snapshot"
    ADD CONSTRAINT "fk_securities_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."securities_indicative_snapshot"
    ADD CONSTRAINT "fk_securities_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."securities_risk_snapshot"
    ADD CONSTRAINT "fk_securities_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."sft_accounting_snapshot"
    ADD CONSTRAINT "fk_sft_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."sft_classification_snapshot"
    ADD CONSTRAINT "fk_sft_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."sft_indicative_snapshot"
    ADD CONSTRAINT "fk_sft_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."sft_risk_snapshot"
    ADD CONSTRAINT "fk_sft_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stock_accounting_snapshot"
    ADD CONSTRAINT "fk_stock_accounting_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stock_classification_snapshot"
    ADD CONSTRAINT "fk_stock_classification_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stock_indicative_snapshot"
    ADD CONSTRAINT "fk_stock_indicative_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "l2"."stock_risk_snapshot"
    ADD CONSTRAINT "fk_stock_risk_snapshot_position_id"
    FOREIGN KEY ("position_id")
    REFERENCES "l2"."position" ("position_id");
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

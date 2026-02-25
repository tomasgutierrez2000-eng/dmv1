-- L1 Schema DDL (generated from scripts/l1/generate.ts)
-- Run in dependency order. PostgreSQL 15+.

CREATE SCHEMA IF NOT EXISTS l1;

CREATE TABLE IF NOT EXISTS l1.currency_dim (
  currency_code VARCHAR(20) NOT NULL PRIMARY KEY,
  currency_name VARCHAR(200),
  currency_symbol VARCHAR(100),
  is_active VARCHAR(100),
  iso_numeric VARCHAR(100),
  minor_unit_decimals INTEGER,
  is_g10_currency VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS l1.country_dim (
  country_code VARCHAR(20) NOT NULL PRIMARY KEY,
  country_name VARCHAR(200),
  is_active VARCHAR(100),
  region_code VARCHAR(20),
  basel_country_risk_weight VARCHAR(255),
  is_developed_market VARCHAR(100),
  is_fatf_high_risk VARCHAR(100),
  is_ofac_sanctioned VARCHAR(100),
  iso_alpha_3 VARCHAR(100),
  iso_numeric VARCHAR(100),
  jurisdiction_id BIGINT
);

CREATE TABLE IF NOT EXISTS l1.region_dim (
  region_code VARCHAR(20) NOT NULL PRIMARY KEY,
  region_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  display_order VARCHAR(100),
  is_active_flag CHAR(1),
  region_group_code VARCHAR(20),
  source_system_id BIGINT
);

CREATE TABLE IF NOT EXISTS l1.regulatory_jurisdiction (
  jurisdiction_code VARCHAR(20) NOT NULL PRIMARY KEY,
  jurisdiction_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  is_active VARCHAR(100),
  jurisdiction_id BIGINT,
  primary_regulator VARCHAR(100),
  regulatory_framework VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS l1.entity_type_dim (
  entity_type_code VARCHAR(20) NOT NULL PRIMARY KEY,
  entity_type_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  is_financial_institution VARCHAR(255),
  is_sovereign VARCHAR(100),
  regulatory_counterparty_class VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS l1.credit_event_type_dim (
  credit_event_type_code BIGINT NOT NULL PRIMARY KEY,
  credit_event_type_id BIGINT NOT NULL,
  credit_event_type_name VARCHAR(200),
  default_trigger_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N'))
);

CREATE TABLE IF NOT EXISTS l1.credit_status_dim (
  credit_status_code BIGINT NOT NULL PRIMARY KEY,
  credit_status_name VARCHAR(200),
  default_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  delinquency_bucket VARCHAR(100),
  status_category VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS l1.exposure_type_dim (
  exposure_type_id BIGINT NOT NULL PRIMARY KEY,
  exposure_type_code VARCHAR(20),
  exposure_type_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  basel_exposure_class VARCHAR(100),
  ccf_pct DECIMAL(10,4),
  off_balance_sheet_flag CHAR(1),
  product_id BIGINT,
  sa_ccr_asset_class VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS l1.amendment_status_dim (
  amendment_status_code VARCHAR(20) NOT NULL PRIMARY KEY,
  amendment_status_name VARCHAR(200),
  status_group VARCHAR(100),
  is_terminal_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.amendment_type_dim (
  amendment_type_code VARCHAR(20) NOT NULL PRIMARY KEY,
  amendment_type_name VARCHAR(200),
  description VARCHAR(2000),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.default_definition_dim (
  default_definition_id BIGINT NOT NULL PRIMARY KEY,
  default_definition_code VARCHAR(20),
  description VARCHAR(2000),
  jurisdiction_code VARCHAR(20),
  days_past_due_threshold VARCHAR(255),
  credit_event_trigger_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  materiality_threshold_amt DECIMAL(18,2)
);

CREATE TABLE IF NOT EXISTS l1.maturity_bucket_dim (
  maturity_bucket_id BIGINT NOT NULL PRIMARY KEY,
  bucket_code VARCHAR(20),
  bucket_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  bucket_end_days VARCHAR(100),
  bucket_start_days VARCHAR(100),
  jurisdiction_code VARCHAR(20),
  regulatory_framework VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS l1.fr2590_category_dim (
  fr2590_category_code BIGINT NOT NULL PRIMARY KEY,
  category_name VARCHAR(200),
  definition VARCHAR(100),
  display_order VARCHAR(100),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.counterparty_role_dim (
  counterparty_role_code VARCHAR(20) NOT NULL PRIMARY KEY,
  role_name VARCHAR(200),
  role_category VARCHAR(50) NOT NULL,
  is_risk_bearing_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  description VARCHAR(2000),
  is_active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rating_scale_dim (
  rating_scale_id BIGINT NOT NULL PRIMARY KEY,
  scale_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  default_flag CHAR(1),
  display_color_hex VARCHAR(100),
  investment_grade_flag CHAR(1),
  pd_implied VARCHAR(100),
  rating_grade_id BIGINT,
  rating_notch VARCHAR(100),
  rating_value DECIMAL(18,4),
  scale_type VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS l1.crm_type_dim (
  crm_type_code VARCHAR(20) NOT NULL PRIMARY KEY,
  crm_type_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  basel_recognition_method VARCHAR(255),
  crm_category VARCHAR(50),
  eligible_flag CHAR(1),
  risk_mitigant_subtype_code VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS l1.source_system_registry (
  source_system_id BIGINT NOT NULL PRIMARY KEY,
  source_system_name VARCHAR(200),
  data_domain VARCHAR(100),
  ingestion_frequency VARCHAR(30),
  system_owner VARCHAR(100),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.date_dim (
  date_id BIGINT NOT NULL PRIMARY KEY,
  calendar_date DATE,
  calendar_year VARCHAR(100),
  calendar_quarter VARCHAR(100),
  calendar_month VARCHAR(100),
  day_of_month VARCHAR(100),
  day_of_week VARCHAR(100),
  day_name VARCHAR(200),
  fiscal_year VARCHAR(100),
  fiscal_quarter VARCHAR(100),
  fiscal_month VARCHAR(100),
  is_weekend VARCHAR(100),
  is_month_end VARCHAR(100),
  is_quarter_end VARCHAR(100),
  is_year_end VARCHAR(100),
  is_us_business_day VARCHAR(100),
  is_us_bank_holiday VARCHAR(100),
  date_day VARCHAR(100),
  date_month VARCHAR(100),
  date_quarter VARCHAR(100),
  date_year VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS l1.date_time_dim (
  date_time_id BIGINT NOT NULL PRIMARY KEY,
  date_id BIGINT NOT NULL,
  timestamp_utc TIMESTAMP,
  hour_of_day VARCHAR(100),
  minute_of_hour VARCHAR(100),
  second_of_minute VARCHAR(100),
  timezone_code VARCHAR(20),
  is_dst VARCHAR(100)
,
  CONSTRAINT fk_date_time_dim_date_id FOREIGN KEY (date_id) REFERENCES l1.date_dim(date_id)
);

CREATE TABLE IF NOT EXISTS l1.regulatory_capital_basis_dim (
  regulatory_capital_basis_id BIGINT NOT NULL PRIMARY KEY,
  basis_code VARCHAR(20),
  basis_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  description VARCHAR(2000),
  effective_from_date DATE,
  effective_to_date DATE,
  jurisdiction_code VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS l1.industry_dim (
  industry_id BIGINT NOT NULL PRIMARY KEY,
  industry_code VARCHAR(20),
  industry_name VARCHAR(200),
  industry_level VARCHAR(100),
  industry_standard VARCHAR(100),
  parent_industry_id BIGINT NOT NULL,
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_industry_dim_parent_industry_id FOREIGN KEY (parent_industry_id) REFERENCES l1.industry_dim(industry_id)
);

CREATE TABLE IF NOT EXISTS l1.enterprise_business_taxonomy (
  managed_segment_id BIGINT NOT NULL PRIMARY KEY,
  segment_code VARCHAR(50),
  segment_name VARCHAR(200),
  parent_segment_id BIGINT,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  change_event VARCHAR(100),
  comments VARCHAR(2000),
  create_update_date DATE,
  description VARCHAR(2000),
  effective_date DATE,
  long_description VARCHAR(2000),
  parent VARCHAR(100),
  parent_leaf CHAR(1),
  requestor VARCHAR(100),
  status VARCHAR(30),
  substatus DECIMAL(10,4),
  substatus_effective_to_date DATE,
  tree_level INTEGER,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.enterprise_product_taxonomy (
  product_node_id BIGINT NOT NULL PRIMARY KEY,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  parent_node_id BIGINT,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  change_event VARCHAR(100),
  comments VARCHAR(2000),
  create_update_date DATE,
  description VARCHAR(2000),
  effective_date DATE,
  fr2590_category_code VARCHAR(20),
  long_description VARCHAR(2000),
  parent VARCHAR(100),
  parent_leaf CHAR(1),
  requestor VARCHAR(100),
  status VARCHAR(30),
  substatus DECIMAL(10,4),
  substatus_effective_to_date DATE,
  tree_level INTEGER,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.portfolio_dim (
  portfolio_id BIGINT NOT NULL PRIMARY KEY,
  portfolio_code VARCHAR(50),
  portfolio_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  lob_segment_id BIGINT,
  parent_portfolio_id BIGINT,
  portfolio_type VARCHAR(50),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.org_unit_dim (
  org_unit_id BIGINT NOT NULL PRIMARY KEY,
  org_unit_code VARCHAR(50),
  org_unit_name VARCHAR(200),
  parent_org_unit_id BIGINT,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  cost_center_code VARCHAR(20),
  effective_from_date DATE,
  effective_to_date DATE,
  is_current VARCHAR(100),
  lob_segment_id BIGINT,
  manager_user_id BIGINT,
  org_unit_type VARCHAR(50),
  source_system_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rating_source (
  rating_source_id BIGINT NOT NULL PRIMARY KEY,
  source_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  priority_rank VARCHAR(100),
  rating_source_name VARCHAR(200),
  rating_source_type VARCHAR(50),
  vendor_code VARCHAR(20),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rating_grade_dim (
  rating_grade_id BIGINT NOT NULL PRIMARY KEY,
  rating_scale_id BIGINT NOT NULL,
  grade_code VARCHAR(20),
  grade_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  default_flag CHAR(1),
  effective_from_date DATE,
  effective_to_date DATE,
  is_current VARCHAR(100),
  lgd_downturn VARCHAR(100),
  pd_12m VARCHAR(100),
  rating_grade_code BIGINT,
  rating_grade_name VARCHAR(200),
  rating_notch VARCHAR(100),
  rating_scale_code VARCHAR(20),
  source_system_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_rating_grade_dim_rating_scale_id FOREIGN KEY (rating_scale_id) REFERENCES l1.rating_scale_dim(rating_scale_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_type (
  collateral_type_id BIGINT NOT NULL PRIMARY KEY,
  name VARCHAR(200),
  collateral_category VARCHAR(50) NOT NULL,
  description VARCHAR(2000),
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  basel_rwa_weight VARCHAR(100),
  hqla_level VARCHAR(100),
  is_eligible_crm VARCHAR(100),
  is_financial_collateral VARCHAR(255),
  minimum_holding_period_days VARCHAR(255),
  risk_mitigant_subtype_code VARCHAR(20),
  standard_haircut_pct DECIMAL(10,4),
  volatility_adjustment_pct DECIMAL(10,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.interest_rate_index_dim (
  rate_index_id BIGINT NOT NULL PRIMARY KEY,
  index_code VARCHAR(50),
  index_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  cessation_date DATE,
  compounding_method VARCHAR(100),
  currency_code VARCHAR(20),
  day_count_convention VARCHAR(100),
  fallback_spread_bps DECIMAL(8,2),
  fallback_to_index_id BIGINT,
  index_family VARCHAR(100),
  is_bmu_compliant CHAR(1),
  is_fallback_rate CHAR(1),
  publication_source VARCHAR(100),
  tenor_code VARCHAR(20),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.ledger_account_dim (
  ledger_account_id BIGINT NOT NULL PRIMARY KEY,
  account_code VARCHAR(50),
  account_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  account_category VARCHAR(50),
  account_type VARCHAR(50),
  active_flag CHAR(1),
  currency_code VARCHAR(20),
  effective_from_date DATE,
  effective_to_date DATE,
  is_reconciliation_account CHAR(1),
  legal_entity_id BIGINT,
  lob_segment_id BIGINT,
  parent_account_id BIGINT,
  regulatory_report_code VARCHAR(20),
  source_system_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.internal_risk_rating_bucket_dim (
  internal_risk_rating_bucket_code VARCHAR(20) NOT NULL PRIMARY KEY,
  internal_risk_rating_bucket_name VARCHAR(200),
  rating_range_low INTEGER,
  rating_range_high INTEGER,
  description VARCHAR(2000),
  display_order INTEGER,
  is_active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: Internal Risk Rating Buckets
-- CRITICAL: 15-16
-- HIGH: 10-14
-- MODERATE: 5-9
-- NON_HIGH_RISK: all others (1-4)

CREATE TABLE IF NOT EXISTS l1.pricing_tier_dim (
  pricing_tier_code VARCHAR(20) NOT NULL PRIMARY KEY,
  pricing_tier_name VARCHAR(200),
  tier_rank INTEGER,
  description VARCHAR(2000),
  is_active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.context_dim (
  context_id BIGINT NOT NULL PRIMARY KEY,
  context_domain VARCHAR(100),
  context_code VARCHAR(20),
  context_name VARCHAR(200),
  description VARCHAR(2000),
  is_active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.metric_definition_dim (
  metric_definition_id BIGINT NOT NULL PRIMARY KEY,
  metric_code VARCHAR(50),
  metric_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  calculation_rule_id BIGINT,
  definition_text VARCHAR(100),
  effective_from_date DATE,
  effective_to_date DATE,
  is_active_flag CHAR(1),
  metric_domain VARCHAR(100),
  periodicity_code VARCHAR(20),
  source_system_id BIGINT,
  unit_of_measure VARCHAR(100),
  version VARCHAR(100),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.counterparty (
  counterparty_id BIGINT NOT NULL PRIMARY KEY,
  legal_name VARCHAR(200),
  counterparty_type VARCHAR(50) NOT NULL,
  country_code VARCHAR(20) NOT NULL,
  entity_type_code VARCHAR(20) NOT NULL,
  industry_id BIGINT NOT NULL,
  basel_asset_class VARCHAR(50),
  basel_risk_grade VARCHAR(100),
  call_report_counterparty_type VARCHAR(50),
  country_of_domicile INTEGER,
  country_of_incorporation DECIMAL(10,4),
  country_of_risk INTEGER,
  external_rating_fitch VARCHAR(255),
  external_rating_moodys VARCHAR(255),
  external_rating_sp VARCHAR(100),
  fr2590_counterparty_type VARCHAR(50),
  internal_risk_rating VARCHAR(100),
  is_affiliated VARCHAR(100),
  is_central_counterparty VARCHAR(255),
  is_financial_institution VARCHAR(255),
  is_insider VARCHAR(100),
  is_multilateral_dev_bank VARCHAR(255),
  is_parent_flag CHAR(1),
  is_public_sector_entity VARCHAR(255),
  is_regulated_entity VARCHAR(100),
  is_sovereign VARCHAR(100),
  lei_code VARCHAR(20),
  lgd_unsecured VARCHAR(100),
  pd_annual VARCHAR(100),
  regulatory_counterparty_type VARCHAR(50),
  updated_ts TIMESTAMP,
  y14_obligor_type VARCHAR(50),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_counterparty_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_counterparty_entity_type_code FOREIGN KEY (entity_type_code) REFERENCES l1.entity_type_dim(entity_type_code),
  CONSTRAINT fk_counterparty_industry_id FOREIGN KEY (industry_id) REFERENCES l1.industry_dim(industry_id)
);

CREATE TABLE IF NOT EXISTS l1.legal_entity (
  legal_entity_id BIGINT NOT NULL PRIMARY KEY,
  legal_name VARCHAR(200),
  legal_entity_name VARCHAR(200),
  country_code VARCHAR(20) NOT NULL,
  active_flag CHAR(1),
  entity_type_code VARCHAR(20),
  functional_currency_code VARCHAR(20),
  institution_id BIGINT,
  is_reporting_entity VARCHAR(100),
  lei_code VARCHAR(20),
  primary_regulator VARCHAR(100),
  rssd_id BIGINT,
  short_name VARCHAR(200),
  tax_id BIGINT,
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_legal_entity_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code)
);

CREATE TABLE IF NOT EXISTS l1.instrument_master (
  instrument_id BIGINT NOT NULL PRIMARY KEY,
  country_code VARCHAR(20) NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  coupon_frequency VARCHAR(30),
  coupon_rate DECIMAL(10,4),
  instrument_name VARCHAR(200),
  instrument_type VARCHAR(50),
  is_callable VARCHAR(100),
  is_convertible VARCHAR(100),
  issue_date DATE,
  issuer_counterparty_id BIGINT,
  maturity_date DATE,
  product_id BIGINT,
  seniority VARCHAR(100),
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_instrument_master_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_instrument_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l1.instrument_identifier (
  instrument_id BIGINT NOT NULL,
  id_type VARCHAR(20) NOT NULL,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  id_value VARCHAR(100),
  source_system_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_primary VARCHAR(100),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (instrument_id, id_type, effective_start_date)
,
  CONSTRAINT fk_instrument_identifier_instrument_id FOREIGN KEY (instrument_id) REFERENCES l1.instrument_master(instrument_id),
  CONSTRAINT fk_instrument_identifier_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.credit_agreement_master (
  credit_agreement_id BIGINT NOT NULL PRIMARY KEY,
  borrower_counterparty_id BIGINT NOT NULL,
  lender_legal_entity_id BIGINT NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  agreement_type VARCHAR(50) NOT NULL,
  origination_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  status_code VARCHAR(20),
  agreement_reference VARCHAR(100),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_credit_agreement_master_borrower_counterparty_id FOREIGN KEY (borrower_counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_credit_agreement_master_lender_legal_entity_id FOREIGN KEY (lender_legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id),
  CONSTRAINT fk_credit_agreement_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l1.facility_master (
  facility_id BIGINT NOT NULL PRIMARY KEY,
  credit_agreement_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  facility_name VARCHAR(200),
  facility_type VARCHAR(50) NOT NULL,
  facility_status VARCHAR(30) NOT NULL,
  committed_facility_amt DECIMAL(18,2),
  origination_date DATE NOT NULL,
  maturity_date DATE,
  portfolio_id BIGINT NOT NULL,
  industry_code VARCHAR(20),
  lob_segment_id BIGINT NOT NULL,
  product_node_id BIGINT NOT NULL,
  rate_index_id BIGINT NOT NULL,
  ledger_account_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  all_in_rate_pct DECIMAL(10,4),
  amortization_type VARCHAR(50),
  created_by VARCHAR(100),
  day_count_convention INTEGER,
  facility_reference VARCHAR(100),
  interest_rate_reference DECIMAL(8,6),
  interest_rate_spread_bps DECIMAL(8,2),
  interest_rate_type DECIMAL(8,6),
  next_repricing_date DATE,
  payment_frequency VARCHAR(30),
  prepayment_penalty_flag CHAR(1),
  product_id BIGINT,
  rate_cap_pct DECIMAL(10,4),
  rate_floor_pct DECIMAL(10,4),
  region_code VARCHAR(20),
  revolving_flag CHAR(1),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_facility_master_credit_agreement_id FOREIGN KEY (credit_agreement_id) REFERENCES l1.credit_agreement_master(credit_agreement_id),
  CONSTRAINT fk_facility_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_facility_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_facility_master_portfolio_id FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim(portfolio_id),
  CONSTRAINT fk_facility_master_lob_segment_id FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy(managed_segment_id),
  CONSTRAINT fk_facility_master_product_node_id FOREIGN KEY (product_node_id) REFERENCES l1.enterprise_product_taxonomy(product_node_id),
  CONSTRAINT fk_facility_master_rate_index_id FOREIGN KEY (rate_index_id) REFERENCES l1.interest_rate_index_dim(rate_index_id),
  CONSTRAINT fk_facility_master_ledger_account_id FOREIGN KEY (ledger_account_id) REFERENCES l1.ledger_account_dim(ledger_account_id)
);

CREATE TABLE IF NOT EXISTS l1.contract_master (
  contract_id BIGINT NOT NULL PRIMARY KEY,
  contract_type VARCHAR(50) NOT NULL,
  contract_status VARCHAR(30) NOT NULL,
  effective_start_date DATE NOT NULL,
  contract_end_date DATE,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  counterparty_id BIGINT,
  facility_id BIGINT,
  instrument_id BIGINT,
  legal_entity_id BIGINT,
  netting_set_id BIGINT,
  product_node_id BIGINT,
  source_record_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.netting_agreement (
  netting_agreement_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  governing_law VARCHAR(100),
  is_bankruptcy_remote VARCHAR(100),
  is_enforceable VARCHAR(100),
  legal_entity_id BIGINT,
  margin_frequency VARCHAR(30),
  minimum_transfer_amount DECIMAL(18,2),
  netting_agreement_type VARCHAR(50),
  netting_set_id BIGINT,
  source_system_id BIGINT,
  threshold_amount DECIMAL(18,2),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_netting_agreement_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.netting_set (
  netting_set_id BIGINT NOT NULL PRIMARY KEY,
  netting_agreement_id BIGINT NOT NULL,
  active_flag CHAR(1),
  counterparty_id BIGINT,
  governing_law VARCHAR(100),
  is_enforceable_flag CHAR(1),
  legal_entity_id BIGINT,
  master_agreement_reference VARCHAR(255),
  netting_set_type VARCHAR(50),
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_netting_set_netting_agreement_id FOREIGN KEY (netting_agreement_id) REFERENCES l1.netting_agreement(netting_agreement_id)
);

CREATE TABLE IF NOT EXISTS l1.netting_set_link (
  netting_set_link_id BIGINT NOT NULL PRIMARY KEY,
  netting_set_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  anchor_id BIGINT,
  anchor_type VARCHAR(50),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_netting_set_link_netting_set_id FOREIGN KEY (netting_set_id) REFERENCES l1.netting_set(netting_set_id),
  CONSTRAINT fk_netting_set_link_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l1.csa_master (
  csa_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  csa_type VARCHAR(50),
  currency_code VARCHAR(20),
  eligible_collateral_desc VARCHAR(255),
  governing_law VARCHAR(100),
  independent_amount DECIMAL(18,2),
  margin_frequency VARCHAR(30),
  minimum_transfer_amount DECIMAL(18,2),
  netting_set_id BIGINT,
  threshold_amount DECIMAL(18,2),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_csa_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.margin_agreement (
  margin_agreement_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE,
  csa_id BIGINT,
  currency_code VARCHAR(20),
  im_amount DECIMAL(18,2),
  loaded_ts TIMESTAMP,
  margin_model VARCHAR(100),
  netting_set_id BIGINT,
  source_system_id BIGINT,
  vm_amount DECIMAL(18,2),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_margin_agreement_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_asset_master (
  collateral_asset_id BIGINT NOT NULL PRIMARY KEY,
  collateral_type_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  country_code VARCHAR(20) NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  legal_entity_id BIGINT NOT NULL,
  charge_type VARCHAR(50),
  collateral_asset_type VARCHAR(50),
  collateral_id BIGINT,
  collateral_status VARCHAR(30),
  description VARCHAR(2000),
  insurance_expiry_date DATE,
  insurance_flag CHAR(1),
  lien_priority VARCHAR(100),
  location_country_code VARCHAR(20),
  location_description VARCHAR(2000),
  maturity_date DATE,
  original_cost VARCHAR(100),
  regulatory_eligible_flag CHAR(1),
  revaluation_frequency VARCHAR(255),
  source_record_id BIGINT,
  updated_ts TIMESTAMP,
  valuation_currency_code VARCHAR(20),
  vintage_date DATE,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_collateral_asset_master_collateral_type_id FOREIGN KEY (collateral_type_id) REFERENCES l1.collateral_type(collateral_type_id),
  CONSTRAINT fk_collateral_asset_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_collateral_asset_master_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_collateral_asset_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_collateral_asset_master_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_link (
  collateral_link_id BIGINT NOT NULL PRIMARY KEY,
  collateral_asset_id BIGINT NOT NULL,
  anchor_id BIGINT NOT NULL,
  anchor_type VARCHAR(50) NOT NULL,
  source_system_id BIGINT NOT NULL,
  link_type_code VARCHAR(20),
  pledged_amount DECIMAL(18,2),
  pledged_currency_code VARCHAR(20),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_collateral_link_collateral_asset_id FOREIGN KEY (collateral_asset_id) REFERENCES l1.collateral_asset_master(collateral_asset_id),
  CONSTRAINT fk_collateral_link_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_eligibility_dim (
  collateral_eligibility_id BIGINT NOT NULL PRIMARY KEY,
  collateral_type_id BIGINT NOT NULL,
  effective_from_date DATE NOT NULL,
  effective_to_date DATE,
  eligible_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  jurisdiction_code VARCHAR(20) NOT NULL,
  regulatory_capital_basis_id BIGINT NOT NULL,
  haircut_method VARCHAR(100),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_collateral_eligibility_dim_collateral_type_id FOREIGN KEY (collateral_type_id) REFERENCES l1.collateral_type(collateral_type_id),
  CONSTRAINT fk_collateral_eligibility_dim_jurisdiction_code FOREIGN KEY (jurisdiction_code) REFERENCES l1.regulatory_jurisdiction(jurisdiction_code),
  CONSTRAINT fk_collateral_eligibility_dim_regulatory_capital_basis_id FOREIGN KEY (regulatory_capital_basis_id) REFERENCES l1.regulatory_capital_basis_dim(regulatory_capital_basis_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_haircut_dim (
  collateral_haircut_id BIGINT NOT NULL PRIMARY KEY,
  collateral_type_id BIGINT NOT NULL,
  effective_from_date DATE NOT NULL,
  effective_to_date DATE,
  haircut_pct DECIMAL(10,4),
  jurisdiction_code VARCHAR(20) NOT NULL,
  maturity_bucket_id BIGINT NOT NULL,
  regulatory_capital_basis_id BIGINT NOT NULL,
  volatility_adjustment_pct DECIMAL(10,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_collateral_haircut_dim_collateral_type_id FOREIGN KEY (collateral_type_id) REFERENCES l1.collateral_type(collateral_type_id),
  CONSTRAINT fk_collateral_haircut_dim_jurisdiction_code FOREIGN KEY (jurisdiction_code) REFERENCES l1.regulatory_jurisdiction(jurisdiction_code),
  CONSTRAINT fk_collateral_haircut_dim_maturity_bucket_id FOREIGN KEY (maturity_bucket_id) REFERENCES l1.maturity_bucket_dim(maturity_bucket_id),
  CONSTRAINT fk_collateral_haircut_dim_regulatory_capital_basis_id FOREIGN KEY (regulatory_capital_basis_id) REFERENCES l1.regulatory_capital_basis_dim(regulatory_capital_basis_id)
);

CREATE TABLE IF NOT EXISTS l1.crm_eligibility_dim (
  crm_eligibility_id BIGINT NOT NULL PRIMARY KEY,
  crm_type_code VARCHAR(20) NOT NULL,
  effective_from_date DATE NOT NULL,
  effective_to_date DATE,
  eligible_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  jurisdiction_code VARCHAR(20) NOT NULL,
  regulatory_capital_basis_id BIGINT NOT NULL,
  source_system_id BIGINT NOT NULL,
  eligibility_conditions VARCHAR(255),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_crm_eligibility_dim_crm_type_code FOREIGN KEY (crm_type_code) REFERENCES l1.crm_type_dim(crm_type_code),
  CONSTRAINT fk_crm_eligibility_dim_jurisdiction_code FOREIGN KEY (jurisdiction_code) REFERENCES l1.regulatory_jurisdiction(jurisdiction_code),
  CONSTRAINT fk_crm_eligibility_dim_regulatory_capital_basis_id FOREIGN KEY (regulatory_capital_basis_id) REFERENCES l1.regulatory_capital_basis_dim(regulatory_capital_basis_id),
  CONSTRAINT fk_crm_eligibility_dim_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.crm_protection_master (
  protection_id BIGINT NOT NULL PRIMARY KEY,
  crm_type_code VARCHAR(20) NOT NULL,
  beneficiary_legal_entity_id BIGINT NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  notional_amount DECIMAL(18,2),
  maturity_date DATE NOT NULL,
  enforceable_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  coverage_pct DECIMAL(10,4),
  governing_law_jurisdiction_id BIGINT,
  protection_provider_counterparty_id BIGINT,
  protection_reference VARCHAR(100),
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_crm_protection_master_crm_type_code FOREIGN KEY (crm_type_code) REFERENCES l1.crm_type_dim(crm_type_code),
  CONSTRAINT fk_crm_protection_master_beneficiary_legal_entity_id FOREIGN KEY (beneficiary_legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id),
  CONSTRAINT fk_crm_protection_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l1.protection_link (
  protection_link_id BIGINT NOT NULL PRIMARY KEY,
  protection_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  allocated_amount DECIMAL(18,2),
  allocated_currency_code VARCHAR(20),
  allocation_pct DECIMAL(10,4),
  anchor_id BIGINT,
  anchor_type VARCHAR(50),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_protection_link_protection_id FOREIGN KEY (protection_id) REFERENCES l1.crm_protection_master(protection_id),
  CONSTRAINT fk_protection_link_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l1.risk_mitigant_type_dim (
  risk_mitigant_subtype_code VARCHAR(20) NOT NULL PRIMARY KEY,
  subtype_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  display_order VARCHAR(100),
  eligible_flag CHAR(1),
  mitigant_category VARCHAR(50),
  parent_group_code VARCHAR(20),
  parent_group_name VARCHAR(200),
  source_system_id BIGINT
);

CREATE TABLE IF NOT EXISTS l1.risk_mitigant_master (
  risk_mitigant_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  risk_mitigant_subtype_code VARCHAR(20) NOT NULL,
  collateral_asset_id BIGINT,
  description VARCHAR(2000),
  effective_from_date DATE,
  effective_to_date DATE,
  is_active_flag CHAR(1),
  mitigant_source_type VARCHAR(50),
  protection_id BIGINT,
  provider_counterparty_id BIGINT,
  source_record_id BIGINT,
  source_system_id BIGINT,
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_risk_mitigant_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_risk_mitigant_master_risk_mitigant_subtype_code FOREIGN KEY (risk_mitigant_subtype_code) REFERENCES l1.risk_mitigant_type_dim(risk_mitigant_subtype_code)
);

CREATE TABLE IF NOT EXISTS l1.risk_mitigant_link (
  risk_mitigant_link_id BIGINT NOT NULL PRIMARY KEY,
  risk_mitigant_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  anchor_id BIGINT,
  anchor_type VARCHAR(50),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_risk_mitigant_link_risk_mitigant_id FOREIGN KEY (risk_mitigant_id) REFERENCES l1.risk_mitigant_master(risk_mitigant_id),
  CONSTRAINT fk_risk_mitigant_link_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l1.collateral_portfolio (
  collateral_portfolio_id BIGINT NOT NULL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL,
  description VARCHAR(2000),
  lob_segment_id BIGINT NOT NULL,
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  portfolio_name_override VARCHAR(255),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_collateral_portfolio_portfolio_id FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim(portfolio_id),
  CONSTRAINT fk_collateral_portfolio_lob_segment_id FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy(managed_segment_id)
);

CREATE TABLE IF NOT EXISTS l1.counterparty_hierarchy (
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  immediate_parent_id BIGINT NOT NULL,
  ultimate_parent_id BIGINT NOT NULL,
  ownership_pct DECIMAL(10,4),
  as_of_date DATE NOT NULL,
  PRIMARY KEY (counterparty_id, as_of_date)
,
  CONSTRAINT fk_counterparty_hierarchy_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_counterparty_hierarchy_immediate_parent_id FOREIGN KEY (immediate_parent_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_counterparty_hierarchy_ultimate_parent_id FOREIGN KEY (ultimate_parent_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.legal_entity_hierarchy (
  hierarchy_id BIGINT NOT NULL PRIMARY KEY,
  legal_entity_id BIGINT NOT NULL,
  parent_legal_entity_id BIGINT NOT NULL,
  as_of_date DATE,
  consolidation_method VARCHAR(100),
  hierarchy_level VARCHAR(100),
  hierarchy_path VARCHAR(100),
  ownership_pct DECIMAL(10,4),
  ultimate_parent_legal_entity_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_legal_entity_hierarchy_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id),
  CONSTRAINT fk_legal_entity_hierarchy_parent_legal_entity_id FOREIGN KEY (parent_legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l1.control_relationship (
  control_relationship_id BIGINT NOT NULL PRIMARY KEY,
  parent_counterparty_id BIGINT NOT NULL,
  subsidiary_counterparty_id BIGINT NOT NULL,
  control_type_code VARCHAR(20),
  controlled_counterparty_id BIGINT,
  controller_counterparty_id BIGINT,
  ownership_pct DECIMAL(10,4),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_control_relationship_parent_counterparty_id FOREIGN KEY (parent_counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_control_relationship_subsidiary_counterparty_id FOREIGN KEY (subsidiary_counterparty_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.economic_interdependence_relationship (
  econ_interdep_relationship_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id_1 BIGINT NOT NULL,
  counterparty_id_2 BIGINT NOT NULL,
  source_system_id BIGINT NOT NULL,
  interdependence_strength_score VARCHAR(255),
  interdependence_type_code VARCHAR(20),
  rationale DECIMAL(10,4),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_economic_interdependence_relationship_counterparty_id_1 FOREIGN KEY (counterparty_id_1) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_economic_interdependence_relationship_counterparty_id_2 FOREIGN KEY (counterparty_id_2) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_economic_interdependence_relationship_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.credit_agreement_counterparty_participation (
  agreement_participation_id BIGINT NOT NULL PRIMARY KEY,
  credit_agreement_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  counterparty_role_code VARCHAR(20) NOT NULL,
  is_primary_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  participation_pct DECIMAL(10,4),
  source_record_id BIGINT NOT NULL,
  role_priority_rank VARCHAR(100),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_credit_agreement_counterparty_participation_credit_agreement_id FOREIGN KEY (credit_agreement_id) REFERENCES l1.credit_agreement_master(credit_agreement_id),
  CONSTRAINT fk_credit_agreement_counterparty_participation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_credit_agreement_counterparty_participation_counterparty_role_code FOREIGN KEY (counterparty_role_code) REFERENCES l1.counterparty_role_dim(counterparty_role_code)
);

CREATE TABLE IF NOT EXISTS l1.facility_counterparty_participation (
  facility_participation_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  counterparty_role_code VARCHAR(20) NOT NULL,
  is_primary_flag CHAR(1),
  participation_pct DECIMAL(10,4),
  role_priority_rank VARCHAR(100),
  source_record_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_facility_counterparty_participation_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id),
  CONSTRAINT fk_facility_counterparty_participation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_facility_counterparty_participation_counterparty_role_code FOREIGN KEY (counterparty_role_code) REFERENCES l1.counterparty_role_dim(counterparty_role_code)
);

CREATE TABLE IF NOT EXISTS l1.facility_lender_allocation (
  lender_allocation_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  legal_entity_id BIGINT NOT NULL,
  bank_share_pct DECIMAL(10,4),
  bank_commitment_amt DECIMAL(18,2),
  allocation_role VARCHAR(50) NOT NULL,
  is_lead_flag CHAR(1),
  source_record_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_facility_lender_allocation_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id),
  CONSTRAINT fk_facility_lender_allocation_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l1.sccl_counterparty_group (
  sccl_group_id BIGINT NOT NULL PRIMARY KEY,
  group_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  as_of_date DATE,
  created_by VARCHAR(100),
  grouping_basis VARCHAR(100),
  jurisdiction_code VARCHAR(20),
  run_version_id BIGINT,
  sccl_group_name VARCHAR(200),
  ultimate_parent_counterparty_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.sccl_counterparty_group_member (
  member_id BIGINT NOT NULL PRIMARY KEY,
  sccl_group_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  effective_end_date DATE,
  effective_start_date DATE,
  included_flag CHAR(1),
  member_role_code VARCHAR(20),
  ownership_pct DECIMAL(10,4),
  sccl_group_member_id BIGINT,
  source_system_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_sccl_counterparty_group_member_sccl_group_id FOREIGN KEY (sccl_group_id) REFERENCES l1.sccl_counterparty_group(sccl_group_id),
  CONSTRAINT fk_sccl_counterparty_group_member_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l1.limit_rule (
  limit_rule_id BIGINT NOT NULL PRIMARY KEY,
  rule_code VARCHAR(50),
  rule_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  as_of_date DATE,
  counterparty_id BIGINT,
  effective_from_date DATE,
  effective_to_date DATE,
  inner_threshold_pct DECIMAL(10,4),
  limit_amount_usd DECIMAL(18,2),
  limit_scope VARCHAR(30),
  limit_type DECIMAL(10,4),
  lob_segment_id BIGINT,
  outer_threshold_pct DECIMAL(10,4),
  risk_tier DECIMAL(18,2),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.limit_threshold (
  limit_threshold_id BIGINT NOT NULL PRIMARY KEY,
  limit_rule_id BIGINT NOT NULL,
  threshold_value DECIMAL(18,2),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  direction VARCHAR(100),
  effective_from_date DATE,
  effective_to_date DATE,
  escalation_action VARCHAR(100),
  threshold_lower_abs DECIMAL(18,2),
  threshold_lower_pct DECIMAL(10,4),
  threshold_type VARCHAR(50),
  threshold_upper_abs DECIMAL(18,2),
  threshold_upper_pct DECIMAL(10,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_limit_threshold_limit_rule_id FOREIGN KEY (limit_rule_id) REFERENCES l1.limit_rule(limit_rule_id)
);

CREATE TABLE IF NOT EXISTS l1.fx_rate (
  fx_rate_id BIGINT NOT NULL PRIMARY KEY,
  as_of_date DATE,
  from_currency_code VARCHAR(20) NOT NULL,
  to_currency_code VARCHAR(20) NOT NULL,
  rate DECIMAL(18,10),
  rate_type VARCHAR(50),
  effective_ts TIMESTAMP,
  loaded_ts TIMESTAMP,
  provider VARCHAR(100),
  as_of_date DATE NOT NULL
,
  CONSTRAINT fk_fx_rate_from_currency_code FOREIGN KEY (from_currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_fx_rate_to_currency_code FOREIGN KEY (to_currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l1.run_control (
  run_control_id BIGINT NOT NULL PRIMARY KEY,
  run_name VARCHAR(200),
  as_of_date DATE,
  source_system_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  certified_by VARCHAR(100),
  certified_ts TIMESTAMP,
  created_by VARCHAR(100),
  cutoff_ts TIMESTAMP,
  notes VARCHAR(2000),
  run_version_id BIGINT,
  status VARCHAR(30),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_run_control_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.report_registry (
  report_id BIGINT NOT NULL PRIMARY KEY,
  report_code VARCHAR(50),
  report_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  effective_from_date DATE,
  effective_to_date DATE,
  frequency VARCHAR(30),
  jurisdiction_code VARCHAR(20),
  regulator_code VARCHAR(20),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.reporting_calendar_dim (
  reporting_calendar_id BIGINT NOT NULL PRIMARY KEY,
  calendar_code VARCHAR(20),
  calendar_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  as_of_date DATE,
  cutoff_ts TIMESTAMP,
  fiscal_quarter DATE,
  fiscal_year DATE,
  is_period_end DATE,
  period_end_date DATE,
  period_start_date DATE,
  regulator_code VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS l1.reporting_entity_dim (
  reporting_entity_id BIGINT NOT NULL PRIMARY KEY,
  entity_code VARCHAR(50),
  entity_name VARCHAR(200),
  legal_entity_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  consolidation_basis DATE,
  effective_from_date DATE,
  effective_to_date DATE,
  functional_currency_code VARCHAR(20),
  is_current VARCHAR(100),
  jurisdiction_code VARCHAR(20),
  reporting_entity_code VARCHAR(20),
  reporting_entity_name VARCHAR(200),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_reporting_entity_dim_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l1.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l1.model_registry_dim (
  model_id BIGINT NOT NULL PRIMARY KEY,
  model_code VARCHAR(50),
  model_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  documentation_url VARCHAR(100),
  effective_from_date DATE,
  effective_to_date DATE,
  is_current VARCHAR(100),
  model_type VARCHAR(50),
  model_version VARCHAR(100),
  owner_org_unit_id BIGINT,
  regulatory_approved_flag CHAR(1),
  validation_status VARCHAR(30),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rule_registry (
  rule_id BIGINT NOT NULL PRIMARY KEY,
  rule_code VARCHAR(50),
  rule_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  approved_by VARCHAR(100),
  approved_ts TIMESTAMP,
  effective_from_date DATE,
  effective_to_date DATE,
  input_variables VARCHAR(100),
  output_variable VARCHAR(100),
  rule_expression VARCHAR(100),
  rule_type VARCHAR(50),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.validation_check_registry (
  check_id BIGINT NOT NULL PRIMARY KEY,
  check_name VARCHAR(200),
  check_type VARCHAR(50) NOT NULL,
  check_rule_id BIGINT NOT NULL,
  target_table VARCHAR(100),
  target_column VARCHAR(100),
  severity VARCHAR(100),
  owner_id BIGINT,
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (value IN ('Y','N')),
  validation_check_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_validation_check_registry_check_rule_id FOREIGN KEY (check_rule_id) REFERENCES l1.rule_registry(rule_id)
);

CREATE TABLE IF NOT EXISTS l1.reconciliation_control (
  reconciliation_control_id BIGINT NOT NULL PRIMARY KEY,
  control_name VARCHAR(200),
  source_system_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  actual_value DECIMAL(18,4),
  check_name VARCHAR(200),
  check_type VARCHAR(50),
  executed_ts TIMESTAMP,
  expected_value DECIMAL(18,4),
  owner_id BIGINT,
  recon_id BIGINT,
  remediation_ticket_id BIGINT,
  report_code VARCHAR(20),
  run_version_id BIGINT,
  status VARCHAR(30),
  tolerance_value DECIMAL(18,4),
  variance_value DECIMAL(18,4),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_reconciliation_control_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l1.regulatory_mapping (
  regulatory_mapping_id BIGINT NOT NULL PRIMARY KEY,
  mapping_code VARCHAR(50),
  jurisdiction_code VARCHAR(20) NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  calculation_rule_id BIGINT,
  effective_end_date DATE,
  effective_start_date DATE,
  line_item_code VARCHAR(20),
  mapping_id BIGINT,
  mdrm_id BIGINT,
  metric_name VARCHAR(200),
  notes VARCHAR(2000),
  relationship_type VARCHAR(50),
  report_code VARCHAR(20),
  schedule_code VARCHAR(20),
  source_mdrm_code VARCHAR(20),
  source_report_code VARCHAR(20),
  source_system_id BIGINT,
  target_mdrm_code VARCHAR(20),
  target_report_code VARCHAR(20),
  tolerance_pct DECIMAL(10,4),
  transformation_rule VARCHAR(100),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_regulatory_mapping_jurisdiction_code FOREIGN KEY (jurisdiction_code) REFERENCES l1.regulatory_jurisdiction(jurisdiction_code)
);

CREATE TABLE IF NOT EXISTS l1.report_cell_definition (
  report_cell_id BIGINT NOT NULL PRIMARY KEY,
  report_id BIGINT NOT NULL,
  cell_code VARCHAR(50),
  cell_definition TEXT,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  active_flag CHAR(1),
  calculation_rule_id BIGINT,
  cell_datatype VARCHAR(100),
  cell_id BIGINT,
  cell_name VARCHAR(200),
  is_derived_flag CHAR(1),
  line_item_code VARCHAR(20),
  report_code VARCHAR(20),
  schedule_code VARCHAR(20),
  uom DECIMAL(18,2),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_report_cell_definition_report_id FOREIGN KEY (report_id) REFERENCES l1.report_registry(report_id)
);

CREATE TABLE IF NOT EXISTS l1.rating_mapping (
  rating_mapping_id BIGINT NOT NULL PRIMARY KEY,
  rating_scale_id BIGINT NOT NULL,
  rating_source_id BIGINT NOT NULL,
  external_rating VARCHAR(50),
  internal_grade_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  approved_by VARCHAR(100),
  approved_ts TIMESTAMP,
  effective_from_date DATE,
  effective_to_date DATE,
  is_current VARCHAR(100),
  mapping_method VARCHAR(100),
  model_id BIGINT,
  rating_grade_code VARCHAR(20),
  source_rating_code VARCHAR(20),
  source_system_id BIGINT,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_rating_mapping_rating_scale_id FOREIGN KEY (rating_scale_id) REFERENCES l1.rating_scale_dim(rating_scale_id),
  CONSTRAINT fk_rating_mapping_rating_source_id FOREIGN KEY (rating_source_id) REFERENCES l1.rating_source(rating_source_id),
  CONSTRAINT fk_rating_mapping_internal_grade_id FOREIGN KEY (internal_grade_id) REFERENCES l1.rating_grade_dim(rating_grade_id)
);

CREATE TABLE IF NOT EXISTS l1.scenario_dim (
  scenario_id BIGINT NOT NULL PRIMARY KEY,
  scenario_code VARCHAR(50),
  scenario_name VARCHAR(200),
  scenario_type VARCHAR(50),
  source_system_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  description VARCHAR(2000),
  is_active VARCHAR(100),
  regulatory_scenario_code VARCHAR(20),
  scenario_end_date DATE,
  scenario_horizon_months VARCHAR(255),
  scenario_start_date DATE,
  shock_parameters_json VARCHAR(255),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_scenario_dim_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

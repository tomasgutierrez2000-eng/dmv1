-- L1 Schema DDL (generated from scripts/l1/generate.ts)
-- Run in dependency order. PostgreSQL 15+.

CREATE SCHEMA IF NOT EXISTS l1;

CREATE TABLE IF NOT EXISTS l1.currency_dim (
  currency_code VARCHAR(20) NOT NULL PRIMARY KEY,
  currency_name VARCHAR(200),
  currency_symbol VARCHAR(100),
  is_active VARCHAR(100),
  iso_numeric VARCHAR(100),
  minor_unit_decimals INTEGER
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
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.regulatory_jurisdiction (
  jurisdiction_code VARCHAR(20) NOT NULL PRIMARY KEY,
  jurisdiction_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.entity_type_dim (
  entity_type_code VARCHAR(20) NOT NULL PRIMARY KEY,
  entity_type_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
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
  updated_ts TIMESTAMP
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
  updated_ts TIMESTAMP
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
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.crm_type_dim (
  crm_type_code VARCHAR(20) NOT NULL PRIMARY KEY,
  crm_type_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
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
  is_us_bank_holiday VARCHAR(100)
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
  updated_ts TIMESTAMP
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.portfolio_dim (
  portfolio_id BIGINT NOT NULL PRIMARY KEY,
  portfolio_code VARCHAR(50),
  portfolio_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rating_source (
  rating_source_id BIGINT NOT NULL PRIMARY KEY,
  source_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.interest_rate_index_dim (
  rate_index_id BIGINT NOT NULL PRIMARY KEY,
  index_code VARCHAR(50),
  index_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.ledger_account_dim (
  ledger_account_id BIGINT NOT NULL PRIMARY KEY,
  account_code VARCHAR(50),
  account_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  country_code VARCHAR(20) NOT NULL,
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
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.netting_agreement (
  netting_agreement_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
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
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.risk_mitigant_master (
  risk_mitigant_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  risk_mitigant_subtype_code VARCHAR(20) NOT NULL,
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
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_facility_counterparty_participation_facility_id FOREIGN KEY (facility_id) REFERENCES l1.facility_master(facility_id),
  CONSTRAINT fk_facility_counterparty_participation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty(counterparty_id),
  CONSTRAINT fk_facility_counterparty_participation_counterparty_role_code FOREIGN KEY (counterparty_role_code) REFERENCES l1.counterparty_role_dim(counterparty_role_code)
);

CREATE TABLE IF NOT EXISTS l1.sccl_counterparty_group (
  sccl_group_id BIGINT NOT NULL PRIMARY KEY,
  group_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.sccl_counterparty_group_member (
  member_id BIGINT NOT NULL PRIMARY KEY,
  sccl_group_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.limit_threshold (
  limit_threshold_id BIGINT NOT NULL PRIMARY KEY,
  limit_rule_id BIGINT NOT NULL,
  threshold_value DECIMAL(18,2),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.reporting_calendar_dim (
  reporting_calendar_id BIGINT NOT NULL PRIMARY KEY,
  calendar_code VARCHAR(20),
  calendar_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.reporting_entity_dim (
  reporting_entity_id BIGINT NOT NULL PRIMARY KEY,
  entity_code VARCHAR(50),
  entity_name VARCHAR(200),
  legal_entity_id BIGINT NOT NULL,
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS l1.rule_registry (
  rule_id BIGINT NOT NULL PRIMARY KEY,
  rule_code VARCHAR(50),
  rule_name VARCHAR(200),
  created_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,
  CONSTRAINT fk_scenario_dim_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

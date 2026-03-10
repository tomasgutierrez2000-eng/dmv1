-- L2 Schema DDL (generated from scripts/l2/generate.ts)
-- Run after scripts/l1/output/ddl.sql. PostgreSQL 15+.
SET search_path TO l1, l2, public;
-- Drop and recreate for clean load.
DROP SCHEMA IF EXISTS l2 CASCADE;
CREATE SCHEMA l2;

-- ============================================================
-- === Migrated Master Tables (from L1) ===
-- ============================================================

CREATE TABLE IF NOT EXISTS l2.counterparty (
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
  country_of_incorporation INTEGER,
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
  lei_code VARCHAR(50),
  lgd_unsecured DECIMAL(10,6),
  pd_annual DECIMAL(10,6),
  regulatory_counterparty_type VARCHAR(50),
  updated_ts TIMESTAMP,
  y14_obligor_type VARCHAR(50),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  region_code VARCHAR(20),
  revenue_amt NUMERIC(18,2),
  CONSTRAINT fk_counterparty_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_counterparty_entity_type_code FOREIGN KEY (entity_type_code) REFERENCES l1.entity_type_dim(entity_type_code),
  CONSTRAINT fk_counterparty_industry_id FOREIGN KEY (industry_id) REFERENCES l1.industry_dim(industry_id)
);

CREATE TABLE IF NOT EXISTS l2.legal_entity (
  legal_entity_id BIGINT NOT NULL PRIMARY KEY,
  legal_name VARCHAR(200),
  legal_entity_name VARCHAR(200),
  country_code VARCHAR(20) NOT NULL,
  active_flag CHAR(1),
  entity_type_code VARCHAR(20),
  functional_currency_code VARCHAR(20),
  institution_id BIGINT,
  is_reporting_entity VARCHAR(100),
  lei_code VARCHAR(50),
  primary_regulator VARCHAR(100),
  rssd_id BIGINT,
  short_name VARCHAR(200),
  tax_id BIGINT,
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_legal_entity_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code)
);

CREATE TABLE IF NOT EXISTS l2.instrument_master (
  instrument_id BIGINT NOT NULL PRIMARY KEY,
  country_code VARCHAR(20) NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  active_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (active_flag IN ('Y','N')),
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_instrument_master_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_instrument_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.credit_agreement_master (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_credit_agreement_master_borrower_counterparty_id FOREIGN KEY (borrower_counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_credit_agreement_master_lender_legal_entity_id FOREIGN KEY (lender_legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id),
  CONSTRAINT fk_credit_agreement_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_master (
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
  day_count_convention VARCHAR(20),
  facility_reference VARCHAR(100),
  interest_rate_reference VARCHAR(20),
  interest_rate_spread_bps DECIMAL(8,2),
  interest_rate_type VARCHAR(20),
  next_repricing_date DATE,
  payment_frequency VARCHAR(30),
  prepayment_penalty_flag CHAR(1),
  product_id BIGINT,
  rate_cap_pct DECIMAL(10,4),
  rate_floor_pct DECIMAL(10,4),
  region_code VARCHAR(20),
  revenue_amt NUMERIC(18,2),
  revolving_flag CHAR(1),
  is_active_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (is_active_flag IN ('Y','N')),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  CONSTRAINT fk_facility_master_credit_agreement_id FOREIGN KEY (credit_agreement_id) REFERENCES l2.credit_agreement_master(credit_agreement_id),
  CONSTRAINT fk_facility_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_facility_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_facility_master_portfolio_id FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim(portfolio_id),
  CONSTRAINT fk_facility_master_lob_segment_id FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy(managed_segment_id),
  CONSTRAINT fk_facility_master_product_node_id FOREIGN KEY (product_node_id) REFERENCES l1.enterprise_product_taxonomy(product_node_id),
  CONSTRAINT fk_facility_master_rate_index_id FOREIGN KEY (rate_index_id) REFERENCES l1.interest_rate_index_dim(rate_index_id),
  CONSTRAINT fk_facility_master_ledger_account_id FOREIGN KEY (ledger_account_id) REFERENCES l1.ledger_account_dim(ledger_account_id)
);

CREATE TABLE IF NOT EXISTS l2.contract_master (
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
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS l2.netting_agreement (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_netting_agreement_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.netting_set (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_netting_set_netting_agreement_id FOREIGN KEY (netting_agreement_id) REFERENCES l2.netting_agreement(netting_agreement_id)
);

CREATE TABLE IF NOT EXISTS l2.netting_set_link (
  netting_set_link_id BIGINT NOT NULL PRIMARY KEY,
  netting_set_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  anchor_id BIGINT,
  anchor_type VARCHAR(50),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_netting_set_link_netting_set_id FOREIGN KEY (netting_set_id) REFERENCES l2.netting_set(netting_set_id),
  CONSTRAINT fk_netting_set_link_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l2.csa_master (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_csa_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.margin_agreement (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_margin_agreement_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.collateral_asset_master (
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
  lien_priority INTEGER,
  location_country_code VARCHAR(20),
  location_description VARCHAR(2000),
  maturity_date DATE,
  original_cost DECIMAL(18,2),
  regulatory_eligible_flag CHAR(1),
  revaluation_frequency VARCHAR(255),
  source_record_id BIGINT,
  updated_ts TIMESTAMP,
  valuation_currency_code VARCHAR(20),
  vintage_date DATE,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_collateral_asset_master_collateral_type_id FOREIGN KEY (collateral_type_id) REFERENCES l1.collateral_type(collateral_type_id),
  CONSTRAINT fk_collateral_asset_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_collateral_asset_master_country_code FOREIGN KEY (country_code) REFERENCES l1.country_dim(country_code),
  CONSTRAINT fk_collateral_asset_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_collateral_asset_master_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l2.collateral_link (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_collateral_link_collateral_asset_id FOREIGN KEY (collateral_asset_id) REFERENCES l2.collateral_asset_master(collateral_asset_id),
  CONSTRAINT fk_collateral_link_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l2.crm_protection_master (
  protection_id BIGINT NOT NULL PRIMARY KEY,
  crm_type_code VARCHAR(20) NOT NULL,
  beneficiary_legal_entity_id BIGINT NOT NULL,
  currency_code VARCHAR(20) NOT NULL,
  notional_amount DECIMAL(18,2),
  maturity_date DATE NOT NULL,
  enforceable_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (enforceable_flag IN ('Y','N')),
  coverage_pct DECIMAL(10,4),
  governing_law_jurisdiction_id BIGINT,
  protection_provider_counterparty_id BIGINT,
  protection_reference VARCHAR(100),
  updated_ts TIMESTAMP,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crm_protection_master_crm_type_code FOREIGN KEY (crm_type_code) REFERENCES l1.crm_type_dim(crm_type_code),
  CONSTRAINT fk_crm_protection_master_beneficiary_legal_entity_id FOREIGN KEY (beneficiary_legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id),
  CONSTRAINT fk_crm_protection_master_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.protection_link (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_protection_link_protection_id FOREIGN KEY (protection_id) REFERENCES l2.crm_protection_master(protection_id),
  CONSTRAINT fk_protection_link_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l2.risk_mitigant_master (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_risk_mitigant_master_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_risk_mitigant_master_risk_mitigant_subtype_code FOREIGN KEY (risk_mitigant_subtype_code) REFERENCES l1.risk_mitigant_type_dim(risk_mitigant_subtype_code)
);

CREATE TABLE IF NOT EXISTS l2.risk_mitigant_link (
  risk_mitigant_link_id BIGINT NOT NULL PRIMARY KEY,
  risk_mitigant_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  anchor_id BIGINT,
  anchor_type VARCHAR(50),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_risk_mitigant_link_risk_mitigant_id FOREIGN KEY (risk_mitigant_id) REFERENCES l2.risk_mitigant_master(risk_mitigant_id),
  CONSTRAINT fk_risk_mitigant_link_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l2.counterparty_hierarchy (
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  immediate_parent_id BIGINT NOT NULL,
  ultimate_parent_id BIGINT NOT NULL,
  ownership_pct DECIMAL(10,4),
  PRIMARY KEY (counterparty_id, as_of_date),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  CONSTRAINT fk_counterparty_hierarchy_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_counterparty_hierarchy_immediate_parent_id FOREIGN KEY (immediate_parent_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_counterparty_hierarchy_ultimate_parent_id FOREIGN KEY (ultimate_parent_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.legal_entity_hierarchy (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_legal_entity_hierarchy_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id),
  CONSTRAINT fk_legal_entity_hierarchy_parent_legal_entity_id FOREIGN KEY (parent_legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l2.control_relationship (
  control_relationship_id BIGINT NOT NULL PRIMARY KEY,
  parent_counterparty_id BIGINT NOT NULL,
  subsidiary_counterparty_id BIGINT NOT NULL,
  control_type_code VARCHAR(50),
  controlled_counterparty_id BIGINT,
  controller_counterparty_id BIGINT,
  ownership_pct DECIMAL(10,4),
  source_system_id BIGINT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_control_relationship_parent_counterparty_id FOREIGN KEY (parent_counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_control_relationship_subsidiary_counterparty_id FOREIGN KEY (subsidiary_counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.economic_interdependence_relationship (
  econ_interdep_relationship_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id_1 BIGINT NOT NULL,
  counterparty_id_2 BIGINT NOT NULL,
  source_system_id BIGINT NOT NULL,
  interdependence_strength_score DECIMAL(5,2),
  interdependence_type_code VARCHAR(20),
  rationale VARCHAR(255),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_econ_interdep_rel_counterparty_id_1 FOREIGN KEY (counterparty_id_1) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_econ_interdep_rel_counterparty_id_2 FOREIGN KEY (counterparty_id_2) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_econ_interdep_rel_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l2.credit_agreement_counterparty_participation (
  agreement_participation_id BIGINT NOT NULL PRIMARY KEY,
  credit_agreement_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  counterparty_role_code VARCHAR(20) NOT NULL,
  is_primary_flag CHAR(1) NOT NULL DEFAULT 'N' CHECK (is_primary_flag IN ('Y','N')),
  participation_pct DECIMAL(10,4),
  source_record_id BIGINT NOT NULL,
  role_priority_rank VARCHAR(100),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  is_current_flag CHAR(1) DEFAULT 'Y',
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ca_cp_participation_credit_agreement_id FOREIGN KEY (credit_agreement_id) REFERENCES l2.credit_agreement_master(credit_agreement_id),
  CONSTRAINT fk_ca_cp_participation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_ca_cp_participation_counterparty_role_code FOREIGN KEY (counterparty_role_code) REFERENCES l1.counterparty_role_dim(counterparty_role_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_counterparty_participation (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fac_cp_participation_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_fac_cp_participation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_fac_cp_participation_counterparty_role_code FOREIGN KEY (counterparty_role_code) REFERENCES l1.counterparty_role_dim(counterparty_role_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_lender_allocation (
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
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_facility_lender_allocation_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_lender_allocation_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id)
);

CREATE TABLE IF NOT EXISTS l2.fx_rate (
  fx_rate_id BIGINT NOT NULL PRIMARY KEY,
  as_of_date DATE,
  from_currency_code VARCHAR(20) NOT NULL,
  to_currency_code VARCHAR(20) NOT NULL,
  rate DECIMAL(18,10),
  rate_type VARCHAR(50),
  effective_ts TIMESTAMP,
  loaded_ts TIMESTAMP,
  provider VARCHAR(100),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  CONSTRAINT fk_fx_rate_from_currency_code FOREIGN KEY (from_currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_fx_rate_to_currency_code FOREIGN KEY (to_currency_code) REFERENCES l1.currency_dim(currency_code)
);

-- ============================================================
-- === Atomic Snapshots & Events ===
-- ============================================================

CREATE TABLE IF NOT EXISTS l2.position (
  position_id BIGINT NOT NULL PRIMARY KEY,
  as_of_date DATE NOT NULL,
  facility_id BIGINT,
  instrument_id BIGINT,
  balance_amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  source_system_id BIGINT,
  accrued_interest_amt NUMERIC(18,2),
  book_value_amt NUMERIC(18,2),
  contractual_maturity_date DATE,
  counterparty_id BIGINT,
  credit_agreement_id BIGINT,
  credit_status_code VARCHAR(20),
  effective_date DATE,
  exposure_type_code VARCHAR(20),
  external_risk_rating VARCHAR(100),
  internal_risk_rating VARCHAR(100),
  legal_entity_id BIGINT,
  lgd_estimate VARCHAR(100),
  market_value_amt NUMERIC(18,2),
  netting_set_id BIGINT,
  notional_amount NUMERIC(18,2),
  pd_estimate VARCHAR(100),
  position_currency VARCHAR(100),
  trading_banking_book_flag CHAR(1),
  ultimate_parent_id BIGINT,
  product_node_id BIGINT,
  product_code VARCHAR(50),
  CONSTRAINT fk_position_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_position_instrument_id FOREIGN KEY (instrument_id) REFERENCES l2.instrument_master(instrument_id),
  CONSTRAINT fk_position_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code),
  CONSTRAINT fk_position_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id),
  CONSTRAINT fk_position_product_node_id FOREIGN KEY (product_node_id) REFERENCES l1.enterprise_product_taxonomy(product_node_id)
);

CREATE TABLE IF NOT EXISTS l2.position_detail (
  position_detail_id BIGINT NOT NULL PRIMARY KEY,
  position_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  detail_type VARCHAR(50),
  amount NUMERIC(18,2),
  maturity_date DATE,
  cash_leg_amount NUMERIC(18,2),
  ccf NUMERIC(5,4),
  current_balance NUMERIC(18,2),
  days_past_due INTEGER,
  delinquency_status VARCHAR(30),
  derivative_type VARCHAR(50),
  fair_value NUMERIC(18,2),
  funded_amount NUMERIC(18,2),
  haircut_applied_pct NUMERIC(10,4),
  insured_balance NUMERIC(18,2),
  interest_rate NUMERIC(8,6),
  mark_to_market NUMERIC(18,2),
  origination_date DATE,
  pfe VARCHAR(100),
  quantity INTEGER,
  rate_index NUMERIC(10,4),
  rate_type CHAR(1),
  replacement_cost NUMERIC(18,2),
  sft_type VARCHAR(50),
  spread_bps NUMERIC(8,2),
  total_commitment NUMERIC(18,2),
  unfunded_amount NUMERIC(18,2),
  unrealized_gain_loss VARCHAR(100),
  product_node_id BIGINT,
  exposure_type_code VARCHAR(20),
  notional_amount NUMERIC(18,2),
  credit_conversion_factor NUMERIC(10,6),
  lgd_pct NUMERIC(10,6),
  risk_weight_pct NUMERIC(10,6),
  delinquent_payment_flag CHAR(1),
  overdue_amt_0_30 NUMERIC(18,2),
  overdue_amt_31_60 NUMERIC(18,2),
  overdue_amt_61_90_plus NUMERIC(18,2),
  CONSTRAINT fk_position_detail_position_id FOREIGN KEY (position_id) REFERENCES l2.position(position_id)
);

CREATE TABLE IF NOT EXISTS l2.exposure_counterparty_attribution (
  attribution_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  exposure_type_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  exposure_amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  attributed_exposure_usd NUMERIC(18,2),
  attribution_pct NUMERIC(10,4),
  counterparty_role_code VARCHAR(20),
  facility_id BIGINT,
  is_risk_shifted_flag CHAR(1),
  risk_shifted_from_counterparty_id BIGINT,
  PRIMARY KEY (attribution_id, as_of_date),
  CONSTRAINT fk_exp_cp_attribution_exposure_type_id FOREIGN KEY (exposure_type_id) REFERENCES l1.exposure_type_dim(exposure_type_id),
  CONSTRAINT fk_exp_cp_attribution_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_exp_cp_attribution_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

DROP TABLE IF EXISTS l2.facility_exposure_snapshot CASCADE;
CREATE TABLE IF NOT EXISTS l2.facility_exposure_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  exposure_type_id BIGINT NOT NULL,
  drawn_amount NUMERIC(18,2),
  committed_amount NUMERIC(18,2),
  undrawn_amount NUMERIC(18,2),
  source_system_id BIGINT,
  counterparty_id BIGINT,
  coverage_ratio_pct NUMERIC(10,4),
  currency_code VARCHAR(20),
  exposure_amount_local NUMERIC(18,2),
  facility_exposure_id BIGINT NOT NULL,
  fr2590_category_code VARCHAR(20),
  gross_exposure_usd NUMERIC(18,2),
  legal_entity_id BIGINT,
  lob_segment_id BIGINT,
  net_exposure_usd NUMERIC(18,2),
  product_node_id BIGINT,
  outstanding_balance_amt NUMERIC(18,2),
  undrawn_commitment_amt NUMERIC(18,2),
  number_of_loans INTEGER,
  number_of_facilities INTEGER,
  days_until_maturity INTEGER,
  limit_status_code VARCHAR(50),
  rwa_amt NUMERIC(18,2),
  internal_risk_rating_bucket_code VARCHAR(20),
  total_collateral_mv_usd NUMERIC(18,2),
  bank_share_pct NUMERIC(10,4),
  PRIMARY KEY (facility_exposure_id),
  CONSTRAINT fk_facility_exposure_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_exposure_snapshot_exposure_type_id FOREIGN KEY (exposure_type_id) REFERENCES l1.exposure_type_dim(exposure_type_id),
  CONSTRAINT fk_facility_exposure_snapshot_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id),
  CONSTRAINT fk_fac_exp_snapshot_irr_bucket_code FOREIGN KEY (internal_risk_rating_bucket_code) REFERENCES l1.internal_risk_rating_bucket_dim(internal_risk_rating_bucket_code)
);

CREATE TABLE IF NOT EXISTS l2.netting_set_exposure_snapshot (
  netting_set_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  netted_exposure_amount NUMERIC(18,2),
  gross_exposure_amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  collateral_held_usd NUMERIC(18,2),
  counterparty_id BIGINT,
  gross_mtm_usd NUMERIC(18,2),
  legal_entity_id BIGINT,
  netting_set_exposure_id BIGINT,
  pfe_usd NUMERIC(18,2),
  netting_benefit_amt NUMERIC(18,2),
  PRIMARY KEY (netting_set_id, as_of_date),
  CONSTRAINT fk_netting_set_exp_snapshot_netting_set_id FOREIGN KEY (netting_set_id) REFERENCES l2.netting_set(netting_set_id),
  CONSTRAINT fk_netting_set_exp_snapshot_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_lob_attribution (
  attribution_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  lob_segment_id BIGINT NOT NULL,
  attribution_pct NUMERIC(10,4),
  attributed_amount NUMERIC(18,2),
  attribution_amount_usd NUMERIC(18,2),
  attribution_type VARCHAR(50),
  lob_node_id BIGINT,
  hierarchy_id VARCHAR(64),
  CONSTRAINT fk_facility_lob_attribution_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_lob_attribution_lob_segment_id FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy(managed_segment_id)
);

CREATE TABLE IF NOT EXISTS l2.collateral_snapshot (
  collateral_asset_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  valuation_amount NUMERIC(18,2),
  haircut_pct NUMERIC(10,4),
  eligible_collateral_amount NUMERIC(18,2),
  source_system_id BIGINT,
  allocated_amount_usd NUMERIC(18,2),
  collateral_snapshot_id BIGINT,
  counterparty_id BIGINT,
  crm_type_code VARCHAR(20),
  current_valuation_usd NUMERIC(18,2),
  facility_id BIGINT,
  mitigant_group_code VARCHAR(20),
  mitigant_subtype VARCHAR(100),
  original_valuation_usd NUMERIC(18,2),
  risk_shifting_flag CHAR(1),
  PRIMARY KEY (collateral_asset_id, as_of_date),
  CONSTRAINT fk_collateral_snapshot_collateral_asset_id FOREIGN KEY (collateral_asset_id) REFERENCES l2.collateral_asset_master(collateral_asset_id),
  CONSTRAINT fk_collateral_snapshot_source_system_id FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id)
);

CREATE TABLE IF NOT EXISTS l2.cash_flow (
  cash_flow_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT,
  cash_flow_date DATE NOT NULL,
  cash_flow_type VARCHAR(50),
  amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  as_of_date DATE,
  contractual_amt NUMERIC(18,2),
  contractual_amt_usd NUMERIC(18,2),
  counterparty_id BIGINT,
  flow_date DATE,
  flow_direction VARCHAR(100),
  flow_id BIGINT,
  flow_type VARCHAR(50),
  position_id BIGINT,
  CONSTRAINT fk_cash_flow_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_cash_flow_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_financial_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  noi_amt NUMERIC(18,2),
  total_debt_service_amt NUMERIC(18,2),
  revenue_amt NUMERIC(18,2),
  operating_expense_amt NUMERIC(18,2),
  ebitda_amt NUMERIC(18,2),
  interest_expense_amt NUMERIC(18,2),
  principal_payment_amt NUMERIC(18,2),
  counterparty_id BIGINT,
  currency_code VARCHAR(20),
  reporting_period VARCHAR(20),
  financial_snapshot_id BIGINT,
  dscr_value NUMERIC(12,6),
  ltv_pct NUMERIC(10,6),
  net_income_amt NUMERIC(18,2),
  interest_rate_sensitivity_pct NUMERIC(10,6),
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_facility_financial_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l2.facility_delinquency_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  credit_status_code BIGINT NOT NULL,
  days_past_due INTEGER,
  watch_list_flag CHAR(1),
  counterparty_id BIGINT,
  currency_code VARCHAR(20),
  days_past_due_max INTEGER,
  delinquency_bucket_code VARCHAR(20),
  delinquency_snapshot_id BIGINT,
  delinquency_status_code VARCHAR(20),
  last_payment_received_date DATE,
  overdue_interest_amt NUMERIC(18,2),
  overdue_principal_amt NUMERIC(18,2),
  delinquent_payment_flag CHAR(1),
  overdue_amt_0_30 NUMERIC(18,2),
  overdue_amt_31_60 NUMERIC(18,2),
  overdue_amt_61_90_plus NUMERIC(18,2),
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_facility_delinquency_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_fac_delinq_credit_status_code FOREIGN KEY (credit_status_code) REFERENCES l1.credit_status_dim(credit_status_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_pricing_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  spread_bps NUMERIC(10,2),
  rate_index_id BIGINT,
  all_in_rate_pct NUMERIC(10,4),
  floor_pct NUMERIC(10,4),
  base_rate_pct NUMERIC(10,4),
  currency_code VARCHAR(20),
  facility_pricing_id BIGINT,
  min_spread_threshold_bps NUMERIC(8,2),
  payment_frequency VARCHAR(30),
  prepayment_penalty_flag CHAR(1),
  rate_cap_pct NUMERIC(10,4),
  rate_index_code VARCHAR(20),
  pricing_exception_flag CHAR(1),
  fee_rate_pct NUMERIC(10,6),
  cost_of_funds_pct NUMERIC(10,6),
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_facility_pricing_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_pricing_snapshot_rate_index_id FOREIGN KEY (rate_index_id) REFERENCES l1.interest_rate_index_dim(rate_index_id)
);

CREATE TABLE IF NOT EXISTS l2.facility_profitability_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  nii_ytd NUMERIC(18,2),
  fee_income_ytd NUMERIC(18,2),
  ledger_account_id BIGINT,
  allocated_equity_amt NUMERIC(18,2),
  avg_earning_assets_amt NUMERIC(18,2),
  base_currency_code VARCHAR(20),
  fee_income_amt NUMERIC(18,2),
  interest_expense_amt NUMERIC(18,2),
  interest_income_amt NUMERIC(18,2),
  profitability_snapshot_id BIGINT,
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_facility_profitability_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_profitability_snapshot_ledger_account_id FOREIGN KEY (ledger_account_id) REFERENCES l1.ledger_account_dim(ledger_account_id)
);

CREATE TABLE IF NOT EXISTS l2.limit_contribution_snapshot (
  limit_rule_id BIGINT NOT NULL,
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  contribution_amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  contribution_amount_usd NUMERIC(18,2),
  contribution_id BIGINT,
  contribution_pct NUMERIC(10,4),
  facility_id BIGINT,
  PRIMARY KEY (limit_rule_id, counterparty_id, as_of_date),
  CONSTRAINT fk_limit_contribution_snapshot_limit_rule_id FOREIGN KEY (limit_rule_id) REFERENCES l1.limit_rule(limit_rule_id),
  CONSTRAINT fk_limit_contribution_snapshot_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_limit_contribution_snapshot_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.limit_utilization_event (
  limit_rule_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  counterparty_id BIGINT,
  utilized_amount NUMERIC(18,2),
  available_amount NUMERIC(18,2),
  reporting_ts TIMESTAMP,
  utilization_event_id BIGINT,
  utilized_amount_usd NUMERIC(18,2),
  PRIMARY KEY (limit_rule_id, as_of_date),
  CONSTRAINT fk_limit_utilization_event_limit_rule_id FOREIGN KEY (limit_rule_id) REFERENCES l1.limit_rule(limit_rule_id),
  CONSTRAINT fk_limit_utilization_event_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.amendment_event (
  amendment_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  credit_agreement_id BIGINT NOT NULL,
  amendment_type_code VARCHAR(20) NOT NULL,
  amendment_status_code VARCHAR(20) NOT NULL,
  effective_date DATE,
  event_ts TIMESTAMP,
  amendment_description VARCHAR(2000),
  amendment_event_id BIGINT,
  amendment_status VARCHAR(30),
  amendment_subtype VARCHAR(100),
  amendment_type VARCHAR(50),
  as_of_date DATE,
  completed_date DATE,
  counterparty_id BIGINT,
  identified_date DATE,
  last_updated_ts TIMESTAMP,
  CONSTRAINT fk_amendment_event_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_amendment_event_credit_agreement_id FOREIGN KEY (credit_agreement_id) REFERENCES l2.credit_agreement_master(credit_agreement_id),
  CONSTRAINT fk_amendment_event_amendment_type_code FOREIGN KEY (amendment_type_code) REFERENCES l1.amendment_type_dim(amendment_type_code),
  CONSTRAINT fk_amendment_event_amendment_status_code FOREIGN KEY (amendment_status_code) REFERENCES l1.amendment_status_dim(amendment_status_code)
);

CREATE TABLE IF NOT EXISTS l2.amendment_change_detail (
  change_detail_id BIGINT NOT NULL PRIMARY KEY,
  amendment_id BIGINT NOT NULL,
  change_type VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  amendment_event_id BIGINT,
  change_currency_code VARCHAR(20),
  change_field_name VARCHAR(200),
  change_seq BIGINT,
  CONSTRAINT fk_amendment_change_detail_amendment_id FOREIGN KEY (amendment_id) REFERENCES l2.amendment_event(amendment_id)
);

CREATE TABLE IF NOT EXISTS l2.credit_event (
  credit_event_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  credit_event_type_code BIGINT NOT NULL,
  event_date DATE NOT NULL,
  event_ts TIMESTAMP,
  default_definition_id BIGINT,
  as_of_date DATE,
  event_risk_rating VARCHAR(100),
  event_status VARCHAR(30),
  event_summary VARCHAR(2000),
  loss_amount_usd NUMERIC(18,2),
  recovery_amount_usd NUMERIC(18,2),
  CONSTRAINT fk_credit_event_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_credit_event_credit_event_type_code FOREIGN KEY (credit_event_type_code) REFERENCES l1.credit_event_type_dim(credit_event_type_code),
  CONSTRAINT fk_credit_event_default_definition_id FOREIGN KEY (default_definition_id) REFERENCES l1.default_definition_dim(default_definition_id)
);

CREATE TABLE IF NOT EXISTS l2.credit_event_facility_link (
  link_id BIGINT NOT NULL PRIMARY KEY,
  credit_event_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  exposure_at_default NUMERIC(18,2),
  as_of_date DATE,
  estimated_loss_usd NUMERIC(18,2),
  impact_pct NUMERIC(10,4),
  CONSTRAINT fk_credit_event_facility_link_credit_event_id FOREIGN KEY (credit_event_id) REFERENCES l2.credit_event(credit_event_id),
  CONSTRAINT fk_credit_event_facility_link_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);

CREATE TABLE IF NOT EXISTS l2.stress_test_result (
  result_id BIGINT NOT NULL PRIMARY KEY,
  scenario_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  result_description VARCHAR(500),
  loss_amount NUMERIC(18,2),
  capital_impact NUMERIC(18,2),
  result_status VARCHAR(50),
  scenario_type VARCHAR(50),
  CONSTRAINT fk_stress_test_result_scenario_id FOREIGN KEY (scenario_id) REFERENCES l1.scenario_dim(scenario_id)
);

CREATE TABLE IF NOT EXISTS l2.stress_test_breach (
  breach_id BIGINT NOT NULL PRIMARY KEY,
  scenario_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  limit_rule_id BIGINT,
  counterparty_id BIGINT,
  breach_amount NUMERIC(18,2),
  breach_amount_usd NUMERIC(18,2),
  breach_severity VARCHAR(100),
  control_description VARCHAR(2000),
  control_owner VARCHAR(100),
  failure_description VARCHAR(2000),
  lob_segment_id BIGINT,
  stress_test_result_id BIGINT,
  CONSTRAINT fk_stress_test_breach_scenario_id FOREIGN KEY (scenario_id) REFERENCES l1.scenario_dim(scenario_id),
  CONSTRAINT fk_stress_test_breach_limit_rule_id FOREIGN KEY (limit_rule_id) REFERENCES l1.limit_rule(limit_rule_id),
  CONSTRAINT fk_stress_test_breach_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.deal_pipeline_fact (
  pipeline_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT,
  as_of_date DATE NOT NULL,
  stage_code VARCHAR(50),
  proposed_amount NUMERIC(18,2),
  currency_code VARCHAR(20),
  expected_all_in_rate_pct NUMERIC(10,4),
  expected_close_date DATE,
  expected_committed_amt NUMERIC(18,2),
  expected_coverage_ratio NUMERIC(10,4),
  expected_exposure_amt NUMERIC(18,2),
  expected_internal_risk_grade VARCHAR(255),
  expected_spread_bps NUMERIC(8,2),
  expected_tenor_months VARCHAR(255),
  facility_id BIGINT,
  lob_segment_id BIGINT,
  pipeline_deal_id BIGINT,
  pipeline_stage VARCHAR(100),
  pipeline_status VARCHAR(30),
  record_level_code VARCHAR(20),
  CONSTRAINT fk_deal_pipeline_fact_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_deal_pipeline_fact_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.counterparty_rating_observation (
  observation_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  rating_grade_id BIGINT NOT NULL,
  rating_source_id BIGINT NOT NULL,
  is_internal_flag CHAR(1),
  pd_implied VARCHAR(100),
  prior_rating_value VARCHAR(20),
  rating_agency VARCHAR(100),
  rating_date DATE,
  rating_type VARCHAR(50),
  rating_value VARCHAR(20),
  risk_rating_status VARCHAR(30),
  risk_rating_change_steps INTEGER,
  CONSTRAINT fk_cp_rating_observation_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_cp_rating_observation_rating_grade_id FOREIGN KEY (rating_grade_id) REFERENCES l1.rating_grade_dim(rating_grade_id),
  CONSTRAINT fk_cp_rating_observation_rating_source_id FOREIGN KEY (rating_source_id) REFERENCES l1.rating_source(rating_source_id)
);

CREATE TABLE IF NOT EXISTS l2.financial_metric_observation (
  observation_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT,
  facility_id BIGINT,
  as_of_date DATE NOT NULL,
  metric_definition_id BIGINT NOT NULL,
  value NUMERIC(18,4),
  context_id BIGINT,
  credit_agreement_id BIGINT,
  metric_category VARCHAR(50),
  metric_code VARCHAR(20),
  metric_name VARCHAR(200),
  metric_value NUMERIC(18,4),
  metric_value_usd NUMERIC(18,2),
  period_end_date DATE,
  CONSTRAINT fk_fin_metric_obs_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_fin_metric_obs_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_fin_metric_obs_metric_definition_id FOREIGN KEY (metric_definition_id) REFERENCES l1.metric_definition_dim(metric_definition_id),
  CONSTRAINT fk_fin_metric_obs_context_id FOREIGN KEY (context_id) REFERENCES l1.context_dim(context_id)
);

CREATE TABLE IF NOT EXISTS l2.exception_event (
  exception_id BIGINT NOT NULL PRIMARY KEY,
  as_of_date DATE NOT NULL,
  exception_type VARCHAR(50),
  facility_id BIGINT,
  counterparty_id BIGINT,
  raised_ts TIMESTAMP,
  resolved_ts TIMESTAMP,
  actual_remediation_date DATE,
  approver VARCHAR(100),
  breach_amount_usd NUMERIC(18,2),
  breach_pct NUMERIC(10,4),
  days_open INTEGER,
  exception_description VARCHAR(2000),
  exception_owner VARCHAR(100),
  exception_severity VARCHAR(100),
  exception_status VARCHAR(30),
  exception_value NUMERIC(18,4),
  identified_date DATE,
  limit_rule_id BIGINT,
  lob_segment_id BIGINT,
  lod_sponsor VARCHAR(100),
  metric_threshold_id BIGINT,
  remediation_plan VARCHAR(2000),
  target_remediation_date DATE,
  threshold_value NUMERIC(18,4),
  CONSTRAINT fk_exception_event_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_exception_event_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.risk_flag (
  risk_flag_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT,
  counterparty_id BIGINT,
  flag_type VARCHAR(50) NOT NULL,
  as_of_date DATE NOT NULL,
  raised_ts TIMESTAMP,
  cleared_ts TIMESTAMP,
  created_ts TIMESTAMP,
  flag_code VARCHAR(50),
  flag_description VARCHAR(2000),
  flag_scope VARCHAR(30),
  flag_severity VARCHAR(100),
  flag_trigger_value NUMERIC(18,4),
  CONSTRAINT fk_risk_flag_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_risk_flag_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.counterparty_financial_snapshot (
  financial_snapshot_id BIGINT NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  reporting_period VARCHAR(20),
  currency_code VARCHAR(20),
  revenue_amt NUMERIC(18,2),
  operating_expense_amt NUMERIC(18,2),
  net_income_amt NUMERIC(18,2),
  interest_expense_amt NUMERIC(18,2),
  tax_expense_amt NUMERIC(18,2),
  depreciation_amt NUMERIC(18,2),
  amortization_amt NUMERIC(18,2),
  total_assets_amt NUMERIC(18,2),
  total_liabilities_amt NUMERIC(18,2),
  shareholders_equity_amt NUMERIC(18,2),
  ebitda_amt NUMERIC(18,2),
  noi_amt NUMERIC(18,2),
  total_debt_service_amt NUMERIC(18,2),
  expected_drawdown_amt NUMERIC(18,2),
  fee_income_amt NUMERIC(18,2),
  tangible_net_worth_usd NUMERIC(18,2),
  CONSTRAINT fk_cp_financial_snapshot_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_cp_financial_snapshot_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.facility_risk_snapshot (
  facility_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  counterparty_id BIGINT,
  pd_pct NUMERIC(10,6),
  lgd_pct NUMERIC(10,6),
  ccf NUMERIC(6,4),
  ead_amt NUMERIC(18,2),
  expected_loss_amt NUMERIC(18,2),
  rwa_amt NUMERIC(18,2),
  risk_weight_pct NUMERIC(10,6),
  internal_risk_rating VARCHAR(100),
  currency_code VARCHAR(20),
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_facility_risk_snapshot_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_risk_snapshot_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_facility_risk_snapshot_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

CREATE TABLE IF NOT EXISTS l2.data_quality_score_snapshot (
  score_id BIGINT NOT NULL PRIMARY KEY,
  as_of_date DATE NOT NULL,
  dimension_name VARCHAR(100),
  completeness_pct NUMERIC(10,4),
  validity_pct NUMERIC(10,4),
  overall_score NUMERIC(10,4),
  target_table VARCHAR(100),
  issue_count INTEGER
);

CREATE TABLE IF NOT EXISTS l2.metric_threshold (
  threshold_id BIGINT NOT NULL PRIMARY KEY,
  metric_definition_id BIGINT NOT NULL,
  as_of_date DATE,
  threshold_value NUMERIC(18,4),
  threshold_type VARCHAR(50),
  CONSTRAINT fk_metric_threshold_metric_definition_id FOREIGN KEY (metric_definition_id) REFERENCES l1.metric_definition_dim(metric_definition_id)
);

CREATE TABLE IF NOT EXISTS l2.facility_credit_approval (
  approval_id BIGINT NOT NULL PRIMARY KEY,
  facility_id BIGINT NOT NULL,
  counterparty_id BIGINT,
  as_of_date DATE NOT NULL,
  approval_status VARCHAR(30),
  approval_date DATE,
  approved_amount NUMERIC(18,2),
  exception_flag CHAR(1),
  exception_type VARCHAR(50),
  exception_type_code VARCHAR(30),
  exception_severity VARCHAR(30),
  exception_reason VARCHAR(500),
  approved_by VARCHAR(100),
  expiry_date DATE,
  CONSTRAINT fk_facility_credit_approval_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_facility_credit_approval_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
);

CREATE TABLE IF NOT EXISTS l2.payment_ledger (
  payment_id BIGSERIAL NOT NULL PRIMARY KEY,
  counterparty_id BIGINT NOT NULL,
  facility_id BIGINT NOT NULL,
  contract_id BIGINT,
  position_id BIGINT,
  payment_amount_due NUMERIC(18,2),
  payment_due_date DATE,
  payment_amount_made NUMERIC(18,2),
  payment_date DATE,
  fee_due_amt NUMERIC(18,2),
  payment_applied_amt NUMERIC(18,2),
  applied_date DATE,
  payment_status VARCHAR(30),
  currency_code VARCHAR(20),
  created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts TIMESTAMP,
  CONSTRAINT fk_payment_ledger_counterparty_id FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id),
  CONSTRAINT fk_payment_ledger_facility_id FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id),
  CONSTRAINT fk_payment_ledger_position_id FOREIGN KEY (position_id) REFERENCES l2.position(position_id),
  CONSTRAINT fk_payment_ledger_currency_code FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code)
);

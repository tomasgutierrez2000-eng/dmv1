-- =============================================================================
-- L1 Core Tables — Google Cloud BigQuery Compatible
-- =============================================================================
-- 5 key L1 tables for upload to Google Cloud BigQuery.
-- Adapted from PostgreSQL DDL to BigQuery Standard SQL.
--
-- Tables (in dependency order):
--   1. l1.currency_dim        — Reference: currency codes (no FK deps)
--   2. l1.country_dim         — Reference: country codes (no FK deps)
--   3. l1.counterparty        — Master: borrower/obligor data
--   4. l1.legal_entity        — Master: internal bank entities
--   5. l1.facility_master     — Master: credit facility details
--
-- NOTE: BigQuery does not enforce FOREIGN KEY constraints. They are declared
-- below for documentation purposes only (BigQuery supports FK declarations
-- as metadata but does not enforce them at INSERT time).
--
-- Prerequisites for facility_master FKs (not included in this file):
--   l1.entity_type_dim, l1.industry_dim, l1.portfolio_dim,
--   l1.enterprise_business_taxonomy, l1.enterprise_product_taxonomy,
--   l1.interest_rate_index_dim, l1.ledger_account_dim,
--   l1.credit_agreement_master
-- =============================================================================

-- Create dataset (run once via bq CLI or Console):
--   bq mk --dataset --location=US <project_id>:l1

-- -----------------------------------------------------------------------------
-- 1. currency_dim
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS l1.currency_dim (
  currency_code       STRING NOT NULL,
  currency_name       STRING,
  currency_symbol     STRING,
  is_active           STRING,
  iso_numeric         STRING,
  minor_unit_decimals INT64,
  is_g10_currency     STRING
)
OPTIONS (
  description = 'L1 reference dimension: ISO 4217 currency codes'
);

-- -----------------------------------------------------------------------------
-- 2. country_dim
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS l1.country_dim (
  country_code              STRING NOT NULL,
  country_name              STRING,
  is_active                 STRING,
  region_code               STRING,
  basel_country_risk_weight  STRING,
  is_developed_market       STRING,
  is_fatf_high_risk         STRING,
  is_ofac_sanctioned        STRING,
  iso_alpha_3               STRING,
  iso_numeric               STRING,
  jurisdiction_id           INT64
)
OPTIONS (
  description = 'L1 reference dimension: ISO 3166 country codes with regulatory attributes'
);

-- -----------------------------------------------------------------------------
-- 3. counterparty
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS l1.counterparty (
  counterparty_id              INT64 NOT NULL,
  legal_name                   STRING,
  counterparty_type            STRING NOT NULL,
  country_code                 STRING NOT NULL,
  entity_type_code             STRING NOT NULL,
  industry_id                  INT64 NOT NULL,
  basel_asset_class             STRING,
  basel_risk_grade              STRING,
  call_report_counterparty_type STRING,
  country_of_domicile          INT64,
  country_of_incorporation     NUMERIC,
  country_of_risk              INT64,
  external_rating_fitch        STRING,
  external_rating_moodys       STRING,
  external_rating_sp           STRING,
  fr2590_counterparty_type     STRING,
  internal_risk_rating         STRING,
  is_affiliated                STRING,
  is_central_counterparty      STRING,
  is_financial_institution     STRING,
  is_insider                   STRING,
  is_multilateral_dev_bank     STRING,
  is_parent_flag               STRING,
  is_public_sector_entity      STRING,
  is_regulated_entity          STRING,
  is_sovereign                 STRING,
  lei_code                     STRING,
  lgd_unsecured                NUMERIC,
  pd_annual                    NUMERIC,
  regulatory_counterparty_type STRING,
  updated_ts                   TIMESTAMP,
  y14_obligor_type             STRING,
  effective_start_date         DATE NOT NULL,
  effective_end_date           DATE,
  is_current_flag              STRING DEFAULT 'Y',
  created_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (
  description = 'L1 master: counterparty/obligor records (SCD-2 history)'
);

-- -----------------------------------------------------------------------------
-- 4. legal_entity
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS l1.legal_entity (
  legal_entity_id         INT64 NOT NULL,
  legal_name              STRING,
  legal_entity_name       STRING,
  country_code            STRING NOT NULL,
  active_flag             STRING,
  entity_type_code        STRING,
  functional_currency_code STRING,
  institution_id          INT64,
  is_reporting_entity     STRING,
  lei_code                STRING,
  primary_regulator       STRING,
  rssd_id                 INT64,
  short_name              STRING,
  tax_id                  INT64,
  updated_ts              TIMESTAMP,
  effective_start_date    DATE NOT NULL,
  effective_end_date      DATE,
  is_current_flag         STRING DEFAULT 'Y',
  created_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (
  description = 'L1 master: internal bank legal entities (SCD-2 history)'
);

-- -----------------------------------------------------------------------------
-- 5. facility_master
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS l1.facility_master (
  facility_id              INT64 NOT NULL,
  credit_agreement_id      INT64 NOT NULL,
  counterparty_id          INT64 NOT NULL,
  currency_code            STRING NOT NULL,
  facility_name            STRING,
  facility_type            STRING NOT NULL,
  facility_status          STRING NOT NULL,
  committed_facility_amt   NUMERIC,
  origination_date         DATE NOT NULL,
  maturity_date            DATE,
  portfolio_id             INT64 NOT NULL,
  industry_code            STRING,
  lob_segment_id           INT64 NOT NULL,
  product_node_id          INT64 NOT NULL,
  rate_index_id            INT64 NOT NULL,
  ledger_account_id        INT64 NOT NULL,
  created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_ts               TIMESTAMP,
  all_in_rate_pct          NUMERIC,
  amortization_type        STRING,
  created_by               STRING,
  day_count_convention     INT64,
  facility_reference       STRING,
  interest_rate_reference  NUMERIC,
  interest_rate_spread_bps NUMERIC,
  interest_rate_type       NUMERIC,
  next_repricing_date      DATE,
  payment_frequency        STRING,
  prepayment_penalty_flag  STRING,
  product_id               INT64,
  rate_cap_pct             NUMERIC,
  rate_floor_pct           NUMERIC,
  region_code              STRING,
  revolving_flag           STRING,
  effective_start_date     DATE NOT NULL,
  effective_end_date       DATE,
  is_current_flag          STRING DEFAULT 'Y'
)
OPTIONS (
  description = 'L1 master: credit facility details with terms and pricing (SCD-2 history)'
);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- currency_dim (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES
  ('USD', 'US Dollar', '$', 'Y', '840', 2, 'Y'),
  ('EUR', 'Euro', '\u20AC', 'Y', '978', 2, 'Y'),
  ('GBP', 'British Pound', '\u00A3', 'Y', '826', 2, 'Y'),
  ('CHF', 'Swiss Franc', 'CHF', 'Y', '756', 2, 'Y'),
  ('JPY', 'Japanese Yen', '\u00A5', 'Y', '392', 0, 'Y'),
  ('CAD', 'Canadian Dollar', 'C$', 'Y', '124', 2, 'Y'),
  ('AUD', 'Australian Dollar', 'A$', 'Y', '036', 2, 'Y'),
  ('CNY', 'Chinese Yuan', '\u00A5', 'Y', '156', 2, 'N'),
  ('HKD', 'Hong Kong Dollar', 'HK$', 'Y', '344', 2, 'N'),
  ('SGD', 'Singapore Dollar', 'S$', 'Y', '702', 2, 'N');

-- -----------------------------------------------------------------------------
-- country_dim (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES
  ('US', 'United States', 'Y', 'AMER', '0', 'Y', 'N', 'N', 'USA', '840', 1),
  ('GB', 'United Kingdom', 'Y', 'EMEA', '0', 'Y', 'N', 'N', 'GBR', '826', 2),
  ('DE', 'Germany', 'Y', 'EMEA', '0', 'Y', 'N', 'N', 'DEU', '276', 3),
  ('FR', 'France', 'Y', 'EMEA', '0', 'Y', 'N', 'N', 'FRA', '250', 4),
  ('JP', 'Japan', 'Y', 'APAC', '0', 'Y', 'N', 'N', 'JPN', '392', 5),
  ('CH', 'Switzerland', 'Y', 'EMEA', '0', 'Y', 'N', 'N', 'CHE', '756', 6),
  ('CA', 'Canada', 'Y', 'AMER', '0', 'Y', 'N', 'N', 'CAN', '124', 7),
  ('AU', 'Australia', 'Y', 'APAC', '0', 'Y', 'N', 'N', 'AUS', '036', 8),
  ('NL', 'Netherlands', 'Y', 'EMEA', '0', 'Y', 'N', 'N', 'NLD', '528', 9),
  ('SG', 'Singapore', 'Y', 'APAC', '0', 'Y', 'N', 'N', 'SGP', '702', 10);

-- -----------------------------------------------------------------------------
-- counterparty (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO l1.counterparty (counterparty_id, legal_name, counterparty_type, country_code, entity_type_code, industry_id, basel_asset_class, basel_risk_grade, call_report_counterparty_type, country_of_domicile, country_of_incorporation, country_of_risk, external_rating_fitch, external_rating_moodys, external_rating_sp, fr2590_counterparty_type, internal_risk_rating, is_affiliated, is_central_counterparty, is_financial_institution, is_insider, is_multilateral_dev_bank, is_parent_flag, is_public_sector_entity, is_regulated_entity, is_sovereign, lei_code, lgd_unsecured, pd_annual, regulatory_counterparty_type, updated_ts, y14_obligor_type, effective_start_date, effective_end_date, is_current_flag, created_ts) VALUES
  (1, 'Meridian Aerospace Holdings Inc.', 'CORPORATE', 'US', 'CORP', 1, 'CORPORATE', '4', 'C&I_DOMESTIC', 1, 1, 1, 'A+', 'A1', 'A+', 'C&I', '3', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900ABCDEF123456XX', 0.45, 0.0012, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (2, 'Northbridge Pharmaceuticals Corp.', 'CORPORATE', 'US', 'CORP', 2, 'CORPORATE', '5', 'C&I_DOMESTIC', 1, 1, 1, 'BBB+', 'Baa1', 'BBB+', 'C&I', '4', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900GHIJKL789012YY', 0.45, 0.0035, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (3, 'Pacific Ridge Energy LLC', 'CORPORATE', 'US', 'CORP', 4, 'CORPORATE', '6', 'C&I_DOMESTIC', 1, 1, 1, 'BBB', 'Baa2', 'BBB', 'C&I', '5', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900MNOPQR345678ZZ', 0.4, 0.0058, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (4, 'Silverton Financial Group', 'BANK', 'GB', 'FI', 3, 'BANK', '2', 'DEPOSITORY', 2, 2, 2, 'AA-', 'Aa3', 'AA-', 'FI', '2', 'N', 'N', 'Y', 'N', 'N', 'Y', 'N', 'Y', 'N', '213800STUVWX901234AA', 0.45, 0.0005, 'BANK', '2024-06-15 12:00:00', 'BANK', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (5, 'Atlas Industrial Technologies Inc.', 'CORPORATE', 'DE', 'CORP', 5, 'CORPORATE', '5', 'C&I_FOREIGN', 3, 3, 3, 'BBB+', 'Baa1', 'BBB+', 'C&I', '4', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '391200BCDEFG567890BB', 0.45, 0.0035, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (6, 'Greenfield Consumer Brands Inc.', 'CORPORATE', 'US', 'CORP', 6, 'CORPORATE', '4', 'C&I_DOMESTIC', 1, 1, 1, 'A', 'A2', 'A', 'C&I', '3', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900HIJKLM123456CC', 0.45, 0.0018, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (7, 'Pinnacle Healthcare Systems Corp.', 'CORPORATE', 'US', 'CORP', 2, 'CORPORATE', '7', 'C&I_DOMESTIC', 1, 1, 1, 'BBB-', 'Baa3', 'BBB-', 'C&I', '5', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900NOPQRS789012DD', 0.45, 0.0072, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (8, 'Westlake Materials Group Ltd.', 'CORPORATE', 'AU', 'CORP', 9, 'CORPORATE', '8', 'C&I_FOREIGN', 8, 8, 8, 'BB+', 'Ba1', 'BB+', 'C&I', '6', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '969500TUVWXY345678EE', 0.45, 0.0125, 'CORPORATE', '2024-06-15 12:00:00', 'MIDDLE_MARKET', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (9, 'Ironclad Infrastructure Partners LP', 'CORPORATE', 'CA', 'PE', 5, 'CORPORATE', '7', 'C&I_FOREIGN', 7, 7, 7, 'BBB-', 'Baa3', 'BBB-', 'C&I', '5', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900FGHIJK901234FF', 0.35, 0.0072, 'CORPORATE', '2024-06-15 12:00:00', 'LARGE_CORPORATE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (10, 'Crestview Real Estate Investment Trust', 'RE_TRUST', 'US', 'RE', 10, 'CRE', '6', 'CRE_NONFARM', 1, 1, 1, 'BBB', 'Baa2', 'BBB', 'CRE', '4', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N', 'N', '529900LMNOPQ567890GG', 0.25, 0.0045, 'CRE', '2024-06-15 12:00:00', 'CRE', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00');

-- -----------------------------------------------------------------------------
-- legal_entity (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO l1.legal_entity (legal_entity_id, legal_name, legal_entity_name, country_code, active_flag, entity_type_code, functional_currency_code, institution_id, is_reporting_entity, lei_code, primary_regulator, rssd_id, short_name, tax_id, updated_ts, effective_start_date, effective_end_date, is_current_flag, created_ts) VALUES
  (1, 'Meridian National Bank, N.A.', 'Meridian National Bank, N.A.', 'US', 'Y', 'BANK', 'USD', 1, 'Y', '529900ABCDEF123456XX', 'OCC', 480228, 'MNB', 560505001, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (2, 'Meridian Securities Inc.', 'Meridian Securities Inc.', 'GB', 'Y', 'FI', 'USD', 1, 'Y', '529900GHIJKL789012YY', 'SEC', 480229, 'MSI', 560505002, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (3, 'Meridian Capital Corporation', 'Meridian Capital Corporation', 'DE', 'Y', 'CORP', 'USD', 1, 'N', '529900MNOPQR345678ZZ', 'FRB', 480230, 'MCC', 560505003, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (4, 'Meridian Bank Europe DAC', 'Meridian Bank Europe DAC', 'FR', 'Y', 'BANK', 'EUR', 1, 'Y', '213800STUVWX901234AA', 'ECB', 0, 'MBE', 0, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (5, 'Meridian Securities Europe SA', 'Meridian Securities Europe SA', 'JP', 'Y', 'FI', 'EUR', 1, 'N', '391200BCDEFG567890BB', 'AMF', 0, 'MSE', 0, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (6, 'Meridian Bank (Japan) Ltd.', 'Meridian Bank (Japan) Ltd.', 'CH', 'Y', 'BANK', 'JPY', 1, 'Y', '529900HIJKLM123456CC', 'FSA', 0, 'MBJ', 0, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (7, 'Meridian Bank Canada', 'Meridian Bank Canada', 'CA', 'Y', 'BANK', 'CAD', 1, 'Y', '529900NOPQRS789012DD', 'OSFI', 0, 'MBC', 0, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (8, 'Meridian Wealth Management LLC', 'Meridian Wealth Management LLC', 'AU', 'Y', 'FI', 'USD', 1, 'N', '969500TUVWXY345678EE', 'SEC', 480234, 'MWM', 560505008, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (9, 'Meridian Leasing Corp.', 'Meridian Leasing Corp.', 'NL', 'Y', 'CORP', 'USD', 1, 'N', '529900FGHIJK901234FF', 'OCC', 480235, 'MLC', 560505009, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00'),
  (10, 'Meridian Merchant Services Inc.', 'Meridian Merchant Services Inc.', 'SG', 'Y', 'CORP', 'USD', 1, 'N', '529900LMNOPQ567890GG', 'OCC', 480236, 'MMS', 560505010, '2024-06-15 12:00:00', '2024-01-01', NULL, 'Y', '2024-06-15 12:00:00');

-- -----------------------------------------------------------------------------
-- facility_master (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO l1.facility_master (facility_id, credit_agreement_id, counterparty_id, currency_code, facility_name, facility_type, facility_status, committed_facility_amt, origination_date, maturity_date, portfolio_id, industry_code, lob_segment_id, product_node_id, rate_index_id, ledger_account_id, created_ts, updated_ts, all_in_rate_pct, amortization_type, created_by, day_count_convention, facility_reference, interest_rate_reference, interest_rate_spread_bps, interest_rate_type, next_repricing_date, payment_frequency, prepayment_penalty_flag, product_id, rate_cap_pct, rate_floor_pct, region_code, revolving_flag, effective_start_date, effective_end_date, is_current_flag) VALUES
  (1, 1, 1, 'USD', 'Meridian Aerospace \u2014 USD Revolver 2027', 'REVOLVING_CREDIT', 'ACTIVE', 250000000, '2022-03-15', '2027-03-15', 1, 'TMT', 1, 1, 1, 1, '2024-06-15', '2024-06-15 12:00:00', 4.85, 'BULLET', 'SYSTEM', 1, 'FAC-2022-001-A', 3.6, 125, 'FLOATING', '2025-04-30', 'QUARTERLY', 'Y', 1, 8, 1, 'AMER', 'Y', '2024-01-01', NULL, 'Y'),
  (2, 2, 2, 'EUR', 'Northbridge Pharma \u2014 Term Loan B', 'TERM_LOAN', 'ACTIVE', 500000000, '2023-06-01', '2028-06-01', 2, 'HC', 2, 2, 2, 2, '2024-06-15', '2024-06-15 12:00:00', 6.25, 'AMORTIZING', 'SYSTEM', 2, 'FAC-2023-042-A', 4, 225, 'FIXED', '9999-12-31', 'MONTHLY', 'N', 2, 9.5, 1.5, 'EMEA', 'N', '2024-01-01', NULL, 'Y'),
  (3, 3, 3, 'GBP', 'Pacific Ridge \u2014 Multi-Currency RCF', 'REVOLVING_CREDIT', 'ACTIVE', 1000000000, '2022-09-20', '2026-09-20', 3, 'FIN', 3, 3, 3, 3, '2024-06-15', '2024-06-15 12:00:00', 5.1, 'BULLET', 'SYSTEM', 1, 'FAC-2022-108-A', 3.6, 150, 'FLOATING', '2025-04-30', 'QUARTERLY', 'N', 3, 8.5, 1, 'EMEA', 'Y', '2024-01-01', NULL, 'Y'),
  (4, 4, 4, 'CHF', 'Silverton Financial \u2014 Bridge Facility', 'TERM_LOAN_B', 'ACTIVE', 2500000000, '2024-01-10', '2029-01-10', 4, 'ENE', 4, 4, 4, 4, '2024-06-15', '2024-06-15 12:00:00', 7.15, 'AMORTIZING', 'SYSTEM', 1, 'FAC-2024-015-A', 4, 315, 'FIXED', '9999-12-31', 'QUARTERLY', 'Y', 4, 10, 2, 'EMEA', 'N', '2024-01-01', NULL, 'Y'),
  (5, 5, 5, 'JPY', 'Atlas Industrial \u2014 Working Capital RCF', 'BRIDGE_LOAN', 'PENDING', 750000000, '2023-11-01', '2028-11-01', 5, 'IND', 5, 5, 5, 5, '2024-06-15', '2024-06-15 12:00:00', 5.75, 'BULLET', 'SYSTEM', 2, 'FAC-2023-089-A', 3.75, 200, 'FLOATING', '2025-04-30', 'MONTHLY', 'N', 5, 9, 1.25, 'APAC', 'N', '2024-01-01', NULL, 'Y'),
  (6, 6, 6, 'CAD', 'Greenfield Consumer \u2014 Syndicated RCF', 'REVOLVING_CREDIT', 'ACTIVE', 1500000000, '2021-07-15', '2026-07-15', 6, 'CON', 6, 6, 6, 6, '2024-06-15', '2024-06-15 12:00:00', 4.5, 'BULLET', 'SYSTEM', 1, 'FAC-2022-033-A', 3.5, 100, 'FIXED', '9999-12-31', 'QUARTERLY', 'N', 6, 7.5, 0.75, 'EMEA', 'Y', '2024-01-01', NULL, 'Y'),
  (7, 7, 7, 'AUD', 'Pinnacle Healthcare \u2014 Bilateral Term', 'TERM_LOAN', 'MATURED', 3000000000, '2020-12-01', '2025-12-01', 7, 'RET', 7, 7, 7, 7, '2024-06-15', '2024-06-15 12:00:00', 5.9, 'AMORTIZING', 'SYSTEM', 2, 'FAC-2021-056-A', 3.5, 240, 'FLOATING', '2025-04-30', 'MONTHLY', 'Y', 7, 9.5, 1.5, 'AMER', 'N', '2024-01-01', NULL, 'Y'),
  (8, 8, 8, 'CNY', 'Westlake Materials \u2014 L/C Facility', 'LETTER_OF_CREDIT', 'ACTIVE', 400000000, '2024-02-28', '2029-02-28', 8, 'UTL', 8, 8, 8, 8, '2024-06-15', '2024-06-15 12:00:00', 3.25, 'BULLET', 'SYSTEM', 1, 'FAC-2024-002-A', 2.5, 75, 'FIXED', '9999-12-31', 'QUARTERLY', 'N', 8, 6, 0.5, 'APAC', 'N', '2024-01-01', NULL, 'Y'),
  (9, 9, 9, 'HKD', 'Ironclad Infrastructure \u2014 Global Revolver', 'REVOLVING_CREDIT', 'ACTIVE', 600000000, '2023-04-15', '2028-04-15', 9, 'MAT', 9, 9, 9, 9, '2024-06-15', '2024-06-15 12:00:00', 5.35, 'BULLET', 'SYSTEM', 1, 'FAC-2023-021-A', 3.5, 185, 'FLOATING', '2025-04-30', 'QUARTERLY', 'N', 9, 8.5, 1, 'EMEA', 'Y', '2024-01-01', NULL, 'Y'),
  (10, 10, 10, 'SGD', 'Crestview REIT \u2014 Credit Facility', 'TERM_LOAN', 'ACTIVE', 5000000000, '2022-06-30', '2027-06-30', 10, 'CD', 10, 10, 10, 10, '2024-06-15', '2024-06-15 12:00:00', 6.5, 'AMORTIZING', 'SYSTEM', 2, 'FAC-2022-077-A', 3.5, 300, 'FIXED', '9999-12-31', 'MONTHLY', 'Y', 10, 10, 2, 'APAC', 'N', '2024-01-01', NULL, 'Y');


-- =============================================================================
-- UPLOAD INSTRUCTIONS (Google Cloud)
-- =============================================================================
--
-- Option A: BigQuery Console
--   1. Open https://console.cloud.google.com/bigquery
--   2. Create dataset: bq mk --dataset --location=US <project>:l1
--   3. Paste DDL section into the query editor and run
--   4. Paste INSERT section and run
--
-- Option B: bq CLI
--   bq query --use_legacy_sql=false < l1_core_5_tables.sql
--
-- Option C: Cloud Storage + bq load (for large data)
--   1. Upload this file to GCS:
--      gsutil cp l1_core_5_tables.sql gs://<bucket>/l1/
--   2. Or export seed data as CSV/JSON and use:
--      bq load --source_format=CSV l1.currency_dim gs://<bucket>/l1/currency_dim.csv
--
-- Option D: Terraform / Infrastructure as Code
--   Use google_bigquery_table resources with the schema above.
--
-- =============================================================================

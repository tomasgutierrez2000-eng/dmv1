-- Migration 009: ECL/CECL/IFRS9 provisioning + Watchlist/Forbearance tables
-- GSIB Audit finding: No coverage for expected credit loss staging, allowance
-- movements, watchlist management, or forbearance/restructuring tracking.
-- Adds 4 L1 dims, 3 L2 event/snapshot tables, 3 L3 calc/summary tables.
-- Part of GSIB Audit Remediation — regulatory coverage gaps.

CREATE SCHEMA IF NOT EXISTS l1;
CREATE SCHEMA IF NOT EXISTS l2;
CREATE SCHEMA IF NOT EXISTS l3;
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- L1 REFERENCE TABLES (4)
-----------------------------------------------------------------------

-- ECL stage dimension (IFRS 9 / CECL staging)
CREATE TABLE IF NOT EXISTS l1.ecl_stage_dim (
    "ecl_stage_code"      VARCHAR(20) NOT NULL PRIMARY KEY,
    "stage_name"           VARCHAR(500),
    "description"          VARCHAR(500),
    "ifrs9_stage_mapping"  VARCHAR(500),
    "cecl_equivalent"      VARCHAR(500),
    "display_order"        INTEGER,
    "active_flag"          BOOLEAN DEFAULT TRUE,
    "created_ts"           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"        VARCHAR(100),
    "created_by"           VARCHAR(100)
);

-- Impairment model dimension (IFRS9 vs CECL framework)
CREATE TABLE IF NOT EXISTS l1.impairment_model_dim (
    "model_code"            VARCHAR(20) NOT NULL PRIMARY KEY,
    "model_name"            VARCHAR(500),
    "regulatory_framework"  VARCHAR(500),
    "description"           VARCHAR(500),
    "active_flag"           BOOLEAN DEFAULT TRUE,
    "created_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"         VARCHAR(100),
    "created_by"            VARCHAR(100)
);

-- Watchlist category dimension
CREATE TABLE IF NOT EXISTS l1.watchlist_category_dim (
    "watchlist_category_code" VARCHAR(20) NOT NULL PRIMARY KEY,
    "category_name"           VARCHAR(500),
    "description"             VARCHAR(500),
    "severity_ordinal"        INTEGER,
    "display_order"           INTEGER,
    "active_flag"             BOOLEAN DEFAULT TRUE,
    "created_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"           VARCHAR(100),
    "created_by"              VARCHAR(100)
);

-- Forbearance type dimension
CREATE TABLE IF NOT EXISTS l1.forbearance_type_dim (
    "forbearance_type_code" VARCHAR(20) NOT NULL PRIMARY KEY,
    "type_name"              VARCHAR(500),
    "description"            VARCHAR(500),
    "display_order"          INTEGER,
    "active_flag"            BOOLEAN DEFAULT TRUE,
    "created_ts"             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"          VARCHAR(100),
    "created_by"             VARCHAR(100)
);

-----------------------------------------------------------------------
-- L2 ATOMIC TABLES (3)
-----------------------------------------------------------------------

-- ECL staging snapshot — facility-level stage assignment per reporting date
CREATE TABLE IF NOT EXISTS l2.ecl_staging_snapshot (
    "ecl_staging_id"            BIGSERIAL PRIMARY KEY,
    "facility_id"               BIGINT,
    "counterparty_id"           BIGINT,
    "as_of_date"                DATE,
    "ecl_stage_code"            VARCHAR(20),
    "prior_stage_code"          VARCHAR(20),
    "stage_change_date"         DATE,
    "stage_change_reason"       VARCHAR(500),
    "model_code"                VARCHAR(20),
    "days_past_due"             INTEGER,
    "significant_increase_flag" BOOLEAN,
    "credit_impaired_flag"      BOOLEAN,
    "currency_code"             VARCHAR(20),
    "created_ts"                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"             VARCHAR(100),
    "created_by"                VARCHAR(100)
);

-- Watchlist entry — tracks counterparty/facility watchlist membership
CREATE TABLE IF NOT EXISTS l2.watchlist_entry (
    "watchlist_entry_id"      BIGSERIAL PRIMARY KEY,
    "counterparty_id"         BIGINT,
    "facility_id"             BIGINT,
    "watchlist_category_code" VARCHAR(20),
    "entry_date"              DATE,
    "exit_date"               DATE,
    "entry_reason"            VARCHAR(500),
    "exit_reason"             VARCHAR(500),
    "assigned_officer"        VARCHAR(500),
    "review_frequency"        VARCHAR(500),
    "next_review_date"        DATE,
    "as_of_date"              DATE,
    "is_current_flag"         BOOLEAN DEFAULT TRUE,
    "created_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"           VARCHAR(100),
    "created_by"              VARCHAR(100)
);

-- Forbearance event — individual forbearance/restructuring actions
CREATE TABLE IF NOT EXISTS l2.forbearance_event (
    "forbearance_event_id"     BIGSERIAL PRIMARY KEY,
    "facility_id"              BIGINT,
    "counterparty_id"          BIGINT,
    "forbearance_type_code"    VARCHAR(20),
    "event_date"               DATE,
    "original_maturity_date"   DATE,
    "modified_maturity_date"   DATE,
    "original_rate_pct"        NUMERIC(10,6),
    "modified_rate_pct"        NUMERIC(10,6),
    "maturity_extension_months" INTEGER,
    "principal_forgiven_amt"   NUMERIC(20,4),
    "currency_code"            VARCHAR(20),
    "approval_date"            DATE,
    "approved_by"              VARCHAR(500),
    "as_of_date"               DATE,
    "created_ts"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"            VARCHAR(100),
    "created_by"               VARCHAR(100)
);

-----------------------------------------------------------------------
-- L3 DERIVED TABLES (3)
-----------------------------------------------------------------------

-- ECL provision calculation — facility-level ECL amounts (12-month + lifetime)
CREATE TABLE IF NOT EXISTS l3.ecl_provision_calc (
    "ecl_provision_id"      BIGSERIAL PRIMARY KEY,
    "facility_id"           BIGINT,
    "counterparty_id"       BIGINT,
    "as_of_date"            DATE,
    "ecl_stage_code"        VARCHAR(20),
    "twelve_month_ecl_amt"  NUMERIC(20,4),
    "lifetime_ecl_amt"      NUMERIC(20,4),
    "provision_amt"         NUMERIC(20,4),
    "lifetime_pd_pct"       NUMERIC(10,6),
    "twelve_month_pd_pct"   NUMERIC(10,6),
    "lgd_pct"               NUMERIC(10,6),
    "ead_amt"               NUMERIC(20,4),
    "stage_transfer_flag"   BOOLEAN,
    "model_code"            VARCHAR(20),
    "currency_code"         VARCHAR(20),
    "created_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"         VARCHAR(100),
    "created_by"            VARCHAR(100)
);

-- ECL allowance movement — entity-level stage-by-stage roll-forward
CREATE TABLE IF NOT EXISTS l3.ecl_allowance_movement (
    "allowance_movement_id" BIGSERIAL PRIMARY KEY,
    "legal_entity_id"       BIGINT,
    "as_of_date"            DATE,
    "ecl_stage_code"        VARCHAR(20),
    "opening_balance_amt"   NUMERIC(20,4),
    "provision_charge_amt"  NUMERIC(20,4),
    "write_off_amt"         NUMERIC(20,4),
    "recovery_amt"          NUMERIC(20,4),
    "fx_adjustment_amt"     NUMERIC(20,4),
    "stage_transfer_amt"    NUMERIC(20,4),
    "closing_balance_amt"   NUMERIC(20,4),
    "currency_code"         VARCHAR(20),
    "created_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"         VARCHAR(100),
    "created_by"            VARCHAR(100)
);

-- Watchlist movement summary — period-over-period watchlist activity
CREATE TABLE IF NOT EXISTS l3.watchlist_movement_summary (
    "movement_summary_id"     BIGSERIAL PRIMARY KEY,
    "as_of_date"              DATE,
    "watchlist_category_code" VARCHAR(20),
    "legal_entity_id"         BIGINT,
    "entry_count"             INTEGER,
    "exit_count"              INTEGER,
    "net_change"              INTEGER,
    "total_exposure_amt"      NUMERIC(20,4),
    "total_facilities_count"  INTEGER,
    "currency_code"           VARCHAR(20),
    "created_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts"              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "record_source"           VARCHAR(100),
    "created_by"              VARCHAR(100)
);

-----------------------------------------------------------------------
-- SEED DATA — L1 dimension tables
-----------------------------------------------------------------------

-- ECL stages (IFRS 9 standard)
INSERT INTO l1.ecl_stage_dim (ecl_stage_code, stage_name, description, ifrs9_stage_mapping, cecl_equivalent, display_order, active_flag, record_source)
VALUES
  ('STAGE_1', 'Stage 1 — Performing',       '12-month ECL; no significant increase in credit risk since origination', 'Stage 1', 'Current — collective',     1, TRUE, 'SEED'),
  ('STAGE_2', 'Stage 2 — Under-performing',  'Lifetime ECL; significant increase in credit risk but not credit-impaired', 'Stage 2', 'Current — individual',   2, TRUE, 'SEED'),
  ('STAGE_3', 'Stage 3 — Non-performing',    'Lifetime ECL; credit-impaired (objective evidence of impairment)',          'Stage 3', 'Non-accrual / impaired', 3, TRUE, 'SEED'),
  ('POCI',    'Purchased/Originated Credit-Impaired', 'Lifetime ECL from initial recognition; originated or purchased already credit-impaired', 'POCI', 'PCD (Purchased Credit Deteriorated)', 4, TRUE, 'SEED')
ON CONFLICT DO NOTHING;

-- Impairment models
INSERT INTO l1.impairment_model_dim (model_code, model_name, regulatory_framework, description, active_flag, record_source)
VALUES
  ('IFRS9', 'IFRS 9 Expected Credit Loss', 'IFRS',    'International Financial Reporting Standard 9 — forward-looking ECL model with 3-stage classification', TRUE, 'SEED'),
  ('CECL',  'CECL Current Expected Credit Loss', 'US GAAP', 'ASC 326 — Current Expected Credit Losses; lifetime loss from Day 1, no staging',                TRUE, 'SEED')
ON CONFLICT DO NOTHING;

-- Watchlist categories (OCC/Fed standard classification)
INSERT INTO l1.watchlist_category_dim (watchlist_category_code, category_name, description, severity_ordinal, display_order, active_flag, record_source)
VALUES
  ('EARLY_WARNING',  'Early Warning',   'Pre-watchlist flag; early indicators of potential deterioration',                            1, 1, TRUE, 'SEED'),
  ('SPECIAL_MENTION','Special Mention',  'OCC classification: potential weaknesses that deserve close attention (Pass/Watch)',         2, 2, TRUE, 'SEED'),
  ('SUBSTANDARD',    'Substandard',      'OCC classification: well-defined weakness jeopardizing repayment; loss possible if not corrected', 3, 3, TRUE, 'SEED'),
  ('DOUBTFUL',       'Doubtful',         'OCC classification: full collection highly unlikely; loss expected but amount not yet determinable', 4, 4, TRUE, 'SEED'),
  ('LOSS',           'Loss',             'OCC classification: uncollectible; of such little value that continued carrying is not warranted',  5, 5, TRUE, 'SEED')
ON CONFLICT DO NOTHING;

-- Forbearance types
INSERT INTO l1.forbearance_type_dim (forbearance_type_code, type_name, description, display_order, active_flag, record_source)
VALUES
  ('TERM_EXT',          'Term Extension',         'Extension of the facility maturity date without other modifications',  1, TRUE, 'SEED'),
  ('RATE_RED',          'Rate Reduction',          'Reduction in interest rate or fee schedule',                           2, TRUE, 'SEED'),
  ('PMT_HOLIDAY',       'Payment Holiday',         'Temporary suspension of principal and/or interest payments',           3, TRUE, 'SEED'),
  ('PRINCIPAL_FORGIVE', 'Principal Forgiveness',   'Partial or full write-down of outstanding principal',                  4, TRUE, 'SEED'),
  ('DEBT_EQUITY',       'Debt-to-Equity Swap',     'Conversion of debt obligation to equity stake in the borrower',       5, TRUE, 'SEED'),
  ('RESTRUCTURE',       'Full Restructure',        'Comprehensive restructuring involving multiple forbearance measures',  6, TRUE, 'SEED')
ON CONFLICT DO NOTHING;

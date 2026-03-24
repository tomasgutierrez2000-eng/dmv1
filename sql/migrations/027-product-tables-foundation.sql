-- Migration 027: Product tables foundation
-- Creates L1 reference tables and extends l2.position for product-level data model
-- Date: 2026-03-23

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1A. l1.product_subtype_dim — Product subtypes (IRS, CDS, TERM_LOAN, etc.)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l1.product_subtype_dim (
    product_subtype_id        BIGSERIAL    PRIMARY KEY,
    product_subtype_code      VARCHAR(30)  NOT NULL UNIQUE,
    product_subtype_name      VARCHAR(200) NOT NULL,
    product_node_id           BIGINT,
    product_category          VARCHAR(64)  NOT NULL,
    is_active_flag            BOOLEAN      DEFAULT TRUE,
    created_ts                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_ts                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE l1.product_subtype_dim
  ADD CONSTRAINT fk_prod_subtype_ept
  FOREIGN KEY (product_node_id) REFERENCES l1.enterprise_product_taxonomy(product_node_id);

-- Seed: ~45 subtypes covering all 10 products
INSERT INTO l1.product_subtype_dim (product_subtype_code, product_subtype_name, product_category) VALUES
  -- Loans
  ('TERM_LOAN_A',    'Term Loan A',                     'Loans'),
  ('TERM_LOAN_B',    'Term Loan B',                     'Loans'),
  ('REVOLVER_DRAW',  'Revolving Credit Drawdown',       'Loans'),
  ('HELOC',          'Home Equity Line of Credit',       'Loans'),
  ('CRE_MORTGAGE',   'CRE Mortgage Loan',               'Loans'),
  ('RESI_MORTGAGE',  'Residential Mortgage',             'Loans'),
  ('C_AND_I',        'Commercial & Industrial Loan',     'Loans'),
  ('CONSUMER',       'Consumer Loan',                    'Loans'),
  ('BRIDGE_LOAN',    'Bridge Loan',                      'Loans'),
  ('LEVERAGED_LOAN', 'Leveraged Loan',                   'Loans'),
  -- Derivatives
  ('IRS',            'Interest Rate Swap',               'Derivatives'),
  ('CDS',            'Credit Default Swap',              'Derivatives'),
  ('FX_FORWARD',     'FX Forward',                       'Derivatives'),
  ('FX_OPTION',      'FX Option',                        'Derivatives'),
  ('EQUITY_SWAP',    'Equity Swap',                      'Derivatives'),
  ('COMMODITY_FUT',  'Commodity Future',                  'Derivatives'),
  ('SWAPTION',       'Swaption',                         'Derivatives'),
  ('TRS',            'Total Return Swap',                'Derivatives'),
  -- Securities
  ('GOVT_BOND',      'Government Bond',                  'Securities'),
  ('CORP_BOND',      'Corporate Bond',                   'Securities'),
  ('MBS',            'Mortgage-Backed Security',          'Securities'),
  ('ABS',            'Asset-Backed Security',             'Securities'),
  ('CLO',            'Collateralized Loan Obligation',    'Securities'),
  ('MUNI',           'Municipal Bond',                   'Securities'),
  ('AGENCY',         'Agency Security',                  'Securities'),
  -- SFT
  ('REPO',           'Repurchase Agreement',             'SFT'),
  ('REVERSE_REPO',   'Reverse Repurchase Agreement',     'SFT'),
  ('SEC_LENDING',    'Securities Lending',               'SFT'),
  ('SEC_BORROWING',  'Securities Borrowing',             'SFT'),
  ('MARGIN_LOAN',    'Margin Loan',                      'SFT'),
  -- Off-BS Commitments
  ('SBLC',           'Standby Letter of Credit',         'Off-BS Commitments'),
  ('COMM_LC',        'Commercial Letter of Credit',      'Off-BS Commitments'),
  ('UNFUNDED',       'Unfunded Commitment',              'Off-BS Commitments'),
  ('GUARANTEE',      'Financial Guarantee',              'Off-BS Commitments'),
  ('PERF_BOND',      'Performance Bond',                 'Off-BS Commitments'),
  -- Deposits
  ('DEMAND_DEP',     'Demand Deposit',                   'Deposits'),
  ('TIME_DEP',       'Time Deposit / CD',                'Deposits'),
  ('SAVINGS',        'Savings Account',                  'Deposits'),
  ('MMDA',           'Money Market Deposit',             'Deposits'),
  -- Borrowings
  ('FED_FUNDS',      'Federal Funds Purchased',          'Borrowings'),
  ('FHLB_ADV',       'FHLB Advance',                    'Borrowings'),
  ('BROKERED_DEP',   'Brokered Deposit',                'Borrowings'),
  -- Debt
  ('SENIOR_NOTE',    'Senior Unsecured Note',            'Debt'),
  ('SUBORD_NOTE',    'Subordinated Note',                'Debt'),
  ('COVERED_BOND',   'Covered Bond',                     'Debt'),
  -- Equities & Stock
  ('COMMON_EQ',      'Common Equity',                    'Equities'),
  ('PREFERRED_EQ',   'Preferred Equity',                 'Equities'),
  ('COMMON_STOCK',   'Common Stock',                     'Stock'),
  ('PREFERRED_STK',  'Preferred Stock',                  'Stock')
ON CONFLICT (product_subtype_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1B. l1.customer_counterparty_map — Source system customer → canonical CP
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l1.customer_counterparty_map (
    customer_counterparty_map_id  BIGSERIAL    PRIMARY KEY,
    source_system_id              BIGINT,
    source_customer_id            VARCHAR(64)  NOT NULL,
    counterparty_id               BIGINT       NOT NULL,
    effective_start_date          DATE,
    effective_end_date            DATE,
    is_current_flag               BOOLEAN      DEFAULT TRUE,
    created_ts                    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_ts                    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE l1.customer_counterparty_map
  ADD CONSTRAINT fk_cust_cp_map_cp
  FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 1C. Extend l1.enterprise_product_taxonomy — 4 new credit-risk fields
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE l1.enterprise_product_taxonomy
  ADD COLUMN IF NOT EXISTS is_on_balance_sheet_flag    BOOLEAN,
  ADD COLUMN IF NOT EXISTS ccf_default_pct             NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS risk_weight_default_pct     NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS accounting_treatment_code   VARCHAR(30);

-- Populate for existing top-level product nodes
UPDATE l1.enterprise_product_taxonomy SET is_on_balance_sheet_flag = TRUE  WHERE product_code IN ('TLA', 'TLB', 'RCF', 'BLNK', 'CLINE', 'SYNLN');
UPDATE l1.enterprise_product_taxonomy SET is_on_balance_sheet_flag = FALSE WHERE product_code IN ('SBLC', 'CLC', 'UCMT', 'GUAR', 'PBOND');
UPDATE l1.enterprise_product_taxonomy SET ccf_default_pct = 100.0 WHERE product_code IN ('GUAR', 'SBLC');
UPDATE l1.enterprise_product_taxonomy SET ccf_default_pct = 50.0  WHERE product_code = 'PBOND';
UPDATE l1.enterprise_product_taxonomy SET ccf_default_pct = 20.0  WHERE product_code = 'CLC';
UPDATE l1.enterprise_product_taxonomy SET ccf_default_pct = 40.0  WHERE product_code = 'UCMT';


-- ═══════════════════════════════════════════════════════════════════════════
-- 1D. Extend l2.position — add new fields for product-level grain
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE l2.position
  ADD COLUMN IF NOT EXISTS product_subtype_id              BIGINT,
  ADD COLUMN IF NOT EXISTS customer_id                     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS trade_date                      DATE,
  ADD COLUMN IF NOT EXISTS settlement_date                 DATE,
  ADD COLUMN IF NOT EXISTS is_hedging_flag                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accounting_classification_code  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cost_center_id                  BIGINT;

ALTER TABLE l2.position
  ADD CONSTRAINT fk_position_prod_subtype
  FOREIGN KEY (product_subtype_id) REFERENCES l1.product_subtype_dim(product_subtype_id);

-- Note: pd_estimate, lgd_estimate, external_risk_rating, internal_risk_rating
-- are L2 violations (derived data on atomic table). These will be migrated to
-- l3.position_exposure_calc in Phase 7 and then dropped from l2.position.
-- We leave them for now to avoid breaking existing queries.


COMMIT;

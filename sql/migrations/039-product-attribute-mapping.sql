-- Migration 039: L1 Product Attribute Mapping Tables
-- Metadata-driven source→target field mapping for L3 cross-product views
-- Enables: queryable lineage, SR 11-7 provenance audit, extensible product onboarding
-- Date: 2026-03-24

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Table 1: product_table_registry — Catalog of all product snapshot tables
-- SCD-1: Overwrite when metadata changes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l1.product_table_registry (
    product_table_id         BIGSERIAL    PRIMARY KEY,
    product_code             VARCHAR(30)  NOT NULL,
    snapshot_type_code       VARCHAR(30)  NOT NULL,
    table_schema             VARCHAR(10)  NOT NULL DEFAULT 'l2',
    table_name               VARCHAR(100) NOT NULL,
    field_count              INTEGER,
    pk_fields                VARCHAR(200) NOT NULL DEFAULT 'position_id, as_of_date',
    regulatory_schedule      VARCHAR(30),
    description              VARCHAR(500),
    is_active_flag           BOOLEAN      DEFAULT TRUE,
    created_ts               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prod_tbl_reg UNIQUE (table_schema, table_name)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- Table 2: product_attribute_mapping — Field-level source→target mapping
-- SCD-1: Overwrite when mapping changes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS l1.product_attribute_mapping (
    attribute_mapping_id     BIGSERIAL    PRIMARY KEY,
    product_table_id         BIGINT       NOT NULL,
    source_field_name        VARCHAR(200) NOT NULL,
    target_view_code         VARCHAR(30)  NOT NULL,
    target_field_name        VARCHAR(200) NOT NULL,
    mapping_type_code        VARCHAR(30)  NOT NULL DEFAULT 'DIRECT',
    transform_expression     VARCHAR(500),
    priority                 INTEGER      DEFAULT 1,
    data_type_code           VARCHAR(30),
    is_nullable_flag         BOOLEAN      DEFAULT TRUE,
    description              VARCHAR(500),
    is_active_flag           BOOLEAN      DEFAULT TRUE,
    created_ts               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pam_product_table
      FOREIGN KEY (product_table_id) REFERENCES l1.product_table_registry(product_table_id),
    CONSTRAINT uq_pam_source_target
      UNIQUE (product_table_id, source_field_name, target_view_code, target_field_name),
    CONSTRAINT chk_pam_mapping_type
      CHECK (mapping_type_code IN ('DIRECT', 'RENAME', 'TRANSFORM', 'COALESCE')),
    CONSTRAINT chk_pam_priority
      CHECK (priority BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_pam_target
  ON l1.product_attribute_mapping (target_view_code, target_field_name);
CREATE INDEX IF NOT EXISTS idx_pam_product
  ON l1.product_attribute_mapping (product_table_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: product_table_registry (40 rows — 10 products × 4 snapshot types)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO l1.product_table_registry
  (product_code, snapshot_type_code, table_schema, table_name, field_count, description)
VALUES
  -- Loans (4)
  ('loans', 'accounting', 'l2', 'loans_accounting_snapshot', 154, 'Loan accounting: balances, allowances, charge-offs, fair value, origination'),
  ('loans', 'classification', 'l2', 'loans_classification_snapshot', 146, 'Loan classification: purpose, borrower, collateral type, regulatory codes'),
  ('loans', 'indicative', 'l2', 'loans_indicative_snapshot', 70, 'Loan indicative: terms, maturity, interest rates, amortization'),
  ('loans', 'risk', 'l2', 'loans_risk_snapshot', 130, 'Loan risk: PD, LGD, delinquency, covenant, internal ratings'),
  -- Derivatives (4)
  ('derivatives', 'accounting', 'l2', 'derivatives_accounting_snapshot', 50, 'Derivatives accounting: fair value, notional, collateral, allowance'),
  ('derivatives', 'classification', 'l2', 'derivatives_classification_snapshot', 20, 'Derivatives classification: ISDA, counterparty type, legal entity'),
  ('derivatives', 'indicative', 'l2', 'derivatives_indicative_snapshot', 50, 'Derivatives indicative: instrument type, maturity, hedge designation'),
  ('derivatives', 'risk', 'l2', 'derivatives_risk_snapshot', 33, 'Derivatives risk: PD, LGD, collateral posted, potential future exposure'),
  -- Off-Balance-Sheet Commitments (4)
  ('offbs_commitments', 'accounting', 'l2', 'offbs_commitments_accounting_snapshot', 40, 'Off-BS commitment accounting: contingent liabilities, allowance'),
  ('offbs_commitments', 'classification', 'l2', 'offbs_commitments_classification_snapshot', 15, 'Off-BS classification: commitment type, facility linkage'),
  ('offbs_commitments', 'indicative', 'l2', 'offbs_commitments_indicative_snapshot', 50, 'Off-BS indicative: terms, maturity, draw provisions'),
  ('offbs_commitments', 'risk', 'l2', 'offbs_commitments_risk_snapshot', 33, 'Off-BS risk: PD, LGD, CCF, usage rates'),
  -- SFT (4)
  ('sft', 'accounting', 'l2', 'sft_accounting_snapshot', 60, 'SFT accounting: repo balances, collateral valuation, allowance'),
  ('sft', 'classification', 'l2', 'sft_classification_snapshot', 13, 'SFT classification: conduit flag, transaction type, netting'),
  ('sft', 'indicative', 'l2', 'sft_indicative_snapshot', 25, 'SFT indicative: SFT type, right to offset, interest terms'),
  ('sft', 'risk', 'l2', 'sft_risk_snapshot', 21, 'SFT risk: PD, LGD, eligible collateral, encumbrance'),
  -- Securities (4)
  ('securities', 'accounting', 'l2', 'securities_accounting_snapshot', 50, 'Securities accounting: carrying value, accrued interest, FVOCI/FVTPL'),
  ('securities', 'classification', 'l2', 'securities_classification_snapshot', 20, 'Securities classification: CUSIP/ISIN, issuer, credit rating'),
  ('securities', 'indicative', 'l2', 'securities_indicative_snapshot', 25, 'Securities indicative: bond type, coupon, maturity'),
  ('securities', 'risk', 'l2', 'securities_risk_snapshot', 20, 'Securities risk: credit quality, fair value hierarchy, encumbrance'),
  -- Deposits (4)
  ('deposits', 'accounting', 'l2', 'deposits_accounting_snapshot', 55, 'Deposits accounting: balances, accrued interest, insurance coverage'),
  ('deposits', 'classification', 'l2', 'deposits_classification_snapshot', 22, 'Deposits classification: deposit type, customer tier, regulatory class'),
  ('deposits', 'indicative', 'l2', 'deposits_indicative_snapshot', 21, 'Deposits indicative: rate, maturity, withdrawal terms'),
  ('deposits', 'risk', 'l2', 'deposits_risk_snapshot', 18, 'Deposits risk: funding stability, concentration, maturity ladder'),
  -- Borrowings (4)
  ('borrowings', 'accounting', 'l2', 'borrowings_accounting_snapshot', 55, 'Borrowings accounting: outstanding balance, accrued interest, fair value'),
  ('borrowings', 'classification', 'l2', 'borrowings_classification_snapshot', 22, 'Borrowings classification: guarantor, security, identifier'),
  ('borrowings', 'indicative', 'l2', 'borrowings_indicative_snapshot', 21, 'Borrowings indicative: coupon, maturity, call/put dates'),
  ('borrowings', 'risk', 'l2', 'borrowings_risk_snapshot', 18, 'Borrowings risk: credit rating, internal risk rating, PD/LGD'),
  -- Debt (4)
  ('debt', 'accounting', 'l2', 'debt_accounting_snapshot', 50, 'Debt accounting: amortized cost, premium/discount, fair value'),
  ('debt', 'classification', 'l2', 'debt_classification_snapshot', 20, 'Debt classification: debt type, redeemable flag, security'),
  ('debt', 'indicative', 'l2', 'debt_indicative_snapshot', 25, 'Debt indicative: coupon, maturity, conversion terms'),
  ('debt', 'risk', 'l2', 'debt_risk_snapshot', 20, 'Debt risk: PD, LGD, rating, default probability'),
  -- Equities (4)
  ('equities', 'accounting', 'l2', 'equities_accounting_snapshot', 22, 'Equities accounting: carrying value, fair value, dividends'),
  ('equities', 'classification', 'l2', 'equities_classification_snapshot', 12, 'Equities classification: CUSIP, ownership %, industry'),
  ('equities', 'indicative', 'l2', 'equities_indicative_snapshot', 7, 'Equities indicative: equity type, currency'),
  ('equities', 'risk', 'l2', 'equities_risk_snapshot', 1, 'Equities risk: treasury control flag only'),
  -- Stock (4)
  ('stock', 'accounting', 'l2', 'stock_accounting_snapshot', 9, 'Stock accounting: shares, market value, unrealized gain/loss'),
  ('stock', 'classification', 'l2', 'stock_classification_snapshot', 7, 'Stock classification: percentage ownership, investee industry'),
  ('stock', 'indicative', 'l2', 'stock_indicative_snapshot', 4, 'Stock indicative: stock type, stock position ID'),
  ('stock', 'risk', 'l2', 'stock_risk_snapshot', 1, 'Stock risk: treasury control flag only')
ON CONFLICT (table_schema, table_name) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: product_attribute_mapping — T90 (cross_product_accounting_view)
-- 12 target fields × up to 10 products = ~120 mapping rows
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: resolve product_table_id by table_name
-- Each INSERT uses a subquery: (SELECT product_table_id FROM l1.product_table_registry WHERE table_name = ...)

-- ── carrying_value_amt ──
-- 8/10 products have carrying_value (missing: offbs_commitments, deposits)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'carrying_value_amt', v.mapping_type, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'carrying_value',  'DIRECT', 'Net carrying value of loan'),
  ('derivatives_accounting_snapshot', 'carrying_value',  'DIRECT', 'Derivative carrying value'),
  ('sft_accounting_snapshot',         'carrying_value',  'DIRECT', 'SFT carrying value — not present, fair_value used'),
  ('securities_accounting_snapshot',  'carrying_value',  'DIRECT', 'Securities carrying value'),
  ('borrowings_accounting_snapshot',  'carrying_value',  'DIRECT', 'Borrowings carrying value'),
  ('debt_accounting_snapshot',        'carrying_value',  'DIRECT', 'Debt carrying value'),
  ('equities_accounting_snapshot',    'carrying_value',  'DIRECT', 'Equities carrying value'),
  ('stock_accounting_snapshot',       'carrying_value',  'DIRECT', 'Stock carrying value')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── fair_value_amt ──
-- 9/10 products (missing: offbs_commitments)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'fair_value_amt', v.mapping_type, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'fair_value_amount',  'DIRECT',  'Loan fair value'),
  ('derivatives_accounting_snapshot', 'fair_value',         'RENAME',  'Derivative fair value (field: fair_value)'),
  ('sft_accounting_snapshot',         'fair_value_amount',  'DIRECT',  'SFT fair value'),
  ('securities_accounting_snapshot',  'fair_value_amount',  'DIRECT',  'Securities fair value'),
  ('borrowings_accounting_snapshot',  'fair_value_amount',  'DIRECT',  'Borrowings fair value'),
  ('debt_accounting_snapshot',        'fair_value_amount',  'DIRECT',  'Debt fair value'),
  ('deposits_accounting_snapshot',    'fair_value_amount',  'DIRECT',  'Deposits fair value'),
  ('equities_accounting_snapshot',    'fair_value_amount',  'DIRECT',  'Equities fair value'),
  ('stock_accounting_snapshot',       'fair_value_amount',  'DIRECT',  'Stock fair value')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── bs_amount_amt ──
-- 8/10 products (missing: offbs_commitments, deposits uses bs_amount)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'bs_amount_amt', v.mapping_type, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'bs_amount',             'DIRECT', 'Loan balance sheet amount'),
  ('derivatives_accounting_snapshot', 'bs_amount',             'DIRECT', 'Derivative balance sheet amount'),
  ('sft_accounting_snapshot',         'bs_amount',             'DIRECT', 'SFT balance sheet amount'),
  ('securities_accounting_snapshot',  'balance_sheet_amount',  'RENAME', 'Securities uses balance_sheet_amount'),
  ('borrowings_accounting_snapshot',  'bs_amount',             'DIRECT', 'Borrowings balance sheet amount'),
  ('debt_accounting_snapshot',        'bs_amount',             'DIRECT', 'Debt balance sheet amount'),
  ('deposits_accounting_snapshot',    'bs_amount',             'DIRECT', 'Deposits balance sheet amount'),
  ('equities_accounting_snapshot',    'bs_amount',             'DIRECT', 'Equities balance sheet amount'),
  ('stock_accounting_snapshot',       'bs_amount',             'DIRECT', 'Stock balance sheet amount')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── accrued_interest_amt ──
-- 7/10 products (missing: offbs_commitments, equities uses accrued_interest_dividend_amount, stock missing)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, priority, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'accrued_interest_amt', v.mapping_type, v.priority, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'accrued_interest_amount',          'DIRECT',   1, 'Loan accrued interest'),
  ('loans_accounting_snapshot',       'accrued_interest_dividend_amount', 'COALESCE', 2, 'Loan accrued interest/dividend fallback'),
  ('sft_accounting_snapshot',         'accrued_interest_amount',          'DIRECT',   1, 'SFT accrued interest'),
  ('securities_accounting_snapshot',  'accrued_interest_amount',          'DIRECT',   1, 'Securities accrued interest'),
  ('borrowings_accounting_snapshot',  'accrued_interest_amount',          'DIRECT',   1, 'Borrowings accrued interest'),
  ('debt_accounting_snapshot',        'accrued_interest_amount',          'DIRECT',   1, 'Debt accrued interest'),
  ('deposits_accounting_snapshot',    'accrued_interest_amount',          'DIRECT',   1, 'Deposits accrued interest'),
  ('equities_accounting_snapshot',    'accrued_interest_dividend_amount', 'RENAME',   1, 'Equities uses dividend variant')
) AS v(table_name, source_field, mapping_type, priority, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── unrealized_gain_loss_amt ──
-- 6/10 products (missing: derivatives, offbs_commitments, equities, deposits — wait deposits has it)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'unrealized_gain_loss_amt', v.mapping_type, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'unrealized_gain_loss', 'DIRECT', 'Loan unrealized gain/loss'),
  ('sft_accounting_snapshot',         'unrealized_gain_loss', 'DIRECT', 'SFT unrealized gain/loss'),
  ('securities_accounting_snapshot',  'unrealized_gain_loss', 'DIRECT', 'Securities unrealized gain/loss'),
  ('borrowings_accounting_snapshot',  'unrealized_gain_loss', 'DIRECT', 'Borrowings unrealized gain/loss'),
  ('debt_accounting_snapshot',        'unrealized_gain_loss', 'DIRECT', 'Debt unrealized gain/loss'),
  ('deposits_accounting_snapshot',    'unrealized_gain_loss', 'DIRECT', 'Deposits unrealized gain/loss'),
  ('stock_accounting_snapshot',       'unrealized_gain_loss', 'DIRECT', 'Stock unrealized gain/loss')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── allowance_amt ──
-- 7/10 products have allowance fields (missing: deposits, equities, stock)
-- Multiple source fields per product → COALESCE with priority
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, priority, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'allowance_amt', 'COALESCE', v.priority, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',                'allowance_balance',                         1, 'Loans allowance balance (primary)'),
  ('loans_accounting_snapshot',                'allowance_for_credit_losses_amount',         2, 'Loans CECL allowance (fallback)'),
  ('loans_accounting_snapshot',                'amount_of_allowance_for_credit_losses',      3, 'Loans allowance alternate (fallback 2)'),
  ('derivatives_accounting_snapshot',          'allowance_balance',                         1, 'Derivatives allowance balance'),
  ('derivatives_accounting_snapshot',          'allowance_for_credit_losses_amount',         2, 'Derivatives CECL allowance'),
  ('offbs_commitments_accounting_snapshot',    'allowance_balance',                         1, 'Off-BS allowance balance'),
  ('offbs_commitments_accounting_snapshot',    'allowance_for_credit_losses_amount',         2, 'Off-BS CECL allowance'),
  ('sft_accounting_snapshot',                  'allowance_balance',                         1, 'SFT allowance balance'),
  ('sft_accounting_snapshot',                  'allowance_for_credit_losses_amount',         2, 'SFT CECL allowance'),
  ('securities_accounting_snapshot',           'allowance_for_credit_losses_amount',         1, 'Securities CECL allowance'),
  ('borrowings_accounting_snapshot',           'allowance_balance',                         1, 'Borrowings allowance balance'),
  ('borrowings_accounting_snapshot',           'allowance_for_credit_losses_amount',         2, 'Borrowings CECL allowance'),
  ('debt_accounting_snapshot',                 'allowance_balance',                         1, 'Debt allowance balance'),
  ('debt_accounting_snapshot',                 'allowance_for_credit_losses_amount',         2, 'Debt CECL allowance')
) AS v(table_name, source_field, priority, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── charge_off_amt ──
-- 7/10 products (missing: deposits, equities, stock)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'charge_off_amt', v.mapping_type, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',              'charge_off_amount',  'DIRECT', 'Loan charge-off amount'),
  ('derivatives_accounting_snapshot',        'charge_off_amount',  'DIRECT', 'Derivatives charge-off amount'),
  ('offbs_commitments_accounting_snapshot',  'charge_off_amount',  'DIRECT', 'Off-BS charge-off amount'),
  ('sft_accounting_snapshot',                'charge_offs_amount', 'RENAME', 'SFT uses charge_offs_amount (plural)'),
  ('securities_accounting_snapshot',         'charge_off_amount',  'DIRECT', 'Securities charge-off amount'),
  ('borrowings_accounting_snapshot',         'charge_off_amount',  'DIRECT', 'Borrowings charge-off amount'),
  ('debt_accounting_snapshot',               'charge_off_amount',  'DIRECT', 'Debt charge-off amount')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── recovery_amt ──
-- 6/10 products (missing: securities, deposits, equities, stock)
-- Primary source: net_recovery_amount or recoveries_amount
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, priority, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'recovery_amt', v.mapping_type, v.priority, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',              'net_recovery_amount',  'DIRECT',   1, 'Loan net recovery (primary)'),
  ('loans_accounting_snapshot',              'recovery_amount',      'COALESCE', 2, 'Loan gross recovery (fallback)'),
  ('derivatives_accounting_snapshot',        'net_recovery_amount',  'DIRECT',   1, 'Derivatives net recovery'),
  ('offbs_commitments_accounting_snapshot',  'net_recovery_amount',  'DIRECT',   1, 'Off-BS net recovery'),
  ('sft_accounting_snapshot',                'net_recovery_amount',  'DIRECT',   1, 'SFT net recovery'),
  ('borrowings_accounting_snapshot',         'net_recovery_amount',  'DIRECT',   1, 'Borrowings net recovery'),
  ('debt_accounting_snapshot',               'net_recovery_amount',  'DIRECT',   1, 'Debt net recovery')
) AS v(table_name, source_field, mapping_type, priority, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── net_income_amt ──
-- Only loans has this field
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'net_income_current', 'T90', 'net_income_amt', 'RENAME', 'NUMERIC',
       'Loans net_income_current → net_income_amt (current period only)'
FROM l1.product_table_registry ptr
WHERE ptr.table_name = 'loans_accounting_snapshot'
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── accounting_intent ──
-- 7/10 products (missing: offbs_commitments, equities, stock)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T90', 'accounting_intent', v.mapping_type, 'VARCHAR', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_accounting_snapshot',       'accounting_intent', 'DIRECT', 'Loan accounting intent (HTM/AFS/HFT/HFI)'),
  ('derivatives_accounting_snapshot', 'accounting_intent', 'DIRECT', 'Derivative accounting intent'),
  ('sft_accounting_snapshot',         'accounting_intent', 'DIRECT', 'SFT accounting intent'),
  ('securities_accounting_snapshot',  'accounting_intent', 'DIRECT', 'Securities accounting intent'),
  ('borrowings_accounting_snapshot',  'accounting_intent', 'DIRECT', 'Borrowings accounting intent'),
  ('debt_accounting_snapshot',        'accounting_intent', 'DIRECT', 'Debt accounting intent'),
  ('deposits_accounting_snapshot',    'accounting_intent', 'DIRECT', 'Deposits accounting intent')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── call_report_schedule & call_report_line_code ──
-- All 10 products have call_report_code in classification snapshot
-- Maps to BOTH call_report_schedule AND call_report_line_code (same source, dual target)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'call_report_code', 'T90', 'call_report_schedule', 'RENAME', 'VARCHAR',
       v.product_code || ' call_report_code → schedule (from classification snapshot)'
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_classification_snapshot'),
  ('derivatives_classification_snapshot'),
  ('offbs_commitments_classification_snapshot'),
  ('sft_classification_snapshot'),
  ('securities_classification_snapshot'),
  ('borrowings_classification_snapshot'),
  ('debt_classification_snapshot'),
  ('deposits_classification_snapshot'),
  ('equities_classification_snapshot'),
  ('stock_classification_snapshot')
) AS v(product_code) ON ptr.table_name = v.product_code
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'call_report_code', 'T90', 'call_report_line_code', 'RENAME', 'VARCHAR',
       v.product_code || ' call_report_code → line code (from classification snapshot)'
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_classification_snapshot'),
  ('derivatives_classification_snapshot'),
  ('offbs_commitments_classification_snapshot'),
  ('sft_classification_snapshot'),
  ('securities_classification_snapshot'),
  ('borrowings_classification_snapshot'),
  ('debt_classification_snapshot'),
  ('deposits_classification_snapshot'),
  ('equities_classification_snapshot'),
  ('stock_classification_snapshot')
) AS v(product_code) ON ptr.table_name = v.product_code
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: product_attribute_mapping — T91 (cross_product_risk_view)
-- 11 target fields; risk coverage is sparser (6 products max per field)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── pd_pct ──
-- 6/10 products: loans, derivatives, offbs_commitments, sft, borrowings, debt
-- Primary source: probability_of_default_pd; fallback: maximum_probability_of_default
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, priority, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T91', 'pd_pct', v.mapping_type, v.priority, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_risk_snapshot',              'probability_of_default_pd',   'RENAME',   1, 'Loan PD (primary, point-in-time)'),
  ('loans_risk_snapshot',              'maximum_probability_of_default', 'COALESCE', 2, 'Loan max PD (fallback for through-the-cycle)'),
  ('derivatives_risk_snapshot',        'probability_of_default_pd',   'RENAME',   1, 'Derivative counterparty PD'),
  ('offbs_commitments_risk_snapshot',  'probability_of_default_pd',   'RENAME',   1, 'Off-BS commitment PD'),
  ('sft_risk_snapshot',                'probability_of_default_pd',   'RENAME',   1, 'SFT counterparty PD'),
  ('borrowings_risk_snapshot',         'probability_of_default_pd',   'RENAME',   1, 'Borrowings issuer PD'),
  ('debt_risk_snapshot',               'probability_of_default_pd',   'RENAME',   1, 'Debt issuer PD')
) AS v(table_name, source_field, mapping_type, priority, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── lgd_pct ──
-- 6/10 products: loans, derivatives, offbs_commitments, sft, borrowings, debt
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, priority, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T91', 'lgd_pct', v.mapping_type, v.priority, 'NUMERIC', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_risk_snapshot',              'loss_given_default_lgd',          'RENAME',   1, 'Loan LGD (primary)'),
  ('loans_risk_snapshot',              'expected_loss_given_default_elgd','COALESCE', 2, 'Loan ELGD (fallback — downturn LGD)'),
  ('derivatives_risk_snapshot',        'loss_given_default_lgd',          'RENAME',   1, 'Derivative counterparty LGD'),
  ('offbs_commitments_risk_snapshot',  'loss_given_default_lgd',          'RENAME',   1, 'Off-BS commitment LGD'),
  ('sft_risk_snapshot',                'loss_given_default_lgd',          'RENAME',   1, 'SFT counterparty LGD'),
  ('borrowings_risk_snapshot',         'loss_given_default_lgd',          'RENAME',   1, 'Borrowings issuer LGD'),
  ('debt_risk_snapshot',               'loss_given_default_lgd',          'RENAME',   1, 'Debt issuer LGD')
) AS v(table_name, source_field, mapping_type, priority, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── ead_amt ──
-- Only loans has exposure_at_default_ead (stored as VARCHAR — needs CAST)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, transform_expression, data_type_code, description)
SELECT ptr.product_table_id, 'exposure_at_default_ead', 'T91', 'ead_amt', 'TRANSFORM',
       'CAST(exposure_at_default_ead AS NUMERIC(20,4))', 'NUMERIC',
       'Loan EAD — source is VARCHAR, requires CAST to NUMERIC'
FROM l1.product_table_registry ptr
WHERE ptr.table_name = 'loans_risk_snapshot'
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- Note: expected_loss_amt, risk_weight_pct, rwa_amt are L3-derived (T92)
-- They do NOT have direct L2 source mappings — documented as coverage gaps

-- ── days_past_due ──
-- Only loans
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'num_days_principal_or_interest_past_due', 'T91', 'days_past_due', 'RENAME', 'NUMERIC',
       'Loan DPD — FFIEC standard delinquency measure'
FROM l1.product_table_registry ptr
WHERE ptr.table_name = 'loans_risk_snapshot'
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── delinquency_status_code ──
-- Only loans
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'delinquency_status', 'T91', 'delinquency_status_code', 'RENAME', 'VARCHAR',
       'Loan delinquency status (CURRENT, 1-29, 30-59, 60-89, 90+)'
FROM l1.product_table_registry ptr
WHERE ptr.table_name = 'loans_risk_snapshot'
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── credit_status_code ──
-- Only loans (via accrual_status)
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, 'accrual_status', 'T91', 'credit_status_code', 'RENAME', 'VARCHAR',
       'Loan accrual status → credit status (PERFORMING, NONACCRUAL, etc.)'
FROM l1.product_table_registry ptr
WHERE ptr.table_name = 'loans_risk_snapshot'
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── internal_risk_rating ──
-- 5/10 products: loans, derivatives, offbs_commitments, borrowings, debt
INSERT INTO l1.product_attribute_mapping
  (product_table_id, source_field_name, target_view_code, target_field_name, mapping_type_code, data_type_code, description)
SELECT ptr.product_table_id, v.source_field, 'T91', 'internal_risk_rating', v.mapping_type, 'VARCHAR', v.description
FROM l1.product_table_registry ptr
JOIN (VALUES
  ('loans_risk_snapshot',              'internal_risk_rating', 'DIRECT', 'Loan borrower internal risk rating'),
  ('derivatives_risk_snapshot',        'internal_risk_rating', 'DIRECT', 'Derivative counterparty internal rating'),
  ('offbs_commitments_risk_snapshot',  'internal_risk_rating', 'DIRECT', 'Off-BS commitment internal rating'),
  ('borrowings_risk_snapshot',         'internal_risk_rating', 'DIRECT', 'Borrowings issuer internal rating'),
  ('debt_risk_snapshot',               'internal_risk_rating', 'DIRECT', 'Debt issuer internal rating')
) AS v(table_name, source_field, mapping_type, description) ON ptr.table_name = v.table_name
ON CONFLICT (product_table_id, source_field_name, target_view_code, target_field_name) DO NOTHING;

-- ── external_risk_rating ──
-- No L2 product risk tables have a direct external_risk_rating field
-- This is typically sourced from l1.rating_mapping or l2.counterparty_rating_observation
-- Documented as coverage gap — populated by L3 calculation join logic


-- ═══════════════════════════════════════════════════════════════════════════
-- Summary comments for audit trail
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE l1.product_table_registry IS
  'Catalog of all L2 product snapshot tables (10 products × 4 types). Enables data-driven cross-product view generation and lineage queries.';

COMMENT ON TABLE l1.product_attribute_mapping IS
  'Field-level source→target mapping from L2 product snapshots to L3 cross-product views (T89-T92). Supports DIRECT, RENAME, TRANSFORM, COALESCE mapping types with priority ordering for multi-source fields.';

COMMENT ON COLUMN l1.product_attribute_mapping.mapping_type_code IS
  'DIRECT: same name/semantics. RENAME: different name, same concept. TRANSFORM: requires SQL expression. COALESCE: multiple sources for same target, ordered by priority.';

COMMENT ON COLUMN l1.product_attribute_mapping.priority IS
  'COALESCE ordering: 1 = highest priority (tried first). Used when multiple source fields map to the same target field within one product.';

COMMIT;

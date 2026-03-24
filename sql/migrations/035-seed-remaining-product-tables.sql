-- Migration 035: Seed remaining product tables (8 product categories, 32 tables)
-- Generates GSIB-quality data for: Derivatives, SFT, Securities, Deposits, Borrowings, Debt, Equities, Stock
-- Position IDs: 700001-709999 (no collision with existing max 601041)
-- Date: 2026-03-24

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: CREATE POSITION RECORDS FOR ALL NEW PRODUCT TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: 3 as_of_dates × N positions per product type
-- Dates: 2024-11-30, 2024-12-31, 2025-01-31 (monthly time-series)

-- ─── DERIVATIVES POSITIONS (700001-700240: 80 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, instrument_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_agreement_id, credit_status_code, effective_date,
    exposure_type_code, external_risk_rating, internal_risk_rating, legal_entity_id,
    lgd_estimate, market_value_amt, netting_set_id, notional_amount, pd_estimate,
    is_trading_banking_book_flag, product_code, product_subtype_id, created_by, record_source
)
SELECT
    700000 + (s.n * 3) + d.date_idx AS position_id,
    d.as_of_date,
    NULL AS facility_id,  -- derivatives don't always have facilities
    (s.n % 100) + 1 AS instrument_id,
    -- MTM value: derivatives can be positive or negative
    CASE WHEN s.n % 4 = 0 THEN (s.n * 137 % 50000000 + 500000) * 1.0
         WHEN s.n % 4 = 1 THEN -(s.n * 97 % 30000000 + 200000) * 1.0
         WHEN s.n % 4 = 2 THEN (s.n * 211 % 80000000 + 1000000) * 1.0
         ELSE -(s.n * 61 % 15000000 + 100000) * 1.0
    END + (d.date_idx * s.n * 17 % 500000) AS balance_amount,
    CASE WHEN s.n % 5 = 0 THEN 'EUR' WHEN s.n % 5 = 1 THEN 'GBP'
         WHEN s.n % 5 = 2 THEN 'JPY' WHEN s.n % 5 = 3 THEN 'CHF' ELSE 'USD' END AS currency_code,
    2000001 AS source_system_id,
    0 AS accrued_interest_amt,
    ABS((s.n * 137 % 50000000 + 500000) * 1.0) AS book_value_amt,
    '2026-01-15'::date + (s.n % 1800 || ' days')::interval AS contractual_maturity_date,
    (s.n % 100) + 1 AS counterparty_id,
    NULL AS credit_agreement_id,
    'PERFORMING' AS credit_status_code,
    '2022-01-15'::date + (s.n % 365 || ' days')::interval AS effective_date,
    'DERIVATIVE' AS exposure_type_code,
    CASE WHEN s.n % 6 = 0 THEN 'AAA' WHEN s.n % 6 = 1 THEN 'AA'
         WHEN s.n % 6 = 2 THEN 'A' WHEN s.n % 6 = 3 THEN 'BBB'
         WHEN s.n % 6 = 4 THEN 'BB' ELSE 'B' END AS external_risk_rating,
    ((s.n % 8) + 1)::text AS internal_risk_rating,
    (s.n % 10) + 1 AS legal_entity_id,
    CASE WHEN s.n % 4 = 0 THEN '0.45' WHEN s.n % 4 = 1 THEN '0.55'
         WHEN s.n % 4 = 2 THEN '0.35' ELSE '0.60' END AS lgd_estimate,
    ABS((s.n * 137 % 50000000 + 500000) * 1.0) * (1.0 + d.date_idx * 0.02) AS market_value_amt,
    (s.n % 60) + 1 AS netting_set_id,  -- valid range 1-60
    -- Notional: 10M to 500M range for derivatives
    (s.n * 311 % 490000000 + 10000000) * 1.0 AS notional_amount,
    CASE WHEN s.n % 5 = 0 THEN '0.001' WHEN s.n % 5 = 1 THEN '0.005'
         WHEN s.n % 5 = 2 THEN '0.015' WHEN s.n % 5 = 3 THEN '0.03' ELSE '0.08' END AS pd_estimate,
    CASE WHEN s.n % 3 = 0 THEN true ELSE false END AS is_trading_banking_book_flag,
    CASE WHEN s.n % 8 = 0 THEN 'IRS' WHEN s.n % 8 = 1 THEN 'CDS'
         WHEN s.n % 8 = 2 THEN 'FX_FORWARD' WHEN s.n % 8 = 3 THEN 'FX_OPTION'
         WHEN s.n % 8 = 4 THEN 'EQUITY_SWAP' WHEN s.n % 8 = 5 THEN 'COMMODITY_FUT'
         WHEN s.n % 8 = 6 THEN 'SWAPTION' ELSE 'TRS' END AS product_code,
    (s.n % 8) + 11 AS product_subtype_id,  -- 11-18 for derivatives
    'SEED_035' AS created_by,
    'MIGRATION_035' AS record_source
FROM generate_series(1, 80) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── SFT POSITIONS (701001-701180: 60 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, instrument_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    external_risk_rating, internal_risk_rating, legal_entity_id, lgd_estimate,
    market_value_amt, notional_amount, pd_estimate, is_trading_banking_book_flag,
    product_code, product_subtype_id, created_by, record_source
)
SELECT
    701000 + (s.n * 3) + d.date_idx AS position_id,
    d.as_of_date,
    NULL AS facility_id,
    NULL AS instrument_id,
    -- Repo/SFT amounts: 50M-2B range
    (s.n * 2713 % 1950000000 + 50000000) * 1.0 AS balance_amount,
    CASE WHEN s.n % 3 = 0 THEN 'EUR' WHEN s.n % 3 = 1 THEN 'GBP' ELSE 'USD' END,
    3000001 AS source_system_id,
    (s.n * 2713 % 1950000000 + 50000000) * 0.0001 AS accrued_interest_amt,
    (s.n * 2713 % 1950000000 + 50000000) * 1.0 AS book_value_amt,
    '2025-02-15'::date + (s.n % 365 || ' days')::interval,
    (s.n % 100) + 1 AS counterparty_id,
    'PERFORMING',
    '2024-01-15'::date + (s.n % 180 || ' days')::interval,
    'SFT' AS exposure_type_code,
    CASE WHEN s.n % 4 = 0 THEN 'AAA' WHEN s.n % 4 = 1 THEN 'AA'
         WHEN s.n % 4 = 2 THEN 'A' ELSE 'BBB' END,
    ((s.n % 5) + 1)::text,
    (s.n % 10) + 1,
    CASE WHEN s.n % 3 = 0 THEN '0.15' WHEN s.n % 3 = 1 THEN '0.25' ELSE '0.10' END,
    (s.n * 2713 % 1950000000 + 50000000) * 1.02 AS market_value_amt,
    (s.n * 2713 % 1950000000 + 50000000) * 1.05 AS notional_amount,
    CASE WHEN s.n % 4 = 0 THEN '0.001' WHEN s.n % 4 = 1 THEN '0.003'
         WHEN s.n % 4 = 2 THEN '0.008' ELSE '0.02' END,
    false,
    CASE WHEN s.n % 5 = 0 THEN 'REPO' WHEN s.n % 5 = 1 THEN 'REVERSE_REPO'
         WHEN s.n % 5 = 2 THEN 'SEC_LENDING' WHEN s.n % 5 = 3 THEN 'SEC_BORROWING'
         ELSE 'MARGIN_LOAN' END,
    (s.n % 5) + 26,  -- 26-30 for SFT
    'SEED_035', 'MIGRATION_035'
FROM generate_series(1, 60) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── SECURITIES POSITIONS (702001-702300: 100 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, instrument_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    external_risk_rating, internal_risk_rating, legal_entity_id, lgd_estimate,
    market_value_amt, notional_amount, pd_estimate, is_trading_banking_book_flag,
    product_code, product_subtype_id, created_by, record_source
)
SELECT
    702000 + (s.n * 3) + d.date_idx AS position_id,
    d.as_of_date,
    NULL, NULL,
    -- Securities face values: 5M-200M
    (s.n * 1973 % 195000000 + 5000000) * 1.0,
    CASE WHEN s.n % 4 = 0 THEN 'EUR' WHEN s.n % 4 = 1 THEN 'GBP'
         WHEN s.n % 4 = 2 THEN 'JPY' ELSE 'USD' END,
    4000001, -- securities source system
    (s.n * 1973 % 195000000 + 5000000) * 0.015,  -- accrued coupon
    (s.n * 1973 % 195000000 + 5000000) * 0.98,   -- book value (slight discount)
    '2027-01-15'::date + (s.n % 3650 || ' days')::interval,  -- 1-10yr maturities
    (s.n % 100) + 1,
    'PERFORMING',
    '2020-01-15'::date + (s.n % 730 || ' days')::interval,
    'SECURITY',
    CASE WHEN s.n % 7 = 0 THEN 'AAA' WHEN s.n % 7 = 1 THEN 'AA+'
         WHEN s.n % 7 = 2 THEN 'AA' WHEN s.n % 7 = 3 THEN 'A+'
         WHEN s.n % 7 = 4 THEN 'A' WHEN s.n % 7 = 5 THEN 'BBB+' ELSE 'BBB' END,
    ((s.n % 6) + 1)::text,
    (s.n % 10) + 1,
    CASE WHEN s.n % 7 < 3 THEN '0.20' WHEN s.n % 7 < 5 THEN '0.35' ELSE '0.45' END,
    (s.n * 1973 % 195000000 + 5000000) * (1.0 + (d.date_idx - 1) * 0.005),
    (s.n * 1973 % 195000000 + 5000000) * 1.0,
    CASE WHEN s.n % 7 = 0 THEN '0.0003' WHEN s.n % 7 = 1 THEN '0.001'
         WHEN s.n % 7 = 2 THEN '0.002' WHEN s.n % 7 = 3 THEN '0.005'
         WHEN s.n % 7 = 4 THEN '0.01' WHEN s.n % 7 = 5 THEN '0.02' ELSE '0.04' END,
    CASE WHEN s.n % 5 = 0 THEN true ELSE false END,
    CASE WHEN s.n % 7 = 0 THEN 'GOVT_BOND' WHEN s.n % 7 = 1 THEN 'CORP_BOND'
         WHEN s.n % 7 = 2 THEN 'MBS' WHEN s.n % 7 = 3 THEN 'ABS'
         WHEN s.n % 7 = 4 THEN 'CLO' WHEN s.n % 7 = 5 THEN 'MUNI' ELSE 'AGENCY' END,
    (s.n % 7) + 19,  -- 19-25 for securities
    'SEED_035', 'MIGRATION_035'
FROM generate_series(1, 100) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── DEPOSITS POSITIONS (703001-703240: 80 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    legal_entity_id, product_code, product_subtype_id, created_by, record_source,
    is_trading_banking_book_flag
)
SELECT
    703000 + (s.n * 3) + d.date_idx,
    d.as_of_date,
    NULL,
    -- Deposit balances: 1M-500M (larger deposits for GSIB)
    (s.n * 6173 % 499000000 + 1000000) * 1.0,
    CASE WHEN s.n % 4 = 0 THEN 'EUR' WHEN s.n % 4 = 1 THEN 'GBP' ELSE 'USD' END,
    5000001,
    (s.n * 6173 % 499000000 + 1000000) * 0.002,
    (s.n * 6173 % 499000000 + 1000000) * 1.0,
    CASE WHEN s.n % 4 IN (0,1) THEN NULL  -- demand/savings have no maturity
         ELSE '2025-06-15'::date + (s.n % 730 || ' days')::interval END,
    (s.n % 100) + 1,
    'PERFORMING',
    '2022-01-15'::date + (s.n % 365 || ' days')::interval,
    'DEPOSIT',
    (s.n % 10) + 1,
    CASE WHEN s.n % 4 = 0 THEN 'DEMAND_DEP' WHEN s.n % 4 = 1 THEN 'SAVINGS'
         WHEN s.n % 4 = 2 THEN 'TIME_DEP' ELSE 'MMDA' END,
    (s.n % 4) + 36,  -- 36-39 for deposits
    'SEED_035', 'MIGRATION_035', false
FROM generate_series(1, 80) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── BORROWINGS POSITIONS (704001-704120: 40 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    legal_entity_id, product_code, product_subtype_id, created_by, record_source,
    is_trading_banking_book_flag
)
SELECT
    704000 + (s.n * 3) + d.date_idx,
    d.as_of_date,
    NULL,
    -- Borrowing amounts: 100M-5B for GSIB wholesale funding
    (s.n * 12713 % 4900000000 + 100000000) * 1.0,
    CASE WHEN s.n % 3 = 0 THEN 'EUR' WHEN s.n % 3 = 1 THEN 'GBP' ELSE 'USD' END,
    6000001,
    (s.n * 12713 % 4900000000 + 100000000) * 0.001,
    (s.n * 12713 % 4900000000 + 100000000) * 1.0,
    '2025-03-15'::date + (s.n % 365 || ' days')::interval,
    (s.n % 100) + 1,
    'PERFORMING',
    '2024-01-15'::date + (s.n % 180 || ' days')::interval,
    'BORROWING',
    (s.n % 10) + 1,
    CASE WHEN s.n % 3 = 0 THEN 'FED_FUNDS' WHEN s.n % 3 = 1 THEN 'FHLB_ADV' ELSE 'BROKERED_DEP' END,
    (s.n % 3) + 40,  -- 40-42 for borrowings
    'SEED_035', 'MIGRATION_035', false
FROM generate_series(1, 40) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── DEBT POSITIONS (705001-705090: 30 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    legal_entity_id, product_code, product_subtype_id, created_by, record_source,
    is_trading_banking_book_flag
)
SELECT
    705000 + (s.n * 3) + d.date_idx,
    d.as_of_date,
    NULL,
    -- Debt issuance: 500M-10B for GSIB
    (s.n * 31337 % 9500000000 + 500000000) * 1.0,
    CASE WHEN s.n % 3 = 0 THEN 'EUR' WHEN s.n % 3 = 1 THEN 'GBP' ELSE 'USD' END,
    7000001,
    (s.n * 31337 % 9500000000 + 500000000) * 0.02,  -- coupon accrual
    (s.n * 31337 % 9500000000 + 500000000) * 0.99,  -- slight discount
    '2028-01-15'::date + (s.n % 3650 || ' days')::interval,  -- long-dated
    (s.n % 50) + 1,
    'PERFORMING',
    '2020-01-15'::date + (s.n % 730 || ' days')::interval,
    'DEBT',
    (s.n % 10) + 1,
    CASE WHEN s.n % 3 = 0 THEN 'SENIOR_NOTE' WHEN s.n % 3 = 1 THEN 'SUBORD_NOTE' ELSE 'COVERED_BOND' END,
    (s.n % 3) + 43,  -- 43-45 for debt
    'SEED_035', 'MIGRATION_035', false
FROM generate_series(1, 30) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── EQUITIES POSITIONS (706001-706090: 30 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    legal_entity_id, product_code, product_subtype_id, created_by, record_source,
    is_trading_banking_book_flag
)
SELECT
    706000 + (s.n * 3) + d.date_idx,
    d.as_of_date,
    NULL,
    -- Equity investments: 10M-500M
    (s.n * 4217 % 490000000 + 10000000) * 1.0,
    CASE WHEN s.n % 3 = 0 THEN 'EUR' WHEN s.n % 3 = 1 THEN 'GBP' ELSE 'USD' END,
    8000001,
    (s.n * 4217 % 490000000 + 10000000) * 0.005,  -- dividend accrual
    (s.n * 4217 % 490000000 + 10000000) * 0.95,
    NULL,  -- equities have no maturity
    (s.n % 100) + 1,
    'PERFORMING',
    '2021-01-15'::date + (s.n % 730 || ' days')::interval,
    'EQUITY',
    (s.n % 10) + 1,
    CASE WHEN s.n % 2 = 0 THEN 'COMMON_EQ' ELSE 'PREFERRED_EQ' END,
    (s.n % 2) + 46,  -- 46-47 for equities
    'SEED_035', 'MIGRATION_035',
    CASE WHEN s.n % 4 = 0 THEN true ELSE false END
FROM generate_series(1, 30) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;

-- ─── STOCK POSITIONS (707001-707060: 20 positions × 3 dates) ───
INSERT INTO l2.position (
    position_id, as_of_date, facility_id, balance_amount, currency_code,
    source_system_id, accrued_interest_amt, book_value_amt, contractual_maturity_date,
    counterparty_id, credit_status_code, effective_date, exposure_type_code,
    legal_entity_id, product_code, product_subtype_id, created_by, record_source,
    is_trading_banking_book_flag
)
SELECT
    707000 + (s.n * 3) + d.date_idx,
    d.as_of_date,
    NULL,
    -- Stock holdings: 5M-200M
    (s.n * 7919 % 195000000 + 5000000) * 1.0,
    CASE WHEN s.n % 2 = 0 THEN 'EUR' ELSE 'USD' END,
    8000001,
    (s.n * 7919 % 195000000 + 5000000) * 0.003,
    (s.n * 7919 % 195000000 + 5000000) * 0.97,
    NULL,  -- no maturity
    (s.n % 100) + 1,
    'PERFORMING',
    '2021-06-15'::date + (s.n % 365 || ' days')::interval,
    'EQUITY',
    (s.n % 10) + 1,
    CASE WHEN s.n % 2 = 0 THEN 'COMMON_STOCK' ELSE 'PREFERRED_STK' END,
    (s.n % 2) + 48,  -- 48-49 for stock
    'SEED_035', 'MIGRATION_035',
    CASE WHEN s.n % 3 = 0 THEN true ELSE false END
FROM generate_series(1, 20) s(n)
CROSS JOIN (VALUES (0, '2024-11-30'::date), (1, '2024-12-31'::date), (2, '2025-01-31'::date)) d(date_idx, as_of_date)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2: POPULATE PRODUCT SNAPSHOT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ DERIVATIVES ACCOUNTING ═══
INSERT INTO l2.derivatives_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount, carrying_value,
    counterparty_exposure_value, exposure_amount, fair_value, notional_amount,
    notional_amount_at_inception, effective_notional_amount, net_gross_ratio,
    aggregate_gross_value, aggregate_net_value, current_credit_exposure_amount,
    conversion_factor_percentage, usd_equivalent_amount, trading_intent,
    transaction_date, asset_liability_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.is_trading_banking_book_flag THEN 'TRADING' ELSE 'HEDGING' END,
    p.balance_amount,
    ABS(p.balance_amount),
    GREATEST(p.balance_amount, 0),  -- CVA only on positive MTM
    ABS(p.balance_amount) * 1.4,    -- EAD with add-on
    p.balance_amount,
    p.notional_amount,
    p.notional_amount * 0.95,  -- inception notional
    p.notional_amount * CASE WHEN p.product_code IN ('IRS','CDS','TRS') THEN 1.0
                              WHEN p.product_code IN ('FX_FORWARD','FX_OPTION') THEN 0.5
                              ELSE 0.3 END,
    0.65 + (p.position_id % 30) * 0.01,  -- net/gross 65-95%
    ABS(p.balance_amount) * 1.5,
    ABS(p.balance_amount) * (0.65 + (p.position_id % 30) * 0.01),
    GREATEST(p.balance_amount, 0),
    CASE WHEN p.product_code IN ('IRS','CDS','TRS') THEN 1.0
         WHEN p.product_code IN ('FX_FORWARD','FX_OPTION') THEN 0.5
         ELSE 0.15 END,
    ABS(p.balance_amount),
    CASE WHEN p.is_trading_banking_book_flag THEN 'YES' ELSE 'NO' END,
    p.effective_date,
    CASE WHEN p.balance_amount >= 0 THEN 'ASSET' ELSE 'LIABILITY' END
FROM l2.position p
WHERE p.product_code IN ('IRS','CDS','FX_FORWARD','FX_OPTION','EQUITY_SWAP','COMMODITY_FUT','SWAPTION','TRS')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DERIVATIVES CLASSIFICATION ═══
INSERT INTO l2.derivatives_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number, counterparty_type,
    isda_id, legal_entity_id, source_system_id, source_system_name,
    internal_transaction_flag, usd_conversion_rate, qmna
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.is_trading_banking_book_flag THEN 4100 ELSE 4200 END,
    CASE WHEN p.counterparty_id % 4 = 0 THEN 'BANK' WHEN p.counterparty_id % 4 = 1 THEN 'CORPORATE'
         WHEN p.counterparty_id % 4 = 2 THEN 'SOVEREIGN' ELSE 'FUND' END,
    'ISDA-' || LPAD(p.counterparty_id::text, 6, '0'),
    p.legal_entity_id::text,
    p.source_system_id::text, 'MUREX',
    CASE WHEN p.counterparty_id % 20 = 0 THEN 'Y' ELSE 'N' END,
    CASE WHEN p.currency_code = 'USD' THEN 1.0
         WHEN p.currency_code = 'EUR' THEN 1.08
         WHEN p.currency_code = 'GBP' THEN 1.27
         WHEN p.currency_code = 'JPY' THEN 0.0067
         ELSE 1.12 END,
    CASE WHEN p.product_code IN ('IRS','CDS','FX_FORWARD') THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('IRS','CDS','FX_FORWARD','FX_OPTION','EQUITY_SWAP','COMMODITY_FUT','SWAPTION','TRS')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DERIVATIVES INDICATIVE ═══
INSERT INTO l2.derivatives_indicative_snapshot (
    position_id, as_of_date, derivative_type, derivative_instrument_type,
    derivative_direction, currency_code, maturity_date, effective_maturity_date,
    interest_rate, interest_rate_type, clearing_status, clearing_type_flag,
    is_hedge, otc_trade_flag,
    reporting_currency, settlement_currency, transaction_currency,
    swap_type, option_type, product_domain, risk_type
)
SELECT p.position_id, p.as_of_date,
    p.product_code,
    CASE WHEN p.product_code = 'IRS' THEN 'INTEREST_RATE_SWAP'
         WHEN p.product_code = 'CDS' THEN 'CREDIT_DEFAULT_SWAP'
         WHEN p.product_code = 'FX_FORWARD' THEN 'FX_FORWARD'
         WHEN p.product_code = 'FX_OPTION' THEN 'FX_OPTION'
         WHEN p.product_code = 'EQUITY_SWAP' THEN 'EQUITY_TOTAL_RETURN'
         WHEN p.product_code = 'COMMODITY_FUT' THEN 'COMMODITY_FUTURE'
         WHEN p.product_code = 'SWAPTION' THEN 'SWAPTION'
         ELSE 'TOTAL_RETURN_SWAP' END,
    CASE WHEN p.position_id % 2 = 0 THEN 'PAY' ELSE 'RECEIVE' END,
    p.currency_code,
    p.contractual_maturity_date,
    p.contractual_maturity_date - 30,
    CASE WHEN p.product_code = 'IRS' THEN 0.0425 + (p.position_id % 200) * 0.0001
         WHEN p.product_code = 'CDS' THEN 0.0050 + (p.position_id % 300) * 0.0001
         ELSE 0.03 + (p.position_id % 100) * 0.0001 END,
    CASE WHEN p.product_code = 'IRS' THEN 'FIXED' ELSE 'FLOATING' END,
    CASE WHEN p.position_id % 3 = 0 THEN 'CLEARED' ELSE 'BILATERAL' END,
    CASE WHEN p.position_id % 3 = 0 THEN 'CCP_CLEARED' ELSE 'OTC_BILATERAL' END,
    NOT p.is_trading_banking_book_flag,
    CASE WHEN p.position_id % 3 = 0 THEN false ELSE true END,
    'USD', p.currency_code, p.currency_code,
    CASE WHEN p.product_code IN ('IRS','SWAPTION') THEN 'FIXED_FLOAT'
         WHEN p.product_code IN ('TRS','EQUITY_SWAP') THEN 'TOTAL_RETURN'
         ELSE NULL END,
    CASE WHEN p.product_code IN ('FX_OPTION','SWAPTION') THEN 'CALL' ELSE NULL END,
    CASE WHEN p.product_code IN ('IRS','SWAPTION') THEN 'INTEREST_RATE'
         WHEN p.product_code IN ('CDS','TRS') THEN 'CREDIT'
         WHEN p.product_code IN ('FX_FORWARD','FX_OPTION') THEN 'FX'
         WHEN p.product_code = 'EQUITY_SWAP' THEN 'EQUITY'
         ELSE 'COMMODITY' END,
    CASE WHEN p.product_code IN ('IRS','SWAPTION') THEN 'INTEREST_RATE'
         WHEN p.product_code IN ('CDS','TRS') THEN 'CREDIT'
         WHEN p.product_code IN ('FX_FORWARD','FX_OPTION') THEN 'FX'
         WHEN p.product_code = 'EQUITY_SWAP' THEN 'EQUITY'
         ELSE 'COMMODITY' END
FROM l2.position p
WHERE p.product_code IN ('IRS','CDS','FX_FORWARD','FX_OPTION','EQUITY_SWAP','COMMODITY_FUT','SWAPTION','TRS')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DERIVATIVES RISK ═══
INSERT INTO l2.derivatives_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd, loss_given_default_lgd,
    expected_loss_given_default_elgd, two_year_probability_of_default,
    potential_future_exposure_amount, potential_future_exposure_adjustment,
    eligible_collateral, eligible_im_cash, eligible_vm_cash,
    collateralization_type, pledged_flag, secured_flag, treasury_control_flag,
    maximum_probability_of_default, minimum_probability_of_default
)
SELECT p.position_id, p.as_of_date,
    p.pd_estimate::NUMERIC,
    p.lgd_estimate::NUMERIC,
    p.lgd_estimate::NUMERIC * 0.9,
    LEAST(p.pd_estimate::NUMERIC * 2.0, 1.0),
    ABS(p.notional_amount) * CASE
        WHEN p.product_code IN ('IRS','SWAPTION') THEN 0.005 + (p.position_id % 50) * 0.0001
        WHEN p.product_code IN ('CDS','TRS') THEN 0.05 + (p.position_id % 100) * 0.001
        WHEN p.product_code IN ('FX_FORWARD','FX_OPTION') THEN 0.01 + (p.position_id % 80) * 0.0005
        ELSE 0.07 + (p.position_id % 60) * 0.001 END,
    ABS(p.notional_amount) * 0.005,
    CASE WHEN p.position_id % 3 = 0 THEN ABS(p.balance_amount) * 0.8 ELSE 0 END,
    CASE WHEN p.position_id % 3 = 0 THEN ABS(p.balance_amount) * 0.3 ELSE 0 END,
    CASE WHEN p.position_id % 2 = 0 THEN ABS(p.balance_amount) * 0.5 ELSE 0 END,
    CASE WHEN p.position_id % 3 = 0 THEN 'FULLY_COLLATERALIZED'
         WHEN p.position_id % 3 = 1 THEN 'PARTIALLY_COLLATERALIZED'
         ELSE 'UNCOLLATERALIZED' END,
    CASE WHEN p.position_id % 4 = 0 THEN true ELSE false END,
    CASE WHEN p.position_id % 3 = 0 THEN 'SECURED' ELSE 'UNSECURED' END,
    false,
    p.pd_estimate::NUMERIC * 1.5,
    p.pd_estimate::NUMERIC * 0.5
FROM l2.position p
WHERE p.product_code IN ('IRS','CDS','FX_FORWARD','FX_OPTION','EQUITY_SWAP','COMMODITY_FUT','SWAPTION','TRS')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SFT ACCOUNTING ═══
INSERT INTO l2.sft_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount, book_value_amount,
    counterparty_exposure_value, exposure_amount, fair_value_amount,
    collateral_fair_value, collateral_fair_value_at_reporting_date,
    collateral_value_at_inception_date, contract_amount, contract_amount_at_inception_date,
    contract_amount_at_reporting_date, usd_equivalent_amount, settlement_date,
    transaction_date, accrued_interest_amount
)
SELECT p.position_id, p.as_of_date,
    'HELD_FOR_INVESTMENT',
    p.balance_amount,
    p.book_value_amt,
    p.balance_amount * 0.02,  -- haircut-adjusted exposure
    p.balance_amount,
    p.market_value_amt,
    p.balance_amount * 1.05,  -- overcollateralized
    p.balance_amount * (1.05 + (p.position_id % 10) * 0.001),
    p.balance_amount * 1.02,
    p.balance_amount,
    p.balance_amount * 0.98,
    p.balance_amount * (1.0 + (p.position_id % 5) * 0.001),
    p.balance_amount,
    p.effective_date + 2,
    p.effective_date,
    p.accrued_interest_amt
FROM l2.position p
WHERE p.product_code IN ('REPO','REVERSE_REPO','SEC_LENDING','SEC_BORROWING','MARGIN_LOAN')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SFT CLASSIFICATION ═══
INSERT INTO l2.sft_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number, counterparty_type,
    legal_entity_id, source_system_id, source_system_name,
    internal_transaction_flag, transaction_type
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code = 'REPO' THEN 2100
         WHEN p.product_code = 'REVERSE_REPO' THEN 2200
         WHEN p.product_code = 'SEC_LENDING' THEN 2300
         WHEN p.product_code = 'SEC_BORROWING' THEN 2400
         ELSE 2500 END,
    CASE WHEN p.counterparty_id % 3 = 0 THEN 'BANK' WHEN p.counterparty_id % 3 = 1 THEN 'BROKER_DEALER'
         ELSE 'FUND' END,
    p.legal_entity_id::text,
    p.source_system_id::text, 'CALYPSO',
    CASE WHEN p.counterparty_id % 15 = 0 THEN 'Y' ELSE 'N' END,
    CASE WHEN p.product_code = 'REPO' THEN 'REPO'
         WHEN p.product_code = 'REVERSE_REPO' THEN 'REVERSE_REPO'
         WHEN p.product_code = 'SEC_LENDING' THEN 'SECURITIES_LENDING'
         WHEN p.product_code = 'SEC_BORROWING' THEN 'SECURITIES_BORROWING'
         ELSE 'MARGIN_LENDING' END
FROM l2.position p
WHERE p.product_code IN ('REPO','REVERSE_REPO','SEC_LENDING','SEC_BORROWING','MARGIN_LOAN')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SFT INDICATIVE ═══
INSERT INTO l2.sft_indicative_snapshot (
    position_id, as_of_date, sft_type, sft_contract_id, currency_code,
    maturity_date, effective_maturity_date, interest_rate, interest_rate_type,
    reporting_currency, settlement_currency, transaction_currency,
    asset_liability_indicator, principal_agent, qmna_flag
)
SELECT p.position_id, p.as_of_date,
    p.product_code,
    'SFT-' || LPAD(p.position_id::text, 8, '0'),
    p.currency_code,
    p.contractual_maturity_date,
    p.contractual_maturity_date - 7,
    0.0530 + (p.position_id % 100) * 0.0001,
    'FLOATING',
    'USD', p.currency_code, p.currency_code,
    CASE WHEN p.product_code IN ('REPO','SEC_LENDING') THEN 'LIABILITY' ELSE 'ASSET' END,
    CASE WHEN p.position_id % 3 = 0 THEN 'PRINCIPAL' ELSE 'AGENT' END,
    CASE WHEN p.position_id % 4 = 0 THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('REPO','REVERSE_REPO','SEC_LENDING','SEC_BORROWING','MARGIN_LOAN')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SFT RISK ═══
INSERT INTO l2.sft_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd, loss_given_default_lgd,
    expected_loss_given_default_elgd, two_year_probability_of_default,
    pledged_flag, secured_flag, encumbered_flag, treasury_control_flag,
    rehypothecated, liquid_assets_collateral_level,
    maximum_probability_of_default, minimum_probability_of_default
)
SELECT p.position_id, p.as_of_date,
    p.pd_estimate::NUMERIC,
    p.lgd_estimate::NUMERIC,
    p.lgd_estimate::NUMERIC * 0.85,
    LEAST(p.pd_estimate::NUMERIC * 2.0, 1.0),
    CASE WHEN p.product_code IN ('REPO','SEC_LENDING') THEN true ELSE false END,
    'SECURED',
    CASE WHEN p.product_code = 'REPO' THEN true ELSE false END,
    false,
    CASE WHEN p.product_code = 'SEC_LENDING' AND p.position_id % 3 = 0 THEN 'Y' ELSE 'N' END,
    CASE WHEN p.position_id % 3 = 0 THEN 'LEVEL_1'
         WHEN p.position_id % 3 = 1 THEN 'LEVEL_2A'
         ELSE 'LEVEL_2B' END,
    p.pd_estimate::NUMERIC * 1.5,
    p.pd_estimate::NUMERIC * 0.5
FROM l2.position p
WHERE p.product_code IN ('REPO','REVERSE_REPO','SEC_LENDING','SEC_BORROWING','MARGIN_LOAN')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SECURITIES ACCOUNTING ═══
INSERT INTO l2.securities_accounting_snapshot (
    position_id, as_of_date, accounting_intent, balance_sheet_amount, carrying_value,
    amortized_cost, fair_value_amount, market_value, accrued_interest_amount,
    accrued_interest_dividend_amount, original_face_value, current_face_value,
    counterparty_exposure_value, exposure_amount, unrealized_gain_loss,
    book_yield, original_book_yield, purchase_price, price,
    usd_equivalent_amounts, fair_value_measurement_level, settlement_date, trade_date
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.position_id % 3 = 0 THEN 'HTM' WHEN p.position_id % 3 = 1 THEN 'AFS' ELSE 'TRADING' END,
    p.balance_amount,
    p.book_value_amt,
    p.balance_amount * 0.985,
    p.market_value_amt,
    p.market_value_amt,
    p.accrued_interest_amt,
    p.accrued_interest_amt,
    p.notional_amount,
    p.notional_amount * (1.0 - (p.position_id % 100) * 0.0001),
    p.balance_amount,
    p.balance_amount,
    p.market_value_amt - p.book_value_amt,
    0.04 + (p.position_id % 200) * 0.00005,
    0.035 + (p.position_id % 150) * 0.00005,
    p.balance_amount * 0.99,
    100.0 + (p.position_id % 50 - 25) * 0.1,
    p.balance_amount,
    CASE WHEN p.position_id % 3 = 0 THEN 'Level_1' WHEN p.position_id % 3 = 1 THEN 'Level_2' ELSE 'Level_3' END,
    p.effective_date + 3,
    p.effective_date
FROM l2.position p
WHERE p.product_code IN ('GOVT_BOND','CORP_BOND','MBS','ABS','CLO','MUNI','AGENCY')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SECURITIES CLASSIFICATION ═══
INSERT INTO l2.securities_classification_snapshot (
    position_id, as_of_date, cusip, isin, security_name, security_description,
    security_status, security_identifier, security_identifier_type,
    issuer_name, issuer_type, issuer_domicile, issuer_id,
    customer_id, gl_account_number, counterparty_type, legal_entity_id,
    sector, country_code, source_system_id, source_system_name,
    call_report_code, internal_transaction_flag
)
SELECT p.position_id, p.as_of_date,
    LPAD((p.position_id % 999999)::text, 9, '0'),
    'US' || LPAD((p.position_id % 9999999999)::text, 10, '0') || '0',
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 'US Treasury ' || (2025 + p.position_id % 10)::text
         WHEN p.product_code = 'CORP_BOND' THEN 'Corp Bond ' || p.counterparty_id::text
         WHEN p.product_code = 'MBS' THEN 'GNMA MBS Pool ' || p.position_id::text
         WHEN p.product_code = 'ABS' THEN 'Auto ABS ' || p.position_id::text
         WHEN p.product_code = 'CLO' THEN 'CLO Tranche ' || p.position_id::text
         WHEN p.product_code = 'MUNI' THEN 'Muni Bond ' || p.position_id::text
         ELSE 'Agency FHLMC ' || p.position_id::text END,
    p.product_code || ' security',
    'ACTIVE',
    'SEC-' || LPAD(p.position_id::text, 10, '0'),
    'CUSIP',
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 'US Treasury'
         WHEN p.product_code = 'AGENCY' THEN 'FHLMC'
         WHEN p.product_code = 'MBS' THEN 'GNMA'
         ELSE 'Issuer-' || p.counterparty_id::text END,
    CASE WHEN p.product_code IN ('GOVT_BOND') THEN 'SOVEREIGN'
         WHEN p.product_code IN ('AGENCY','MBS') THEN 'GSE'
         ELSE 'CORPORATE' END,
    CASE WHEN p.position_id % 5 = 0 THEN 'GB' WHEN p.position_id % 5 = 1 THEN 'DE'
         WHEN p.position_id % 5 = 2 THEN 'JP' ELSE 'US' END,
    'ISS-' || p.counterparty_id::text,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code IN ('GOVT_BOND','AGENCY') THEN 1500
         WHEN p.product_code IN ('MBS','ABS','CLO') THEN 1600
         ELSE 1700 END,
    CASE WHEN p.product_code IN ('GOVT_BOND') THEN 'SOVEREIGN'
         WHEN p.product_code IN ('AGENCY','MBS') THEN 'GSE'
         ELSE 'CORPORATE' END,
    p.legal_entity_id::text,
    CASE WHEN p.product_code IN ('GOVT_BOND') THEN 'GOVERNMENT'
         WHEN p.product_code IN ('AGENCY','MBS') THEN 'AGENCY'
         WHEN p.product_code = 'MUNI' THEN 'MUNICIPAL'
         ELSE 'FINANCIAL' END,
    CASE WHEN p.position_id % 3 = 0 THEN 'US' WHEN p.position_id % 3 = 1 THEN 'GB' ELSE 'DE' END,
    p.source_system_id::text, 'BLOOMBERG',
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 'RC-B2a' WHEN p.product_code = 'MBS' THEN 'RC-B4a'
         WHEN p.product_code = 'MUNI' THEN 'RC-B3' ELSE 'RC-B5' END,
    'N'
FROM l2.position p
WHERE p.product_code IN ('GOVT_BOND','CORP_BOND','MBS','ABS','CLO','MUNI','AGENCY')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SECURITIES INDICATIVE ═══
INSERT INTO l2.securities_indicative_snapshot (
    position_id, as_of_date, security_type, security_sub_type, product_code,
    currency_code, maturity_date, issue_date, interest_rate, interest_rate_type,
    coupon_dividend_rate, coupon_int_pmt_periodicity,
    reporting_currency, settlement_currency, transaction_currency,
    weighted_average_life, amortization_type
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 'GOVERNMENT' WHEN p.product_code = 'CORP_BOND' THEN 'CORPORATE'
         WHEN p.product_code = 'MBS' THEN 'MBS' WHEN p.product_code = 'ABS' THEN 'ABS'
         WHEN p.product_code = 'CLO' THEN 'CLO' WHEN p.product_code = 'MUNI' THEN 'MUNICIPAL'
         ELSE 'AGENCY' END,
    p.product_code,
    p.product_code,
    p.currency_code,
    p.contractual_maturity_date,
    p.effective_date,
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 0.0425 + (p.position_id % 50) * 0.0001
         WHEN p.product_code = 'CORP_BOND' THEN 0.055 + (p.position_id % 100) * 0.0002
         WHEN p.product_code IN ('MBS','ABS') THEN 0.048 + (p.position_id % 80) * 0.0002
         WHEN p.product_code = 'MUNI' THEN 0.035 + (p.position_id % 60) * 0.0001
         ELSE 0.045 + (p.position_id % 70) * 0.0001 END,
    CASE WHEN p.position_id % 4 = 0 THEN 'FLOATING' ELSE 'FIXED' END,
    CASE WHEN p.product_code = 'GOVT_BOND' THEN 0.04 + (p.position_id % 30) * 0.0002
         WHEN p.product_code = 'CORP_BOND' THEN 0.05 + (p.position_id % 80) * 0.0003
         ELSE 0.045 + (p.position_id % 50) * 0.0002 END,
    CASE WHEN p.position_id % 3 = 0 THEN 'QUARTERLY' WHEN p.position_id % 3 = 1 THEN 'SEMI_ANNUAL'
         ELSE 'ANNUAL' END,
    'USD', p.currency_code, p.currency_code,
    (p.contractual_maturity_date - p.as_of_date) / 365.0 * 0.85,
    CASE WHEN p.product_code IN ('MBS','ABS','CLO') THEN 'AMORTIZING' ELSE 'BULLET' END
FROM l2.position p
WHERE p.product_code IN ('GOVT_BOND','CORP_BOND','MBS','ABS','CLO','MUNI','AGENCY')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ SECURITIES RISK ═══
INSERT INTO l2.securities_risk_snapshot (
    position_id, as_of_date, pledged_flag, encumbered_flag, performing_flag,
    non_accrual_status, secured_flag, treasury_control_flag,
    liquid_assets_collateral_level, trade_long_short_flag, private_placement_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.position_id % 5 = 0 THEN true ELSE false END,
    CASE WHEN p.position_id % 7 = 0 THEN true ELSE false END,
    true,
    false,
    CASE WHEN p.product_code IN ('MBS','ABS','CLO') THEN 'SECURED' ELSE 'UNSECURED' END,
    CASE WHEN p.position_id % 8 = 0 THEN true ELSE false END,
    CASE WHEN p.product_code IN ('GOVT_BOND','AGENCY') THEN 'LEVEL_1'
         WHEN p.product_code IN ('CORP_BOND','MBS') THEN 'LEVEL_2A'
         ELSE 'LEVEL_2B' END,
    'LONG',
    CASE WHEN p.product_code = 'CLO' AND p.position_id % 3 = 0 THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('GOVT_BOND','CORP_BOND','MBS','ABS','CLO','MUNI','AGENCY')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEPOSITS ACCOUNTING ═══
INSERT INTO l2.deposits_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount, book_value_amount,
    deposit_balance, current_balance, accrued_interest_amount,
    accrued_interest_dividend_amount, fair_value_amount,
    usd_equivalent_amount, fdic_insured_balance,
    fdic_insured_depository_institution_flag, original_balance, interest_balance,
    amount_balance
)
SELECT p.position_id, p.as_of_date,
    'HELD_AT_COST',
    p.balance_amount,
    p.balance_amount,
    p.balance_amount,
    p.balance_amount * (1.0 + (p.position_id % 5) * 0.001),
    p.accrued_interest_amt,
    p.accrued_interest_amt,
    p.balance_amount,
    p.balance_amount,
    LEAST(p.balance_amount, 250000),  -- FDIC $250K limit
    true,
    p.balance_amount * (1.0 - (p.position_id % 30) * 0.001),
    p.accrued_interest_amt * 12,  -- annual interest
    p.balance_amount
FROM l2.position p
WHERE p.product_code IN ('DEMAND_DEP','SAVINGS','TIME_DEP','MMDA')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEPOSITS CLASSIFICATION ═══
INSERT INTO l2.deposits_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number, counterparty_type,
    legal_entity_id, source_system_id, source_system_name,
    account_status, internal_transaction_flag, geographic_code,
    insurance_provider, fdic_ownership_code, stability
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code = 'DEMAND_DEP' THEN 6100 WHEN p.product_code = 'SAVINGS' THEN 6200
         WHEN p.product_code = 'TIME_DEP' THEN 6300 ELSE 6400 END,
    CASE WHEN p.counterparty_id % 5 = 0 THEN 'CORPORATE' WHEN p.counterparty_id % 5 = 1 THEN 'SME'
         WHEN p.counterparty_id % 5 = 2 THEN 'RETAIL' WHEN p.counterparty_id % 5 = 3 THEN 'GOVERNMENT'
         ELSE 'INSTITUTIONAL' END,
    p.legal_entity_id::text,
    p.source_system_id::text, 'CORE_BANKING',
    'ACTIVE',
    CASE WHEN p.counterparty_id % 25 = 0 THEN 'Y' ELSE 'N' END,
    CASE WHEN p.position_id % 4 = 0 THEN 'DOMESTIC' ELSE 'FOREIGN' END,
    'FDIC',
    CASE WHEN p.position_id % 6 = 0 THEN 'SINGLE' WHEN p.position_id % 6 = 1 THEN 'JOINT'
         WHEN p.position_id % 6 = 2 THEN 'REVOCABLE_TRUST' ELSE 'BUSINESS' END,
    CASE WHEN p.product_code IN ('DEMAND_DEP','SAVINGS') THEN 'STABLE'
         WHEN p.product_code = 'TIME_DEP' THEN 'STABLE'
         ELSE 'LESS_STABLE' END
FROM l2.position p
WHERE p.product_code IN ('DEMAND_DEP','SAVINGS','TIME_DEP','MMDA')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEPOSITS INDICATIVE ═══
INSERT INTO l2.deposits_indicative_snapshot (
    position_id, as_of_date, deposit_account_type, currency_code,
    interest_rate, interest_rate_type, interest_bearing_flag,
    maturity_date, reporting_currency, settlement_currency, transaction_currency,
    product_code, days_remaining_to_maturity
)
SELECT p.position_id, p.as_of_date,
    p.product_code,
    p.currency_code,
    CASE WHEN p.product_code = 'DEMAND_DEP' THEN 0.001
         WHEN p.product_code = 'SAVINGS' THEN 0.04 + (p.position_id % 20) * 0.001
         WHEN p.product_code = 'TIME_DEP' THEN 0.045 + (p.position_id % 30) * 0.001
         ELSE 0.05 + (p.position_id % 25) * 0.001 END,
    CASE WHEN p.product_code = 'DEMAND_DEP' THEN 'NON_INTEREST_BEARING' ELSE 'FIXED' END,
    CASE WHEN p.product_code = 'DEMAND_DEP' AND p.position_id % 3 = 0 THEN false ELSE true END,
    p.contractual_maturity_date,
    'USD', p.currency_code, p.currency_code,
    p.product_code,
    CASE WHEN p.contractual_maturity_date IS NOT NULL
         THEN (p.contractual_maturity_date - p.as_of_date) ELSE NULL END
FROM l2.position p
WHERE p.product_code IN ('DEMAND_DEP','SAVINGS','TIME_DEP','MMDA')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEPOSITS RISK ═══
INSERT INTO l2.deposits_risk_snapshot (
    position_id, as_of_date, operational_flag, brokered_flag,
    reciprocal_flag, sweep_flag, relationship_flag, transactional_flag,
    stable_vs_less_stable_flag, treasury_control_flag, negotiable_flag,
    automated_renewal_flag, tradable_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.product_code IN ('DEMAND_DEP') THEN true ELSE false END,
    CASE WHEN p.product_code = 'MMDA' AND p.position_id % 5 = 0 THEN true ELSE false END,
    CASE WHEN p.position_id % 10 = 0 THEN true ELSE false END,
    CASE WHEN p.product_code = 'MMDA' AND p.position_id % 3 = 0 THEN true ELSE false END,
    CASE WHEN p.position_id % 3 = 0 THEN true ELSE false END,
    CASE WHEN p.product_code IN ('DEMAND_DEP') THEN true ELSE false END,
    CASE WHEN p.product_code IN ('DEMAND_DEP','SAVINGS') THEN 'STABLE' ELSE 'LESS_STABLE' END,
    false,
    CASE WHEN p.product_code = 'TIME_DEP' AND p.position_id % 8 = 0 THEN true ELSE false END,
    CASE WHEN p.product_code = 'TIME_DEP' THEN true ELSE false END,
    false
FROM l2.position p
WHERE p.product_code IN ('DEMAND_DEP','SAVINGS','TIME_DEP','MMDA')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ BORROWINGS ACCOUNTING ═══
INSERT INTO l2.borrowings_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount, carrying_value,
    current_outstanding_balance, accrued_interest_amount, accrued_interest_dividend_amount,
    fair_value_amount, counterparty_exposure_value, exposure_amount,
    original_amount, usd_equivalent_amount, funded_committed_exposure,
    settlement_date, borrowing_date, borrowing_term
)
SELECT p.position_id, p.as_of_date,
    'HELD_AT_COST',
    p.balance_amount,
    p.balance_amount,
    p.balance_amount,
    p.accrued_interest_amt,
    p.accrued_interest_amt,
    p.balance_amount * (1.0 + (p.position_id % 20 - 10) * 0.0005),
    p.balance_amount,
    p.balance_amount,
    p.balance_amount * 1.0,
    p.balance_amount,
    p.balance_amount,
    p.effective_date + 2,
    p.effective_date,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 'OVERNIGHT'
         WHEN p.product_code = 'FHLB_ADV' THEN 'TERM'
         ELSE '30_DAY' END
FROM l2.position p
WHERE p.product_code IN ('FED_FUNDS','FHLB_ADV','BROKERED_DEP')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ BORROWINGS CLASSIFICATION ═══
INSERT INTO l2.borrowings_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number, counterparty_type,
    legal_entity_id, source_system_id, source_system_name,
    internal_transaction_flag
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 3100
         WHEN p.product_code = 'FHLB_ADV' THEN 3200 ELSE 3300 END,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 'BANK'
         WHEN p.product_code = 'FHLB_ADV' THEN 'GSE'
         ELSE 'BROKER_DEALER' END,
    p.legal_entity_id::text,
    p.source_system_id::text, 'TREASURY_SYSTEM',
    CASE WHEN p.counterparty_id % 20 = 0 THEN 'Y' ELSE 'N' END
FROM l2.position p
WHERE p.product_code IN ('FED_FUNDS','FHLB_ADV','BROKERED_DEP')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ BORROWINGS INDICATIVE ═══
INSERT INTO l2.borrowings_indicative_snapshot (
    position_id, as_of_date, borrowing_type, currency_code, maturity_date,
    interest_rate, interest_rate_type, interest_rate_variability,
    reporting_currency, settlement_currency, transaction_currency,
    repayment_type, commitment_type
)
SELECT p.position_id, p.as_of_date,
    p.product_code,
    p.currency_code,
    p.contractual_maturity_date,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 0.0533
         WHEN p.product_code = 'FHLB_ADV' THEN 0.0480 + (p.position_id % 30) * 0.0001
         ELSE 0.0520 + (p.position_id % 20) * 0.0002 END,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 'FLOATING' ELSE 'FIXED' END,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 'VARIABLE' ELSE 'FIXED' END,
    'USD', p.currency_code, p.currency_code,
    CASE WHEN p.product_code = 'FED_FUNDS' THEN 'OVERNIGHT' ELSE 'BULLET' END,
    'COMMITTED'
FROM l2.position p
WHERE p.product_code IN ('FED_FUNDS','FHLB_ADV','BROKERED_DEP')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ BORROWINGS RISK ═══
INSERT INTO l2.borrowings_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd, loss_given_default_lgd,
    internal_risk_rating, pledged_flag, secured_flag, treasury_control_flag,
    non_accrual_status
)
SELECT p.position_id, p.as_of_date,
    0.001,  -- bank/GSE counterparties are low PD
    CASE WHEN p.product_code = 'FHLB_ADV' THEN 0.10 ELSE 0.25 END,
    '2',  -- low risk
    CASE WHEN p.product_code = 'FHLB_ADV' THEN true ELSE false END,
    CASE WHEN p.product_code = 'FHLB_ADV' THEN 'SECURED' ELSE 'UNSECURED' END,
    true,
    false
FROM l2.position p
WHERE p.product_code IN ('FED_FUNDS','FHLB_ADV','BROKERED_DEP')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEBT ACCOUNTING ═══
INSERT INTO l2.debt_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount, carrying_value,
    outstanding_balance, accrued_interest_amount, accrued_interest_dividend_amount,
    amortized_cost, fair_value_amount, original_face_amount,
    counterparty_exposure_value, exposure_amount, usd_equivalent_amount,
    premium_discount_amount, unrealized_gain_loss, settlement_date, transaction_date
)
SELECT p.position_id, p.as_of_date,
    'HELD_AT_AMORTIZED_COST',
    p.balance_amount,
    p.balance_amount,
    p.balance_amount,
    p.accrued_interest_amt,
    p.accrued_interest_amt,
    p.balance_amount * 0.995,
    p.market_value_amt,
    p.notional_amount,
    p.balance_amount,
    p.balance_amount,
    p.balance_amount,
    p.balance_amount * 0.005,  -- small premium/discount
    p.market_value_amt - p.balance_amount,
    p.effective_date + 3,
    p.effective_date
FROM l2.position p
WHERE p.product_code IN ('SENIOR_NOTE','SUBORD_NOTE','COVERED_BOND')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEBT CLASSIFICATION ═══
INSERT INTO l2.debt_classification_snapshot (
    position_id, as_of_date, cusip, isin, customer_id, gl_account_number,
    counterparty_type, legal_entity_id, source_system_id, source_system_name,
    internal_transaction_flag
)
SELECT p.position_id, p.as_of_date,
    LPAD((p.position_id % 999999)::text, 9, '0'),
    'US' || LPAD((p.position_id % 9999999999)::text, 10, '0') || '1',
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code = 'SENIOR_NOTE' THEN 3400
         WHEN p.product_code = 'SUBORD_NOTE' THEN 3500 ELSE 3600 END,
    'INVESTOR',
    p.legal_entity_id::text,
    p.source_system_id::text, 'DEBT_MANAGEMENT',
    'N'
FROM l2.position p
WHERE p.product_code IN ('SENIOR_NOTE','SUBORD_NOTE','COVERED_BOND')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEBT INDICATIVE ═══
INSERT INTO l2.debt_indicative_snapshot (
    position_id, as_of_date, debt_type, security_type, security_sub_type,
    currency_code, maturity_date, issue_date, interest_rate, interest_rate_type,
    reporting_currency, settlement_currency, transaction_currency,
    remaining_maturity_days
)
SELECT p.position_id, p.as_of_date,
    p.product_code,
    'DEBT',
    p.product_code,
    p.currency_code,
    p.contractual_maturity_date,
    p.effective_date,
    CASE WHEN p.product_code = 'SENIOR_NOTE' THEN 0.055 + (p.position_id % 40) * 0.0002
         WHEN p.product_code = 'SUBORD_NOTE' THEN 0.065 + (p.position_id % 50) * 0.0003
         ELSE 0.048 + (p.position_id % 30) * 0.0002 END,
    CASE WHEN p.position_id % 3 = 0 THEN 'FLOATING' ELSE 'FIXED' END,
    'USD', p.currency_code, p.currency_code,
    (p.contractual_maturity_date - p.as_of_date)
FROM l2.position p
WHERE p.product_code IN ('SENIOR_NOTE','SUBORD_NOTE','COVERED_BOND')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ DEBT RISK ═══
INSERT INTO l2.debt_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd, loss_given_default_lgd,
    internal_risk_rating, pledged_flag, non_accrual_status, treasury_control_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.product_code = 'SENIOR_NOTE' THEN 0.002
         WHEN p.product_code = 'SUBORD_NOTE' THEN 0.005
         ELSE 0.001 END,
    CASE WHEN p.product_code = 'SENIOR_NOTE' THEN 0.40
         WHEN p.product_code = 'SUBORD_NOTE' THEN 0.60
         ELSE 0.25 END,
    CASE WHEN p.product_code = 'SENIOR_NOTE' THEN '3'
         WHEN p.product_code = 'SUBORD_NOTE' THEN '5'
         ELSE '2' END,
    CASE WHEN p.product_code = 'COVERED_BOND' THEN true ELSE false END,
    false,
    true
FROM l2.position p
WHERE p.product_code IN ('SENIOR_NOTE','SUBORD_NOTE','COVERED_BOND')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ EQUITIES ACCOUNTING ═══
INSERT INTO l2.equities_accounting_snapshot (
    position_id, as_of_date, bs_amount, carrying_value, fair_value_amount,
    market_value, counterparty_exposure_value, face_value,
    cash_dividends, ownership_percentage, number_of_shares,
    usd_equivalent_amount, accrued_interest_dividend_amount,
    retained_earnings, lendable_value, transaction_date
)
SELECT p.position_id, p.as_of_date,
    p.balance_amount,
    p.book_value_amt,
    p.market_value_amt,
    p.market_value_amt,
    p.balance_amount,
    p.notional_amount,
    p.balance_amount * 0.025,  -- ~2.5% dividend yield
    CASE WHEN p.product_code = 'COMMON_EQ' THEN (p.position_id % 40 + 1) * 1.0
         ELSE (p.position_id % 20 + 1) * 1.0 END,
    (p.balance_amount / (50 + p.position_id % 200)),
    p.balance_amount,
    p.accrued_interest_amt,
    p.balance_amount * 0.15,
    p.market_value_amt * 0.7,
    p.effective_date
FROM l2.position p
WHERE p.product_code IN ('COMMON_EQ','PREFERRED_EQ')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ EQUITIES CLASSIFICATION ═══
INSERT INTO l2.equities_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number,
    legal_entity_id, source_system_id, source_system_name,
    stock_exchange_code, ticker_symbol, internal_transaction_flag
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    CASE WHEN p.product_code = 'COMMON_EQ' THEN 5100 ELSE 5200 END,
    p.legal_entity_id::text,
    p.source_system_id::text, 'EQUITY_PLATFORM',
    CASE WHEN p.position_id % 4 = 0 THEN 'NYSE' WHEN p.position_id % 4 = 1 THEN 'NASDAQ'
         WHEN p.position_id % 4 = 2 THEN 'LSE' ELSE 'TSE' END,
    'EQ-' || LPAD(p.position_id::text, 5, '0'),
    'N'
FROM l2.position p
WHERE p.product_code IN ('COMMON_EQ','PREFERRED_EQ')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ EQUITIES INDICATIVE ═══
INSERT INTO l2.equities_indicative_snapshot (
    position_id, as_of_date, equity_type, currency_code,
    reporting_currency, settlement_currency, transaction_currency
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.product_code = 'COMMON_EQ' THEN 'COMMON' ELSE 'PREFERRED' END,
    p.currency_code,
    'USD', p.currency_code, p.currency_code
FROM l2.position p
WHERE p.product_code IN ('COMMON_EQ','PREFERRED_EQ')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ EQUITIES RISK ═══
INSERT INTO l2.equities_risk_snapshot (
    position_id, as_of_date, treasury_control_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.position_id % 6 = 0 THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('COMMON_EQ','PREFERRED_EQ')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ STOCK ACCOUNTING ═══
INSERT INTO l2.stock_accounting_snapshot (
    position_id, as_of_date, bs_amount, carrying_value, fair_value_amount,
    market_value, number_of_shares, unrealized_gain_loss,
    accounting_method, investment_type
)
SELECT p.position_id, p.as_of_date,
    p.balance_amount,
    p.book_value_amt,
    p.market_value_amt,
    p.market_value_amt,
    (p.balance_amount / (30 + p.position_id % 150)),
    p.market_value_amt - p.book_value_amt,
    CASE WHEN p.position_id % 3 = 0 THEN 'EQUITY_METHOD' WHEN p.position_id % 3 = 1 THEN 'FAIR_VALUE'
         ELSE 'COST_METHOD' END,
    CASE WHEN p.product_code = 'COMMON_STOCK' THEN 'COMMON' ELSE 'PREFERRED' END
FROM l2.position p
WHERE p.product_code IN ('COMMON_STOCK','PREFERRED_STK')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ STOCK CLASSIFICATION ═══
INSERT INTO l2.stock_classification_snapshot (
    position_id, as_of_date, customer_id, legal_entity_id,
    internal_transaction_flag, investee_industry_type
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id,
    p.legal_entity_id::text,
    'N',
    CASE WHEN p.position_id % 6 = 0 THEN 'TECHNOLOGY' WHEN p.position_id % 6 = 1 THEN 'FINANCIAL'
         WHEN p.position_id % 6 = 2 THEN 'HEALTHCARE' WHEN p.position_id % 6 = 3 THEN 'ENERGY'
         WHEN p.position_id % 6 = 4 THEN 'INDUSTRIAL' ELSE 'CONSUMER' END
FROM l2.position p
WHERE p.product_code IN ('COMMON_STOCK','PREFERRED_STK')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ STOCK INDICATIVE ═══
INSERT INTO l2.stock_indicative_snapshot (
    position_id, as_of_date, currency_code, stock_type,
    stock_position_id
)
SELECT p.position_id, p.as_of_date,
    p.currency_code,
    CASE WHEN p.product_code = 'COMMON_STOCK' THEN 'COMMON' ELSE 'PREFERRED' END,
    'STK-' || LPAD(p.position_id::text, 8, '0')
FROM l2.position p
WHERE p.product_code IN ('COMMON_STOCK','PREFERRED_STK')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

-- ═══ STOCK RISK ═══
INSERT INTO l2.stock_risk_snapshot (
    position_id, as_of_date, treasury_control_flag
)
SELECT p.position_id, p.as_of_date,
    CASE WHEN p.position_id % 5 = 0 THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('COMMON_STOCK','PREFERRED_STK')
  AND p.created_by = 'SEED_035'
ON CONFLICT DO NOTHING;

COMMIT;

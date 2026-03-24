-- Migration 034: Seed product tables from existing position data
-- Populates loans and offbs_commitments tables from l2.position + l2.position_detail
-- Date: 2026-03-23

SET search_path TO l1, l2, l3, public;

BEGIN;

-- ═══ LOANS INDICATIVE ═══
INSERT INTO l2.loans_indicative_snapshot (
    position_id, as_of_date, interest_rate, interest_rate_index,
    interest_rate_spread, interest_type_current, origination_date,
    maturity_date, remaining_maturity_days, currency_code,
    loan_type, product_code, commitment_type, repayment_type
)
SELECT p.position_id, p.as_of_date,
    COALESCE(pd.interest_rate, 0.05), 'SOFR',
    COALESCE(pd.spread_bps, 250) / 10000.0, COALESCE(pd.rate_type, 'FLOATING'),
    p.effective_date, p.contractual_maturity_date,
    CASE WHEN p.contractual_maturity_date IS NOT NULL
         THEN (p.contractual_maturity_date - p.as_of_date) ELSE 1095 END,
    COALESCE(p.currency_code, 'USD'),
    CASE WHEN p.product_code IN ('REVOLVING_CREDIT','RCF') THEN 'REVOLVING' ELSE 'TERM' END,
    p.product_code, 'COMMITTED',
    CASE WHEN p.product_code IN ('REVOLVING_CREDIT','RCF') THEN 'BULLET' ELSE 'AMORTIZING' END
FROM l2.position p
LEFT JOIN l2.position_detail pd ON pd.position_id = p.position_id AND pd.as_of_date = p.as_of_date
WHERE p.product_code IN ('TERM_LOAN','REVOLVING_CREDIT','TERM_LOAN_B','BRIDGE_LOAN','TLA','RCF')
ON CONFLICT DO NOTHING;

-- ═══ LOANS ACCOUNTING ═══
INSERT INTO l2.loans_accounting_snapshot (
    position_id, as_of_date, accounting_intent, bs_amount,
    carrying_value, accrued_interest_amount, accrued_interest_dividend_amount,
    committed_exposure_global, funded_committed_exposure,
    unfunded_committed_exposure, counterparty_exposure_value,
    exposure_amount, allowance_balance, charge_off_amount,
    fair_value_amount
)
SELECT p.position_id, p.as_of_date,
    'HELD_FOR_INVESTMENT', p.balance_amount,
    COALESCE(p.book_value_amt, p.balance_amount),
    COALESCE(p.accrued_interest_amt, p.balance_amount * 0.005),
    COALESCE(p.accrued_interest_amt, p.balance_amount * 0.005),
    COALESCE(p.notional_amount, p.balance_amount), p.balance_amount,
    GREATEST(0, COALESCE(p.notional_amount, p.balance_amount) - p.balance_amount),
    p.balance_amount, p.balance_amount,
    COALESCE(p.balance_amount * NULLIF(p.pd_estimate::NUMERIC, 0) * NULLIF(p.lgd_estimate::NUMERIC, 0), 0),
    0, COALESCE(p.market_value_amt, p.balance_amount)
FROM l2.position p
WHERE p.product_code IN ('TERM_LOAN','REVOLVING_CREDIT','TERM_LOAN_B','BRIDGE_LOAN','TLA','RCF')
ON CONFLICT DO NOTHING;

-- ═══ LOANS CLASSIFICATION ═══
INSERT INTO l2.loans_classification_snapshot (
    position_id, as_of_date, customer_id, facility_id,
    loan_status, gl_account_number
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id, p.facility_id,
    COALESCE(p.credit_status_code, 'PERFORMING'), 1300
FROM l2.position p
WHERE p.product_code IN ('TERM_LOAN','REVOLVING_CREDIT','TERM_LOAN_B','BRIDGE_LOAN','TLA','RCF')
ON CONFLICT DO NOTHING;

-- ═══ LOANS RISK ═══
INSERT INTO l2.loans_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd,
    loss_given_default_lgd, internal_risk_rating,
    delinquency_status
)
SELECT p.position_id, p.as_of_date,
    COALESCE(p.pd_estimate::NUMERIC, 0.02),
    COALESCE(p.lgd_estimate::NUMERIC, 0.40),
    COALESCE(p.internal_risk_rating, '3'),
    CASE WHEN COALESCE(pd.days_past_due, 0) > 0 THEN 'DELINQUENT' ELSE 'CURRENT' END
FROM l2.position p
LEFT JOIN l2.position_detail pd ON pd.position_id = p.position_id AND pd.as_of_date = p.as_of_date
WHERE p.product_code IN ('TERM_LOAN','REVOLVING_CREDIT','TERM_LOAN_B','BRIDGE_LOAN','TLA','RCF')
ON CONFLICT DO NOTHING;

-- ═══ OFF-BS INDICATIVE ═══
INSERT INTO l2.offbs_commitments_indicative_snapshot (
    position_id, as_of_date, effective_date, maturity_date,
    currency_code, commitment_type
)
SELECT p.position_id, p.as_of_date,
    p.effective_date, p.contractual_maturity_date,
    COALESCE(p.currency_code, 'USD'),
    CASE WHEN p.product_code = 'UCMT' THEN 'UNCOMMITTED' ELSE 'IRREVOCABLE' END
FROM l2.position p
WHERE p.product_code IN ('LETTER_OF_CREDIT','UCMT')
ON CONFLICT DO NOTHING;

-- ═══ OFF-BS ACCOUNTING ═══
INSERT INTO l2.offbs_commitments_accounting_snapshot (
    position_id, as_of_date, committed_exposure_global,
    funded_committed_exposure, counterparty_exposure_value,
    credit_conversion_factor, exposure_amount
)
SELECT p.position_id, p.as_of_date,
    COALESCE(p.notional_amount, p.balance_amount), p.balance_amount,
    p.balance_amount * COALESCE(pd.ccf, 0.4),
    COALESCE(pd.ccf, 0.4), p.balance_amount
FROM l2.position p
LEFT JOIN l2.position_detail pd ON pd.position_id = p.position_id AND pd.as_of_date = p.as_of_date
WHERE p.product_code IN ('LETTER_OF_CREDIT','UCMT')
ON CONFLICT DO NOTHING;

-- ═══ OFF-BS CLASSIFICATION ═══
INSERT INTO l2.offbs_commitments_classification_snapshot (
    position_id, as_of_date, customer_id, gl_account_number
)
SELECT p.position_id, p.as_of_date,
    'CUST-' || p.counterparty_id, 9050
FROM l2.position p
WHERE p.product_code IN ('LETTER_OF_CREDIT','UCMT')
ON CONFLICT DO NOTHING;

-- ═══ OFF-BS RISK ═══
INSERT INTO l2.offbs_commitments_risk_snapshot (
    position_id, as_of_date, probability_of_default_pd,
    loss_given_default_lgd, unconditionally_cancellable_flag
)
SELECT p.position_id, p.as_of_date,
    COALESCE(p.pd_estimate::NUMERIC, 0.02),
    COALESCE(p.lgd_estimate::NUMERIC, 0.40),
    CASE WHEN p.product_code = 'UCMT' THEN true ELSE false END
FROM l2.position p
WHERE p.product_code IN ('LETTER_OF_CREDIT','UCMT')
ON CONFLICT DO NOTHING;

COMMIT;

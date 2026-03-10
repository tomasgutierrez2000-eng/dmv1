-- ============================================================
-- GL Seed Data: gl_journal_entry + gl_account_balance_snapshot
-- Depends on: L1 ledger_account_dim (IDs 1-10), L2 counterparty, L2 position, L1 facility_master
-- Source system: 9 (GL)
-- Date range: Nov 2024 - Jan 2025 (3-month trend)
-- ============================================================

SET search_path TO l1, l2, l3, public;

-- ============================================================
-- gl_journal_entry — 24 sample journal entries (12 balanced batches)
-- Batch pattern: each batch has 1 DR + 1 CR = balanced posting
-- ============================================================
INSERT INTO l2.gl_journal_entry (
    journal_entry_id, journal_batch_id, ledger_account_id,
    transaction_date, posting_date, transaction_code, transaction_desc,
    dr_cr_indicator, transaction_amt, transaction_currency_code, reporting_currency_amt,
    position_id, counterparty_id, facility_id, product_code,
    lob_segment_id, org_unit_id, source_system_id, created_ts, updated_ts
) VALUES
-- Batch 1: Loan advance (Nov) — DR Commercial Loans, CR Cash (acct 5=Cash & Equivalents)
(1, 1, 1, '2024-11-05', '2024-11-05', 'LOAN_ADV', 'Term loan advance - Meridian Corp', 'DR', 15000000.0000, 'USD', 15000000.0000, 1, 1, 1, 'TERM_LOAN', 1, 1, 9, '2024-11-05 09:00:00', '2024-11-05 09:00:00'),
(2, 1, 5, '2024-11-05', '2024-11-05', 'LOAN_ADV', 'Cash disbursement - Meridian Corp', 'CR', 15000000.0000, 'USD', 15000000.0000, 1, 1, 1, 'TERM_LOAN', 1, 1, 9, '2024-11-05 09:00:00', '2024-11-05 09:00:00'),

-- Batch 2: Interest accrual (Nov) — DR Interest Receivable (acct 6), CR Interest Income (acct 7)
(3, 2, 6, '2024-11-30', '2024-11-30', 'INT_ACCR', 'Monthly interest accrual - Nov', 'DR', 125000.0000, 'USD', 125000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2024-11-30 18:00:00', '2024-11-30 18:00:00'),
(4, 2, 7, '2024-11-30', '2024-11-30', 'INT_ACCR', 'Interest income recognition - Nov', 'CR', 125000.0000, 'USD', 125000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2024-11-30 18:00:00', '2024-11-30 18:00:00'),

-- Batch 3: Revolver draw (Nov) — DR Revolvers Drawn (acct 2), CR Cash (acct 5)
(5, 3, 2, '2024-11-12', '2024-11-12', 'REV_DRAW', 'Revolver draw - Atlas Holdings', 'DR', 8000000.0000, 'USD', 8000000.0000, 2, 5, 5, 'REVOLVER', 2, 2, 9, '2024-11-12 10:30:00', '2024-11-12 10:30:00'),
(6, 3, 5, '2024-11-12', '2024-11-12', 'REV_DRAW', 'Cash disbursement - Atlas Holdings', 'CR', 8000000.0000, 'USD', 8000000.0000, 2, 5, 5, 'REVOLVER', 2, 2, 9, '2024-11-12 10:30:00', '2024-11-12 10:30:00'),

-- Batch 4: Provision charge (Nov) — DR Provision Expense (acct 10), CR Allowance (acct 9)
(7, 4, 10, '2024-11-30', '2024-11-30', 'PROV_CHG', 'Monthly provision charge - Nov', 'DR', 350000.0000, 'USD', 350000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2024-11-30 18:00:00', '2024-11-30 18:00:00'),
(8, 4, 9, '2024-11-30', '2024-11-30', 'PROV_CHG', 'Allowance build - Nov', 'CR', 350000.0000, 'USD', 350000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2024-11-30 18:00:00', '2024-11-30 18:00:00'),

-- Batch 5: Loan advance (Dec) — DR Term Loans (acct 3), CR Cash (acct 5)
(9, 5, 3, '2024-12-03', '2024-12-03', 'LOAN_ADV', 'Bridge loan advance - Pinnacle Industries', 'DR', 25000000.0000, 'USD', 25000000.0000, 3, 10, 10, 'BRIDGE_LOAN', 3, 3, 9, '2024-12-03 11:00:00', '2024-12-03 11:00:00'),
(10, 5, 5, '2024-12-03', '2024-12-03', 'LOAN_ADV', 'Cash disbursement - Pinnacle Industries', 'CR', 25000000.0000, 'USD', 25000000.0000, 3, 10, 10, 'BRIDGE_LOAN', 3, 3, 9, '2024-12-03 11:00:00', '2024-12-03 11:00:00'),

-- Batch 6: Interest accrual (Dec) — DR Interest Receivable (acct 6), CR Interest Income (acct 7)
(11, 6, 6, '2024-12-31', '2024-12-31', 'INT_ACCR', 'Monthly interest accrual - Dec', 'DR', 185000.0000, 'USD', 185000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2024-12-31 18:00:00', '2024-12-31 18:00:00'),
(12, 6, 7, '2024-12-31', '2024-12-31', 'INT_ACCR', 'Interest income recognition - Dec', 'CR', 185000.0000, 'USD', 185000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2024-12-31 18:00:00', '2024-12-31 18:00:00'),

-- Batch 7: Loan repayment (Dec) — DR Cash (acct 5), CR Commercial Loans (acct 1)
(13, 7, 5, '2024-12-15', '2024-12-15', 'LOAN_RPY', 'Scheduled repayment - Meridian Corp', 'DR', 2000000.0000, 'USD', 2000000.0000, 1, 1, 1, 'TERM_LOAN', 1, 1, 9, '2024-12-15 14:00:00', '2024-12-15 14:00:00'),
(14, 7, 1, '2024-12-15', '2024-12-15', 'LOAN_RPY', 'Principal reduction - Meridian Corp', 'CR', 2000000.0000, 'USD', 2000000.0000, 1, 1, 1, 'TERM_LOAN', 1, 1, 9, '2024-12-15 14:00:00', '2024-12-15 14:00:00'),

-- Batch 8: Provision charge (Dec) — DR Provision Expense (acct 10), CR Allowance (acct 9)
(15, 8, 10, '2024-12-31', '2024-12-31', 'PROV_CHG', 'Monthly provision charge - Dec', 'DR', 425000.0000, 'USD', 425000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2024-12-31 18:00:00', '2024-12-31 18:00:00'),
(16, 8, 9, '2024-12-31', '2024-12-31', 'PROV_CHG', 'Allowance build - Dec', 'CR', 425000.0000, 'USD', 425000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2024-12-31 18:00:00', '2024-12-31 18:00:00'),

-- Batch 9: Loan advance (Jan) — DR Commercial Loans (acct 1), CR Cash (acct 5)
(17, 9, 1, '2025-01-10', '2025-01-10', 'LOAN_ADV', 'Syndicated loan draw - Beacon Group', 'DR', 30000000.0000, 'USD', 30000000.0000, 4, 15, 15, 'SYNDICATED', 1, 1, 9, '2025-01-10 10:00:00', '2025-01-10 10:00:00'),
(18, 9, 5, '2025-01-10', '2025-01-10', 'LOAN_ADV', 'Cash disbursement - Beacon Group', 'CR', 30000000.0000, 'USD', 30000000.0000, 4, 15, 15, 'SYNDICATED', 1, 1, 9, '2025-01-10 10:00:00', '2025-01-10 10:00:00'),

-- Batch 10: Fee income (Jan) — DR Cash (acct 5), CR Fee Income (acct 7)
(19, 10, 5, '2025-01-15', '2025-01-15', 'FEE_POST', 'Commitment fee collection - Q1', 'DR', 750000.0000, 'USD', 750000.0000, NULL, NULL, NULL, 'REVOLVER', 2, 2, 9, '2025-01-15 09:00:00', '2025-01-15 09:00:00'),
(20, 10, 7, '2025-01-15', '2025-01-15', 'FEE_POST', 'Fee income recognition - Q1', 'CR', 750000.0000, 'USD', 750000.0000, NULL, NULL, NULL, 'REVOLVER', 2, 2, 9, '2025-01-15 09:00:00', '2025-01-15 09:00:00'),

-- Batch 11: Interest accrual (Jan) — DR Interest Receivable (acct 6), CR Interest Income (acct 7)
(21, 11, 6, '2025-01-31', '2025-01-31', 'INT_ACCR', 'Monthly interest accrual - Jan', 'DR', 210000.0000, 'USD', 210000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2025-01-31 18:00:00', '2025-01-31 18:00:00'),
(22, 11, 7, '2025-01-31', '2025-01-31', 'INT_ACCR', 'Interest income recognition - Jan', 'CR', 210000.0000, 'USD', 210000.0000, NULL, NULL, NULL, 'TERM_LOAN', 1, 1, 9, '2025-01-31 18:00:00', '2025-01-31 18:00:00'),

-- Batch 12: Provision charge (Jan) — DR Provision Expense (acct 10), CR Allowance (acct 9)
(23, 12, 10, '2025-01-31', '2025-01-31', 'PROV_CHG', 'Monthly provision charge - Jan', 'DR', 500000.0000, 'USD', 500000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2025-01-31 18:00:00', '2025-01-31 18:00:00'),
(24, 12, 9, '2025-01-31', '2025-01-31', 'PROV_CHG', 'Allowance build - Jan', 'CR', 500000.0000, 'USD', 500000.0000, NULL, NULL, NULL, 'PROVISION', 4, 4, 9, '2025-01-31 18:00:00', '2025-01-31 18:00:00');


-- ============================================================
-- gl_account_balance_snapshot — 10 accounts × 3 months = 30 rows
-- Period-end balances: 2024-11-30, 2024-12-31, 2025-01-31
-- Balances reflect cumulative effect of journal entries above
-- ============================================================
INSERT INTO l2.gl_account_balance_snapshot (
    ledger_account_id, as_of_date,
    begin_balance_dr_amt, begin_balance_cr_amt,
    period_activity_dr_amt, period_activity_cr_amt,
    ending_balance_dr_amt, ending_balance_cr_amt,
    currency_code, reporting_currency_amt,
    lob_segment_id, org_unit_id, source_system_id, created_ts, updated_ts
) VALUES
-- ── November 2024 ──
-- Acct 1: Commercial Loans (ASSET) — $15M advance
(1, '2024-11-30', 120000000.0000, 0.0000, 15000000.0000, 0.0000, 135000000.0000, 0.0000, 'USD', 135000000.0000, 1, 1, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 2: Revolvers Drawn (ASSET) — $8M draw
(2, '2024-11-30', 45000000.0000, 0.0000, 8000000.0000, 0.0000, 53000000.0000, 0.0000, 'USD', 53000000.0000, 2, 2, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 3: Term Loans (ASSET) — no Nov activity
(3, '2024-11-30', 80000000.0000, 0.0000, 0.0000, 0.0000, 80000000.0000, 0.0000, 'USD', 80000000.0000, 3, 3, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 4: Derivatives (ASSET) — mark-to-market
(4, '2024-11-30', 12000000.0000, 0.0000, 500000.0000, 200000.0000, 12300000.0000, 0.0000, 'USD', 12300000.0000, 3, 3, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 5: Cash & Equivalents (ASSET) — net outflows from advances
(5, '2024-11-30', 50000000.0000, 0.0000, 0.0000, 23000000.0000, 27000000.0000, 0.0000, 'USD', 27000000.0000, 1, 1, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 6: Interest Receivable (ASSET)
(6, '2024-11-30', 800000.0000, 0.0000, 125000.0000, 0.0000, 925000.0000, 0.0000, 'USD', 925000.0000, 1, 1, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 7: Interest & Fee Income (REVENUE — credit balance)
(7, '2024-11-30', 0.0000, 3500000.0000, 0.0000, 125000.0000, 0.0000, 3625000.0000, 'USD', 3625000.0000, 1, 1, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 8: Collateral Held (ASSET)
(8, '2024-11-30', 35000000.0000, 0.0000, 2000000.0000, 500000.0000, 36500000.0000, 0.0000, 'USD', 36500000.0000, 3, 3, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 9: Allowance (CONTRA_ASSET — credit balance)
(9, '2024-11-30', 0.0000, 4200000.0000, 0.0000, 350000.0000, 0.0000, 4550000.0000, 'USD', 4550000.0000, 4, 4, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),
-- Acct 10: Provision Expense (EXPENSE — debit balance)
(10, '2024-11-30', 1800000.0000, 0.0000, 350000.0000, 0.0000, 2150000.0000, 0.0000, 'USD', 2150000.0000, 4, 4, 9, '2024-12-01 06:00:00', '2024-12-01 06:00:00'),

-- ── December 2024 ──
-- Acct 1: Commercial Loans — $2M repayment
(1, '2024-12-31', 135000000.0000, 0.0000, 0.0000, 2000000.0000, 133000000.0000, 0.0000, 'USD', 133000000.0000, 1, 1, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 2: Revolvers Drawn — no Dec activity
(2, '2024-12-31', 53000000.0000, 0.0000, 0.0000, 0.0000, 53000000.0000, 0.0000, 'USD', 53000000.0000, 2, 2, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 3: Term Loans — $25M bridge loan
(3, '2024-12-31', 80000000.0000, 0.0000, 25000000.0000, 0.0000, 105000000.0000, 0.0000, 'USD', 105000000.0000, 3, 3, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 4: Derivatives — market adjustment
(4, '2024-12-31', 12300000.0000, 0.0000, 300000.0000, 800000.0000, 11800000.0000, 0.0000, 'USD', 11800000.0000, 3, 3, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 5: Cash — repayment in, bridge loan out
(5, '2024-12-31', 27000000.0000, 0.0000, 2000000.0000, 25000000.0000, 4000000.0000, 0.0000, 'USD', 4000000.0000, 1, 1, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 6: Interest Receivable
(6, '2024-12-31', 925000.0000, 0.0000, 185000.0000, 0.0000, 1110000.0000, 0.0000, 'USD', 1110000.0000, 1, 1, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 7: Interest & Fee Income
(7, '2024-12-31', 0.0000, 3625000.0000, 0.0000, 185000.0000, 0.0000, 3810000.0000, 'USD', 3810000.0000, 1, 1, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 8: Collateral Held
(8, '2024-12-31', 36500000.0000, 0.0000, 1500000.0000, 1000000.0000, 37000000.0000, 0.0000, 'USD', 37000000.0000, 3, 3, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 9: Allowance — $425K build
(9, '2024-12-31', 0.0000, 4550000.0000, 0.0000, 425000.0000, 0.0000, 4975000.0000, 'USD', 4975000.0000, 4, 4, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),
-- Acct 10: Provision Expense
(10, '2024-12-31', 2150000.0000, 0.0000, 425000.0000, 0.0000, 2575000.0000, 0.0000, 'USD', 2575000.0000, 4, 4, 9, '2025-01-01 06:00:00', '2025-01-01 06:00:00'),

-- ── January 2025 ──
-- Acct 1: Commercial Loans — $30M syndicated draw
(1, '2025-01-31', 133000000.0000, 0.0000, 30000000.0000, 0.0000, 163000000.0000, 0.0000, 'USD', 163000000.0000, 1, 1, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 2: Revolvers Drawn — no Jan activity
(2, '2025-01-31', 53000000.0000, 0.0000, 0.0000, 0.0000, 53000000.0000, 0.0000, 'USD', 53000000.0000, 2, 2, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 3: Term Loans — no Jan activity
(3, '2025-01-31', 105000000.0000, 0.0000, 0.0000, 0.0000, 105000000.0000, 0.0000, 'USD', 105000000.0000, 3, 3, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 4: Derivatives — favorable mark
(4, '2025-01-31', 11800000.0000, 0.0000, 900000.0000, 200000.0000, 12500000.0000, 0.0000, 'USD', 12500000.0000, 3, 3, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 5: Cash — syndicated draw out, fees in
(5, '2025-01-31', 4000000.0000, 0.0000, 750000.0000, 30000000.0000, 0.0000, 25250000.0000, 'USD', 25250000.0000, 1, 1, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 6: Interest Receivable
(6, '2025-01-31', 1110000.0000, 0.0000, 210000.0000, 0.0000, 1320000.0000, 0.0000, 'USD', 1320000.0000, 1, 1, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 7: Interest & Fee Income — interest + commitment fees
(7, '2025-01-31', 0.0000, 3810000.0000, 0.0000, 960000.0000, 0.0000, 4770000.0000, 'USD', 4770000.0000, 1, 1, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 8: Collateral Held
(8, '2025-01-31', 37000000.0000, 0.0000, 3000000.0000, 500000.0000, 39500000.0000, 0.0000, 'USD', 39500000.0000, 3, 3, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 9: Allowance — $500K build
(9, '2025-01-31', 0.0000, 4975000.0000, 0.0000, 500000.0000, 0.0000, 5475000.0000, 'USD', 5475000.0000, 4, 4, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00'),
-- Acct 10: Provision Expense
(10, '2025-01-31', 2575000.0000, 0.0000, 500000.0000, 0.0000, 3075000.0000, 0.0000, 'USD', 3075000.0000, 4, 4, 9, '2025-02-01 06:00:00', '2025-02-01 06:00:00');

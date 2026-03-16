-- Migration 023: Expand ledger_account_dim with full Chart of Accounts
--
-- Adds enterprise-wide G/L Chart of Accounts hierarchy to ledger_account_dim.
-- Existing 10 banking-book accounts (510001-510010) are preserved and reparented
-- under the new hierarchy structure.
--
-- Account numbering follows standard corporate accounting convention:
--   10000-16999  Current Assets
--   17000-18999  Property, Plant & Equipment
--   20000-24999  Current Liabilities
--   25000-26999  Long-term Liabilities
--   27000-29999  Stockholders' Equity
--   30000-39999  Operating Revenues
--   40000-49999  Cost of Goods Sold
--   50000-59999  Operating Expenses
--   90000-99999  Other Income/Expenses
--
-- Impact analysis:
--   - Zero formula impact: no metrics reference ledger_account_dim in formula_sql
--   - Zero L2 FK impact: existing 510001-510010 rows remain with same PKs
--   - parent_account_id self-refs updated to valid hierarchy nodes
--   - New rows use IDs 510011-510079 (contiguous with existing range)

SET search_path TO l1, public;

BEGIN;

-- ============================================================
-- STEP 1: Insert Category Parent Nodes (hierarchy level 0)
-- These are top-level groupings that individual accounts roll up to.
-- ============================================================

INSERT INTO l1.ledger_account_dim (
    ledger_account_id, account_code, account_name,
    account_type, account_category, is_balance_sheet_flag, is_active_flag,
    currency_code, normal_balance_indicator, parent_account_id,
    effective_start_date, effective_end_date,
    is_reconciliation_account_flag, legal_entity_id, lob_segment_id,
    source_system_id, created_ts, updated_ts, is_current_flag
) VALUES
-- Top-level categories (IDs 510011-510019)
(510011, 'CAT-CA',  'Current Assets',              'ASSET',     'CURRENT_ASSET',     true,  true, 'USD', 'DR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510012, 'CAT-PPE', 'Property, Plant & Equipment', 'ASSET',     'FIXED_ASSET',       true,  true, 'USD', 'DR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510013, 'CAT-CL',  'Current Liabilities',         'LIABILITY', 'CURRENT_LIABILITY', true,  true, 'USD', 'CR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510014, 'CAT-LTL', 'Long-term Liabilities',       'LIABILITY', 'LONG_TERM_LIABILITY', true, true, 'USD', 'CR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510015, 'CAT-EQ',  'Stockholders Equity',         'EQUITY',    'EQUITY',            true,  true, 'USD', 'CR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510016, 'CAT-REV', 'Operating Revenues',          'REVENUE',   'REVENUE',           false, true, 'USD', 'CR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510017, 'CAT-COGS','Cost of Goods Sold',          'EXPENSE',   'COGS',              false, true, 'USD', 'DR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510018, 'CAT-OPEX','Operating Expenses',           'EXPENSE',   'OPERATING_EXPENSE', false, true, 'USD', 'DR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510019, 'CAT-OTH', 'Other Income and Expenses',   'REVENUE',   'OTHER',             false, true, 'USD', 'DR', NULL, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
-- Banking sub-category under Current Assets for existing banking accounts
(510020, 'CAT-BANK','Banking Book Assets',          'ASSET',     'BANKING_BOOK',      true,  true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', true, 1, 400001, 9, NOW(), NOW(), true),
(510021, 'CAT-BKLB','Banking Book Liabilities',     'LIABILITY', 'BANKING_BOOK',      true,  true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', true, 1, 400001, 9, NOW(), NOW(), true);

-- ============================================================
-- STEP 2: Reparent existing 10 banking accounts under new hierarchy
-- Currently parent_account_id = 1-4 (invalid self-refs).
-- Map them to proper banking sub-categories.
-- ============================================================

-- Asset accounts (Commercial Loans, Revolvers, Term Loans, Derivatives, Collateral, Allowance, Interest Receivable)
UPDATE l1.ledger_account_dim SET parent_account_id = 510020, is_current_flag = true
WHERE ledger_account_id IN (510001, 510002, 510003, 510007, 510008, 510009, 510010);

-- Liability/off-balance-sheet accounts (Commitments, Unfunded Revolvers, Letters of Credit)
UPDATE l1.ledger_account_dim SET parent_account_id = 510021, is_current_flag = true
WHERE ledger_account_id IN (510004, 510005, 510006);

-- ============================================================
-- STEP 3: Insert Chart of Accounts detail accounts
-- Following the user's master G/L structure.
-- ============================================================

INSERT INTO l1.ledger_account_dim (
    ledger_account_id, account_code, account_name,
    account_type, account_category, is_balance_sheet_flag, is_active_flag,
    currency_code, normal_balance_indicator, parent_account_id,
    effective_start_date, effective_end_date,
    is_reconciliation_account_flag, legal_entity_id, lob_segment_id,
    source_system_id, created_ts, updated_ts, is_current_flag
) VALUES
-- ── Current Assets (parent = 510011) ──
(510022, '10100', 'Cash - Regular Checking',         'ASSET', 'CASH',              true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510023, '10200', 'Cash - Payroll Checking',          'ASSET', 'CASH',              true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510024, '10600', 'Petty Cash Fund',                  'ASSET', 'CASH',              true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510025, '12100', 'Accounts Receivable',              'ASSET', 'RECEIVABLE',        true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', true,  1, 400001, 9, NOW(), NOW(), true),
(510026, '12500', 'Allowance for Doubtful Accounts',  'ASSET', 'CONTRA_RECEIVABLE', true, true, 'USD', 'CR', 510011, '2020-01-01', '9999-12-31', true,  1, 400001, 9, NOW(), NOW(), true),
(510027, '13100', 'Inventory',                        'ASSET', 'INVENTORY',         true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400002, 9, NOW(), NOW(), true),
(510028, '14100', 'Supplies',                         'ASSET', 'SUPPLIES',          true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400002, 9, NOW(), NOW(), true),
(510029, '15300', 'Prepaid Insurance',                'ASSET', 'PREPAID',           true, true, 'USD', 'DR', 510011, '2020-01-01', '9999-12-31', false, 1, 400002, 9, NOW(), NOW(), true),

-- ── Property, Plant & Equipment (parent = 510012) ──
(510030, '17000', 'Land',                             'ASSET', 'FIXED_ASSET',       true, true, 'USD', 'DR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510031, '17100', 'Buildings',                        'ASSET', 'FIXED_ASSET',       true, true, 'USD', 'DR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510032, '17300', 'Equipment',                        'ASSET', 'FIXED_ASSET',       true, true, 'USD', 'DR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510033, '17800', 'Vehicles',                         'ASSET', 'FIXED_ASSET',       true, true, 'USD', 'DR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510034, '18100', 'Accumulated Depreciation - Buildings',  'ASSET', 'CONTRA_ASSET', true, true, 'USD', 'CR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510035, '18300', 'Accumulated Depreciation - Equipment',  'ASSET', 'CONTRA_ASSET', true, true, 'USD', 'CR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),
(510036, '18800', 'Accumulated Depreciation - Vehicles',   'ASSET', 'CONTRA_ASSET', true, true, 'USD', 'CR', 510012, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),

-- ── Current Liabilities (parent = 510013) ──
(510037, '20100', 'Notes Payable - Credit Line 1',   'LIABILITY', 'NOTES_PAYABLE',    true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', true,  1, 400004, 9, NOW(), NOW(), true),
(510038, '20200', 'Notes Payable - Credit Line 2',   'LIABILITY', 'NOTES_PAYABLE',    true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', true,  1, 400004, 9, NOW(), NOW(), true),
(510039, '21000', 'Accounts Payable',                 'LIABILITY', 'PAYABLE',          true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', true,  1, 400004, 9, NOW(), NOW(), true),
(510040, '22100', 'Wages Payable',                    'LIABILITY', 'ACCRUED_LIABILITY', true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', false, 1, 400004, 9, NOW(), NOW(), true),
(510041, '23100', 'Interest Payable',                 'LIABILITY', 'ACCRUED_LIABILITY', true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', true,  1, 400004, 9, NOW(), NOW(), true),
(510042, '24500', 'Unearned Revenues',                'LIABILITY', 'DEFERRED_REVENUE', true, true, 'USD', 'CR', 510013, '2020-01-01', '9999-12-31', false, 1, 400004, 9, NOW(), NOW(), true),

-- ── Long-term Liabilities (parent = 510014) ──
(510043, '25100', 'Mortgage Loan Payable',            'LIABILITY', 'LONG_TERM_DEBT',   true, true, 'USD', 'CR', 510014, '2020-01-01', '9999-12-31', true,  1, 400005, 9, NOW(), NOW(), true),
(510044, '25600', 'Bonds Payable',                    'LIABILITY', 'LONG_TERM_DEBT',   true, true, 'USD', 'CR', 510014, '2020-01-01', '9999-12-31', true,  1, 400005, 9, NOW(), NOW(), true),
(510045, '25650', 'Discount on Bonds Payable',        'LIABILITY', 'CONTRA_LIABILITY', true, true, 'USD', 'DR', 510014, '2020-01-01', '9999-12-31', false, 1, 400005, 9, NOW(), NOW(), true),

-- ── Stockholders' Equity (parent = 510015) ──
(510046, '27100', 'Common Stock, No Par',             'EQUITY', 'EQUITY',            true, true, 'USD', 'CR', 510015, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510047, '27500', 'Retained Earnings',                'EQUITY', 'EQUITY',            true, true, 'USD', 'CR', 510015, '2020-01-01', '9999-12-31', true,  1, 400001, 9, NOW(), NOW(), true),
(510048, '29500', 'Treasury Stock',                   'EQUITY', 'CONTRA_EQUITY',     true, true, 'USD', 'DR', 510015, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),

-- ── Operating Revenues (parent = 510016) ──
(510049, '31010', 'Sales - Div 1, Product Line 010', 'REVENUE', 'SALES',             false, true, 'USD', 'CR', 510016, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510050, '31022', 'Sales - Div 1, Product Line 022', 'REVENUE', 'SALES',             false, true, 'USD', 'CR', 510016, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510051, '32015', 'Sales - Div 2, Product Line 015', 'REVENUE', 'SALES',             false, true, 'USD', 'CR', 510016, '2020-01-01', '9999-12-31', false, 1, 400002, 9, NOW(), NOW(), true),
(510052, '33110', 'Sales - Div 3, Product Line 110', 'REVENUE', 'SALES',             false, true, 'USD', 'CR', 510016, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),

-- ── Cost of Goods Sold (parent = 510017) ──
(510053, '41010', 'COGS - Div 1, Product Line 010',  'EXPENSE', 'COGS',              false, true, 'USD', 'DR', 510017, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510054, '41022', 'COGS - Div 1, Product Line 022',  'EXPENSE', 'COGS',              false, true, 'USD', 'DR', 510017, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510055, '42015', 'COGS - Div 2, Product Line 015',  'EXPENSE', 'COGS',              false, true, 'USD', 'DR', 510017, '2020-01-01', '9999-12-31', false, 1, 400002, 9, NOW(), NOW(), true),
(510056, '43110', 'COGS - Div 3, Product Line 110',  'EXPENSE', 'COGS',              false, true, 'USD', 'DR', 510017, '2020-01-01', '9999-12-31', false, 1, 400003, 9, NOW(), NOW(), true),

-- ── Marketing Expenses (parent = 510018) ──
(510057, '50100', 'Marketing Dept. Salaries',         'EXPENSE', 'SALARY_EXPENSE',    false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510058, '50150', 'Marketing Dept. Payroll Taxes',    'EXPENSE', 'TAX_EXPENSE',       false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510059, '50200', 'Marketing Dept. Supplies',         'EXPENSE', 'SUPPLY_EXPENSE',    false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510060, '50600', 'Marketing Dept. Telephone',        'EXPENSE', 'TELECOM_EXPENSE',   false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),

-- ── Payroll Dept. Expenses (parent = 510018) ──
(510061, '59100', 'Payroll Dept. Salaries',           'EXPENSE', 'SALARY_EXPENSE',    false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510062, '59150', 'Payroll Dept. Payroll Taxes',      'EXPENSE', 'TAX_EXPENSE',       false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510063, '59200', 'Payroll Dept. Supplies',           'EXPENSE', 'SUPPLY_EXPENSE',    false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510064, '59600', 'Payroll Dept. Telephone',          'EXPENSE', 'TELECOM_EXPENSE',   false, true, 'USD', 'DR', 510018, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),

-- ── Other Income/Expenses (parent = 510019) ──
(510065, '91800', 'Gain on Sale of Assets',           'REVENUE', 'GAIN',              false, true, 'USD', 'CR', 510019, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true),
(510066, '96100', 'Loss on Sale of Assets',           'EXPENSE', 'LOSS',              false, true, 'USD', 'DR', 510019, '2020-01-01', '9999-12-31', false, 1, 400001, 9, NOW(), NOW(), true);

-- ============================================================
-- STEP 4: Validation queries (run inline, errors abort transaction)
-- ============================================================

-- Verify no duplicate account_codes
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT account_code) INTO dup_count
    FROM l1.ledger_account_dim;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: % duplicate account_codes found', dup_count;
    END IF;
END $$;

-- Verify no duplicate PKs
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT ledger_account_id) INTO dup_count
    FROM l1.ledger_account_dim;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: % duplicate ledger_account_ids found', dup_count;
    END IF;
END $$;

-- Verify all parent_account_id self-refs point to valid rows
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM l1.ledger_account_dim child
    WHERE child.parent_account_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM l1.ledger_account_dim parent
          WHERE parent.ledger_account_id = child.parent_account_id
      );
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: % rows have parent_account_id pointing to non-existent rows', orphan_count;
    END IF;
END $$;

-- Verify all currency_code FKs are valid
DO $$
DECLARE
    bad_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bad_count
    FROM l1.ledger_account_dim lad
    WHERE lad.currency_code IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM l1.currency_dim cd WHERE cd.currency_code = lad.currency_code
      );
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: % rows have invalid currency_code FK', bad_count;
    END IF;
END $$;

-- Verify all lob_segment_id FKs are valid
DO $$
DECLARE
    bad_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bad_count
    FROM l1.ledger_account_dim lad
    WHERE lad.lob_segment_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM l1.enterprise_business_taxonomy ebt
          WHERE ebt.managed_segment_id = lad.lob_segment_id
      );
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: % rows have invalid lob_segment_id FK', bad_count;
    END IF;
END $$;

-- Verify existing L2 FK references are unbroken
DO $$
DECLARE
    broken_fm INTEGER;
    broken_fps INTEGER;
BEGIN
    SELECT COUNT(*) INTO broken_fm
    FROM l2.facility_master fm
    WHERE fm.ledger_account_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM l1.ledger_account_dim lad
          WHERE lad.ledger_account_id = fm.ledger_account_id
      );
    SELECT COUNT(*) INTO broken_fps
    FROM l2.facility_profitability_snapshot fps
    WHERE fps.ledger_account_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM l1.ledger_account_dim lad
          WHERE lad.ledger_account_id = fps.ledger_account_id
      );
    IF broken_fm > 0 OR broken_fps > 0 THEN
        RAISE EXCEPTION 'VALIDATION FAILED: L2 FK integrity broken (facility_master: %, profitability: %)', broken_fm, broken_fps;
    END IF;
END $$;

COMMIT;

-- ============================================================
-- Post-commit verification (informational, outside transaction)
-- ============================================================
SELECT 'Total GL accounts: ' || COUNT(*) AS summary FROM l1.ledger_account_dim;
SELECT account_type, COUNT(*) AS cnt FROM l1.ledger_account_dim GROUP BY account_type ORDER BY cnt DESC;
SELECT 'Hierarchy depth check' AS check_name,
       MAX(depth) AS max_depth
FROM (
    WITH RECURSIVE tree AS (
        SELECT ledger_account_id, parent_account_id, 1 AS depth
        FROM l1.ledger_account_dim WHERE parent_account_id IS NULL
        UNION ALL
        SELECT c.ledger_account_id, c.parent_account_id, t.depth + 1
        FROM l1.ledger_account_dim c JOIN tree t ON c.parent_account_id = t.ledger_account_id
    )
    SELECT depth FROM tree
) depths;

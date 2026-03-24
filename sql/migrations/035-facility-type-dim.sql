-- Migration 035: Create facility_type_dim and link to facility_master
-- Fixes the systemic gap where facility types are uncontrolled VARCHAR strings.
-- Per CLAUDE.md "Basel III Exposure Type Rules", off-balance-sheet facility types
-- MUST have regulatory CCF values (CRE 20.93).

SET search_path TO l1, l2, public;

-- ── 1. Create L1 facility_type_dim ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l1.facility_type_dim (
    facility_type_id       BIGSERIAL PRIMARY KEY,
    facility_type_code     VARCHAR(30)    NOT NULL UNIQUE,
    facility_type_name     VARCHAR(200)   NOT NULL,
    description            VARCHAR(2000),
    is_off_balance_sheet_flag BOOLEAN     NOT NULL DEFAULT FALSE,
    regulatory_ccf_pct     NUMERIC(10,6),  -- Basel III CRE 20.93 standard CCF
    product_category       VARCHAR(50),    -- LOAN, COMMITMENT, GUARANTEE, LC, BRIDGE
    is_revolving_flag      BOOLEAN        NOT NULL DEFAULT FALSE,
    is_active_flag         BOOLEAN        NOT NULL DEFAULT TRUE,
    created_ts             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_ts             TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    created_by             VARCHAR(100),
    record_source          VARCHAR(100),
    load_batch_id          VARCHAR(100),
    effective_start_date   DATE,
    effective_end_date     DATE,
    is_current_flag        BOOLEAN        DEFAULT TRUE
);

-- ── 2. Seed reference data (Basel III CCF per CRE 20.93) ────────────────────
INSERT INTO l1.facility_type_dim
    (facility_type_code, facility_type_name, description,
     is_off_balance_sheet_flag, regulatory_ccf_pct, product_category, is_revolving_flag,
     created_by, record_source)
VALUES
    -- On-balance-sheet facility types (no CCF — drawn = EAD)
    ('TERM_LOAN',        'Term Loan',                'Standard amortizing term loan',
     FALSE, NULL, 'LOAN', FALSE, 'migration-035', 'Basel III SA'),

    ('TERM_LOAN_B',      'Term Loan B',              'Institutional tranche term loan (leveraged)',
     FALSE, NULL, 'LOAN', FALSE, 'migration-035', 'Basel III SA'),

    ('BRIDGE_LOAN',      'Bridge Loan',              'Short-term bridge financing',
     FALSE, NULL, 'LOAN', FALSE, 'migration-035', 'Basel III SA'),

    -- Off-balance-sheet: revolving commitments (40% CCF per CRE 20.93)
    ('REVOLVING_CREDIT', 'Revolving Credit Facility', 'Committed revolving credit line with undrawn component',
     TRUE, 40.000000, 'COMMITMENT', TRUE, 'migration-035', 'Basel III CRE 20.93'),

    -- Off-balance-sheet: letters of credit
    ('LETTER_OF_CREDIT', 'Letter of Credit Facility', 'Commercial/standby letter of credit',
     TRUE, 20.000000, 'LC', FALSE, 'migration-035', 'Basel III CRE 20.93'),

    -- Additional standard types (for future use)
    ('FINANCIAL_GUAR',   'Financial Guarantee',       'Financial guarantee / standby LC',
     TRUE, 100.000000, 'GUARANTEE', FALSE, 'migration-035', 'Basel III CRE 20.93'),

    ('PERF_GUAR',        'Performance Guarantee',     'Performance guarantee / bid bond',
     TRUE, 50.000000, 'GUARANTEE', FALSE, 'migration-035', 'Basel III CRE 20.93'),

    ('UNCOMMITTED',      'Uncommitted Line',          'Uncommitted facility — unconditionally cancellable',
     TRUE, 10.000000, 'COMMITMENT', TRUE, 'migration-035', 'Basel III CRE 20.93'),

    ('TRADE_FINANCE',    'Trade Finance Facility',    'Short-term trade-related contingency',
     TRUE, 20.000000, 'LC', FALSE, 'migration-035', 'Basel III CRE 20.93'),

    ('ABL',              'Asset-Based Lending',       'Asset-based revolving line secured by receivables/inventory',
     TRUE, 40.000000, 'COMMITMENT', TRUE, 'migration-035', 'Basel III CRE 20.93')
ON CONFLICT (facility_type_code) DO NOTHING;

-- ── 3. Add facility_type_id FK column to facility_master ────────────────────
ALTER TABLE l2.facility_master
    ADD COLUMN IF NOT EXISTS facility_type_id BIGINT;

-- ── 4. Populate facility_type_id from existing facility_type VARCHAR ─────────
UPDATE l2.facility_master fm
SET facility_type_id = ftd.facility_type_id
FROM l1.facility_type_dim ftd
WHERE fm.facility_type = ftd.facility_type_code
  AND fm.facility_type_id IS NULL;

-- ── 5. Add FK constraint ────────────────────────────────────────────────────
ALTER TABLE l2.facility_master
    ADD CONSTRAINT fk_fm_facility_type
    FOREIGN KEY (facility_type_id)
    REFERENCES l1.facility_type_dim (facility_type_id);

-- ── 6. Verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
    dim_count INTEGER;
    linked_count INTEGER;
    unlinked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dim_count FROM l1.facility_type_dim;
    SELECT COUNT(*) INTO linked_count FROM l2.facility_master WHERE facility_type_id IS NOT NULL;
    SELECT COUNT(*) INTO unlinked_count FROM l2.facility_master WHERE facility_type_id IS NULL;
    RAISE NOTICE 'facility_type_dim: % rows', dim_count;
    RAISE NOTICE 'facility_master linked: %, unlinked: %', linked_count, unlinked_count;
    IF unlinked_count > 0 THEN
        RAISE WARNING '% facilities have no matching facility_type_dim entry — add missing type codes', unlinked_count;
    END IF;
END $$;

-- Migration 011a: Additive audit fixes from GSIB data model review
-- Addresses 4 findings: audit timestamps, provenance fields, SCD-2 upgrade, architecture exception docs.
-- All operations are idempotent (IF NOT EXISTS guards). Safe to re-run.
--
-- =====================================================================
-- ARCHITECTURAL EXCEPTION: l1.regulatory_capital_requirement
-- =====================================================================
-- This L1 table retains 5 derived/total fields that would normally
-- belong in L3 under strict layer conventions:
--   - total_cet1_req_pct
--   - total_tier1_req_pct
--   - total_capital_req_pct
--   - total_leverage_req_pct
--   - total_slr_req_pct
--
-- Justification: The Federal Reserve publishes these totals directly
-- as part of the GSIB surcharge / SCB framework (FR Y-14, CCAR).
-- They are NOT computed by our engine from component buffers; they are
-- raw reference data received from the regulator. Splitting them into
-- a separate L3 table would misrepresent their provenance and add
-- unnecessary complexity. This exception is documented and accepted.
-- =====================================================================

SET client_min_messages TO NOTICE;

-----------------------------------------------------------------------
-- SECTION 1: Audit Timestamps (Finding 5)
-- Add created_ts / updated_ts to L1 tables that are missing them.
-- The 14 known tables are listed below, but the dynamic scan catches
-- any other L1 table missing these columns as well.
--
-- Known targets: credit_event_type_dim, credit_status_dim,
--   default_definition_dim, date_dim, country_dim, currency_dim,
--   internal_risk_rating_bucket_dim, pricing_tier_dim,
--   risk_rating_tier_dim, dpd_bucket_dim, utilization_status_dim,
--   origination_date_bucket_dim, limit_status_dim,
--   rating_change_status_dim
-----------------------------------------------------------------------

-- 1a: Add created_ts to L1 tables missing it
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l1'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'created_ts'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 1a: Added created_ts to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 1a complete: Added created_ts to % L1 tables', cnt;
END $$;

-- 1b: Add updated_ts to L1 tables missing it
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'l1'
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'updated_ts'
          )
        ORDER BY t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 1b: Added updated_ts to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 1b complete: Added updated_ts to % L1 tables', cnt;
END $$;


-----------------------------------------------------------------------
-- SECTION 2: Provenance Fields (Finding 4)
-- Add created_by and load_batch_id to all L1/L2/L3 tables missing them.
-----------------------------------------------------------------------

-- 2a: Add created_by to all tables missing it
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema IN ('l1', 'l2', 'l3')
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'created_by'
          )
        ORDER BY t.table_schema, t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 2a: Added created_by to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 2a complete: Added created_by to % tables', cnt;
END $$;

-- 2b: Add load_batch_id to all tables missing it
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema IN ('l1', 'l2', 'l3')
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'load_batch_id'
          )
        ORDER BY t.table_schema, t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS load_batch_id VARCHAR(100)',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 2b: Added load_batch_id to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 2b complete: Added load_batch_id to % tables', cnt;
END $$;


-----------------------------------------------------------------------
-- SECTION 3: SCD-2 Fields (Finding 3)
-- Add effective_start_date, effective_end_date, is_current_flag to
-- 38 SCD-1 L1 tables that should support SCD-2 history tracking.
-- Uses ADD COLUMN IF NOT EXISTS so tables that already have some of
-- these columns (e.g. sccl_counterparty_group_member) are safe.
-----------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
    scd1_tables TEXT[] := ARRAY[
        'duns_entity_dim',
        'source_system_registry',
        'industry_dim',
        'enterprise_business_taxonomy',
        'enterprise_product_taxonomy',
        'portfolio_dim',
        'org_unit_dim',
        'rating_source',
        'rating_grade_dim',
        'collateral_type',
        'interest_rate_index_dim',
        'ledger_account_dim',
        'context_dim',
        'metric_definition_dim',
        'instrument_identifier',
        'collateral_eligibility_dim',
        'collateral_haircut_dim',
        'crm_eligibility_dim',
        'collateral_portfolio',
        'sccl_counterparty_group',
        'sccl_counterparty_group_member',
        'limit_rule',
        'limit_threshold',
        'run_control',
        'report_registry',
        'reporting_entity_dim',
        'model_registry_dim',
        'rule_registry',
        'validation_check_registry',
        'reconciliation_control',
        'regulatory_mapping',
        'report_cell_definition',
        'rating_mapping',
        'scenario_dim',
        'metric_threshold',
        'equity_allocation_config',
        'impairment_model_dim',
        'regulatory_capital_requirement'
    ];
    cnt_start INTEGER := 0;
    cnt_end   INTEGER := 0;
    cnt_flag  INTEGER := 0;
    skipped   INTEGER := 0;
BEGIN
    FOREACH tbl IN ARRAY scd1_tables
    LOOP
        -- Verify table exists before altering
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'l1' AND table_name = tbl
        ) THEN
            RAISE NOTICE 'Section 3: Skipping l1.% (table does not exist)', tbl;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        -- effective_start_date
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'l1' AND table_name = tbl
              AND column_name = 'effective_start_date'
        ) THEN
            EXECUTE format(
                'ALTER TABLE l1.%I ADD COLUMN IF NOT EXISTS effective_start_date DATE',
                tbl
            );
            cnt_start := cnt_start + 1;
        END IF;

        -- effective_end_date
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'l1' AND table_name = tbl
              AND column_name = 'effective_end_date'
        ) THEN
            EXECUTE format(
                'ALTER TABLE l1.%I ADD COLUMN IF NOT EXISTS effective_end_date DATE',
                tbl
            );
            cnt_end := cnt_end + 1;
        END IF;

        -- is_current_flag
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'l1' AND table_name = tbl
              AND column_name = 'is_current_flag'
        ) THEN
            EXECUTE format(
                'ALTER TABLE l1.%I ADD COLUMN IF NOT EXISTS is_current_flag BOOLEAN DEFAULT TRUE',
                tbl
            );
            cnt_flag := cnt_flag + 1;
        END IF;

        RAISE NOTICE 'Section 3: Processed l1.%', tbl;
    END LOOP;

    RAISE NOTICE 'Section 3 complete: Added effective_start_date to %, effective_end_date to %, is_current_flag to % tables (% skipped)',
        cnt_start, cnt_end, cnt_flag, skipped;
END $$;


-----------------------------------------------------------------------
-- SECTION 4: Architectural Exception Documentation (Finding 1)
-- Add a COMMENT on the regulatory_capital_requirement table to
-- formally document the L1 exception for derived totals.
-----------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'l1' AND table_name = 'regulatory_capital_requirement'
    ) THEN
        COMMENT ON TABLE l1.regulatory_capital_requirement IS
            'Fed-published capital requirements per GSIB per effective date. '
            'ARCHITECTURAL EXCEPTION: 5 total-requirement fields '
            '(total_cet1_req_pct, total_tier1_req_pct, total_capital_req_pct, '
            'total_leverage_req_pct, total_slr_req_pct) are retained in L1 '
            'because the Federal Reserve publishes these totals directly as '
            'part of the GSIB surcharge / SCB framework. They are NOT computed '
            'by our engine from component buffers. Accepted exception per GSIB '
            'data model audit Finding 1.';
        RAISE NOTICE 'Section 4: Added architectural exception comment to l1.regulatory_capital_requirement';
    ELSE
        RAISE NOTICE 'Section 4: l1.regulatory_capital_requirement does not exist, skipping comment';
    END IF;
END $$;


-----------------------------------------------------------------------
-- DONE
-----------------------------------------------------------------------
DO $$ BEGIN
    RAISE NOTICE '=== Migration 011a complete: Additive audit fixes applied ===';
END $$;

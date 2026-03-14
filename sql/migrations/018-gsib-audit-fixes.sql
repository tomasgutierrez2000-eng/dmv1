-- Migration 018: GSIB Audit Remediation Fixes
-- Addresses findings from end-to-end GSIB quality review:
--   1. Add record_source to 6 tables missing it (4 L1 + 2 L2)
--   2. Remove duplicate product_code from L2.position (DD-only issue, DB is clean)
--
-- All operations are idempotent. Safe to re-run.

SET client_min_messages TO NOTICE;

-----------------------------------------------------------------------
-- SECTION 1: Add record_source to L1/L2 tables missing it
-- Tables: l1.basel_exposure_type_dim, l1.capital_allocation,
--         l1.equity_allocation_config, l1.regulatory_capital_requirement,
--         l2.capital_position_snapshot, l2.duns_entity_observation
-----------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT t.table_schema, t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema IN ('l1', 'l2')
          AND t.table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = t.table_schema
                AND c.table_name = t.table_name
                AND c.column_name = 'record_source'
          )
        ORDER BY t.table_schema, t.table_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS record_source VARCHAR(100)',
            rec.table_schema, rec.table_name
        );
        cnt := cnt + 1;
        RAISE NOTICE 'Section 1: Added record_source to %.%', rec.table_schema, rec.table_name;
    END LOOP;
    RAISE NOTICE 'Section 1 complete: Added record_source to % tables', cnt;
END $$;

-- ============================================================================
-- Migration 003: GSIB-Quality Reference Data IDs
-- ============================================================================
-- Converts simple sequential IDs (1,2,3...) to domain-grouped unique IDs
-- across all L1 reference tables. Uses DROP/CREATE FK constraint approach
-- since GCP Cloud SQL doesn't allow DISABLE TRIGGER ALL.
--
-- Approach:
--   1. Save all FK constraint definitions to temp table
--   2. Drop all FK constraints across L1/L2/L3
--   3. Update all PK values and FK column values
--   4. Recreate all FK constraints
--   5. Reset sequences
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Save and drop ALL FK constraints in L1/L2/L3
-- ============================================================================

CREATE TEMP TABLE saved_fk_constraints (
    schema_name TEXT,
    table_name TEXT,
    constraint_name TEXT,
    constraint_def TEXT
);

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_schema, tc.table_name, tc.constraint_name,
               pg_get_constraintdef(pgc.oid) as def
        FROM information_schema.table_constraints tc
        JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
        JOIN pg_namespace ns ON ns.nspname = tc.constraint_schema AND pgc.connamespace = ns.oid
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('l1', 'l2', 'l3')
        ORDER BY tc.table_schema DESC, tc.table_name  -- L3 first, then L2, then L1
    LOOP
        INSERT INTO saved_fk_constraints VALUES (r.table_schema, r.table_name, r.constraint_name, r.def);
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;
    RAISE NOTICE 'Dropped % FK constraints', (SELECT count(*) FROM saved_fk_constraints);
END $$;


-- ============================================================================
-- STEP 2: Update L1 table PKs and BIGINT FK columns
-- ============================================================================

-- Offset key:
--   +100000  collateral_type
--   +110000  collateral_eligibility_dim
--   +120000  collateral_haircut_dim
--   +130000  collateral_portfolio
--   +200000  context_dim
--   +210000  crm_eligibility_dim
--   +300000  date_dim
--   +310000  date_time_dim
--   +320000  default_definition_dim
--   +400000  enterprise_business_taxonomy
--   +410000  enterprise_product_taxonomy
--   +420000  exposure_type_dim
--   +500000  interest_rate_index_dim
--   +510000  ledger_account_dim
--   +600000  limit_rule
--   +610000  limit_threshold
--   +620000  maturity_bucket_dim
--   +700000  metric_definition_dim
--   +710000  metric_threshold
--   +720000  model_registry_dim
--   +800000  org_unit_dim
--   +810000  portfolio_dim
--   +900000  rating_grade_dim
--   +910000  rating_mapping
--   +920000  rating_scale_dim
--   +930000  rating_source
--   +940000  reconciliation_control
--   +1000000 regulatory_capital_basis_dim
--   +1010000 regulatory_mapping
--   +1020000 report_cell_definition
--   +1030000 report_registry
--   +1040000 reporting_calendar_dim
--   +1050000 reporting_entity_dim
--   +1100000 rule_registry
--   +1110000 run_control
--   +1200000 sccl_counterparty_group
--   +1210000 sccl_counterparty_group_member
--   +1300000 scenario_dim
--   +1400000 source_system_registry
--   +1500000 validation_check_registry

-- === Source system registry (+1400000) — most widely referenced ===
UPDATE l1.source_system_registry
SET source_system_id = source_system_id + 1400000;

-- === Collateral domain ===
UPDATE l1.collateral_type
SET collateral_type_id = collateral_type_id + 100000;

UPDATE l1.maturity_bucket_dim
SET maturity_bucket_id = maturity_bucket_id + 620000;

UPDATE l1.regulatory_capital_basis_dim
SET regulatory_capital_basis_id = regulatory_capital_basis_id + 1000000;

UPDATE l1.collateral_eligibility_dim
SET collateral_eligibility_id = collateral_eligibility_id + 110000,
    collateral_type_id = collateral_type_id + 100000,
    regulatory_capital_basis_id = CASE WHEN regulatory_capital_basis_id IS NOT NULL THEN regulatory_capital_basis_id + 1000000 ELSE NULL END;

UPDATE l1.collateral_haircut_dim
SET collateral_haircut_id = collateral_haircut_id + 120000,
    collateral_type_id = collateral_type_id + 100000,
    maturity_bucket_id = CASE WHEN maturity_bucket_id IS NOT NULL THEN maturity_bucket_id + 620000 ELSE NULL END,
    regulatory_capital_basis_id = CASE WHEN regulatory_capital_basis_id IS NOT NULL THEN regulatory_capital_basis_id + 1000000 ELSE NULL END;

-- === Enterprise taxonomy (+400000) — self-referencing ===
UPDATE l1.enterprise_business_taxonomy
SET managed_segment_id = managed_segment_id + 400000,
    parent_segment_id = CASE WHEN parent_segment_id IS NOT NULL THEN parent_segment_id + 400000 ELSE NULL END;

-- === Portfolio (+810000) — self-ref, FK to enterprise_business_taxonomy ===
UPDATE l1.portfolio_dim
SET portfolio_id = portfolio_id + 810000,
    parent_portfolio_id = CASE WHEN parent_portfolio_id IS NOT NULL THEN parent_portfolio_id + 810000 ELSE NULL END,
    lob_segment_id = CASE WHEN lob_segment_id IS NOT NULL THEN lob_segment_id + 400000 ELSE NULL END;

UPDATE l1.collateral_portfolio
SET collateral_portfolio_id = collateral_portfolio_id + 130000,
    portfolio_id = CASE WHEN portfolio_id IS NOT NULL THEN portfolio_id + 810000 ELSE NULL END,
    lob_segment_id = CASE WHEN lob_segment_id IS NOT NULL THEN lob_segment_id + 400000 ELSE NULL END;

-- === Context (+200000) ===
UPDATE l1.context_dim
SET context_id = context_id + 200000;

-- === CRM eligibility (+210000) ===
UPDATE l1.crm_eligibility_dim
SET crm_eligibility_id = crm_eligibility_id + 210000,
    regulatory_capital_basis_id = CASE WHEN regulatory_capital_basis_id IS NOT NULL THEN regulatory_capital_basis_id + 1000000 ELSE NULL END,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

-- === Calendar (+300000, +310000) ===
UPDATE l1.date_dim
SET date_id = date_id + 300000;

UPDATE l1.date_time_dim
SET date_time_id = date_time_id + 310000,
    date_id = CASE WHEN date_id IS NOT NULL THEN date_id + 300000 ELSE NULL END;

-- === Default definition (+320000) ===
UPDATE l1.default_definition_dim
SET default_definition_id = default_definition_id + 320000;

-- === Enterprise product taxonomy (+410000) — self-ref parent_node_id ===
UPDATE l1.enterprise_product_taxonomy
SET product_node_id = product_node_id + 410000,
    parent_node_id = CASE WHEN parent_node_id IS NOT NULL THEN parent_node_id + 410000 ELSE NULL END;

-- === Exposure type (+420000) ===
UPDATE l1.exposure_type_dim
SET exposure_type_id = exposure_type_id + 420000;

-- === Interest rate index (+500000) ===
UPDATE l1.interest_rate_index_dim
SET rate_index_id = rate_index_id + 500000;

-- === Ledger account (+510000) ===
UPDATE l1.ledger_account_dim
SET ledger_account_id = ledger_account_id + 510000,
    lob_segment_id = CASE WHEN lob_segment_id IS NOT NULL THEN lob_segment_id + 400000 ELSE NULL END;

-- === Limits (+600000, +610000) ===
UPDATE l1.limit_rule
SET limit_rule_id = limit_rule_id + 600000;

UPDATE l1.limit_threshold
SET limit_threshold_id = limit_threshold_id + 610000,
    limit_rule_id = CASE WHEN limit_rule_id IS NOT NULL THEN limit_rule_id + 600000 ELSE NULL END;

-- === Metrics (+700000, +710000) ===
UPDATE l1.metric_definition_dim
SET metric_definition_id = metric_definition_id + 700000;

UPDATE l1.metric_threshold
SET threshold_id = threshold_id + 710000,
    metric_definition_id = CASE WHEN metric_definition_id IS NOT NULL THEN metric_definition_id + 700000 ELSE NULL END;

-- === Org unit (+800000) — self-ref, FKs to enterprise_business_taxonomy, source_system ===
UPDATE l1.org_unit_dim
SET org_unit_id = org_unit_id + 800000,
    parent_org_unit_id = CASE WHEN parent_org_unit_id IS NOT NULL THEN parent_org_unit_id + 800000 ELSE NULL END,
    lob_segment_id = CASE WHEN lob_segment_id IS NOT NULL THEN lob_segment_id + 400000 ELSE NULL END,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

-- === Model registry (+720000) — FK to org_unit ===
UPDATE l1.model_registry_dim
SET model_id = model_id + 720000,
    owner_org_unit_id = CASE WHEN owner_org_unit_id IS NOT NULL THEN owner_org_unit_id + 800000 ELSE NULL END;

-- === Rating domain ===
UPDATE l1.rating_scale_dim
SET rating_scale_id = rating_scale_id + 920000;

UPDATE l1.rating_source
SET rating_source_id = rating_source_id + 930000;

UPDATE l1.rating_grade_dim
SET rating_grade_id = rating_grade_id + 900000,
    rating_scale_id = CASE WHEN rating_scale_id IS NOT NULL THEN rating_scale_id + 920000 ELSE NULL END,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

UPDATE l1.rating_mapping
SET rating_mapping_id = rating_mapping_id + 910000,
    internal_grade_id = CASE WHEN internal_grade_id IS NOT NULL THEN internal_grade_id + 900000 ELSE NULL END,
    model_id = CASE WHEN model_id IS NOT NULL THEN model_id + 720000 ELSE NULL END,
    rating_scale_id = CASE WHEN rating_scale_id IS NOT NULL THEN rating_scale_id + 920000 ELSE NULL END,
    rating_source_id = CASE WHEN rating_source_id IS NOT NULL THEN rating_source_id + 930000 ELSE NULL END,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

-- === Reconciliation (+940000) ===
UPDATE l1.reconciliation_control
SET reconciliation_control_id = reconciliation_control_id + 940000,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

-- === Regulatory domain ===
UPDATE l1.regulatory_mapping
SET regulatory_mapping_id = regulatory_mapping_id + 1010000,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

UPDATE l1.rule_registry
SET rule_id = rule_id + 1100000;

UPDATE l1.report_registry
SET report_id = report_id + 1030000;

UPDATE l1.report_cell_definition
SET report_cell_id = report_cell_id + 1020000,
    report_id = CASE WHEN report_id IS NOT NULL THEN report_id + 1030000 ELSE NULL END,
    calculation_rule_id = CASE WHEN calculation_rule_id IS NOT NULL THEN calculation_rule_id + 1100000 ELSE NULL END;

UPDATE l1.reporting_calendar_dim
SET reporting_calendar_id = reporting_calendar_id + 1040000;

UPDATE l1.reporting_entity_dim
SET reporting_entity_id = reporting_entity_id + 1050000;

-- === Operational ===
UPDATE l1.run_control
SET run_control_id = run_control_id + 1110000,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

UPDATE l1.sccl_counterparty_group
SET sccl_group_id = sccl_group_id + 1200000;

UPDATE l1.sccl_counterparty_group_member
SET member_id = member_id + 1210000,
    sccl_group_id = CASE WHEN sccl_group_id IS NOT NULL THEN sccl_group_id + 1200000 ELSE NULL END,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

UPDATE l1.scenario_dim
SET scenario_id = scenario_id + 1300000,
    source_system_id = CASE WHEN source_system_id IS NOT NULL THEN source_system_id + 1400000 ELSE NULL END;

UPDATE l1.validation_check_registry
SET check_id = check_id + 1500000,
    check_rule_id = CASE WHEN check_rule_id IS NOT NULL THEN check_rule_id + 1100000 ELSE NULL END;

-- === L1 tables with only source_system_id FK (no PK change) ===
UPDATE l1.instrument_identifier
SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;

UPDATE l1.region_dim
SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;

UPDATE l1.risk_mitigant_type_dim
SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;


-- ============================================================================
-- STEP 3: Update L2 FK columns referencing L1 BIGINT PKs
-- ============================================================================

-- collateral_type_id (+100000)
UPDATE l2.collateral_asset_master SET collateral_type_id = collateral_type_id + 100000 WHERE collateral_type_id IS NOT NULL;

-- context_id (+200000)
UPDATE l2.financial_metric_observation SET context_id = context_id + 200000 WHERE context_id IS NOT NULL;

-- default_definition_id (+320000)
UPDATE l2.credit_event SET default_definition_id = default_definition_id + 320000 WHERE default_definition_id IS NOT NULL;

-- lob_segment_id (+400000) — enterprise_business_taxonomy
UPDATE l2.deal_pipeline_fact SET lob_segment_id = lob_segment_id + 400000 WHERE lob_segment_id IS NOT NULL;
UPDATE l2.exception_event SET lob_segment_id = lob_segment_id + 400000 WHERE lob_segment_id IS NOT NULL;
UPDATE l2.facility_master SET lob_segment_id = lob_segment_id + 400000 WHERE lob_segment_id IS NOT NULL;
UPDATE l2.stress_test_breach SET lob_segment_id = lob_segment_id + 400000 WHERE lob_segment_id IS NOT NULL;

-- product_node_id (+410000) — enterprise_product_taxonomy
UPDATE l2.facility_master SET product_node_id = product_node_id + 410000 WHERE product_node_id IS NOT NULL;
UPDATE l2.position SET product_node_id = product_node_id + 410000 WHERE product_node_id IS NOT NULL;

-- rate_index_id (+500000) — interest_rate_index_dim
UPDATE l2.facility_master SET rate_index_id = rate_index_id + 500000 WHERE rate_index_id IS NOT NULL;
UPDATE l2.facility_pricing_snapshot SET rate_index_id = rate_index_id + 500000 WHERE rate_index_id IS NOT NULL;

-- ledger_account_id (+510000)
UPDATE l2.facility_master SET ledger_account_id = ledger_account_id + 510000 WHERE ledger_account_id IS NOT NULL;
UPDATE l2.facility_profitability_snapshot SET ledger_account_id = ledger_account_id + 510000 WHERE ledger_account_id IS NOT NULL;

-- limit_rule_id (+600000)
UPDATE l2.exception_event SET limit_rule_id = limit_rule_id + 600000 WHERE limit_rule_id IS NOT NULL;
UPDATE l2.limit_assignment_snapshot SET limit_rule_id = limit_rule_id + 600000 WHERE limit_rule_id IS NOT NULL;
UPDATE l2.limit_contribution_snapshot SET limit_rule_id = limit_rule_id + 600000 WHERE limit_rule_id IS NOT NULL;
UPDATE l2.limit_utilization_event SET limit_rule_id = limit_rule_id + 600000 WHERE limit_rule_id IS NOT NULL;
UPDATE l2.stress_test_breach SET limit_rule_id = limit_rule_id + 600000 WHERE limit_rule_id IS NOT NULL;

-- metric_definition_id (+700000)
UPDATE l2.financial_metric_observation SET metric_definition_id = metric_definition_id + 700000 WHERE metric_definition_id IS NOT NULL;

-- portfolio_id (+810000)
UPDATE l2.facility_master SET portfolio_id = portfolio_id + 810000 WHERE portfolio_id IS NOT NULL;

-- rating_grade_id (+900000)
UPDATE l2.counterparty_rating_observation SET rating_grade_id = rating_grade_id + 900000 WHERE rating_grade_id IS NOT NULL;

-- rating_source_id (+930000)
UPDATE l2.counterparty_rating_observation SET rating_source_id = rating_source_id + 930000 WHERE rating_source_id IS NOT NULL;

-- scenario_id (+1300000)
UPDATE l2.stress_test_breach SET scenario_id = scenario_id + 1300000 WHERE scenario_id IS NOT NULL;

-- source_system_id (+1400000)
UPDATE l2.collateral_link SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;
UPDATE l2.collateral_snapshot SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;
UPDATE l2.economic_interdependence_relationship SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;
UPDATE l2.gl_account_balance_snapshot SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;
UPDATE l2.gl_journal_entry SET source_system_id = source_system_id + 1400000 WHERE source_system_id IS NOT NULL;


-- ============================================================================
-- STEP 4: Update L3 FK columns referencing L1 BIGINT PKs
-- ============================================================================

-- lob_segment_id (+400000)
UPDATE l3.segment_capital_consumption SET lob_segment_id = lob_segment_id + 400000 WHERE lob_segment_id IS NOT NULL;

-- org_unit_id (+800000)
UPDATE l3.desk_capital_consumption SET org_unit_id = org_unit_id + 800000 WHERE org_unit_id IS NOT NULL;

-- portfolio_id (+810000)
UPDATE l3.portfolio_capital_consumption SET portfolio_id = portfolio_id + 810000 WHERE portfolio_id IS NOT NULL;


-- ============================================================================
-- STEP 5: Recreate ALL FK constraints
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
BEGIN
    FOR r IN SELECT * FROM saved_fk_constraints ORDER BY schema_name, table_name
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
                          r.schema_name, r.table_name, r.constraint_name, r.constraint_def);
            success_count := success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to recreate constraint %.%.%: %',
                          r.schema_name, r.table_name, r.constraint_name, SQLERRM;
            fail_count := fail_count + 1;
        END;
    END LOOP;
    RAISE NOTICE 'Recreated % constraints, % failed', success_count, fail_count;
END $$;

DROP TABLE saved_fk_constraints;


-- ============================================================================
-- STEP 6: Reset sequences to match new max IDs
-- ============================================================================

DO $$
DECLARE
    seq_name TEXT;
    tbl TEXT;
    col TEXT;
    max_val BIGINT;
    pairs TEXT[][] := ARRAY[
        ['l1.collateral_type', 'collateral_type_id'],
        ['l1.collateral_eligibility_dim', 'collateral_eligibility_id'],
        ['l1.collateral_haircut_dim', 'collateral_haircut_id'],
        ['l1.collateral_portfolio', 'collateral_portfolio_id'],
        ['l1.context_dim', 'context_id'],
        ['l1.crm_eligibility_dim', 'crm_eligibility_id'],
        ['l1.date_dim', 'date_id'],
        ['l1.date_time_dim', 'date_time_id'],
        ['l1.default_definition_dim', 'default_definition_id'],
        ['l1.enterprise_business_taxonomy', 'managed_segment_id'],
        ['l1.enterprise_product_taxonomy', 'product_node_id'],
        ['l1.exposure_type_dim', 'exposure_type_id'],
        ['l1.interest_rate_index_dim', 'rate_index_id'],
        ['l1.ledger_account_dim', 'ledger_account_id'],
        ['l1.limit_rule', 'limit_rule_id'],
        ['l1.limit_threshold', 'limit_threshold_id'],
        ['l1.maturity_bucket_dim', 'maturity_bucket_id'],
        ['l1.metric_definition_dim', 'metric_definition_id'],
        ['l1.metric_threshold', 'threshold_id'],
        ['l1.model_registry_dim', 'model_id'],
        ['l1.org_unit_dim', 'org_unit_id'],
        ['l1.portfolio_dim', 'portfolio_id'],
        ['l1.rating_grade_dim', 'rating_grade_id'],
        ['l1.rating_mapping', 'rating_mapping_id'],
        ['l1.rating_scale_dim', 'rating_scale_id'],
        ['l1.rating_source', 'rating_source_id'],
        ['l1.reconciliation_control', 'reconciliation_control_id'],
        ['l1.regulatory_capital_basis_dim', 'regulatory_capital_basis_id'],
        ['l1.regulatory_mapping', 'regulatory_mapping_id'],
        ['l1.report_cell_definition', 'report_cell_id'],
        ['l1.report_registry', 'report_id'],
        ['l1.reporting_calendar_dim', 'reporting_calendar_id'],
        ['l1.reporting_entity_dim', 'reporting_entity_id'],
        ['l1.rule_registry', 'rule_id'],
        ['l1.run_control', 'run_control_id'],
        ['l1.sccl_counterparty_group', 'sccl_group_id'],
        ['l1.sccl_counterparty_group_member', 'member_id'],
        ['l1.scenario_dim', 'scenario_id'],
        ['l1.source_system_registry', 'source_system_id'],
        ['l1.validation_check_registry', 'check_id']
    ];
BEGIN
    FOR i IN 1..array_length(pairs, 1) LOOP
        tbl := pairs[i][1];
        col := pairs[i][2];
        seq_name := pg_get_serial_sequence(tbl, col);
        IF seq_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 1) FROM %s', col, tbl) INTO max_val;
            PERFORM setval(seq_name, max_val);
        END IF;
    END LOOP;
END $$;


COMMIT;

-- ============================================================
-- L3 MASTER ORCHESTRATOR
-- Execute this as a single transaction per reporting cycle
-- ============================================================

CREATE OR REPLACE PROCEDURE l3.run_full_population(
    p_run_version_id VARCHAR,
    p_as_of_date DATE,
    p_prior_as_of_date DATE DEFAULT NULL,
    p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE plpgsql AS $$
BEGIN
    -- Default prior = 1 month ago
    IF p_prior_as_of_date IS NULL THEN
        p_prior_as_of_date := p_as_of_date - INTERVAL '1 month';
    END IF;

    RAISE NOTICE '=== L3 Population Start: run=%, as_of=%, prior=% ===', p_run_version_id, p_as_of_date, p_prior_as_of_date;

    -- TIER 1: L1+L2 only
    RAISE NOTICE 'TIER 1...';
    CALL l3.populate_exposure_metric_cube(p_run_version_id, p_as_of_date, p_base_currency);
    CALL l3.populate_risk_metric_cube(p_run_version_id, p_as_of_date, p_base_currency);
    CALL l3.populate_crm_allocation_summary(p_run_version_id, p_as_of_date, p_base_currency);
    CALL l3.update_exposure_secured_amounts(p_run_version_id);  -- post CRM
    CALL l3.populate_limit_current_state(p_run_version_id, p_as_of_date);
    CALL l3.populate_limit_breach_fact(p_run_version_id, p_as_of_date);
    CALL l3.populate_credit_event_summary(p_run_version_id, p_as_of_date, p_base_currency);
    CALL l3.populate_stress_test_result_summary(p_run_version_id, p_as_of_date, p_base_currency);
    -- (remaining Tier 1 procedures...)

    -- TIER 2: Reads Tier 1 L3
    RAISE NOTICE 'TIER 2...';
    CALL l3.populate_counterparty_exposure_summary(p_run_version_id, p_as_of_date, p_prior_as_of_date);
    CALL l3.populate_limit_tier_status_matrix(p_run_version_id, p_as_of_date, p_prior_as_of_date);
    -- (remaining Tier 2 procedures...)

    -- TIER 3: Reads Tier 1-2 L3
    RAISE NOTICE 'TIER 3...';
    CALL l3.populate_lob_exposure_summary(p_run_version_id, p_as_of_date, p_prior_as_of_date);
    CALL l3.populate_counterparty_detail_snapshot(p_run_version_id, p_as_of_date);
    CALL l3.populate_facility_detail_snapshot(p_run_version_id, p_as_of_date);
    CALL l3.populate_risk_appetite_metric_state(p_run_version_id, p_as_of_date);
    -- (remaining Tier 3 procedures...)

    -- TIER 4: Reads all
    RAISE NOTICE 'TIER 4...';
    CALL l3.populate_kpi_period_summary(p_run_version_id, p_as_of_date, p_prior_as_of_date);
    CALL l3.populate_executive_highlight_summary(p_run_version_id, p_as_of_date);

    RAISE NOTICE '=== L3 Population Complete ===';
END;
$$;

-- USAGE:
-- CALL l3.run_full_population('RUN_2026_02_17_001', '2026-02-17');

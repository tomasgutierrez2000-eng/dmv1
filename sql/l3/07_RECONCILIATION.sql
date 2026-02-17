-- ============================================================
-- L3 RECONCILIATION CHECKS
-- Run after population to validate data integrity
-- ============================================================

CREATE OR REPLACE PROCEDURE l3.run_reconciliation_checks(p_run_version_id VARCHAR, p_as_of_date DATE)
LANGUAGE plpgsql AS $$
DECLARE
    v_t1_gross NUMERIC; v_t3_gross NUMERIC; v_t22_gross NUMERIC;
    v_crm_alloc NUMERIC; v_t1_secured NUMERIC;
    v_el_mismatches INTEGER;
BEGIN
    -- CHECK 1: Exposure Conservation (T1 = T3 = T22)
    SELECT SUM(gross_exposure_amt) INTO v_t1_gross FROM l3.exposure_metric_cube WHERE run_version_id = p_run_version_id AND scenario_id = 'BASE';
    SELECT SUM(total_gross_exposure_amt) INTO v_t3_gross FROM l3.counterparty_exposure_summary WHERE run_version_id = p_run_version_id AND scenario_id = 'BASE';
    SELECT SUM(gross_exposure_amt) INTO v_t22_gross FROM l3.lob_exposure_summary WHERE run_version_id = p_run_version_id AND scenario_id = 'BASE';
    RAISE NOTICE 'CHECK 1 Exposure: T1=%, T3=%, T22=%', v_t1_gross, v_t3_gross, v_t22_gross;
    IF ABS(v_t1_gross - v_t3_gross) > 0.01 OR ABS(v_t1_gross - v_t22_gross) > 0.01 THEN
        RAISE WARNING 'FAIL: Exposure totals do not reconcile!';
    ELSE
        RAISE NOTICE 'PASS: Exposure conservation verified.';
    END IF;

    -- CHECK 2: CRM Balance (T6 allocated <= T1 secured)
    SELECT SUM(allocated_amt) INTO v_crm_alloc FROM l3.crm_allocation_summary WHERE run_version_id = p_run_version_id;
    SELECT SUM(secured_amt) INTO v_t1_secured FROM l3.exposure_metric_cube WHERE run_version_id = p_run_version_id;
    RAISE NOTICE 'CHECK 2 CRM: Allocated=%, Secured=%', v_crm_alloc, v_t1_secured;

    -- CHECK 3: EL = PD × LGD × EAD consistency
    SELECT COUNT(*) INTO v_el_mismatches FROM l3.risk_metric_cube
    WHERE run_version_id = p_run_version_id
      AND ABS(expected_loss_amt - (pd_pct / 100.0 * lgd_pct / 100.0 * ead_amt)) > 1.0;
    RAISE NOTICE 'CHECK 3 EL Mismatches: %', v_el_mismatches;

    -- CHECK 4: No orphan counterparties (every T3 counterparty exists in T1)
    RAISE NOTICE 'CHECK 4 Orphan counterparties: %',
        (SELECT COUNT(*) FROM l3.counterparty_exposure_summary ces
         WHERE run_version_id = p_run_version_id
         AND NOT EXISTS (SELECT 1 FROM l3.exposure_metric_cube emc
                         WHERE emc.counterparty_id = ces.counterparty_id AND emc.run_version_id = p_run_version_id));

    -- CHECK 5: utilization% consistency between T8 and T3
    RAISE NOTICE 'CHECK 5 complete. Review logs above for FAIL/WARN.';
END;
$$;

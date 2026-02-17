-- ============================================================
-- L3 POPULATION SQL — TIER 4
-- These tables read from ALL prior tiers
-- ============================================================

-- T29: kpi_period_summary (generic KPI wrapper)
-- Reads: T22, T25, T47, T8, T11 — one row per KPI code
-- Formula: change_pct = (current - prior) / |prior| × 100
CREATE OR REPLACE PROCEDURE l3.populate_kpi_period_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_prior_as_of_date DATE
)
LANGUAGE SQL AS $$
DELETE FROM l3.kpi_period_summary WHERE run_version_id = p_run_version_id;

-- Each KPI maps to a specific L3 source metric. Example KPIs:
INSERT INTO l3.kpi_period_summary

-- KPI: Gross Exposure (from T22)
SELECT 'GROSS_EXPOSURE', p_as_of_date, p_prior_as_of_date, 'BASE', NULL,
       curr.val, prior_val.val, curr.val - COALESCE(prior_val.val, 0),
       CASE WHEN prior_val.val > 0 THEN (curr.val - prior_val.val)/prior_val.val*100 ELSE NULL END,
       'USD', 'USD', p_run_version_id, CURRENT_TIMESTAMP
FROM (SELECT SUM(gross_exposure_amt) AS val FROM l3.lob_exposure_summary WHERE run_version_id = p_run_version_id AND scenario_id = 'BASE') curr,
     (SELECT SUM(gross_exposure_amt) AS val FROM l3.lob_exposure_summary WHERE as_of_date = p_prior_as_of_date AND scenario_id = 'BASE') prior_val

UNION ALL

-- KPI: Delinquency Rate (from T25)
SELECT 'DELINQUENCY_RATE', p_as_of_date, p_prior_as_of_date, 'BASE', NULL,
       curr.val, prior_val.val, curr.val - COALESCE(prior_val.val, 0),
       NULL, 'PCT', 'USD', p_run_version_id, CURRENT_TIMESTAMP
FROM (SELECT SUM(total_overdue_amt)/NULLIF(SUM(total_outstanding_exposure_amt),0)*100 AS val
      FROM l3.lob_delinquency_summary WHERE run_version_id = p_run_version_id) curr,
     (SELECT SUM(total_overdue_amt)/NULLIF(SUM(total_outstanding_exposure_amt),0)*100 AS val
      FROM l3.lob_delinquency_summary WHERE as_of_date = p_prior_as_of_date) prior_val

UNION ALL

-- KPI: Total Breaches (from T11)
SELECT 'TOTAL_BREACHES', p_as_of_date, p_prior_as_of_date, 'BASE', NULL,
       curr.val, prior_val.val, curr.val - COALESCE(prior_val.val, 0),
       NULL, 'COUNT', 'USD', p_run_version_id, CURRENT_TIMESTAMP
FROM (SELECT COUNT(*)::NUMERIC AS val FROM l3.limit_breach_fact WHERE run_version_id = p_run_version_id AND status_code = 'OPEN') curr,
     (SELECT COUNT(*)::NUMERIC AS val FROM l3.limit_breach_fact WHERE as_of_date = p_prior_as_of_date AND status_code = 'OPEN') prior_val;

-- Add additional KPIs (Deteriorated Deals, Rating Changes, Stress Coverage, etc.) following same pattern
$$;


-- T31: executive_highlight_summary (rule-based AI summary)
-- Reads: T30, T29, T11, T12
-- Logic: Scan for breach/warning metrics, new breaches, credit events, largest changes
CREATE OR REPLACE PROCEDURE l3.populate_executive_highlight_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$
DELETE FROM l3.executive_highlight_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.executive_highlight_summary
-- Bullet 1-2: Risk appetite metrics in BREACH or WARNING
SELECT p_run_version_id, p_as_of_date, ROW_NUMBER() OVER (ORDER BY
    CASE status_code WHEN 'BREACH' THEN 1 WHEN 'WARNING' THEN 2 END, utilization_pct DESC),
    'KEY_RISK_INDICATOR',
    metric_name || ' is at ' || ROUND(current_value, 1) || ' vs limit ' || ROUND(limit_value, 1)
     || ' (' || status_code || ')',
    'Utilization at ' || ROUND(utilization_pct, 1) || '%. 30d velocity: ' || ROUND(velocity_30d_pct, 1) || '%',
    immediate_action_text,
    CASE status_code WHEN 'BREACH' THEN 'ALERT_RED' WHEN 'WARNING' THEN 'ALERT_AMBER' END,
    status_code, metric_id, CURRENT_TIMESTAMP
FROM l3.risk_appetite_metric_state
WHERE run_version_id = p_run_version_id AND status_code IN ('BREACH', 'WARNING')
ORDER BY CASE status_code WHEN 'BREACH' THEN 1 ELSE 2 END, utilization_pct DESC
LIMIT 3

UNION ALL

-- Bullet 3-4: Largest MoM KPI changes
SELECT p_run_version_id, p_as_of_date, 4 + ROW_NUMBER() OVER (ORDER BY ABS(change_pct) DESC),
    'NOTABLE_CHANGE',
    kpi_code || ' changed ' || ROUND(change_pct, 1) || '% MoM (from ' || ROUND(prior_value, 1) || ' to ' || ROUND(current_value, 1) || ')',
    'Largest period-over-period shift', NULL,
    CASE WHEN change_pct > 0 THEN 'TREND_UP' ELSE 'TREND_DOWN' END,
    CASE WHEN ABS(change_pct) > 20 THEN 'HIGH' WHEN ABS(change_pct) > 10 THEN 'MODERATE' ELSE 'LOW' END,
    NULL, CURRENT_TIMESTAMP
FROM l3.kpi_period_summary
WHERE run_version_id = p_run_version_id AND change_pct IS NOT NULL
ORDER BY ABS(change_pct) DESC
LIMIT 2;
$$;

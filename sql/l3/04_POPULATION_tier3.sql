-- ============================================================
-- L3 POPULATION SQL — TIER 3
-- These tables read from L1 + L2 + Tier 1-2 L3 tables
-- ============================================================

-- ============================================================
-- T22: lob_exposure_summary
-- Reads: T1, T2 (risk), T8 (limits), T11 (breaches), L2.risk_flag (NPL)
-- Key formulas:
--   utilization% = gross_exposure / limit × 100
--   npl_ratio% = npl_exposure / gross_exposure × 100
--   coverage_ratio% = secured / gross_exposure × 100
--   exposure_change% = (current - prior) / prior × 100
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_lob_exposure_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_prior_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.lob_exposure_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.lob_exposure_summary
SELECT
    p_run_version_id, p_as_of_date,
    emc.hierarchy_id, emc.lob_node_id, emc.scenario_id, emc.legal_entity_id,
    emc.base_currency_code,
    COUNT(DISTINCT emc.facility_id),
    COUNT(DISTINCT emc.counterparty_id),

    SUM(emc.gross_exposure_amt * emc.attribution_pct / 100.0),
    SUM(emc.net_exposure_amt * emc.attribution_pct / 100.0),
    SUM(emc.drawn_amt * emc.attribution_pct / 100.0),
    SUM(emc.undrawn_amt * emc.attribution_pct / 100.0),
    SUM(emc.ead_amt * emc.attribution_pct / 100.0),
    COALESCE(rmc_agg.total_el, 0),
    COALESCE(rmc_agg.total_rwa, 0),

    -- EXPOSURE-WEIGHTED AVG PD = SUM(pd × ead) / SUM(ead)
    rmc_agg.avg_pd,
    rmc_agg.avg_lgd,

    -- LIMIT from T8 at LoB level
    COALESCE(lcs_agg.total_limit, 0),

    -- UTILIZATION % = gross / limit × 100
    CASE WHEN COALESCE(lcs_agg.total_limit, 0) > 0
         THEN SUM(emc.gross_exposure_amt * emc.attribution_pct / 100.0) / lcs_agg.total_limit * 100.0
         ELSE 0 END,

    -- BREACH COUNT from T11
    COALESCE(breach_agg.breach_count, 0),

    -- NPL EXPOSURE = SUM where risk_flag = NPL
    COALESCE(npl_agg.npl_exposure, 0),

    -- NPL RATIO % = npl_exposure / gross × 100
    CASE WHEN SUM(emc.gross_exposure_amt) > 0
         THEN COALESCE(npl_agg.npl_exposure, 0) / SUM(emc.gross_exposure_amt) * 100.0
         ELSE 0 END,

    -- PRIOR PERIOD
    prior.gross_exposure_amt,
    CASE WHEN COALESCE(prior.gross_exposure_amt, 0) > 0
         THEN (SUM(emc.gross_exposure_amt * emc.attribution_pct / 100.0) - prior.gross_exposure_amt)
              / prior.gross_exposure_amt * 100.0
         ELSE NULL END,

    CURRENT_TIMESTAMP, NULL, NULL,

    -- COVERAGE RATIO % = secured / gross × 100
    CASE WHEN SUM(emc.gross_exposure_amt) > 0
         THEN SUM(emc.secured_amt) / SUM(emc.gross_exposure_amt) * 100.0
         ELSE 0 END,

    SUM(emc.secured_amt)

FROM l3.exposure_metric_cube emc

-- Risk aggregates from T2
LEFT JOIN (
    SELECT lob_node_id, scenario_id,
           SUM(pd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0) AS avg_pd,
           SUM(lgd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0) AS avg_lgd,
           SUM(expected_loss_amt) AS total_el,
           SUM(rwa_amt) AS total_rwa
    FROM l3.risk_metric_cube WHERE run_version_id = p_run_version_id
    GROUP BY lob_node_id, scenario_id
) rmc_agg ON emc.lob_node_id = rmc_agg.lob_node_id AND emc.scenario_id = rmc_agg.scenario_id

-- Limit total at LoB level from T8
LEFT JOIN (
    SELECT lob_node_id, SUM(limit_amt) AS total_limit
    FROM l3.limit_current_state WHERE run_version_id = p_run_version_id
    GROUP BY lob_node_id
) lcs_agg ON emc.lob_node_id = lcs_agg.lob_node_id

-- Breach count from T11
LEFT JOIN (
    SELECT lob_node_id, COUNT(DISTINCT breach_id) AS breach_count
    FROM l3.limit_breach_fact WHERE run_version_id = p_run_version_id AND status_code = 'OPEN'
    GROUP BY lob_node_id
) breach_agg ON emc.lob_node_id = breach_agg.lob_node_id

-- NPL from L2.risk_flag
LEFT JOIN (
    SELECT fla.lob_node_id, SUM(fes.outstanding_balance_amt * COALESCE(fx.exchange_rate, 1)) AS npl_exposure
    FROM l2.risk_flag rf
    JOIN l2.facility_exposure_snapshot fes ON rf.facility_id = fes.facility_id AND fes.as_of_date = p_as_of_date
    JOIN l2.facility_lob_attribution fla ON rf.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
    LEFT JOIN l1.fx_rate fx ON fes.currency_code = fx.from_currency_code AND fx.to_currency_code = 'USD' AND fx.as_of_date = p_as_of_date
    WHERE rf.risk_flag_type = 'NPL' AND rf.as_of_date = p_as_of_date
    GROUP BY fla.lob_node_id
) npl_agg ON emc.lob_node_id = npl_agg.lob_node_id

-- Prior period from prior month T22
LEFT JOIN l3.lob_exposure_summary prior
    ON emc.lob_node_id = prior.lob_node_id AND emc.scenario_id = prior.scenario_id
    AND prior.as_of_date = p_prior_as_of_date

WHERE emc.run_version_id = p_run_version_id
GROUP BY emc.hierarchy_id, emc.lob_node_id, emc.scenario_id, emc.legal_entity_id,
         emc.base_currency_code, rmc_agg.avg_pd, rmc_agg.avg_lgd, rmc_agg.total_el, rmc_agg.total_rwa,
         lcs_agg.total_limit, breach_agg.breach_count, npl_agg.npl_exposure, prior.gross_exposure_amt;
$$;


-- ============================================================
-- T32: counterparty_detail_snapshot
-- Reads: T3 (counterparty_exposure_summary), T8 (limits), L1 counterparty/ratings
-- Purpose: Unified profile for all drawer pop-ups (Pages 2,3,4,6)
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_counterparty_detail_snapshot(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.counterparty_detail_snapshot WHERE run_version_id = p_run_version_id;

INSERT INTO l3.counterparty_detail_snapshot
SELECT
    p_run_version_id, p_as_of_date,
    ces.counterparty_id, cp.counterparty_name, ces.is_parent_flag,
    ch.parent_counterparty_id, pcp.counterparty_name,
    ces.legal_entity_id, ces.country_code, ces.region_code, ces.industry_code,
    ind.industry_name,
    cro_int.rating_grade_id,    -- internal rating
    cro_ext.rating_grade_id,    -- external rating
    cp.counterparty_type_code,
    ces.total_gross_exposure_amt, ces.total_net_exposure_amt,
    ces.total_committed_amt, ces.total_outstanding_amt,
    ces.avg_pd_pct, ces.avg_lgd_pct, ces.expected_loss_amt,
    ces.credit_limit_amt,
    ces.total_outstanding_amt,   -- utilized_amt
    ces.utilization_pct, ces.headroom_amt, ces.risk_tier_code, ces.limit_status_code,
    (SELECT COUNT(DISTINCT facility_id) FROM l3.facility_exposure_summary
     WHERE counterparty_id = ces.counterparty_id AND run_version_id = p_run_version_id),
    (SELECT parent_group_code FROM l3.crm_allocation_summary
     WHERE counterparty_id = ces.counterparty_id AND run_version_id = p_run_version_id
     GROUP BY parent_group_code ORDER BY SUM(allocated_amt) DESC LIMIT 1),
    ces.prior_period_gross_exposure_amt, ces.exposure_change_pct,
    ces.base_currency_code, ces.lob_node_id, CURRENT_TIMESTAMP

FROM l3.counterparty_exposure_summary ces
JOIN l1.counterparty cp ON ces.counterparty_id = cp.counterparty_id
LEFT JOIN l1.counterparty_hierarchy ch ON ces.counterparty_id = ch.counterparty_id
LEFT JOIN l1.counterparty pcp ON ch.parent_counterparty_id = pcp.counterparty_id
LEFT JOIN l1.industry_dim ind ON ces.industry_code = ind.industry_code
LEFT JOIN l2.counterparty_rating_observation cro_int
    ON ces.counterparty_id = cro_int.counterparty_id AND cro_int.as_of_date = p_as_of_date AND cro_int.rating_source_id = 'INTERNAL'
LEFT JOIN l2.counterparty_rating_observation cro_ext
    ON ces.counterparty_id = cro_ext.counterparty_id AND cro_ext.as_of_date = p_as_of_date AND cro_ext.rating_source_id = 'EXTERNAL'
WHERE ces.run_version_id = p_run_version_id AND ces.scenario_id = 'BASE';
$$;


-- ============================================================
-- T45: facility_detail_snapshot
-- Reads: T4 (facility_exposure_summary), T6 (CRM), L2.facility_pricing_snapshot, L1.facility_master
-- Formula: utilization% = outstanding / committed × 100
--          coverage_ratio% = CRM_secured / outstanding × 100
--          days_remaining = maturity_date - as_of_date
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_facility_detail_snapshot(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.facility_detail_snapshot WHERE run_version_id = p_run_version_id;

INSERT INTO l3.facility_detail_snapshot
SELECT
    p_run_version_id, p_as_of_date,
    fes.facility_id, fm.facility_type_code, fm.facility_purpose,
    bt_l1.business_node_name, bt_l2.business_node_name,
    pd.portfolio_name, pt.product_name, rd.region_name,
    fes.counterparty_id, cp.counterparty_name,

    -- COMMITTED = outstanding + undrawn
    (fes.outstanding_amt + fes.undrawn_commitment_amt),

    -- UTILIZED = outstanding (funded)
    fes.outstanding_amt,

    -- UTILIZATION % = outstanding / committed × 100
    CASE WHEN (fes.outstanding_amt + fes.undrawn_commitment_amt) > 0
         THEN fes.outstanding_amt / (fes.outstanding_amt + fes.undrawn_commitment_amt) * 100.0
         ELSE 0 END,

    -- COVERAGE RATIO = CRM allocated / outstanding × 100
    CASE WHEN fes.outstanding_amt > 0
         THEN COALESCE(crm.total_secured, 0) / fes.outstanding_amt * 100.0
         ELSE 0 END,

    fm.effective_date, fm.maturity_date,

    -- DAYS REMAINING = maturity - as_of_date (negative if matured)
    fm.maturity_date - p_as_of_date,

    -- FACILITY DURATION = maturity - effective
    fm.maturity_date - fm.effective_date,

    -- STATUS
    CASE WHEN fm.maturity_date < p_as_of_date THEN 'MATURED'
         WHEN fm.is_active = TRUE THEN 'ACTIVE' ELSE 'EXPIRED' END,

    COALESCE(fm.is_syndicated_flag, FALSE),

    -- PRICING from L2.facility_pricing_snapshot
    fps.current_interest_rate_pct, fps.rate_type, fps.all_in_rate_pct,
    fps.spread_bps, fps.rate_index_name, fps.rate_cap_pct,
    fps.payment_frequency, fps.prepayment_penalty_desc,

    -- AMENDMENT FLAGS
    fes.has_amendment_flag,
    (SELECT COUNT(*) FROM l2.amendment_event ae WHERE ae.facility_id = fes.facility_id),

    fes.base_currency_code, CURRENT_TIMESTAMP

FROM l3.facility_exposure_summary fes
JOIN l1.facility_master fm ON fes.facility_id = fm.facility_id
JOIN l1.counterparty cp ON fes.counterparty_id = cp.counterparty_id
LEFT JOIN l1.portfolio_dim pd ON fes.portfolio_id = pd.portfolio_id
LEFT JOIN l1.enterprise_product_taxonomy pt ON fm.product_type_code = pt.product_node_id
LEFT JOIN l1.enterprise_business_taxonomy bt_l1 ON fes.lob_node_id = bt_l1.business_node_id AND bt_l1.node_level = 1
LEFT JOIN l1.enterprise_business_taxonomy bt_l2 ON fes.lob_node_id = bt_l2.business_node_id AND bt_l2.node_level = 2
LEFT JOIN l1.region_dim rd ON fm.region_code = rd.region_code
LEFT JOIN l2.facility_pricing_snapshot fps ON fes.facility_id = fps.facility_id AND fps.as_of_date = p_as_of_date
LEFT JOIN (
    SELECT facility_id, SUM(allocated_amt) AS total_secured
    FROM l3.crm_allocation_summary WHERE run_version_id = p_run_version_id AND allocation_target_level = 'FACILITY'
    GROUP BY facility_id
) crm ON fes.facility_id = crm.facility_id
WHERE fes.run_version_id = p_run_version_id AND fes.scenario_id = 'BASE';
$$;


-- ============================================================
-- T30: risk_appetite_metric_state
-- Reads: L1.metric_definition_dim, L2.metric_threshold, T8 (for dynamic metric values)
-- Formula: status = BREACH if value >= outer_threshold (CEILING) or <= outer_threshold (FLOOR)
--          utilization% = current_value / limit_value × 100
--          velocity = current_util% - util%_N_days_ago
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_risk_appetite_metric_state(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.risk_appetite_metric_state WHERE run_version_id = p_run_version_id;

INSERT INTO l3.risk_appetite_metric_state
SELECT
    p_run_version_id, p_as_of_date,
    md.metric_code, md.metric_name, md.metric_description,
    md.metric_classification, md.limit_type_code,

    -- CURRENT VALUE: source-specific calculation
    mt.current_value,
    mt.threshold_value,              -- limit
    mt.warning_threshold,            -- inner threshold (warning)
    mt.breach_threshold,             -- outer threshold (breach)

    -- UTILIZATION % = current / limit × 100
    CASE WHEN mt.threshold_value > 0 THEN mt.current_value / mt.threshold_value * 100.0 ELSE 0 END,

    -- STATUS: compare current to thresholds based on limit_type
    CASE
        WHEN md.limit_type_code = 'CEILING' AND mt.current_value >= mt.breach_threshold  THEN 'BREACH'
        WHEN md.limit_type_code = 'FLOOR'   AND mt.current_value <= mt.breach_threshold  THEN 'BREACH'
        WHEN md.limit_type_code = 'CEILING' AND mt.current_value >= mt.warning_threshold THEN 'WARNING'
        WHEN md.limit_type_code = 'FLOOR'   AND mt.current_value <= mt.warning_threshold THEN 'WARNING'
        ELSE 'NO_BREACH'
    END,

    -- VELOCITY 30D = current - value_30d_ago
    mt.current_value - COALESCE(prior30.current_value, mt.current_value),
    mt.current_value - COALESCE(prior90.current_value, mt.current_value),

    -- ACTION TEXT
    CASE
        WHEN mt.current_value >= mt.breach_threshold THEN mt.breach_action_text
        WHEN mt.current_value >= mt.warning_threshold THEN mt.warning_action_text
        ELSE NULL
    END,

    md.report_frequency_code, md.report_deadline_date,
    md.metric_owner, md.first_lod_sponsor, md.second_lod_sponsor,
    mt.last_updated_ts, mt.threshold_last_updated_ts,
    'USD', CURRENT_TIMESTAMP

FROM l1.metric_definition_dim md
JOIN l2.metric_threshold mt ON md.metric_code = mt.metric_code AND mt.as_of_date = p_as_of_date
LEFT JOIN l2.metric_threshold prior30 ON md.metric_code = prior30.metric_code AND prior30.as_of_date = p_as_of_date - INTERVAL '30 days'
LEFT JOIN l2.metric_threshold prior90 ON md.metric_code = prior90.metric_code AND prior90.as_of_date = p_as_of_date - INTERVAL '90 days'
WHERE md.is_risk_appetite_metric = TRUE;
$$;


-- ============================================================
-- T28: lob_credit_quality_summary (partial — criticized fields)
-- Reads: L2.risk_flag, T1 (exposure_metric_cube), L2.facility_lob_attribution
-- Key formulas:
--   criticized_portfolio_count = COUNT(DISTINCT facilities with CRITICIZED flag)
--   criticized_exposure_amt = SUM(gross_exposure for criticized facilities)
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_lob_credit_quality_criticized(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

-- Update criticized fields in existing lob_credit_quality_summary rows
UPDATE l3.lob_credit_quality_summary cqs
SET
    criticized_portfolio_count = crit.criticized_count,
    criticized_exposure_amt = crit.criticized_exposure
FROM (
    SELECT
        fla.lob_node_id,
        COUNT(DISTINCT rf.facility_id) AS criticized_count,
        COALESCE(SUM(DISTINCT emc.gross_exposure_amt), 0) AS criticized_exposure
    FROM l2.risk_flag rf
    JOIN l2.facility_lob_attribution fla
        ON rf.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
    LEFT JOIN l3.exposure_metric_cube emc
        ON rf.facility_id = emc.facility_id
        AND emc.run_version_id = p_run_version_id
        AND emc.scenario_id = 'BASE'
    WHERE rf.flag_code = 'CRITICIZED'
      AND rf.as_of_date = p_as_of_date
      AND rf.cleared_ts IS NULL
    GROUP BY fla.lob_node_id
) crit
WHERE cqs.lob_node_id = crit.lob_node_id
  AND cqs.run_version_id = p_run_version_id;
$$;


-- ============================================================
-- T47: lob_deterioration_summary (partial — criticized fields)
-- Same source logic as T28 but targets lob_deterioration_summary
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_lob_deterioration_criticized(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

UPDATE l3.lob_deterioration_summary ds
SET
    criticized_portfolio_count = crit.criticized_count,
    criticized_exposure_amt = crit.criticized_exposure
FROM (
    SELECT
        fla.lob_node_id,
        COUNT(DISTINCT rf.facility_id) AS criticized_count,
        COALESCE(SUM(DISTINCT emc.gross_exposure_amt), 0) AS criticized_exposure
    FROM l2.risk_flag rf
    JOIN l2.facility_lob_attribution fla
        ON rf.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
    LEFT JOIN l3.exposure_metric_cube emc
        ON rf.facility_id = emc.facility_id
        AND emc.run_version_id = p_run_version_id
        AND emc.scenario_id = 'BASE'
    WHERE rf.flag_code = 'CRITICIZED'
      AND rf.as_of_date = p_as_of_date
      AND rf.cleared_ts IS NULL
    GROUP BY fla.lob_node_id
) crit
WHERE ds.lob_node_id = crit.lob_node_id
  AND ds.run_version_id = p_run_version_id;
$$;


-- ============================================================
-- Remaining Tier 3: T23-T25, T28, T34, T36, T46-T49
-- Key formulas documented per table:
--
-- T23 lob_profitability_summary:
--   NIM = NII / avg_earning_assets × 100
--   ROA = net_income / avg_total_assets × 100
--   ROE = net_income / allocated_equity × 100
--
-- T24 lob_pricing_summary:
--   spread_vs_threshold = avg_spread_bps - internal_spread_threshold_bps
--
-- T25 lob_delinquency_summary:
--   delinquency_rate% = overdue_amt / outstanding_exposure × 100
--
-- T28 lob_credit_quality_summary:
--   avg_rating = SUM(rating × ead) / SUM(ead)
--   rwa_density% = SUM(rwa) / SUM(exposure) × 100
--
-- T34 limit_counterparty_movement:
--   NEW = counterparty in current T33 but NOT in prior T33
--   STATIC = counterparty in BOTH current and prior T33
--   LEAVER = counterparty in prior T33 but NOT in current T33
--
-- T36 legal_entity_risk_profile:
--   Aggregate T3 by legal_entity_id: SUM exposures, COUNT facilities, AVG PD/LGD
--
-- T46 lob_risk_ratio_summary:
--   DSCR = Cash Flow / Total Debt Service (from L2.financial_metric_observation)
--   FCCR = (EBITDA - Capex) / (Interest + Lease)
--   LTV% = Loan / Collateral × 100
--   LCR% = HQLA / Net Cash Outflows(30d) × 100
--   CAR% = Total Capital / RWA × 100
--
-- T47 lob_deterioration_summary:
--   deteriorated_deal_pct = deteriorated_count / total_deals × 100
--   doi% = cross_entity_exposure / total_exposure × 100
--
-- T48 lob_rating_distribution:
--   bucket_pct = bucket_count / total_count × 100
--   Buckets: 14-16 (worst), 10-14, 5-9, 1-4 (best)
--
-- T49 lob_top_contributors:
--   contribution_pct = counterparty_exposure / lob_total_exposure × 100
--   RANK() OVER (PARTITION BY lob_node_id ORDER BY exposure DESC) LIMIT 5
-- ============================================================

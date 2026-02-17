-- ============================================================
-- L3 POPULATION SQL — TIER 2
-- These tables read from L1 + L2 + Tier 1 L3 tables
-- ============================================================

-- ============================================================
-- T3: counterparty_exposure_summary
-- Reads: T1 (exposure_metric_cube), T2 (risk_metric_cube), T6 (crm), T8 (limits)
-- Formula: Aggregate T1 by counterparty; exposure-weighted avg PD/LGD from T2;
--          limit fields from T8; period-over-period from prior month T3
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_counterparty_exposure_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_prior_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.counterparty_exposure_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.counterparty_exposure_summary
SELECT
    p_run_version_id, p_as_of_date,
    emc.scenario_id, emc.legal_entity_id, emc.counterparty_id,
    scm.sccl_group_id,
    MODE() WITHIN GROUP (ORDER BY emc.country_code)                AS country_code,
    emc.base_currency_code,

    -- AGGREGATE EXPOSURE from T1 (applying attribution %)
    SUM(emc.gross_exposure_amt * emc.attribution_pct / 100.0)     AS total_gross_exposure_amt,
    SUM(emc.net_exposure_amt * emc.attribution_pct / 100.0)       AS total_net_exposure_amt,
    SUM(emc.ead_amt * emc.attribution_pct / 100.0)                AS total_ead_amt,
    SUM(emc.secured_amt * emc.attribution_pct / 100.0)            AS secured_amt,
    SUM(emc.unsecured_residual_amt * emc.attribution_pct / 100.0) AS unsecured_residual_amt,
    CURRENT_TIMESTAMP,
    MODE() WITHIN GROUP (ORDER BY emc.lob_node_id)                 AS lob_node_id,
    MODE() WITHIN GROUP (ORDER BY emc.hierarchy_id)                AS hierarchy_id,

    -- CROSS-ENTITY: does this counterparty appear in multiple legal entities?
    CASE WHEN COUNT(DISTINCT emc.legal_entity_id) OVER (PARTITION BY emc.counterparty_id, emc.scenario_id) > 1
         THEN TRUE ELSE FALSE END                                  AS has_cross_entity_flag,
    SUM(emc.gross_exposure_amt) OVER (PARTITION BY emc.counterparty_id, emc.scenario_id) AS cross_entity_exposure_amt,
    COUNT(DISTINCT emc.legal_entity_id) OVER (PARTITION BY emc.counterparty_id, emc.scenario_id) AS cross_entity_entity_count,

    -- PARENT FLAG
    CASE WHEN ch.parent_counterparty_id IS NULL AND EXISTS (
        SELECT 1 FROM l1.counterparty_hierarchy ch2 WHERE ch2.parent_counterparty_id = emc.counterparty_id
    ) THEN TRUE ELSE FALSE END                                     AS is_parent_flag,

    -- COMMITTED = drawn + undrawn; OUTSTANDING = drawn only
    SUM((emc.drawn_amt + emc.undrawn_amt) * emc.attribution_pct / 100.0) AS total_committed_amt,
    SUM(emc.drawn_amt * emc.attribution_pct / 100.0)              AS total_outstanding_amt,

    -- PERIOD-OVER-PERIOD from prior month's T3
    prior.total_gross_exposure_amt                                  AS prior_period_gross_exposure_amt,
    CASE WHEN COALESCE(prior.total_gross_exposure_amt, 0) > 0
         THEN (SUM(emc.gross_exposure_amt * emc.attribution_pct / 100.0) - prior.total_gross_exposure_amt)
              / prior.total_gross_exposure_amt * 100.0
         ELSE NULL END                                              AS exposure_change_pct,

    -- EXPOSURE-WEIGHTED AVERAGE PD = SUM(pd × ead) / SUM(ead) from T2
    rmc_agg.avg_pd                                                  AS avg_pd_pct,
    rmc_agg.avg_lgd                                                 AS avg_lgd_pct,
    rmc_agg.total_el                                                AS expected_loss_amt,

    -- LIMIT FIELDS from T8
    lcs.limit_amt                                                   AS credit_limit_amt,
    lcs.utilization_pct,
    lcs.available_amt                                               AS headroom_amt,
    lcs.utilization_tier_code                                       AS risk_tier_code,
    lcs.status_code                                                 AS limit_status_code,

    -- REGION + INDUSTRY from L1 counterparty → country → region
    rd.region_code,
    cp.industry_code

FROM l3.exposure_metric_cube emc
JOIN l1.counterparty cp                       ON emc.counterparty_id = cp.counterparty_id
LEFT JOIN l1.counterparty_hierarchy ch        ON emc.counterparty_id = ch.counterparty_id
LEFT JOIN l1.sccl_counterparty_group_member scm ON emc.counterparty_id = scm.counterparty_id
LEFT JOIN l1.country_dim cd                   ON cp.country_of_domicile = cd.country_code
LEFT JOIN l1.region_dim rd                    ON cd.region_code = rd.region_code

-- RISK METRICS aggregate from T2
LEFT JOIN (
    SELECT counterparty_id, scenario_id, legal_entity_id,
           SUM(pd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0) AS avg_pd,
           SUM(lgd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0) AS avg_lgd,
           SUM(expected_loss_amt) AS total_el
    FROM l3.risk_metric_cube WHERE run_version_id = p_run_version_id
    GROUP BY counterparty_id, scenario_id, legal_entity_id
) rmc_agg ON emc.counterparty_id = rmc_agg.counterparty_id
          AND emc.scenario_id = rmc_agg.scenario_id
          AND emc.legal_entity_id = rmc_agg.legal_entity_id

-- LIMIT from T8 (best match for this counterparty)
LEFT JOIN (
    SELECT DISTINCT ON (la.counterparty_id)
           la.counterparty_id, lcs2.limit_amt, lcs2.utilization_pct,
           lcs2.available_amt, lcs2.utilization_tier_code, lcs2.status_code
    FROM l3.limit_current_state lcs2
    JOIN l1.limit_threshold la ON lcs2.limit_assignment_id = la.limit_assignment_id
    WHERE lcs2.run_version_id = p_run_version_id
    ORDER BY la.counterparty_id, lcs2.limit_amt DESC
) lcs ON emc.counterparty_id = lcs.counterparty_id

-- PRIOR PERIOD from prior month's T3
LEFT JOIN l3.counterparty_exposure_summary prior
    ON emc.counterparty_id = prior.counterparty_id
    AND emc.scenario_id = prior.scenario_id
    AND emc.legal_entity_id = prior.legal_entity_id
    AND prior.as_of_date = p_prior_as_of_date

WHERE emc.run_version_id = p_run_version_id
GROUP BY emc.scenario_id, emc.legal_entity_id, emc.counterparty_id, emc.base_currency_code,
         scm.sccl_group_id, ch.parent_counterparty_id,
         prior.total_gross_exposure_amt, rmc_agg.avg_pd, rmc_agg.avg_lgd, rmc_agg.total_el,
         lcs.limit_amt, lcs.utilization_pct, lcs.available_amt, lcs.utilization_tier_code, lcs.status_code,
         rd.region_code, cp.industry_code;
$$;


-- ============================================================
-- T33: limit_tier_status_matrix
-- Reads: T8 (limit_current_state), L1.limit_rule (for tier classification)
-- Formula: Risk Score = SUM(status_weight × count) where Sufficient=0, Approaching=1, Met=2, Overdraft=3
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_limit_tier_status_matrix(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_prior_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.limit_tier_status_matrix WHERE run_version_id = p_run_version_id;

INSERT INTO l3.limit_tier_status_matrix
WITH classified AS (
    SELECT
        lcs.legal_entity_id,
        -- 3 RISK TIERS: based on limit rule type
        CASE
            WHEN lr.tier_type = 'SCCL_25' THEN 'TIER_1_25PCT'
            WHEN lr.tier_type = 'SCCL_15' THEN 'TIER_1_15PCT'
            ELSE 'ABSOLUTE_DOLLAR'
        END AS risk_tier_code,
        -- 4 LIMIT STATUSES: based on utilization %
        CASE
            WHEN lcs.utilization_pct < 75  THEN 'SUFFICIENT'
            WHEN lcs.utilization_pct < 90  THEN 'APPROACHING'
            WHEN lcs.utilization_pct <= 100 THEN 'MET'
            ELSE 'OVERDRAFT'
        END AS limit_status_code,
        lcs.counterparty_id,    -- via limit_assignment linkage
        lcs.utilized_amt,
        lcs.available_amt
    FROM l3.limit_current_state lcs
    JOIN l1.limit_rule lr ON lcs.limit_definition_id = lr.limit_definition_id
    WHERE lcs.run_version_id = p_run_version_id
)
SELECT
    p_run_version_id, p_as_of_date,
    c.legal_entity_id, c.risk_tier_code, c.limit_status_code,
    COUNT(DISTINCT c.counterparty_id),
    COALESCE(prior.counterparty_count, 0),
    COUNT(DISTINCT c.counterparty_id) - COALESCE(prior.counterparty_count, 0),
    SUM(c.utilized_amt),
    SUM(c.available_amt),
    -- RISK SCORE = weighted severity sum
    SUM(CASE c.limit_status_code
        WHEN 'SUFFICIENT'  THEN 0
        WHEN 'APPROACHING' THEN 1
        WHEN 'MET'         THEN 2
        WHEN 'OVERDRAFT'   THEN 3
    END),
    'USD', CURRENT_TIMESTAMP
FROM classified c
LEFT JOIN l3.limit_tier_status_matrix prior
    ON c.legal_entity_id = prior.legal_entity_id
    AND c.risk_tier_code = prior.risk_tier_code
    AND c.limit_status_code = prior.limit_status_code
    AND prior.as_of_date = p_prior_as_of_date
GROUP BY c.legal_entity_id, c.risk_tier_code, c.limit_status_code, prior.counterparty_count;
$$;

-- ============================================================
-- Remaining Tier 2: T4, T5, T10, T16-T19, T21, T41
-- Follow same stored procedure pattern.
-- T4: Aggregate T1 by facility_id, join L2.amendment_event for amendment flags
-- T5: Aggregate T1+T2 by portfolio_id
-- T10: Read L2.limit_contribution_snapshot, compute contribution_pct = contribution/utilized × 100
-- T16-T19: Populated by regulatory engine from T15 + L1.report_cell_definition + L1.rule_registry
-- T21: Aggregate T20 by counterparty, rank within entity
-- T41: Read L2.metric_threshold WHERE classification='REGULATORY', variance = current - threshold
-- ============================================================

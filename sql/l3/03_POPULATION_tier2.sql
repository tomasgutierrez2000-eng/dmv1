-- ============================================================
-- L3 POPULATION SQL — TIER 2
-- These tables read from L1 + L2 + Tier 1 L3 tables
-- ============================================================

-- ============================================================
-- T03 counterparty_exposure_summary: REMOVED (subsumed by *_derived tables)
-- ============================================================


-- ============================================================
-- T33: limit_tier_status_matrix
-- Reads: T8 (limit_current_state), L1.limit_rule (for tier classification)
-- Formula: Risk Score = SUM(status_weight × count) where Sufficient=0, Approaching=1, Met=2, Overdraft=3
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_limit_tier_status_matrix(
    p_run_version_id BIGINT, p_as_of_date DATE, p_prior_as_of_date DATE
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
-- Remaining Tier 2: T10, T16-T19, T21, T41
-- Follow same stored procedure pattern.
-- (T04 facility_exposure_summary: REMOVED — subsumed by *_derived tables)
-- (T05 portfolio_summary: REMOVED — subsumed by *_derived tables)
-- T10: Read L2.limit_contribution_snapshot, compute contribution_pct = contribution/utilized × 100
-- T16-T19: Populated by regulatory engine from T15 + L1.report_cell_definition + L1.rule_registry
-- T21: Aggregate T20 by counterparty, rank within entity
-- T41: Read L1.metric_threshold WHERE classification='REGULATORY', variance = current - threshold
-- ============================================================

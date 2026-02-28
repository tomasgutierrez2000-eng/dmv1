-- ============================================================
-- L3 POPULATION SQL — TIER 1
-- These tables read ONLY from L1 + L2 (no L3 dependencies)
-- ============================================================

-- ============================================================
-- T1: exposure_metric_cube
-- Source: L2.position + L2.position_detail + L2.facility_exposure_snapshot + L2.netting_set_exposure_snapshot
-- Formula: gross = outstanding + undrawn; net = gross - netting_benefit; ead = drawn + CCF × undrawn
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_exposure_metric_cube(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE SQL AS $$

DELETE FROM l3.exposure_metric_cube WHERE run_version_id = p_run_version_id;

INSERT INTO l3.exposure_metric_cube (
    run_version_id, as_of_date, scenario_id, legal_entity_id, org_unit_id, portfolio_id,
    product_node_id, counterparty_id, facility_id, instrument_id, netting_set_id,
    country_code, currency_code, base_currency_code, exposure_type_code,
    gross_exposure_amt, net_exposure_amt, drawn_amt, undrawn_amt, ead_amt,
    secured_amt, unsecured_residual_amt, created_ts, lob_node_id, hierarchy_id, attribution_pct
)
SELECT
    p_run_version_id,
    p_as_of_date,
    COALESCE(p.scenario_id, 'BASE')                               AS scenario_id,
    p.legal_entity_id,
    COALESCE(fm.org_unit_id, p.org_unit_id)                       AS org_unit_id,
    COALESCE(fm.portfolio_id, p.portfolio_id)                      AS portfolio_id,
    COALESCE(p.product_node_id, pd.product_node_id, fm.product_type_code) AS product_node_id,
    p.counterparty_id,
    p.facility_id,
    p.instrument_id,
    p.netting_set_id,
    COALESCE(cp.country_of_risk, cp.country_of_domicile)          AS country_code,
    p.currency_code,
    p_base_currency                                                AS base_currency_code,
    pd.exposure_type_code,

    -- GROSS EXPOSURE = outstanding + undrawn (before CRM)
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)                               AS gross_exposure_amt,

    -- NET EXPOSURE = gross - netting benefit
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(fes.undrawn_commitment_amt, 0)
     - COALESCE(nse.netting_benefit_amt, 0))
     * COALESCE(fx.exchange_rate, 1)                               AS net_exposure_amt,

    -- DRAWN = funded exposure only
    COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     * COALESCE(fx.exchange_rate, 1)                               AS drawn_amt,

    -- UNDRAWN = unfunded committed amount
    COALESCE(fes.undrawn_commitment_amt, 0)
     * COALESCE(fx.exchange_rate, 1)                               AS undrawn_amt,

    -- EAD = drawn + CCF × undrawn (Credit Conversion Factor from risk model or default 100%)
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(pd.credit_conversion_factor, 1.0) * COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)                               AS ead_amt,

    -- SECURED/UNSECURED: placeholder — updated after T6 CRM allocation
    0                                                               AS secured_amt,
    0                                                               AS unsecured_residual_amt,

    CURRENT_TIMESTAMP,
    COALESCE(fla.lob_node_id, fm.lob_node_id)                    AS lob_node_id,
    COALESCE(fla.hierarchy_id, 'DEFAULT_LOB_HIERARCHY')           AS hierarchy_id,
    COALESCE(fla.attribution_pct, 100.0)                          AS attribution_pct

FROM      l2.position p
JOIN      l2.position_detail pd              ON p.position_id = pd.position_id AND pd.as_of_date = p_as_of_date
LEFT JOIN l2.facility_exposure_snapshot fes   ON p.facility_id = fes.facility_id AND fes.as_of_date = p_as_of_date
LEFT JOIN l2.netting_set_exposure_snapshot nse ON p.netting_set_id = nse.netting_set_id AND nse.as_of_date = p_as_of_date
LEFT JOIN l1.facility_master fm              ON p.facility_id = fm.facility_id
LEFT JOIN l1.counterparty cp                 ON p.counterparty_id = cp.counterparty_id
LEFT JOIN l1.fx_rate fx                      ON p.currency_code = fx.from_currency_code
                                             AND fx.to_currency_code = p_base_currency
                                             AND fx.as_of_date = p_as_of_date
LEFT JOIN l2.facility_lob_attribution fla    ON p.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
WHERE p.as_of_date = p_as_of_date;
$$;

-- POST-STEP: Update secured/unsecured after T6 populates
CREATE OR REPLACE PROCEDURE l3.update_exposure_secured_amounts(p_run_version_id VARCHAR)
LANGUAGE SQL AS $$
UPDATE l3.exposure_metric_cube emc
SET
    secured_amt = COALESCE(crm.total_allocated, 0),
    unsecured_residual_amt = emc.gross_exposure_amt - COALESCE(crm.total_allocated, 0)
FROM (
    SELECT
        COALESCE(facility_id, counterparty_id) AS target_id,
        allocation_target_level,
        legal_entity_id,
        SUM(allocated_amt) AS total_allocated
    FROM l3.crm_allocation_summary
    WHERE run_version_id = p_run_version_id
    GROUP BY COALESCE(facility_id, counterparty_id), allocation_target_level, legal_entity_id
) crm
WHERE emc.run_version_id = p_run_version_id
  AND emc.legal_entity_id = crm.legal_entity_id
  AND (
      (crm.allocation_target_level = 'FACILITY' AND emc.facility_id = crm.target_id)
   OR (crm.allocation_target_level = 'COUNTERPARTY' AND emc.counterparty_id = crm.target_id)
  );
$$;


-- ============================================================
-- T2: risk_metric_cube
-- Source: L2.position + L2.position_detail + L2.counterparty_rating_observation + L2.stress_test_result
-- Formula: EL = PD × LGD × EAD; RWA = EAD × Risk_Weight; Capital = RWA × 8%
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_risk_metric_cube(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE SQL AS $$

DELETE FROM l3.risk_metric_cube WHERE run_version_id = p_run_version_id;

INSERT INTO l3.risk_metric_cube (
    run_version_id, as_of_date, scenario_id, legal_entity_id, portfolio_id, product_node_id,
    counterparty_id, facility_id, instrument_id, currency_code, base_currency_code,
    model_id, rating_grade_id, pd_pct, lgd_pct, ead_amt, expected_loss_amt,
    risk_weight_pct, rwa_amt, capital_req_amt, created_ts, lob_node_id, hierarchy_id
)
SELECT
    p_run_version_id, p_as_of_date,
    COALESCE(str.scenario_id, 'BASE'),
    p.legal_entity_id,
    COALESCE(fm.portfolio_id, p.portfolio_id),
    COALESCE(pd.product_node_id, fm.product_type_code),
    p.counterparty_id,
    p.facility_id,
    p.instrument_id,
    p.currency_code,
    p_base_currency,
    cro.model_id,
    cro.rating_grade_id,

    -- PD: counterparty rating or stress override
    COALESCE(str.stressed_pd_pct, cro.pd_pct)                    AS pd_pct,

    -- LGD: position detail or stress override
    COALESCE(str.stressed_lgd_pct, pd.lgd_pct)                   AS lgd_pct,

    -- EAD = drawn + CCF × undrawn, in base currency
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(pd.credit_conversion_factor, 1.0) * COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)                               AS ead_amt,

    -- EXPECTED LOSS = PD × LGD × EAD
    -- PD and LGD are percentages (e.g., 2.5 means 2.5%), so divide each by 100
    (COALESCE(str.stressed_pd_pct, cro.pd_pct, 0) / 100.0)
     * (COALESCE(str.stressed_lgd_pct, pd.lgd_pct, 0) / 100.0)
     * (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
        + COALESCE(pd.credit_conversion_factor, 1.0) * COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)                               AS expected_loss_amt,

    -- RISK WEIGHT: from regulatory mapping or stress override
    COALESCE(str.stressed_risk_weight_pct, pd.risk_weight_pct, 100.0) AS risk_weight_pct,

    -- RWA = EAD × Risk Weight %
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(pd.credit_conversion_factor, 1.0) * COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)
     * COALESCE(str.stressed_risk_weight_pct, pd.risk_weight_pct, 100.0) / 100.0 AS rwa_amt,

    -- CAPITAL REQUIREMENT = RWA × 8% (Basel III minimum)
    (COALESCE(fes.outstanding_balance_amt, pd.notional_amount, 0)
     + COALESCE(pd.credit_conversion_factor, 1.0) * COALESCE(fes.undrawn_commitment_amt, 0))
     * COALESCE(fx.exchange_rate, 1)
     * COALESCE(str.stressed_risk_weight_pct, pd.risk_weight_pct, 100.0) / 100.0
     * 0.08                                                        AS capital_req_amt,

    CURRENT_TIMESTAMP,
    COALESCE(fla.lob_node_id, fm.lob_node_id),
    COALESCE(fla.hierarchy_id, 'DEFAULT_LOB_HIERARCHY')

FROM      l2.position p
JOIN      l2.position_detail pd              ON p.position_id = pd.position_id AND pd.as_of_date = p_as_of_date
LEFT JOIN l2.facility_exposure_snapshot fes   ON p.facility_id = fes.facility_id AND fes.as_of_date = p_as_of_date
LEFT JOIN l1.facility_master fm              ON p.facility_id = fm.facility_id
LEFT JOIN l2.counterparty_rating_observation cro
            ON p.counterparty_id = cro.counterparty_id AND cro.as_of_date = p_as_of_date AND cro.rating_source_id = 'INTERNAL'
LEFT JOIN l2.stress_test_result str          ON p.position_id = str.position_id AND str.as_of_date = p_as_of_date
LEFT JOIN l1.fx_rate fx                      ON p.currency_code = fx.from_currency_code
                                             AND fx.to_currency_code = p_base_currency AND fx.as_of_date = p_as_of_date
LEFT JOIN l2.facility_lob_attribution fla    ON p.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
WHERE p.as_of_date = p_as_of_date;
$$;


-- ============================================================
-- T6: crm_allocation_summary
-- Source: L2.collateral_snapshot + L1.collateral_asset_master + L1.crm_protection_master + links
-- Formula: recognized = market_value × (1 - haircut%); allocated = MIN(recognized, target_exposure)
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_crm_allocation_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE SQL AS $$

DELETE FROM l3.crm_allocation_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.crm_allocation_summary (
    run_version_id, as_of_date, scenario_id, legal_entity_id, crm_type_code,
    allocation_target_level, facility_id, counterparty_id, netting_set_id, crm_id,
    currency_code, base_currency_code, crm_market_value_amt, haircut_pct,
    crm_recognized_amt, allocated_amt, allocation_method_code, created_ts,
    lob_node_id, risk_mitigant_id, risk_mitigant_subtype_code, parent_group_code
)
SELECT
    p_run_version_id, p_as_of_date,
    COALESCE(cs.scenario_id, 'BASE'),
    cs.legal_entity_id,
    CASE WHEN ca.collateral_asset_id IS NOT NULL THEN 'COLLATERAL' ELSE 'PROTECTION' END,
    CASE
        WHEN cl.facility_id IS NOT NULL THEN 'FACILITY'
        WHEN pl.counterparty_id IS NOT NULL THEN 'COUNTERPARTY'
        WHEN nl.netting_set_id IS NOT NULL THEN 'NETTING_SET'
    END,
    cl.facility_id, pl.counterparty_id, nl.netting_set_id,
    COALESCE(ca.collateral_asset_id, pm.protection_id),
    cs.currency_code,
    p_base_currency,

    -- Market value in base currency
    cs.market_value_amt * COALESCE(fx.exchange_rate, 1),

    -- Haircut from collateral type
    COALESCE(hc.haircut_pct, 0),

    -- RECOGNIZED = market_value × (1 - haircut/100)
    cs.market_value_amt * (1 - COALESCE(hc.haircut_pct, 0) / 100.0) * COALESCE(fx.exchange_rate, 1),

    -- ALLOCATED = MIN(recognized, target facility exposure) — simplified pro-rata
    LEAST(
        cs.market_value_amt * (1 - COALESCE(hc.haircut_pct, 0) / 100.0) * COALESCE(fx.exchange_rate, 1),
        COALESCE(fes.outstanding_balance_amt * COALESCE(fx2.exchange_rate, 1), 0)
    ),

    'PRO_RATA',
    CURRENT_TIMESTAMP,
    fla.lob_node_id,
    rm.risk_mitigant_id,
    rmt.risk_mitigant_subtype_code,
    rmt.parent_group_code   -- 'M1' (funded) or 'M2' (unfunded)

FROM      l2.collateral_snapshot cs
LEFT JOIN l1.collateral_asset_master ca      ON cs.collateral_asset_id = ca.collateral_asset_id
LEFT JOIN l1.crm_protection_master pm        ON cs.protection_id = pm.protection_id
LEFT JOIN l1.collateral_link cl              ON ca.collateral_asset_id = cl.collateral_asset_id
LEFT JOIN l1.protection_link pl              ON pm.protection_id = pl.protection_id
LEFT JOIN l1.netting_set_link nl             ON ca.collateral_asset_id = nl.collateral_asset_id
LEFT JOIN l1.collateral_haircut_dim hc       ON ca.collateral_type_id = hc.collateral_type_id
LEFT JOIN l2.facility_exposure_snapshot fes   ON cl.facility_id = fes.facility_id AND fes.as_of_date = p_as_of_date
LEFT JOIN l1.fx_rate fx                      ON cs.currency_code = fx.from_currency_code
                                             AND fx.to_currency_code = p_base_currency AND fx.as_of_date = p_as_of_date
LEFT JOIN l1.fx_rate fx2                     ON fes.currency_code = fx2.from_currency_code
                                             AND fx2.to_currency_code = p_base_currency AND fx2.as_of_date = p_as_of_date
LEFT JOIN l1.risk_mitigant_master rm         ON COALESCE(ca.collateral_asset_id, pm.protection_id) = rm.source_asset_id
LEFT JOIN l1.risk_mitigant_type_dim rmt      ON rm.risk_mitigant_type_code = rmt.risk_mitigant_type_code
LEFT JOIN l2.facility_lob_attribution fla    ON cl.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
WHERE cs.as_of_date = p_as_of_date;
$$;


-- ============================================================
-- T8: limit_current_state
-- Source: L1.limit_threshold + L2.limit_contribution_snapshot + L2.limit_utilization_event
-- Formula: utilized = SUM(contributions); available = limit - utilized
--          utilization% = utilized / limit × 100
--          status: BREACH (>100%), WARN (>=90%), OK (<90%)
--          velocity_30d = current_util% - util%_30days_ago
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_limit_current_state(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

DELETE FROM l3.limit_current_state WHERE run_version_id = p_run_version_id;

INSERT INTO l3.limit_current_state (
    run_version_id, as_of_ts, legal_entity_id, limit_definition_id, limit_assignment_id,
    limit_currency_code, limit_amt, utilized_amt, available_amt, utilization_pct,
    status_code, last_breach_ts, created_ts, lob_node_id, hierarchy_id,
    last_status_change_ts, status_last_changed_event_id, classification_code,
    velocity_30d_pct, velocity_90d_pct, prior_period_status_code, utilization_tier_code
)
SELECT
    p_run_version_id,
    p_as_of_date::TIMESTAMP                                        AS as_of_ts,
    lt.legal_entity_id,
    lt.limit_definition_id,
    lt.limit_assignment_id,
    lt.limit_currency_code,
    lt.limit_amt,

    -- UTILIZED = SUM of all contributions to this limit
    COALESCE(lc.total_utilized, 0)                                 AS utilized_amt,

    -- AVAILABLE = limit - utilized (headroom)
    lt.limit_amt - COALESCE(lc.total_utilized, 0)                  AS available_amt,

    -- UTILIZATION % = utilized / limit × 100
    CASE WHEN lt.limit_amt > 0
         THEN COALESCE(lc.total_utilized, 0) / lt.limit_amt * 100.0
         ELSE 0 END                                                AS utilization_pct,

    -- STATUS: derived from utilization vs threshold
    CASE
        WHEN COALESCE(lc.total_utilized, 0) > lt.limit_amt          THEN 'BREACH'
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) >= 0.90 THEN 'WARN'
        ELSE 'OK'
    END                                                            AS status_code,

    lbe.last_breach_ts,
    CURRENT_TIMESTAMP,
    fla.lob_node_id,
    'DEFAULT_LOB_HIERARCHY'                                        AS hierarchy_id,
    lue_last.last_event_ts                                         AS last_status_change_ts,
    lue_last.event_id                                              AS status_last_changed_event_id,

    -- CLASSIFICATION: GREEN / AMBER / RED
    CASE
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) >= 1.0  THEN 'RED'
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) >= 0.75 THEN 'AMBER'
        ELSE 'GREEN'
    END                                                            AS classification_code,

    -- VELOCITY 30D = current utilization% - utilization% 30 days ago
    (COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) * 100.0)
     - COALESCE(prior30.utilization_pct, 0)                        AS velocity_30d_pct,

    -- VELOCITY 90D
    (COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) * 100.0)
     - COALESCE(prior90.utilization_pct, 0)                        AS velocity_90d_pct,

    prior_month.status_code                                        AS prior_period_status_code,

    -- UTILIZATION TIER
    CASE
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) < 0.50 THEN '<50%'
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) < 0.75 THEN '50-75%'
        WHEN COALESCE(lc.total_utilized, 0) / NULLIF(lt.limit_amt, 0) < 0.90 THEN '75-90%'
        ELSE '>90%'
    END                                                            AS utilization_tier_code

FROM l1.limit_threshold lt
-- Aggregate current utilization
LEFT JOIN (
    SELECT limit_assignment_id, SUM(contribution_amt) AS total_utilized
    FROM l2.limit_contribution_snapshot
    WHERE as_of_date = p_as_of_date
    GROUP BY limit_assignment_id
) lc ON lt.limit_assignment_id = lc.limit_assignment_id
-- Last breach timestamp
LEFT JOIN (
    SELECT limit_assignment_id, MAX(event_ts) AS last_breach_ts
    FROM l2.limit_utilization_event WHERE event_type = 'BREACH'
    GROUP BY limit_assignment_id
) lbe ON lt.limit_assignment_id = lbe.limit_assignment_id
-- Last event
LEFT JOIN (
    SELECT DISTINCT ON (limit_assignment_id) limit_assignment_id, event_ts AS last_event_ts, event_id
    FROM l2.limit_utilization_event ORDER BY limit_assignment_id, event_ts DESC
) lue_last ON lt.limit_assignment_id = lue_last.limit_assignment_id
-- Velocity comparisons (prior 30d and 90d from timeseries)
LEFT JOIN l3.limit_utilization_timeseries prior30
    ON lt.limit_assignment_id = prior30.limit_assignment_id
    AND prior30.as_of_ts::DATE = p_as_of_date - INTERVAL '30 days'
LEFT JOIN l3.limit_utilization_timeseries prior90
    ON lt.limit_assignment_id = prior90.limit_assignment_id
    AND prior90.as_of_ts::DATE = p_as_of_date - INTERVAL '90 days'
-- Prior month status
LEFT JOIN l3.limit_current_state prior_month
    ON lt.limit_assignment_id = prior_month.limit_assignment_id
    AND prior_month.as_of_ts::DATE = p_as_of_date - INTERVAL '1 month'
-- LoB
LEFT JOIN l2.facility_lob_attribution fla ON lt.facility_id = fla.facility_id
WHERE lt.effective_from_date <= p_as_of_date
  AND (lt.effective_to_date IS NULL OR lt.effective_to_date > p_as_of_date);
$$;


-- ============================================================
-- T11: limit_breach_fact
-- Source: L2.limit_utilization_event + L1.limit_threshold
-- Formula: breach_amount = utilized - limit; severity based on overdraft %
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_limit_breach_fact(
    p_run_version_id VARCHAR, p_as_of_date DATE
)
LANGUAGE SQL AS $$

INSERT INTO l3.limit_breach_fact (
    breach_id, run_version_id, limit_assignment_id, legal_entity_id,
    breach_ts, severity_code, breach_amount, status_code, resolved_ts, created_ts, lob_node_id
)
SELECT
    gen_random_uuid()::VARCHAR(64),
    p_run_version_id,
    lue.limit_assignment_id,
    lt.legal_entity_id,
    lue.event_ts,
    CASE
        WHEN (lue.utilized_amt - lt.limit_amt) / NULLIF(lt.limit_amt, 0) > 0.10 THEN 'CRITICAL'
        WHEN (lue.utilized_amt - lt.limit_amt) / NULLIF(lt.limit_amt, 0) > 0.05 THEN 'MAJOR'
        ELSE 'MINOR'
    END,
    lue.utilized_amt - lt.limit_amt,
    'OPEN',
    NULL,
    CURRENT_TIMESTAMP,
    fla.lob_node_id
FROM l2.limit_utilization_event lue
JOIN l1.limit_threshold lt ON lue.limit_assignment_id = lt.limit_assignment_id
LEFT JOIN l2.facility_lob_attribution fla ON lt.facility_id = fla.facility_id
WHERE lue.event_type = 'BREACH'
  AND lue.utilized_amt > lt.limit_amt
  AND lue.event_ts >= p_as_of_date - INTERVAL '1 year'
  AND NOT EXISTS (
      SELECT 1 FROM l3.limit_breach_fact lbf
      WHERE lbf.limit_assignment_id = lue.limit_assignment_id AND lbf.breach_ts = lue.event_ts
  );
$$;


-- ============================================================
-- T12: credit_event_summary
-- Source: L2.credit_event + L1.credit_event_type_dim + L1.counterparty
-- Formula: SUM(loss), SUM(recovery), net_loss = loss - recovery
--          risk_rating derived from default flag and loss amounts
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_credit_event_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE SQL AS $$

DELETE FROM l3.credit_event_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.credit_event_summary (
    run_version_id, as_of_date, legal_entity_id, counterparty_id, facility_id,
    credit_event_type_id, event_count, default_flag, charge_off_amt, recovery_amt,
    net_loss_amt, base_currency_code, created_ts, lob_node_id,
    impacted_facility_count, event_summary_text, event_short_name, event_risk_rating,
    estimated_exposure_impact_amt
)
SELECT
    p_run_version_id, p_as_of_date,
    ce.legal_entity_id, ce.counterparty_id, ce.facility_id, ce.credit_event_type_id,
    COUNT(*),
    BOOL_OR(ce.is_default_flag),
    SUM(COALESCE(ce.loss_amount, 0) * COALESCE(fx.exchange_rate, 1)),
    SUM(COALESCE(ce.recovery_amount, 0) * COALESCE(fx.exchange_rate, 1)),
    SUM((COALESCE(ce.loss_amount, 0) - COALESCE(ce.recovery_amount, 0)) * COALESCE(fx.exchange_rate, 1)),
    p_base_currency, CURRENT_TIMESTAMP, fla.lob_node_id,
    COUNT(DISTINCT ce.facility_id),
    STRING_AGG(DISTINCT cet.credit_event_type_name, ', '),
    cp.counterparty_short_name,
    CASE
        WHEN BOOL_OR(ce.is_default_flag) THEN 'CRITICAL'
        WHEN SUM(ce.loss_amount) > 1000000 THEN 'HIGH'
        WHEN COUNT(*) > 3 THEN 'MODERATE'
        ELSE 'LOW'
    END,
    SUM(COALESCE(ce.estimated_exposure_impact, 0) * COALESCE(fx.exchange_rate, 1))
FROM l2.credit_event ce
JOIN l1.credit_event_type_dim cet ON ce.credit_event_type_id = cet.credit_event_type_id
JOIN l1.counterparty cp ON ce.counterparty_id = cp.counterparty_id
LEFT JOIN l1.fx_rate fx ON ce.currency_code = fx.from_currency_code
                        AND fx.to_currency_code = p_base_currency AND fx.as_of_date = p_as_of_date
LEFT JOIN l2.facility_lob_attribution fla ON ce.facility_id = fla.facility_id AND fla.as_of_date = p_as_of_date
WHERE ce.event_date BETWEEN p_as_of_date - INTERVAL '3 months' AND p_as_of_date
GROUP BY ce.legal_entity_id, ce.counterparty_id, ce.facility_id, ce.credit_event_type_id,
         fla.lob_node_id, cp.counterparty_short_name;
$$;


-- ============================================================
-- T39: stress_test_result_summary
-- Source: L2.stress_test_result + L2.stress_test_breach + L1.scenario_dim
-- Formula: result_status = FAIL if critical/high breaches, WARNING if any breaches, PASS otherwise
-- ============================================================
CREATE OR REPLACE PROCEDURE l3.populate_stress_test_result_summary(
    p_run_version_id VARCHAR, p_as_of_date DATE, p_base_currency VARCHAR DEFAULT 'USD'
)
LANGUAGE SQL AS $$

DELETE FROM l3.stress_test_result_summary WHERE run_version_id = p_run_version_id;

INSERT INTO l3.stress_test_result_summary
SELECT
    p_run_version_id, p_as_of_date,
    str.scenario_id, sd.scenario_name, sd.scenario_type, sd.scenario_description, sd.scope_description,
    SUM(str.stressed_exposure_amt * COALESCE(fx.exchange_rate, 1)),
    SUM(str.stressed_expected_loss * COALESCE(fx.exchange_rate, 1)),
    AVG(str.capital_impact_pct),
    COUNT(DISTINCT stb.breach_id),
    COUNT(DISTINCT CASE WHEN stb.severity = 'CRITICAL' THEN stb.breach_id END),
    COUNT(DISTINCT CASE WHEN stb.severity = 'HIGH' THEN stb.breach_id END),
    COUNT(DISTINCT CASE WHEN stb.severity = 'MODERATE' THEN stb.breach_id END),
    COUNT(DISTINCT CASE WHEN stb.severity = 'LOW' THEN stb.breach_id END),
    CASE WHEN COUNT(DISTINCT CASE WHEN stb.severity IN ('CRITICAL','HIGH') THEN stb.breach_id END) > 0 THEN 'FAIL'
         WHEN COUNT(DISTINCT stb.breach_id) > 0 THEN 'WARNING'
         ELSE 'PASS' END,
    MAX(str.as_of_date),
    p_base_currency, CURRENT_TIMESTAMP
FROM l2.stress_test_result str
JOIN l1.scenario_dim sd ON str.scenario_id = sd.scenario_id
LEFT JOIN l2.stress_test_breach stb ON str.scenario_id = stb.scenario_id AND str.as_of_date = stb.as_of_date
LEFT JOIN l1.fx_rate fx ON str.currency_code = fx.from_currency_code
                        AND fx.to_currency_code = p_base_currency AND fx.as_of_date = p_as_of_date
WHERE str.as_of_date = p_as_of_date
GROUP BY str.scenario_id, sd.scenario_name, sd.scenario_type, sd.scenario_description, sd.scope_description;
$$;

-- ============================================================
-- Remaining Tier 1 tables: T7, T9, T13, T14, T15, T20, T35, T37, T38, T40, T42, T43, T44
-- These follow the same stored procedure pattern.
-- Population logic for each is documented in 09_GLOBAL_CONVENTIONS.md Key Formulas section.
-- Cursor should generate these using the field list from 01_DDL_all_tables.sql
-- and the source table mappings from the conventions doc.
-- ============================================================

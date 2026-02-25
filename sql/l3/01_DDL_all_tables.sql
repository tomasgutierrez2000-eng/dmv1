-- ============================================================
-- L3 Data Model DDL - All 49 Tables
-- Auto-generated from L3_Complete_Updated.xlsx
-- Target: PostgreSQL
-- ============================================================

CREATE SCHEMA IF NOT EXISTS l3;

-- T1: exposure_metric_cube (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS l3.exposure_metric_cube (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    org_unit_id                                   VARCHAR(64) NOT NULL,
    portfolio_id                                  VARCHAR(64) NOT NULL,
    product_node_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    facility_id                                   VARCHAR(64),
    instrument_id                                 VARCHAR(64),
    netting_set_id                                VARCHAR(64),
    country_code                                  VARCHAR(30) NOT NULL,
    currency_code                                 VARCHAR(30) NOT NULL,
    base_currency_code                            VARCHAR(30),
    exposure_type_code                            VARCHAR(30) NOT NULL,
    gross_exposure_amt                            NUMERIC(20,4),
    net_exposure_amt                              NUMERIC(20,4),
    drawn_amt                                     NUMERIC(20,4),
    undrawn_amt                                   NUMERIC(20,4),
    ead_amt                                       NUMERIC(20,4),
    secured_amt                                   NUMERIC(20,4),
    unsecured_residual_amt                        NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    hierarchy_id                                  VARCHAR(64),
    attribution_pct                               NUMERIC(10,6),
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, legal_entity_id, org_unit_id, portfolio_id, product_node_id, counterparty_id, country_code, currency_code, exposure_type_code)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: org_unit_id → L1.org_unit_dim.org_unit_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: product_node_id → L1.product_hierarchy.product_node_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: instrument_id → L1.instrument_master.instrument_id
    -- FK: netting_set_id → L1.netting_set.netting_set_id
    -- FK: country_code → L1.country_dim.country_code
    -- FK: currency_code → L1.currency_dim.currency_code
    -- FK: base_currency_code → L1.currency_dim.currency_code  to L1.fx_rate by as_of_date)
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id

-- T2: risk_metric_cube (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS l3.risk_metric_cube (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    portfolio_id                                  VARCHAR(64) NOT NULL,
    product_node_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    facility_id                                   VARCHAR(64),
    instrument_id                                 VARCHAR(64),
    currency_code                                 VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    model_id                                      VARCHAR(64),
    rating_grade_id                               VARCHAR(64),
    pd_pct                                        NUMERIC(10,6),
    lgd_pct                                       NUMERIC(10,6),
    ead_amt                                       NUMERIC(20,4),
    expected_loss_amt                             NUMERIC(20,4),
    risk_weight_pct                               NUMERIC(10,6),
    rwa_amt                                       NUMERIC(20,4),
    capital_req_amt                               NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    hierarchy_id                                  VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, legal_entity_id, portfolio_id, product_node_id, counterparty_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: product_node_id → L1.product_hierarchy.product_node_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: instrument_id → L1.instrument_master.instrument_id
    -- FK: currency_code → L1.currency_dim.currency_code
    -- FK: base_currency_code → L1.currency_dim.currency_code  to L1.fx_rate)
    -- FK: model_id → L1.model_registry_dim.model_id
    -- FK: rating_grade_id → L1.rating_grade_dim.rating_grade_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id

-- T3: counterparty_exposure_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS l3.counterparty_exposure_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    sccl_group_id                                 VARCHAR(64),
    country_code                                  VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    total_gross_exposure_amt                      NUMERIC(20,4),
    total_net_exposure_amt                        NUMERIC(20,4),
    total_ead_amt                                 NUMERIC(20,4),
    secured_amt                                   NUMERIC(20,4),
    unsecured_residual_amt                        NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    hierarchy_id                                  VARCHAR(64),
    has_cross_entity_flag                         BOOLEAN,
    cross_entity_exposure_amt                     NUMERIC(20,4),
    cross_entity_entity_count                     INTEGER,
    is_parent_flag                                BOOLEAN,
    total_committed_amt                           NUMERIC(20,4),
    total_outstanding_amt                         NUMERIC(20,4),
    prior_period_gross_exposure_amt               NUMERIC(20,4),
    exposure_change_pct                           NUMERIC(10,6),
    avg_pd_pct                                    NUMERIC(10,6),
    avg_lgd_pct                                   NUMERIC(10,6),
    expected_loss_amt                             NUMERIC(20,4),
    credit_limit_amt                              NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    headroom_amt                                  NUMERIC(20,4),
    risk_tier_code                                VARCHAR(30),
    limit_status_code                             VARCHAR(30),
    region_code                                   VARCHAR(30),
    industry_code                                 VARCHAR(30),
    number_of_loans                               INTEGER,
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, legal_entity_id, counterparty_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: sccl_group_id → L1.sccl_counterparty_group.sccl_group_id (nullable)
    -- FK: country_code → L1.country_dim.country_code
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: region_code → L1.region_dim.region_code
    -- FK: industry_code → L1.industry_dim.industry_code

-- T4: facility_exposure_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS l3.facility_exposure_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    facility_id                                   VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64),
    portfolio_id                                  VARCHAR(64),
    base_currency_code                            VARCHAR(30),
    outstanding_amt                               NUMERIC(20,4),
    undrawn_commitment_amt                        NUMERIC(20,4),
    ead_amt                                       NUMERIC(20,4),
    secured_amt                                   NUMERIC(20,4),
    unsecured_residual_amt                        NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    attribution_pct                               NUMERIC(10,6),
    is_syndicated_flag                            BOOLEAN,
    has_amendment_flag                            BOOLEAN,
    amendment_type_code                           VARCHAR(30),
    amendment_status_code                         VARCHAR(30),
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, legal_entity_id, facility_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T5: portfolio_summary (Exposure & Risk Metrics)
CREATE TABLE IF NOT EXISTS l3.portfolio_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    portfolio_id                                  VARCHAR(64) NOT NULL,
    base_currency_code                            VARCHAR(30),
    total_gross_exposure_amt                      NUMERIC(20,4),
    total_ead_amt                                 NUMERIC(20,4),
    total_expected_loss_amt                       NUMERIC(20,4),
    avg_pd_pct                                    NUMERIC(10,6),
    avg_lgd_pct                                   NUMERIC(10,6),
    total_rwa_amt                                 NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, legal_entity_id, portfolio_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T6: crm_allocation_summary (Credit Risk Mitigation (CRM))
CREATE TABLE IF NOT EXISTS l3.crm_allocation_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64),
    legal_entity_id                               VARCHAR(64) NOT NULL,
    crm_type_code                                 VARCHAR(30) NOT NULL,
    allocation_target_level                       VARCHAR(255) NOT NULL,
    facility_id                                   VARCHAR(64),
    counterparty_id                               VARCHAR(64),
    netting_set_id                                VARCHAR(64),
    crm_id                                        VARCHAR(64) NOT NULL,
    currency_code                                 VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    crm_market_value_amt                          NUMERIC(20,4),
    haircut_pct                                   NUMERIC(10,6),
    crm_recognized_amt                            NUMERIC(20,4),
    allocated_amt                                 NUMERIC(20,4),
    allocation_method_code                        VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    risk_mitigant_id                              VARCHAR(64),
    risk_mitigant_subtype_code                    VARCHAR(30),
    parent_group_code                             VARCHAR(30),
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, crm_type_code, allocation_target_level, crm_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: netting_set_id → L1.netting_set.netting_set_id
    -- FK: crm_id → L1.collateral_asset_master.collateral_asset_id OR L1.crm_protection_master.protection_id (by crm_type_code)
    -- FK: currency_code → L1.currency_dim.currency_code
    -- FK: base_currency_code → L1.currency_dim.currency_code  to L1.fx_rate)
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: risk_mitigant_id → L1.risk_mitigant_master.risk_mitigant_id
    -- FK: risk_mitigant_subtype_code → L1.risk_mitigant_type_dim.risk_mitigant_subtype_code

-- T7: collateral_portfolio_valuation (Credit Risk Mitigation (CRM))
CREATE TABLE IF NOT EXISTS l3.collateral_portfolio_valuation (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64),
    legal_entity_id                               VARCHAR(64) NOT NULL,
    portfolio_id                                  VARCHAR(64) NOT NULL,
    collateral_type_id                            VARCHAR(64) NOT NULL,
    base_currency_code                            VARCHAR(30),
    collateral_market_value_amt                   NUMERIC(20,4),
    collateral_recognized_amt                     NUMERIC(20,4),
    asset_count                                   INTEGER,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    parent_group_code                             VARCHAR(30),
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, portfolio_id, collateral_type_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: collateral_type_id → L1.collateral_type.collateral_type_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T8: limit_current_state (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_current_state (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_ts                                      TIMESTAMP NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    limit_definition_id                           VARCHAR(64),
    limit_assignment_id                           VARCHAR(64) NOT NULL,
    limit_currency_code                           VARCHAR(30),
    limit_amt                                     NUMERIC(20,4),
    utilized_amt                                  NUMERIC(20,4),
    available_amt                                 NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    status_code                                   VARCHAR(30),
    last_breach_ts                                TIMESTAMP,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    hierarchy_id                                  VARCHAR(64),
    last_status_change_ts                         TIMESTAMP,
    status_last_changed_event_id                  VARCHAR(64),
    classification_code                           VARCHAR(30),
    velocity_30d_pct                              NUMERIC(10,6),
    velocity_90d_pct                              NUMERIC(10,6),
    prior_period_status_code                      VARCHAR(30),
    utilization_tier_code                         VARCHAR(30),
    PRIMARY KEY (run_version_id, as_of_ts, legal_entity_id, limit_assignment_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: limit_definition_id → L1.limit_definition.limit_definition_id
    -- FK: limit_assignment_id → L1.limit_assignment.limit_assignment_id
    -- FK: limit_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: status_last_changed_event_id → L3.limit_real_time_event_log.event_id

-- T9: limit_utilization_timeseries (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_utilization_timeseries (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_ts                                      TIMESTAMP NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    limit_assignment_id                           VARCHAR(64) NOT NULL,
    limit_currency_code                           VARCHAR(30),
    utilized_amt                                  NUMERIC(20,4),
    available_amt                                 NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_ts, legal_entity_id, limit_assignment_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: limit_assignment_id → L1.limit_assignment.limit_assignment_id
    -- FK: limit_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T10: limit_attribution_summary (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_attribution_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_ts                                      TIMESTAMP NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    limit_assignment_id                           VARCHAR(64) NOT NULL,
    contributor_level                             VARCHAR(255) NOT NULL,
    facility_id                                   VARCHAR(64),
    counterparty_id                               VARCHAR(64),
    portfolio_id                                  VARCHAR(64),
    product_node_id                               VARCHAR(64),
    org_unit_id                                   VARCHAR(64),
    contribution_amt                              NUMERIC(20,4),
    contribution_pct                              NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    hierarchy_id                                  VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_ts, legal_entity_id, limit_assignment_id, contributor_level)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: limit_assignment_id → L1.limit_assignment.limit_assignment_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: portfolio_id → L1.portfolio_dim.portfolio_id
    -- FK: product_node_id → L1.product_hierarchy.product_node_id
    -- FK: org_unit_id → L1.org_unit_dim.org_unit_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id

-- T11: limit_breach_fact (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_breach_fact (
    breach_id                                     VARCHAR(64) NOT NULL,
    run_version_id                                VARCHAR(64),
    limit_assignment_id                           VARCHAR(64),
    legal_entity_id                               VARCHAR(64),
    breach_ts                                     TIMESTAMP,
    severity_code                                 VARCHAR(30),
    breach_amount                                 NUMERIC(20,4),
    status_code                                   VARCHAR(30),
    resolved_ts                                   TIMESTAMP,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (breach_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: limit_assignment_id → L1.limit_assignment.limit_assignment_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T12: credit_event_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS l3.credit_event_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64),
    facility_id                                   VARCHAR(64),
    credit_event_type_id                          VARCHAR(64) NOT NULL,
    event_count                                   INTEGER,
    default_flag                                  BOOLEAN,
    charge_off_amt                                NUMERIC(20,4),
    recovery_amt                                  NUMERIC(20,4),
    net_loss_amt                                  NUMERIC(20,4),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    impacted_facility_count                       INTEGER,
    event_summary_text                            TEXT,
    event_short_name                              VARCHAR(500),
    event_risk_rating                             VARCHAR(255),
    estimated_exposure_impact_amt                 NUMERIC(20,4),
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, credit_event_type_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: credit_event_type_id → L1.credit_event_type_dim.credit_event_type_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T13: rating_migration_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS l3.rating_migration_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    rating_source_id                              VARCHAR(64) NOT NULL,
    from_rating_grade_id                          VARCHAR(64) NOT NULL,
    to_rating_grade_id                            VARCHAR(64) NOT NULL,
    migration_count                               INTEGER,
    exposure_at_migration_amt                     NUMERIC(20,4),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, counterparty_id, rating_source_id, from_rating_grade_id, to_rating_grade_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: rating_source_id → L1.rating_source.rating_source_id
    -- FK: from_rating_grade_id → L1.rating_grade_dim.rating_grade_id
    -- FK: to_rating_grade_id → L1.rating_grade_dim.rating_grade_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T14: default_loss_recovery_summary (Credit Events & Performance)
CREATE TABLE IF NOT EXISTS l3.default_loss_recovery_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    facility_id                                   VARCHAR(64),
    default_exposure_amt                          NUMERIC(20,4),
    charge_off_amt                                NUMERIC(20,4),
    recovery_amt                                  NUMERIC(20,4),
    realized_lgd_pct                              NUMERIC(10,6),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, counterparty_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T15: report_run (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.report_run (
    report_run_id                                 VARCHAR(64) NOT NULL,
    run_version_id                                VARCHAR(64),
    report_code                                   VARCHAR(30),
    as_of_date                                    DATE,
    scenario_id                                   VARCHAR(64),
    status_code                                   VARCHAR(30),
    started_ts                                    TIMESTAMP,
    completed_ts                                  TIMESTAMP,
    produced_by_system_id                         VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_run_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: report_code → L1.report_registry.report_code OR L1.regulatory_report_dim.report_code
    -- FK: scenario_id → L1.scenario_dim.scenario_id (nullable)
    -- FK: produced_by_system_id → L1.source_system_registry.source_system_id

-- T16: report_cell_value (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.report_cell_value (
    report_run_id                                 VARCHAR(64) NOT NULL,
    cell_id                                       VARCHAR(64) NOT NULL,
    value_amt                                     NUMERIC(20,4),
    currency_code                                 VARCHAR(30),
    unit_code                                     VARCHAR(30),
    value_precision                               VARCHAR(255),
    calculation_rule_id                           VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_run_id, cell_id)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: cell_id → L1.report_cell_definition.cell_id (recommended new L1 table)
    -- FK: currency_code → L1.currency_dim.currency_code (nullable)
    -- FK: calculation_rule_id → L1.rule_registry.rule_id (recommended) OR reference to L1.regulatory_mapping

-- T17: report_cell_contribution_fact (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.report_cell_contribution_fact (
    contribution_id                               VARCHAR(64) NOT NULL,
    report_run_id                                 VARCHAR(64),
    cell_id                                       VARCHAR(64),
    source_record_type_code                       VARCHAR(30),
    source_record_id                              VARCHAR(64),
    contribution_amt                              NUMERIC(20,4),
    currency_code                                 VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    rule_id                                       VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    PRIMARY KEY (contribution_id)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: cell_id → L1.report_cell_definition.cell_id (recommended new L1 table)
    -- FK: currency_code → L1.currency_dim.currency_code (nullable)
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: rule_id → L1.rule_registry.rule_id (recommended) OR reference to L1.regulatory_mapping
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T18: report_cell_rule_execution (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.report_cell_rule_execution (
    report_run_id                                 VARCHAR(64) NOT NULL,
    cell_id                                       VARCHAR(64) NOT NULL,
    rule_id                                       VARCHAR(64) NOT NULL,
    rule_version                                  VARCHAR(255) NOT NULL,
    status_code                                   VARCHAR(30),
    started_ts                                    TIMESTAMP,
    ended_ts                                      TIMESTAMP,
    input_record_count                            INTEGER,
    output_value_amt                              NUMERIC(20,4),
    error_message                                 VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_run_id, cell_id, rule_id, rule_version)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: cell_id → L1.report_cell_definition.cell_id (recommended new L1 table)
    -- FK: rule_id → L1.rule_registry.rule_id (recommended)

-- T19: report_validation_result (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.report_validation_result (
    validation_result_id                          VARCHAR(64) NOT NULL,
    report_run_id                                 VARCHAR(64),
    validation_check_id                           VARCHAR(64),
    cell_id                                       VARCHAR(64),
    severity_code                                 VARCHAR(30),
    result_flag                                   BOOLEAN,
    threshold_value                               NUMERIC(12,6),
    observed_value                                NUMERIC(12,6),
    message                                       VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (validation_result_id)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: validation_check_id → L1.validation_check_registry.validation_check_id (recommended)
    -- FK: cell_id → L1.report_cell_definition.cell_id (nullable)

-- T20: fr2590_position_snapshot (FR 2590 Helper Artifacts)
CREATE TABLE IF NOT EXISTS l3.fr2590_position_snapshot (
    report_run_id                                 VARCHAR(64) NOT NULL,
    position_id                                   VARCHAR(64) NOT NULL,
    as_of_date                                    DATE,
    legal_entity_id                               VARCHAR(64),
    counterparty_id                               VARCHAR(64),
    facility_id                                   VARCHAR(64),
    instrument_id                                 VARCHAR(64),
    product_node_id                               VARCHAR(64),
    country_code                                  VARCHAR(30),
    currency_code                                 VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    mdrm_id                                       VARCHAR(64),
    mapped_schedule_code                          VARCHAR(30),
    mapped_line_id                                VARCHAR(64),
    mapped_column_id                              VARCHAR(64),
    amount_amt                                    NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    fr2590_category_code                          VARCHAR(30),
    PRIMARY KEY (report_run_id, position_id)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: position_id → L2.position.position_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id (nullable)
    -- FK: facility_id → L1.facility_master.facility_id (nullable)
    -- FK: instrument_id → L1.instrument_master.instrument_id (nullable)
    -- FK: product_node_id → L1.product_hierarchy.product_node_id
    -- FK: country_code → L1.country_dim.country_code
    -- FK: currency_code → L1.currency_dim.currency_code
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: mdrm_id → L1.regulatory_mapping.mdrm_id (or equivalent)
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: fr2590_category_code → L1.fr2590_category_dim.fr2590_category_code

-- T21: fr2590_counterparty_aggregate (FR 2590 Helper Artifacts)
CREATE TABLE IF NOT EXISTS l3.fr2590_counterparty_aggregate (
    report_run_id                                 VARCHAR(64) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    product_node_id                               VARCHAR(64),
    country_code                                  VARCHAR(30),
    base_currency_code                            VARCHAR(30),
    total_amount_amt                              NUMERIC(20,4),
    rank_within_entity                            VARCHAR(255),
    is_top_counterparty_flag                      BOOLEAN,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lob_node_id                                   VARCHAR(64),
    fr2590_category_code                          VARCHAR(30),
    PRIMARY KEY (report_run_id, counterparty_id, legal_entity_id, as_of_date)
);
    -- FK: report_run_id → L3.report_run.report_run_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: product_node_id → L1.product_hierarchy.product_node_id
    -- FK: country_code → L1.country_dim.country_code
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: fr2590_category_code → L1.fr2590_category_dim.fr2590_category_code

-- T22: lob_exposure_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_exposure_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    legal_entity_id                               VARCHAR(64),
    base_currency_code                            VARCHAR(30),
    facility_count                                INTEGER,
    counterparty_count                            INTEGER,
    gross_exposure_amt                            NUMERIC(20,4),
    net_exposure_amt                              NUMERIC(20,4),
    drawn_amt                                     NUMERIC(20,4),
    undrawn_amt                                   NUMERIC(20,4),
    ead_amt                                       NUMERIC(20,4),
    expected_loss_amt                             NUMERIC(20,4),
    rwa_amt                                       NUMERIC(20,4),
    avg_pd_pct                                    NUMERIC(10,6),
    avg_lgd_pct                                   NUMERIC(10,6),
    limit_amt                                     NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    breach_count                                  INTEGER,
    npl_exposure_amt                              NUMERIC(20,4),
    npl_ratio_pct                                 NUMERIC(10,6),
    prior_period_gross_exposure_amt               NUMERIC(20,4),
    exposure_change_pct                           NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result_status_code                            VARCHAR(30),
    scenario_scope_desc                           TEXT,
    coverage_ratio_pct                            NUMERIC(10,6),
    total_crm_amt                                 NUMERIC(20,4),
    number_of_loans                               INTEGER,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id, scenario_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T23: lob_profitability_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_profitability_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    base_currency_code                            VARCHAR(30),
    period_start_date                             DATE,
    period_end_date                               DATE,
    periodicity_code                              VARCHAR(30),
    total_revenue_amt                             NUMERIC(20,4),
    net_income_amt                                NUMERIC(20,4),
    net_interest_income_amt                       NUMERIC(20,4),
    avg_earning_assets_amt                        NUMERIC(20,4),
    avg_total_assets_amt                          NUMERIC(20,4),
    allocated_equity_amt                          NUMERIC(20,4),
    nim_pct                                       NUMERIC(10,6),
    roa_pct                                       NUMERIC(10,6),
    roe_pct                                       NUMERIC(10,6),
    prior_period_total_revenue_amt                NUMERIC(20,4),
    revenue_change_pct                            NUMERIC(10,6),
    prior_period_net_income_amt                   NUMERIC(20,4),
    net_income_change_pct                         NUMERIC(10,6),
    return_on_rwa_pct                             NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: period_start_date → L1.date_dim.calendar_date
    -- FK: period_end_date → L1.date_dim.calendar_date

-- T24: lob_pricing_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_pricing_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    base_currency_code                            VARCHAR(30),
    avg_spread_bps                                NUMERIC(10,4),
    avg_base_rate_pct                             NUMERIC(10,6),
    avg_all_in_rate_pct                           NUMERIC(10,6),
    internal_spread_threshold_bps                 NUMERIC(10,4),
    spread_vs_threshold_bps                       NUMERIC(10,4),
    below_threshold_facility_count                INTEGER,
    documented_exception_count                    INTEGER,
    prior_period_avg_spread_bps                   NUMERIC(10,4),
    avg_spread_change_bps                         NUMERIC(10,4),
    weighted_avg_fee_rate_pct                     NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T25: lob_delinquency_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_delinquency_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    base_currency_code                            VARCHAR(30),
    total_overdue_amt                             NUMERIC(20,4),
    delinquent_facility_count                     INTEGER,
    delinquent_counterparty_count                 INTEGER,
    total_outstanding_exposure_amt                NUMERIC(20,4),
    delinquency_rate_pct                          NUMERIC(10,6),
    prior_period_total_overdue_amt                NUMERIC(20,4),
    overdue_change_pct                            NUMERIC(10,6),
    prior_period_delinquency_rate_pct             NUMERIC(10,6),
    delinquency_rate_change_pct                   NUMERIC(10,6),
    delinquent_loan_count                         INTEGER,
    overdue_amt_0_30                              NUMERIC(20,4),
    overdue_amt_31_60                             NUMERIC(20,4),
    overdue_amt_61_90_plus                        NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T26: lob_profitability_allocation_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_profitability_allocation_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    allocation_dim_type                           VARCHAR(255) NOT NULL,
    allocation_dim_id                             VARCHAR(64),
    allocation_dim_name                           VARCHAR(500),
    allocation_pct                                NUMERIC(10,6),
    exposure_amt                                  NUMERIC(20,4),
    total_revenue_amt                             NUMERIC(20,4),
    net_income_amt                                NUMERIC(20,4),
    roe_pct                                       NUMERIC(10,6),
    roa_pct                                       NUMERIC(10,6),
    nim_pct                                       NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id, allocation_dim_type)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: allocation_dim_id → L1.region_dim.region_code (if REGION)

-- T27: deal_pipeline_stage_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.deal_pipeline_stage_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    pipeline_stage_code                           VARCHAR(30) NOT NULL,
    deal_count                                    INTEGER,
    expected_exposure_amt                         NUMERIC(20,4),
    expected_collateral_value_amt                 NUMERIC(20,4),
    avg_expected_spread_bps                       NUMERIC(10,4),
    avg_expected_coverage_ratio                   VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id, pipeline_stage_code)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: pipeline_stage_code → L1.pipeline_stage_dim.pipeline_stage_code

-- T28: lob_credit_quality_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_credit_quality_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    avg_internal_risk_rating                      VARCHAR(255),
    prior_period_avg_internal_risk_rating         VARCHAR(255),
    avg_internal_risk_rating_change               VARCHAR(255),
    dscr_value                                    NUMERIC(12,6),
    dcsr_value                                    NUMERIC(12,6),
    rwa_density_pct                               NUMERIC(10,6),
    rating_downgrade_count                        INTEGER,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                                    TIMESTAMP,
    external_downgrade_count                      INTEGER,
    internal_downgrade_count                      INTEGER,
    criticized_portfolio_count                    INTEGER,
    deteriorated_deal_count                       INTEGER,
    doi_pct                                       NUMERIC(10,6),
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T29: kpi_period_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.kpi_period_summary (
    kpi_code                                      VARCHAR(30),
    as_of_date                                    DATE NOT NULL,
    prior_as_of_date                              DATE,
    scenario_id                                   VARCHAR(64),
    legal_entity_id                               VARCHAR(64),
    current_value                                 NUMERIC(12,6),
    prior_value                                   NUMERIC(12,6),
    change_value                                  NUMERIC(12,6),
    change_pct                                    NUMERIC(10,6),
    unit_of_measure                               VARCHAR(255),
    base_currency_code                            VARCHAR(30),
    run_version_id                                VARCHAR(64) NOT NULL,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (as_of_date, run_version_id)
);
    -- FK: kpi_code → L1.metric_definition_dim.metric_code
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: prior_as_of_date → L1.date_dim.calendar_date
    -- FK: scenario_id → L1.scenario_dim.scenario_id (nullable)
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id (nullable)
    -- FK: base_currency_code → L1.currency_dim.currency_code (nullable)
    -- FK: run_version_id → L1.run_control.run_version_id

-- T30: risk_appetite_metric_state (Executive Dashboard)
CREATE TABLE IF NOT EXISTS l3.risk_appetite_metric_state (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    metric_id                                     VARCHAR(64) NOT NULL,
    metric_name                                   VARCHAR(500),
    metric_description                            TEXT,
    metric_classification                         VARCHAR(255),
    limit_type_code                               VARCHAR(30),
    current_value                                 NUMERIC(12,6),
    limit_value                                   NUMERIC(12,6),
    inner_threshold_value                         NUMERIC(12,6),
    outer_threshold_value                         NUMERIC(12,6),
    utilization_pct                               NUMERIC(10,6),
    status_code                                   VARCHAR(30),
    velocity_30d_pct                              NUMERIC(10,6),
    velocity_90d_pct                              NUMERIC(10,6),
    immediate_action_text                         TEXT,
    report_frequency_code                         VARCHAR(30),
    report_deadline_date                          DATE,
    metric_owner                                  VARCHAR(255),
    first_lod_sponsor                             VARCHAR(255),
    second_lod_sponsor                            VARCHAR(255),
    last_metric_updated_ts                        TIMESTAMP,
    last_threshold_updated_ts                     TIMESTAMP,
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, metric_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: metric_id → L1.metric_definition_dim.metric_code
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T31: executive_highlight_summary (Executive Dashboard)
CREATE TABLE IF NOT EXISTS l3.executive_highlight_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    highlight_seq                                 INTEGER NOT NULL,
    highlight_category                            VARCHAR(255),
    highlight_text                                TEXT,
    driver_text                                   TEXT,
    action_required_text                          TEXT,
    icon_code                                     VARCHAR(30),
    severity_code                                 VARCHAR(30),
    source_metric_id                              VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, highlight_seq)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: source_metric_id → L1.metric_definition_dim.metric_code (nullable)

-- T32: counterparty_detail_snapshot (Counterparty Analytics)
CREATE TABLE IF NOT EXISTS l3.counterparty_detail_snapshot (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    counterparty_name                             VARCHAR(500),
    is_parent_flag                                BOOLEAN,
    parent_counterparty_id                        VARCHAR(64),
    parent_counterparty_name                      VARCHAR(500),
    legal_entity_id                               VARCHAR(64),
    country_code                                  VARCHAR(30),
    region_code                                   VARCHAR(30),
    industry_code                                 VARCHAR(30),
    industry_name                                 VARCHAR(500),
    internal_risk_rating                          VARCHAR(255),
    external_risk_rating                          VARCHAR(255),
    counterparty_type                             VARCHAR(255),
    total_gross_exposure_amt                      NUMERIC(20,4),
    total_net_exposure_amt                        NUMERIC(20,4),
    total_committed_amt                           NUMERIC(20,4),
    total_outstanding_amt                         NUMERIC(20,4),
    pd_pct                                        NUMERIC(10,6),
    lgd_pct                                       NUMERIC(10,6),
    expected_loss_amt                             NUMERIC(20,4),
    credit_limit_amt                              NUMERIC(20,4),
    utilized_amt                                  NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    headroom_amt                                  NUMERIC(20,4),
    risk_tier_code                                VARCHAR(30),
    limit_status_code                             VARCHAR(30),
    facility_count                                INTEGER,
    crm_type                                      VARCHAR(255),
    prior_period_gross_exposure_amt               NUMERIC(20,4),
    exposure_change_pct                           NUMERIC(10,6),
    base_currency_code                            VARCHAR(30),
    lob_node_id                                   VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, counterparty_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: parent_counterparty_id → L1.counterparty.counterparty_id (nullable)
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: country_code → L1.country_dim.country_code
    -- FK: region_code → L1.region_dim.region_code
    -- FK: industry_code → L1.industry_dim.industry_code
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T33: limit_tier_status_matrix (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_tier_status_matrix (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    risk_tier_code                                VARCHAR(30) NOT NULL,
    limit_status_code                             VARCHAR(30) NOT NULL,
    counterparty_count                            INTEGER,
    prior_period_counterparty_count               INTEGER,
    counterparty_count_change                     VARCHAR(255),
    total_utilized_exposure_amt                   NUMERIC(20,4),
    total_headroom_amt                            NUMERIC(20,4),
    risk_score                                    VARCHAR(255),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, risk_tier_code, limit_status_code)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T34: limit_counterparty_movement (Limits & Appetite)
CREATE TABLE IF NOT EXISTS l3.limit_counterparty_movement (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    risk_tier_code                                VARCHAR(30) NOT NULL,
    limit_status_code                             VARCHAR(30) NOT NULL,
    counterparty_id                               VARCHAR(64) NOT NULL,
    movement_type                                 VARCHAR(255) NOT NULL,
    prior_limit_status_code                       VARCHAR(30),
    counterparty_name                             VARCHAR(500),
    gross_exposure_amt                            NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id, risk_tier_code, limit_status_code, counterparty_id, movement_type)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id

-- T35: data_quality_score_summary (Data Quality)
CREATE TABLE IF NOT EXISTS l3.data_quality_score_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    dimension_type                                VARCHAR(255) NOT NULL,
    dimension_id                                  VARCHAR(64) NOT NULL,
    dimension_name                                VARCHAR(500),
    data_quality_score_pct                        NUMERIC(10,6),
    prior_period_dq_score_pct                     NUMERIC(10,6),
    dq_score_change_pct                           NUMERIC(10,6),
    total_dq_issues                               VARCHAR(255),
    reconciliation_break_count                    INTEGER,
    prior_period_recon_break_count                INTEGER,
    leading_issue_type                            VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, dimension_type, dimension_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id

-- T36: legal_entity_risk_profile (Legal Entity Analytics)
CREATE TABLE IF NOT EXISTS l3.legal_entity_risk_profile (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64) NOT NULL,
    legal_entity_name                             VARCHAR(500),
    le_classification                             VARCHAR(255),
    gross_exposure_amt                            NUMERIC(20,4),
    net_exposure_amt                              NUMERIC(20,4),
    has_cross_entity_flag                         BOOLEAN,
    cross_entity_exposure_amt                     NUMERIC(20,4),
    facility_count                                INTEGER,
    liquidity_ratio_pct                           NUMERIC(10,6),
    utilization_pct                               NUMERIC(10,6),
    avg_pd_pct                                    NUMERIC(10,6),
    avg_lgd_pct                                   NUMERIC(10,6),
    expected_loss_amt                             NUMERIC(20,4),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, legal_entity_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T37: data_quality_attribute_score (Data Quality)
CREATE TABLE IF NOT EXISTS l3.data_quality_attribute_score (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    attribute_name                                VARCHAR(500) NOT NULL,
    data_quality_score_pct                        NUMERIC(10,6),
    dq_issue_count                                INTEGER,
    impact_pct                                    NUMERIC(10,6),
    impacted_reports                              VARCHAR(255),
    rank_order                                    INTEGER,
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, attribute_name)
);
    -- FK: run_version_id → L1.run_control.run_version_id

-- T38: data_quality_trend (Data Quality)
CREATE TABLE IF NOT EXISTS l3.data_quality_trend (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    legal_entity_id                               VARCHAR(64),
    data_quality_score_pct                        NUMERIC(10,6),
    reconciliation_break_count                    INTEGER,
    total_dq_issues                               VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: legal_entity_id → L1.legal_entity.legal_entity_id

-- T39: stress_test_result_summary (Stress Testing)
CREATE TABLE IF NOT EXISTS l3.stress_test_result_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    scenario_name                                 VARCHAR(500),
    scenario_type                                 VARCHAR(255),
    scenario_description                          TEXT,
    scope_description                             TEXT,
    total_exposure_amt                            NUMERIC(20,4),
    expected_loss_amt                             NUMERIC(20,4),
    capital_impact_pct                            NUMERIC(10,6),
    total_breach_count                            INTEGER,
    critical_breach_count                         INTEGER,
    high_breach_count                             INTEGER,
    moderate_breach_count                         INTEGER,
    low_breach_count                              INTEGER,
    result_status_code                            VARCHAR(30),
    last_tested_date                              DATE,
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, scenario_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T40: stress_test_breach_detail (Stress Testing)
CREATE TABLE IF NOT EXISTS l3.stress_test_breach_detail (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    scenario_id                                   VARCHAR(64) NOT NULL,
    breach_seq                                    INTEGER NOT NULL,
    lob_node_id                                   VARCHAR(64),
    lob_name                                      VARCHAR(500),
    breach_severity                               VARCHAR(255),
    control_description                           TEXT,
    control_owner_name                            VARCHAR(500),
    exception_description                         TEXT,
    expected_loss_amt                             NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, scenario_id, breach_seq)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: scenario_id → L1.scenario_dim.scenario_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id

-- T41: regulatory_compliance_state (Regulatory Reporting Output)
CREATE TABLE IF NOT EXISTS l3.regulatory_compliance_state (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    metric_id                                     VARCHAR(64) NOT NULL,
    metric_name                                   VARCHAR(500),
    current_value                                 NUMERIC(12,6),
    regulatory_threshold                          VARCHAR(255),
    variance_value                                NUMERIC(12,6),
    compliance_status                             VARCHAR(255),
    prior_period_value                            NUMERIC(12,6),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, metric_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: metric_id → L1.metric_definition_dim.metric_code
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T42: facility_timeline_summary (Facility Analytics)
CREATE TABLE IF NOT EXISTS l3.facility_timeline_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    timeline_month                                VARCHAR(255) NOT NULL,
    timeline_type                                 VARCHAR(255) NOT NULL,
    facility_count                                INTEGER,
    total_exposure_amt                            NUMERIC(20,4),
    cumulative_exposure_change_amt                NUMERIC(20,4),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, timeline_month, timeline_type)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T43: amendment_summary (Amendment Analytics)
CREATE TABLE IF NOT EXISTS l3.amendment_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    amendment_type_code                           VARCHAR(30) NOT NULL,
    amendment_type_name                           VARCHAR(500),
    amendment_status_code                         VARCHAR(30) NOT NULL,
    amendment_status_name                         VARCHAR(500),
    credit_agreement_count                        INTEGER,
    total_exposure_amt                            NUMERIC(20,4),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, amendment_type_code, amendment_status_code)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: amendment_type_code → L1.amendment_type_dim.amendment_type_code
    -- FK: amendment_status_code → L1.amendment_status_dim.amendment_status_code

-- T44: amendment_detail (Amendment Analytics)
CREATE TABLE IF NOT EXISTS l3.amendment_detail (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    amendment_event_id                            VARCHAR(64) NOT NULL,
    credit_agreement_id                           VARCHAR(64),
    obligor_name                                  VARCHAR(500),
    amendment_type_code                           VARCHAR(30),
    amendment_description                         TEXT,
    original_value                                NUMERIC(12,6),
    amended_value                                 NUMERIC(12,6),
    amendment_start_date                          DATE,
    amendment_status_code                         VARCHAR(30),
    amendment_aging_days                          VARCHAR(255),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, amendment_event_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: amendment_event_id → L2.amendment_event.amendment_event_id
    -- FK: credit_agreement_id → L1.credit_agreement_master.credit_agreement_id
    -- FK: amendment_type_code → L1.amendment_type_dim.amendment_type_code
    -- FK: amendment_status_code → L1.amendment_status_dim.amendment_status_code

-- T45: facility_detail_snapshot (Facility Analytics)
CREATE TABLE IF NOT EXISTS l3.facility_detail_snapshot (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    facility_id                                   VARCHAR(64) NOT NULL,
    facility_type                                 VARCHAR(255),
    facility_purpose_desc                         TEXT,
    lob_l1_name                                   VARCHAR(500),
    lob_l2_name                                   VARCHAR(500),
    portfolio_name                                VARCHAR(500),
    product_name                                  VARCHAR(500),
    region_name                                   VARCHAR(500),
    counterparty_id                               VARCHAR(64),
    counterparty_name                             VARCHAR(500),
    committed_amt                                 NUMERIC(20,4),
    utilized_amt                                  NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    coverage_ratio_pct                            NUMERIC(10,6),
    effective_date                                DATE,
    maturity_date                                 DATE,
    days_remaining                                VARCHAR(255),
    facility_duration_days                        VARCHAR(255),
    status_code                                   VARCHAR(30),
    is_syndicated_flag                            BOOLEAN,
    interest_rate_pct                             NUMERIC(10,6),
    rate_type                                     VARCHAR(255),
    all_in_rate_pct                               NUMERIC(10,6),
    interest_rate_spread_bps                      NUMERIC(10,4),
    interest_rate_index                           VARCHAR(255),
    rate_cap_pct                                  NUMERIC(10,6),
    payment_frequency                             VARCHAR(255),
    prepayment_penalty_desc                       TEXT,
    has_amendment_flag                            BOOLEAN,
    amendment_count                               INTEGER,
    pricing_tier                                  VARCHAR(20),
    pricing_exception_flag                        CHAR(1),
    number_of_loans                               INTEGER,
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, facility_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: facility_id → L1.facility_master.facility_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id
    -- FK: base_currency_code → L1.currency_dim.currency_code
    -- FK: pricing_tier → L1.pricing_tier_dim.pricing_tier_code

-- T46: lob_risk_ratio_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_risk_ratio_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    dscr_value                                    NUMERIC(12,6),
    fccr_value                                    NUMERIC(12,6),
    ltv_pct                                       NUMERIC(10,6),
    lcr_pct                                       NUMERIC(10,6),
    capital_adequacy_ratio_pct                    NUMERIC(10,6),
    tangible_net_worth_amt                        NUMERIC(20,4),
    cash_interest_expense_amt                     NUMERIC(20,4),
    exception_rate_pct                            NUMERIC(10,6),
    interest_rate_sensitivity_pct                  NUMERIC(10,6),
    return_on_rwa_pct                             NUMERIC(10,6),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T47: lob_deterioration_summary (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_deterioration_summary (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    deteriorated_deal_count                       INTEGER,
    deteriorated_deal_exposure_amt                NUMERIC(20,4),
    deteriorated_deal_pct                         NUMERIC(10,6),
    criticized_portfolio_count                    INTEGER,
    doi_pct                                       NUMERIC(10,6),
    internal_downgrade_count                      INTEGER,
    external_downgrade_count                      INTEGER,
    total_rating_change_count                     INTEGER,
    prior_period_deteriorated_count               INTEGER,
    deterioration_change_pct                      NUMERIC(10,6),
    base_currency_code                            VARCHAR(30),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: base_currency_code → L1.currency_dim.currency_code

-- T48: lob_rating_distribution (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_rating_distribution (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    internal_risk_rating_bucket_code              VARCHAR(30) NOT NULL,
    rating_bucket_code                            VARCHAR(30) NOT NULL,
    rating_bucket_name                            VARCHAR(500),
    counterparty_count                            INTEGER,
    exposure_amt                                  NUMERIC(20,4),
    bucket_pct                                    NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id, rating_bucket_code)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: internal_risk_rating_bucket_code → L1.internal_risk_rating_bucket_dim.internal_risk_rating_bucket_code

-- T49: lob_top_contributors (LoB Summary)
CREATE TABLE IF NOT EXISTS l3.lob_top_contributors (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    hierarchy_id                                  VARCHAR(64) NOT NULL,
    lob_node_id                                   VARCHAR(64) NOT NULL,
    rank_order                                    INTEGER NOT NULL,
    contributor_type                              VARCHAR(255),
    counterparty_id                               VARCHAR(64),
    counterparty_name                             VARCHAR(500),
    exposure_amt                                  NUMERIC(20,4),
    utilization_pct                               NUMERIC(10,6),
    contribution_pct                              NUMERIC(10,6),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_version_id, as_of_date, hierarchy_id, lob_node_id, rank_order)
);
    -- FK: run_version_id → L1.run_control.run_version_id
    -- FK: as_of_date → L1.date_dim.calendar_date
    -- FK: hierarchy_id → L1.lob_hierarchy_config.hierarchy_id
    -- FK: lob_node_id → L1.lob_node.lob_node_id
    -- FK: counterparty_id → L1.counterparty.counterparty_id

-- T50: metric_value_fact (Dashboard consumption — pre-calculated metric values by level)
CREATE TABLE IF NOT EXISTS l3.metric_value_fact (
    run_version_id                                VARCHAR(64) NOT NULL,
    as_of_date                                    DATE NOT NULL,
    metric_id                                     VARCHAR(64) NOT NULL,
    variant_id                                    VARCHAR(64),
    aggregation_level                             VARCHAR(30) NOT NULL,
    facility_id                                   VARCHAR(64),
    counterparty_id                               VARCHAR(64),
    desk_id                                       VARCHAR(64),
    portfolio_id                                  VARCHAR(64),
    lob_id                                        VARCHAR(64),
    value                                         NUMERIC(20,6),
    unit                                          VARCHAR(30),
    display_format                                VARCHAR(64),
    created_ts                                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_value_fact ON l3.metric_value_fact (run_version_id, as_of_date, metric_id, COALESCE(variant_id, ''), aggregation_level, COALESCE(facility_id, ''), COALESCE(counterparty_id, ''), COALESCE(desk_id, ''), COALESCE(portfolio_id, ''), COALESCE(lob_id, ''));
CREATE INDEX IF NOT EXISTS ix_metric_value_fact_lookup ON l3.metric_value_fact (metric_id, aggregation_level, as_of_date, run_version_id);


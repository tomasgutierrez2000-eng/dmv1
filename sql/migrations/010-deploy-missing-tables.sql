-- ============================================================================
-- Migration 010: Deploy 37 missing tables (in DD but not in PostgreSQL)
--
-- Sources: migrations 002-009, gsib-export DDL files
-- Order: L1 (11) → L2 (7) → L3 (19), respecting FK dependencies
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS l1;
CREATE SCHEMA IF NOT EXISTS l2;
CREATE SCHEMA IF NOT EXISTS l3;

-- ============================================================================
-- L1 REFERENCE TABLES — Pure dims (no cross-schema FKs) first
-- ============================================================================

-- 1. basel_exposure_type_dim (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l1.basel_exposure_type_dim (
    basel_exposure_type_id   BIGINT NOT NULL,
    exposure_type_code       VARCHAR(30),
    exposure_type_name       VARCHAR(200),
    description              VARCHAR(2000),
    std_risk_weight_pct      NUMERIC(10,6),
    erba_risk_weight_pct     NUMERIC(10,6),
    asset_class_group        VARCHAR(100),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_basel_exposure_type_dim PRIMARY KEY (basel_exposure_type_id)
);

-- 2. duns_entity_dim (from 004-duns-integration.sql)
CREATE TABLE IF NOT EXISTS l1.duns_entity_dim (
    duns_number             VARCHAR(9)  NOT NULL,
    business_name           VARCHAR(500),
    trade_style_name        VARCHAR(500),
    sic_code                VARCHAR(10),
    naics_code              VARCHAR(10),
    employee_count          INTEGER,
    annual_revenue_amt      NUMERIC(20,4),
    duns_country_code       VARCHAR(3),
    paydex_score            INTEGER,
    dnb_rating              VARCHAR(10),
    failure_score           INTEGER,
    is_out_of_business_flag BOOLEAN DEFAULT FALSE,
    last_updated_date       DATE,
    created_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_duns_entity_dim PRIMARY KEY (duns_number)
);

-- 3. ecl_stage_dim (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l1.ecl_stage_dim (
    ecl_stage_code         VARCHAR(20) NOT NULL,
    stage_name             VARCHAR(500),
    description            VARCHAR(500),
    ifrs9_stage_mapping    VARCHAR(500),
    cecl_equivalent        VARCHAR(500),
    display_order          INTEGER,
    active_flag            BOOLEAN DEFAULT TRUE,
    created_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source          VARCHAR(100),
    created_by             VARCHAR(100),
    CONSTRAINT pk_ecl_stage_dim PRIMARY KEY (ecl_stage_code)
);

-- 4. forbearance_type_dim (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l1.forbearance_type_dim (
    forbearance_type_code  VARCHAR(20) NOT NULL,
    type_name              VARCHAR(500),
    description            VARCHAR(500),
    display_order          INTEGER,
    active_flag            BOOLEAN DEFAULT TRUE,
    created_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source          VARCHAR(100),
    created_by             VARCHAR(100),
    CONSTRAINT pk_forbearance_type_dim PRIMARY KEY (forbearance_type_code)
);

-- 5. impairment_model_dim (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l1.impairment_model_dim (
    model_code             VARCHAR(20) NOT NULL,
    model_name             VARCHAR(500),
    regulatory_framework   VARCHAR(500),
    description            VARCHAR(500),
    active_flag            BOOLEAN DEFAULT TRUE,
    created_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source          VARCHAR(100),
    created_by             VARCHAR(100),
    CONSTRAINT pk_impairment_model_dim PRIMARY KEY (model_code)
);

-- 6. limit_status_dim (from 002-layer-reassignment.sql)
CREATE TABLE IF NOT EXISTS l1.limit_status_dim (
    limit_status_code      VARCHAR(20) NOT NULL,
    status_name            VARCHAR(200),
    description            VARCHAR(500),
    severity_ordinal       INTEGER,
    display_order          INTEGER,
    active_flag            BOOLEAN DEFAULT TRUE,
    CONSTRAINT pk_limit_status_dim PRIMARY KEY (limit_status_code)
);

-- 7. rating_change_status_dim (from 002-layer-reassignment.sql)
CREATE TABLE IF NOT EXISTS l1.rating_change_status_dim (
    rating_change_status_code VARCHAR(20) NOT NULL,
    status_name            VARCHAR(200),
    description            VARCHAR(500),
    direction              VARCHAR(20),
    display_order          INTEGER,
    active_flag            BOOLEAN DEFAULT TRUE,
    CONSTRAINT pk_rating_change_status_dim PRIMARY KEY (rating_change_status_code)
);

-- 8. watchlist_category_dim (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l1.watchlist_category_dim (
    watchlist_category_code VARCHAR(20) NOT NULL,
    category_name          VARCHAR(500),
    description            VARCHAR(500),
    severity_ordinal       INTEGER,
    display_order          INTEGER,
    active_flag            BOOLEAN DEFAULT TRUE,
    created_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source          VARCHAR(100),
    created_by             VARCHAR(100),
    CONSTRAINT pk_watchlist_category_dim PRIMARY KEY (watchlist_category_code)
);

-- ============================================================================
-- L1 REFERENCE TABLES — With cross-schema FKs
-- ============================================================================
SET search_path TO l1, l2, l3, public;

-- 9. equity_allocation_config (from 003-schema-changes-batch.sql)
CREATE TABLE IF NOT EXISTS l1.equity_allocation_config (
    equity_allocation_id    BIGSERIAL NOT NULL,
    managed_segment_id      BIGINT NOT NULL,
    legal_entity_id         BIGINT,
    effective_date          DATE NOT NULL,
    equity_allocation_amt   NUMERIC(20,4) NOT NULL,
    currency_code           VARCHAR(20) DEFAULT 'USD',
    active_flag             BOOLEAN DEFAULT TRUE,
    created_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_equity_allocation_config PRIMARY KEY (equity_allocation_id),
    CONSTRAINT fk_eac_segment
        FOREIGN KEY (managed_segment_id) REFERENCES l1.enterprise_business_taxonomy(managed_segment_id)
);

-- 10. capital_allocation (from 003-capital-allocation.sql)
CREATE TABLE IF NOT EXISTS l1.capital_allocation (
    node_id                  BIGINT        NOT NULL,
    node_type                VARCHAR(30)   NOT NULL,
    as_of_date               DATE          NOT NULL,
    legal_entity_id          BIGINT        NOT NULL,
    allocated_capital_amt    NUMERIC(20,4),
    capital_allocation_pct   NUMERIC(10,6),
    required_capital_pct     NUMERIC(10,6),
    allocated_equity_amt     NUMERIC(20,4),
    equity_allocation_pct    NUMERIC(10,6),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_capital_allocation
        PRIMARY KEY (node_id, node_type, as_of_date, legal_entity_id),
    CONSTRAINT fk_ca_legal_entity
        FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT chk_ca_node_type
        CHECK (node_type IN ('FACILITY','COUNTERPARTY','DESK','PORTFOLIO','SEGMENT'))
);

-- 11. regulatory_capital_requirement (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l1.regulatory_capital_requirement (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    regulatory_capital_basis_id BIGINT NOT NULL,
    min_cet1_ratio_pct          NUMERIC(10,6),
    min_tier1_ratio_pct         NUMERIC(10,6),
    min_total_capital_ratio_pct NUMERIC(10,6),
    min_leverage_ratio_pct      NUMERIC(10,6),
    min_slr_pct                 NUMERIC(10,6),
    stress_capital_buffer_pct   NUMERIC(10,6),
    gsib_surcharge_pct          NUMERIC(10,6),
    countercyclical_buffer_pct  NUMERIC(10,6),
    total_cet1_req_pct          NUMERIC(10,6),
    total_tier1_req_pct         NUMERIC(10,6),
    total_capital_req_pct       NUMERIC(10,6),
    total_leverage_req_pct      NUMERIC(10,6),
    total_slr_req_pct           NUMERIC(10,6),
    tlac_risk_based_req_pct     NUMERIC(10,6),
    tlac_leverage_req_pct       NUMERIC(10,6),
    currency_code               VARCHAR(20),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_reg_capital_req PRIMARY KEY (legal_entity_id, as_of_date, regulatory_capital_basis_id),
    CONSTRAINT fk_rcr_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_rcr_reg_basis FOREIGN KEY (regulatory_capital_basis_id) REFERENCES l1.regulatory_capital_basis_dim (regulatory_capital_basis_id),
    CONSTRAINT fk_rcr_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code)
);

-- ============================================================================
-- L2 ATOMIC TABLES (7)
-- ============================================================================

-- 12. capital_position_snapshot (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l2.capital_position_snapshot (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    currency_code               VARCHAR(20),
    cet1_ratio_pct              NUMERIC(10,6),
    tier1_ratio_pct             NUMERIC(10,6),
    total_capital_ratio_pct     NUMERIC(10,6),
    tier1_leverage_ratio_pct    NUMERIC(10,6),
    leverage_ratio_pct          NUMERIC(10,6),
    tlac_ratio_pct              NUMERIC(10,6),
    slr_pct                     NUMERIC(10,6),
    tier1_capital_amt           NUMERIC(20,4),
    cet1_capital_amt            NUMERIC(20,4),
    total_capital_amt           NUMERIC(20,4),
    rwa_amt                     NUMERIC(20,4),
    total_assets_leverage_amt   NUMERIC(20,4),
    total_leverage_exposure_amt NUMERIC(20,4),
    tlac_amt                    NUMERIC(20,4),
    rwa_std_amt                 NUMERIC(20,4),
    rwa_erba_amt                NUMERIC(20,4),
    source_filing_code          VARCHAR(30),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_capital_position_snapshot PRIMARY KEY (legal_entity_id, as_of_date),
    CONSTRAINT fk_cps_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_cps_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code)
);

-- 13. ecl_staging_snapshot (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l2.ecl_staging_snapshot (
    ecl_staging_id            BIGSERIAL NOT NULL,
    facility_id               BIGINT,
    counterparty_id           BIGINT,
    as_of_date                DATE,
    ecl_stage_code            VARCHAR(20),
    prior_stage_code          VARCHAR(20),
    stage_change_date         DATE,
    stage_change_reason       VARCHAR(500),
    model_code                VARCHAR(20),
    days_past_due             INTEGER,
    significant_increase_flag BOOLEAN,
    credit_impaired_flag      BOOLEAN,
    currency_code             VARCHAR(20),
    created_ts                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source             VARCHAR(100),
    created_by                VARCHAR(100),
    CONSTRAINT pk_ecl_staging_snapshot PRIMARY KEY (ecl_staging_id)
);

-- 14. forbearance_event (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l2.forbearance_event (
    forbearance_event_id      BIGSERIAL NOT NULL,
    facility_id               BIGINT,
    counterparty_id           BIGINT,
    forbearance_type_code     VARCHAR(20),
    event_date                DATE,
    original_maturity_date    DATE,
    modified_maturity_date    DATE,
    original_rate_pct         NUMERIC(10,6),
    modified_rate_pct         NUMERIC(10,6),
    maturity_extension_months INTEGER,
    principal_forgiven_amt    NUMERIC(20,4),
    currency_code             VARCHAR(20),
    approval_date             DATE,
    approved_by               VARCHAR(500),
    as_of_date                DATE,
    created_ts                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source             VARCHAR(100),
    created_by                VARCHAR(100),
    CONSTRAINT pk_forbearance_event PRIMARY KEY (forbearance_event_id)
);

-- 15. gl_account_balance_snapshot (from 02-l2-ddl.sql)
CREATE TABLE IF NOT EXISTS l2.gl_account_balance_snapshot (
    ledger_account_id        BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    begin_balance_dr_amt     NUMERIC(20,4),
    begin_balance_cr_amt     NUMERIC(20,4),
    period_activity_dr_amt   NUMERIC(20,4),
    period_activity_cr_amt   NUMERIC(20,4),
    ending_balance_dr_amt    NUMERIC(20,4),
    ending_balance_cr_amt    NUMERIC(20,4),
    currency_code            VARCHAR(30),
    reporting_currency_amt   NUMERIC(20,4),
    lob_segment_id           BIGINT,
    org_unit_id              BIGINT,
    source_system_id         BIGINT,
    created_ts               TIMESTAMP,
    updated_ts               TIMESTAMP,
    CONSTRAINT pk_gl_acct_balance_snapshot PRIMARY KEY (ledger_account_id, as_of_date)
);

-- 16. gl_journal_entry (from 02-l2-ddl.sql)
CREATE TABLE IF NOT EXISTS l2.gl_journal_entry (
    journal_entry_id          BIGINT NOT NULL,
    journal_batch_id          BIGINT,
    ledger_account_id         BIGINT,
    transaction_date          DATE,
    posting_date              DATE,
    transaction_code          VARCHAR(30),
    transaction_desc          VARCHAR(500),
    dr_cr_indicator           VARCHAR(30),
    transaction_amt           NUMERIC(20,4),
    transaction_currency_code VARCHAR(30),
    reporting_currency_amt    NUMERIC(20,4),
    position_id               BIGINT,
    counterparty_id           BIGINT,
    facility_id               BIGINT,
    product_code              VARCHAR(30),
    lob_segment_id            BIGINT,
    org_unit_id               BIGINT,
    source_system_id          BIGINT,
    created_ts                TIMESTAMP,
    updated_ts                TIMESTAMP,
    CONSTRAINT pk_gl_journal_entry PRIMARY KEY (journal_entry_id)
);

-- 17. limit_assignment_snapshot (from 02-l2-ddl.sql)
CREATE TABLE IF NOT EXISTS l2.limit_assignment_snapshot (
    facility_id              BIGINT NOT NULL,
    limit_rule_id            BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    limit_amt                NUMERIC(20,4),
    assigned_date            DATE,
    expiry_date              DATE,
    status_code              VARCHAR(20),
    currency_code            VARCHAR(20),
    created_ts               TIMESTAMP,
    updated_ts               TIMESTAMP,
    CONSTRAINT pk_limit_assignment_snapshot PRIMARY KEY (facility_id, limit_rule_id, as_of_date)
);

-- 18. watchlist_entry (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l2.watchlist_entry (
    watchlist_entry_id       BIGSERIAL NOT NULL,
    counterparty_id          BIGINT,
    facility_id              BIGINT,
    watchlist_category_code  VARCHAR(20),
    entry_date               DATE,
    exit_date                DATE,
    entry_reason             VARCHAR(500),
    exit_reason              VARCHAR(500),
    assigned_officer         VARCHAR(500),
    review_frequency         VARCHAR(500),
    next_review_date         DATE,
    as_of_date               DATE,
    is_current_flag          BOOLEAN DEFAULT TRUE,
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source            VARCHAR(100),
    created_by               VARCHAR(100),
    CONSTRAINT pk_watchlist_entry PRIMARY KEY (watchlist_entry_id)
);

-- ============================================================================
-- L3 DERIVED TABLES (19)
-- ============================================================================

-- 19. capital_binding_constraint (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.capital_binding_constraint (
    legal_entity_id             BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    cet1_binding_amt            NUMERIC(20,4),
    tier1_binding_amt           NUMERIC(20,4),
    total_capital_binding_amt   NUMERIC(20,4),
    tier1_leverage_binding_amt  NUMERIC(20,4),
    leverage_binding_amt        NUMERIC(20,4),
    slr_binding_amt             NUMERIC(20,4),
    tlac_binding_amt            NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    most_binding_ratio_pct      NUMERIC(10,6),
    most_binding_denominator    VARCHAR(30),
    binding_rwa_approach        VARCHAR(10),
    cet1_buffer_pct             NUMERIC(10,6),
    tier1_buffer_pct            NUMERIC(10,6),
    total_capital_buffer_pct    NUMERIC(10,6),
    tier1_leverage_buffer_pct   NUMERIC(10,6),
    leverage_buffer_pct         NUMERIC(10,6),
    slr_buffer_pct              NUMERIC(10,6),
    tlac_buffer_pct             NUMERIC(10,6),
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_capital_binding_constraint PRIMARY KEY (legal_entity_id, as_of_date),
    CONSTRAINT fk_cbc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 20. cash_flow_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.cash_flow_calc (
    cash_flow_id             BIGINT NOT NULL,
    contractual_amt          NUMERIC(20,4),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_cash_flow_calc PRIMARY KEY (cash_flow_id)
);

-- 21. collateral_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.collateral_calc (
    collateral_asset_id      BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    allocated_amount_usd     NUMERIC(20,4),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_collateral_calc PRIMARY KEY (collateral_asset_id, as_of_date)
);

-- 22. counterparty_capital_consumption (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.counterparty_capital_consumption (
    counterparty_id              BIGINT NOT NULL,
    as_of_date                   DATE NOT NULL,
    legal_entity_id              BIGINT NOT NULL,
    exposure_count               INTEGER,
    total_exposure_amt           NUMERIC(20,4),
    rwa_std_amt                  NUMERIC(20,4),
    rwa_erba_amt                 NUMERIC(20,4),
    rwa_binding_amt              NUMERIC(20,4),
    rwa_density_pct              NUMERIC(10,6),
    capital_consumption_amt      NUMERIC(20,4),
    capital_consumption_std_amt  NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt            NUMERIC(20,4),
    most_binding_constraint      VARCHAR(30),
    created_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_cp_capital_consumption PRIMARY KEY (counterparty_id, as_of_date, legal_entity_id),
    CONSTRAINT fk_cpcc_counterparty FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty (counterparty_id),
    CONSTRAINT fk_cpcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 23. counterparty_rating_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.counterparty_rating_calc (
    counterparty_id           BIGINT NOT NULL,
    as_of_date                DATE NOT NULL,
    rating_type               VARCHAR(30),
    risk_rating_change_steps  INTEGER,
    rating_change_status_code VARCHAR(20),
    created_ts                TIMESTAMP,
    CONSTRAINT pk_counterparty_rating_calc PRIMARY KEY (counterparty_id, as_of_date, rating_type)
);

-- 24. data_quality_score_snapshot (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.data_quality_score_snapshot (
    table_name               VARCHAR(100) NOT NULL,
    as_of_date               DATE NOT NULL,
    completeness_score_pct   NUMERIC(10,6),
    accuracy_score_pct       NUMERIC(10,6),
    timeliness_score_pct     NUMERIC(10,6),
    overall_dq_score_pct     NUMERIC(10,6),
    total_row_count          INTEGER,
    null_field_count         INTEGER,
    anomaly_count            INTEGER,
    created_ts               TIMESTAMP,
    CONSTRAINT pk_dq_score_snapshot PRIMARY KEY (table_name, as_of_date)
);

-- 25. desk_capital_consumption (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.desk_capital_consumption (
    org_unit_id                  BIGINT NOT NULL,
    as_of_date                   DATE NOT NULL,
    legal_entity_id              BIGINT NOT NULL,
    exposure_count               INTEGER,
    total_exposure_amt           NUMERIC(20,4),
    rwa_std_amt                  NUMERIC(20,4),
    rwa_erba_amt                 NUMERIC(20,4),
    rwa_binding_amt              NUMERIC(20,4),
    rwa_density_pct              NUMERIC(10,6),
    capital_consumption_amt      NUMERIC(20,4),
    capital_consumption_std_amt  NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt            NUMERIC(20,4),
    most_binding_constraint      VARCHAR(30),
    created_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_desk_capital_consumption PRIMARY KEY (org_unit_id, as_of_date, legal_entity_id),
    CONSTRAINT fk_dcc_org_unit FOREIGN KEY (org_unit_id) REFERENCES l1.org_unit_dim (org_unit_id),
    CONSTRAINT fk_dcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id)
);

-- 26. ecl_allowance_movement (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l3.ecl_allowance_movement (
    allowance_movement_id    BIGSERIAL NOT NULL,
    legal_entity_id          BIGINT,
    as_of_date               DATE,
    ecl_stage_code           VARCHAR(20),
    opening_balance_amt      NUMERIC(20,4),
    provision_charge_amt     NUMERIC(20,4),
    write_off_amt            NUMERIC(20,4),
    recovery_amt             NUMERIC(20,4),
    fx_adjustment_amt        NUMERIC(20,4),
    stage_transfer_amt       NUMERIC(20,4),
    closing_balance_amt      NUMERIC(20,4),
    currency_code            VARCHAR(20),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source            VARCHAR(100),
    created_by               VARCHAR(100),
    CONSTRAINT pk_ecl_allowance_movement PRIMARY KEY (allowance_movement_id)
);

-- 27. ecl_provision_calc (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l3.ecl_provision_calc (
    ecl_provision_id         BIGSERIAL NOT NULL,
    facility_id              BIGINT,
    counterparty_id          BIGINT,
    as_of_date               DATE,
    ecl_stage_code           VARCHAR(20),
    twelve_month_ecl_amt     NUMERIC(20,4),
    lifetime_ecl_amt         NUMERIC(20,4),
    provision_amt            NUMERIC(20,4),
    lifetime_pd_pct          NUMERIC(10,6),
    twelve_month_pd_pct      NUMERIC(10,6),
    lgd_pct                  NUMERIC(10,6),
    ead_amt                  NUMERIC(20,4),
    stage_transfer_flag      BOOLEAN,
    model_code               VARCHAR(20),
    currency_code            VARCHAR(20),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source            VARCHAR(100),
    created_by               VARCHAR(100),
    CONSTRAINT pk_ecl_provision_calc PRIMARY KEY (ecl_provision_id)
);

-- 28. facility_capital_consumption (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.facility_capital_consumption (
    facility_id                 BIGINT NOT NULL,
    as_of_date                  DATE NOT NULL,
    legal_entity_id             BIGINT,
    counterparty_id             BIGINT,
    min_capital_std_amt         NUMERIC(20,4),
    min_capital_erba_amt        NUMERIC(20,4),
    min_capital_delta_amt       NUMERIC(20,4),
    capital_consumption_amt     NUMERIC(20,4),
    rwa_binding_amt             NUMERIC(20,4),
    most_binding_constraint     VARCHAR(30),
    basel_exposure_type_id      BIGINT,
    created_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_facility_capital_consumption PRIMARY KEY (facility_id, as_of_date),
    CONSTRAINT fk_fcc_facility FOREIGN KEY (facility_id) REFERENCES l2.facility_master (facility_id),
    CONSTRAINT fk_fcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_fcc_counterparty FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty (counterparty_id),
    CONSTRAINT fk_fcc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-- 29. facility_exposure_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.facility_exposure_calc (
    facility_id              BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    number_of_loans          INTEGER,
    number_of_facilities     INTEGER,
    days_until_maturity      INTEGER,
    rwa_amt                  NUMERIC(20,4),
    utilization_status_code  VARCHAR(20),
    risk_rating_tier_code    VARCHAR(20),
    limit_status_code        VARCHAR(20),
    coverage_ratio_pct       NUMERIC(10,6),
    utilization_pct          NUMERIC(10,6),
    undrawn_amt              NUMERIC(20,4),
    net_exposure_amt         NUMERIC(20,4),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_facility_exposure_calc PRIMARY KEY (facility_id, as_of_date)
);

-- 30. facility_financial_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.facility_financial_calc (
    facility_id                    BIGINT NOT NULL,
    as_of_date                     DATE NOT NULL,
    dscr_value                     NUMERIC(12,6),
    dscr                           NUMERIC(10,6),
    ltv_pct                        NUMERIC(10,6),
    net_income_amt                 NUMERIC(20,4),
    total_debt_service_amt         NUMERIC(20,4),
    revenue_amt                    NUMERIC(20,4),
    interest_expense_amt           NUMERIC(20,4),
    interest_income_amt            NUMERIC(20,4),
    avg_earning_assets_amt         NUMERIC(20,4),
    fee_rate_pct                   NUMERIC(10,6),
    interest_rate_sensitivity_pct  NUMERIC(10,6),
    interest_coverage_ratio        NUMERIC(10,6),
    debt_yield_pct                 NUMERIC(10,6),
    created_ts                     TIMESTAMP,
    CONSTRAINT pk_facility_financial_calc PRIMARY KEY (facility_id, as_of_date)
);

-- 31. facility_pricing_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.facility_pricing_calc (
    facility_id              BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    pricing_exception_flag   BOOLEAN,
    pricing_tier_code        VARCHAR(20),
    fee_rate_pct             NUMERIC(10,6),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_facility_pricing_calc PRIMARY KEY (facility_id, as_of_date)
);

-- 32. facility_rwa_calc (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.facility_rwa_calc (
    facility_id              BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    rwa_std_amt              NUMERIC(20,4),
    rwa_erba_amt             NUMERIC(20,4),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_facility_rwa_calc PRIMARY KEY (facility_id, as_of_date),
    CONSTRAINT fk_frc_facility FOREIGN KEY (facility_id) REFERENCES l2.facility_master (facility_id)
);

-- 33. gl_account_balance_calc (from 004-missing-l3-overlay-tables.sql)
CREATE TABLE IF NOT EXISTS l3.gl_account_balance_calc (
    ledger_account_id        BIGINT NOT NULL,
    as_of_date               DATE NOT NULL,
    ending_balance_net_amt   NUMERIC(20,4),
    period_net_activity_amt  NUMERIC(20,4),
    balance_change_pct       NUMERIC(10,6),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_gl_acct_balance_calc PRIMARY KEY (ledger_account_id, as_of_date)
);

-- 34. portfolio_capital_consumption (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.portfolio_capital_consumption (
    portfolio_id                 BIGINT NOT NULL,
    as_of_date                   DATE NOT NULL,
    legal_entity_id              BIGINT NOT NULL,
    basel_exposure_type_id       BIGINT NOT NULL,
    exposure_count               INTEGER,
    total_exposure_amt           NUMERIC(20,4),
    rwa_std_amt                  NUMERIC(20,4),
    rwa_erba_amt                 NUMERIC(20,4),
    rwa_density_pct              NUMERIC(10,6),
    capital_consumption_amt      NUMERIC(20,4),
    capital_consumption_std_amt  NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt            NUMERIC(20,4),
    most_binding_constraint      VARCHAR(30),
    created_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_portfolio_capital_consumption PRIMARY KEY (portfolio_id, as_of_date, legal_entity_id, basel_exposure_type_id),
    CONSTRAINT fk_pcc_portfolio FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim (portfolio_id),
    CONSTRAINT fk_pcc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_pcc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-- 35. segment_capital_consumption (from 002-capital-metrics.sql)
CREATE TABLE IF NOT EXISTS l3.segment_capital_consumption (
    lob_segment_id               BIGINT NOT NULL,
    as_of_date                   DATE NOT NULL,
    legal_entity_id              BIGINT NOT NULL,
    basel_exposure_type_id       BIGINT NOT NULL,
    exposure_count               INTEGER,
    total_exposure_amt           NUMERIC(20,4),
    rwa_std_amt                  NUMERIC(20,4),
    rwa_erba_amt                 NUMERIC(20,4),
    rwa_density_pct              NUMERIC(10,6),
    capital_consumption_amt      NUMERIC(20,4),
    capital_consumption_std_amt  NUMERIC(20,4),
    capital_consumption_erba_amt NUMERIC(20,4),
    capital_delta_amt            NUMERIC(20,4),
    most_binding_constraint      VARCHAR(30),
    created_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_segment_capital_consumption PRIMARY KEY (lob_segment_id, as_of_date, legal_entity_id, basel_exposure_type_id),
    CONSTRAINT fk_scc_lob_segment FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy (managed_segment_id),
    CONSTRAINT fk_scc_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT fk_scc_basel_exp_type FOREIGN KEY (basel_exposure_type_id) REFERENCES l1.basel_exposure_type_dim (basel_exposure_type_id)
);

-- 36. stress_test_result (from 004-missing-l3-overlay-tables.sql — L3 version)
CREATE TABLE IF NOT EXISTS l3.stress_test_result (
    stress_test_result_id    BIGSERIAL NOT NULL,
    position_id              BIGINT,
    facility_id              BIGINT,
    counterparty_id          BIGINT,
    scenario_id              BIGINT,
    as_of_date               DATE,
    stressed_exposure_amt    NUMERIC(20,4),
    stressed_expected_loss   NUMERIC(20,4),
    capital_impact_pct       NUMERIC(10,6),
    currency_code            VARCHAR(30),
    created_ts               TIMESTAMP,
    CONSTRAINT pk_stress_test_result PRIMARY KEY (stress_test_result_id)
);

-- 37. watchlist_movement_summary (from 009-regulatory-coverage-gaps.sql)
CREATE TABLE IF NOT EXISTS l3.watchlist_movement_summary (
    movement_summary_id      BIGSERIAL NOT NULL,
    as_of_date               DATE,
    watchlist_category_code  VARCHAR(20),
    legal_entity_id          BIGINT,
    entry_count              INTEGER,
    exit_count               INTEGER,
    net_change               INTEGER,
    total_exposure_amt       NUMERIC(20,4),
    total_facilities_count   INTEGER,
    currency_code            VARCHAR(20),
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_source            VARCHAR(100),
    created_by               VARCHAR(100),
    CONSTRAINT pk_watchlist_movement_summary PRIMARY KEY (movement_summary_id)
);

RESET search_path;

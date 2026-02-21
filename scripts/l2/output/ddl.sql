-- L2 Schema DDL — DSCR Engine snapshot/observation tables.
-- Run after scripts/l1/output/ddl.sql. PostgreSQL 15+.
-- All L2 tables reference L1 (counterparty, facility_master, etc.) in same path.

SET search_path TO l1, l2, public;

CREATE SCHEMA IF NOT EXISTS l2;

-- ============================================================================
-- L2: counterparty_financial_line_item (FK → counterparty_financial_statement, counterparty, currency_dim)
-- ============================================================================
CREATE TABLE l2.counterparty_financial_line_item (
  line_item_id                BIGINT          NOT NULL,
  financial_statement_id      BIGINT          NOT NULL,
  counterparty_id             BIGINT          NOT NULL,
  line_item_code              VARCHAR(50)     NOT NULL,
  line_item_name              VARCHAR(200)    NOT NULL,
  line_item_category          VARCHAR(30)     NOT NULL,
  line_item_subcategory       VARCHAR(50),
  reported_amount             NUMERIC(18,2),
  adjusted_amount             NUMERIC(18,2),
  adjustment_amount           NUMERIC(18,2),
  adjustment_reason           VARCHAR(4000),
  adjustment_approved_by      VARCHAR(100),
  adjustment_approved_ts      TIMESTAMP,
  annualized_amount           NUMERIC(18,2),
  is_annualized_flag          CHAR(1)         NOT NULL DEFAULT 'N',
  currency_code               VARCHAR(20)     NOT NULL,
  currency_amount_usd         NUMERIC(18,2),
  fx_rate_used                NUMERIC(18,8),
  period_start_date           DATE            NOT NULL,
  period_end_date             DATE            NOT NULL,
  period_months               SMALLINT        NOT NULL DEFAULT 12,
  source_system_id            BIGINT,
  source_record_id            BIGINT,
  data_quality_flag           VARCHAR(20)     NOT NULL DEFAULT 'CLEAN',
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_cpty_fin_line_item PRIMARY KEY (line_item_id, as_of_date),
  CONSTRAINT fk_cpty_line_stmt FOREIGN KEY (financial_statement_id) REFERENCES l1.counterparty_financial_statement (financial_statement_id),
  CONSTRAINT fk_cpty_line_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT fk_cpty_line_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code),
  CONSTRAINT ck_line_category CHECK (line_item_category IN ('INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW_STATEMENT', 'ADDBACK', 'ADJUSTMENT', 'DERIVED', 'SUPPLEMENTAL')),
  CONSTRAINT ck_line_annualized CHECK (is_annualized_flag IN ('Y', 'N')),
  CONSTRAINT ck_line_dq_flag CHECK (data_quality_flag IN ('CLEAN', 'ESTIMATED', 'INTERPOLATED', 'MANUAL_OVERRIDE', 'STALE', 'UNVERIFIED', 'FLAGGED'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.counterparty_financial_line_item_default PARTITION OF l2.counterparty_financial_line_item DEFAULT;
CREATE INDEX IF NOT EXISTS ix_cpty_line_cpty_code_period ON l2.counterparty_financial_line_item (counterparty_id, line_item_code, period_end_date DESC, as_of_date);
CREATE INDEX IF NOT EXISTS ix_cpty_line_stmt ON l2.counterparty_financial_line_item (financial_statement_id, as_of_date);

-- ============================================================================
-- L2: property_income_snapshot (FK → collateral_asset_master, facility_master, counterparty, currency_dim)
-- ============================================================================
CREATE TABLE l2.property_income_snapshot (
  property_income_id          BIGINT          NOT NULL,
  collateral_asset_id         BIGINT          NOT NULL,
  facility_id                 BIGINT,
  counterparty_id             BIGINT          NOT NULL,
  property_type               VARCHAR(30)     NOT NULL,
  property_subtype            VARCHAR(50),
  income_basis                VARCHAR(20)     NOT NULL,
  gross_potential_rent        NUMERIC(18,2),
  loss_to_lease_amt           NUMERIC(18,2),
  concessions_amt             NUMERIC(18,2),
  other_income                NUMERIC(18,2),
  other_income_detail         VARCHAR(2000),
  percentage_rent             NUMERIC(18,2),
  vacancy_pct                 NUMERIC(10,4),
  credit_loss_pct             NUMERIC(10,4),
  vacancy_credit_loss_amt     NUMERIC(18,2),
  effective_gross_income      NUMERIC(18,2),
  real_estate_taxes           NUMERIC(18,2),
  insurance_expense           NUMERIC(18,2),
  management_fee              NUMERIC(18,2),
  management_fee_pct          NUMERIC(10,4),
  is_management_fee_imputed   CHAR(1)         NOT NULL DEFAULT 'N',
  repairs_maintenance         NUMERIC(18,2),
  utilities_expense           NUMERIC(18,2),
  general_admin_expense       NUMERIC(18,2),
  other_operating_expense     NUMERIC(18,2),
  total_operating_expenses    NUMERIC(18,2),
  operating_expense_ratio     NUMERIC(10,4),
  net_operating_income        NUMERIC(18,2),
  replacement_reserves        NUMERIC(18,2),
  replacement_reserve_per_unit NUMERIC(10,2),
  ti_lc_reserves              NUMERIC(18,2),
  ti_lc_per_sf                NUMERIC(10,2),
  ground_lease_payment         NUMERIC(18,2),
  ffe_reserve                 NUMERIC(18,2),
  ffe_reserve_pct             NUMERIC(10,4),
  other_below_line            NUMERIC(18,2),
  net_cash_flow               NUMERIC(18,2),
  occupancy_pct               NUMERIC(10,4),
  number_of_units             INTEGER,
  total_sf                    INTEGER,
  avg_rent_per_unit           NUMERIC(18,2),
  avg_rent_per_sf             NUMERIC(18,2),
  weighted_avg_lease_term_yrs NUMERIC(6,2),
  largest_tenant_pct          NUMERIC(10,4),
  lease_rollover_12m_pct      NUMERIC(10,4),
  lease_rollover_24m_pct      NUMERIC(10,4),
  appraised_value             NUMERIC(18,2),
  appraisal_date              DATE,
  cap_rate_applied            NUMERIC(10,4),
  income_source               VARCHAR(50),
  currency_code               VARCHAR(20)     NOT NULL,
  period_start_date           DATE,
  period_end_date             DATE            NOT NULL,
  source_system_id            BIGINT,
  data_quality_flag           VARCHAR(20)     NOT NULL DEFAULT 'CLEAN',
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_prop_income PRIMARY KEY (property_income_id, as_of_date),
  CONSTRAINT fk_prop_income_collateral FOREIGN KEY (collateral_asset_id) REFERENCES l1.collateral_asset_master (collateral_asset_id),
  CONSTRAINT fk_prop_income_facility FOREIGN KEY (facility_id) REFERENCES l1.facility_master (facility_id),
  CONSTRAINT fk_prop_income_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT fk_prop_income_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code),
  CONSTRAINT ck_prop_type CHECK (property_type IN ('MULTIFAMILY', 'OFFICE', 'RETAIL', 'INDUSTRIAL', 'HOTEL', 'HEALTHCARE', 'SELF_STORAGE', 'MIXED_USE', 'LAND', 'MANUFACTURED_HOUSING', 'STUDENT_HOUSING', 'SENIOR_LIVING', 'DATA_CENTER', 'LIFE_SCIENCE', 'OTHER')),
  CONSTRAINT ck_prop_basis CHECK (income_basis IN ('INPLACE', 'STABILIZED', 'PROFORMA', 'STRESSED', 'DARK_VALUE', 'APPRAISER', 'UNDERWRITTEN')),
  CONSTRAINT ck_prop_mgmt_imputed CHECK (is_management_fee_imputed IN ('Y', 'N')),
  CONSTRAINT ck_prop_income_source CHECK (income_source IS NULL OR income_source IN ('RENT_ROLL', 'OPERATING_STATEMENT', 'APPRAISAL', 'BORROWER_BUDGET', 'BANK_UNDERWRITTEN', 'THIRD_PARTY_REPORT')),
  CONSTRAINT ck_prop_dq_flag CHECK (data_quality_flag IN ('CLEAN', 'ESTIMATED', 'INTERPOLATED', 'MANUAL_OVERRIDE', 'STALE', 'UNVERIFIED', 'FLAGGED'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.property_income_snapshot_default PARTITION OF l2.property_income_snapshot DEFAULT;
CREATE INDEX IF NOT EXISTS ix_prop_income_collateral_basis ON l2.property_income_snapshot (collateral_asset_id, income_basis, period_end_date DESC, as_of_date);
CREATE INDEX IF NOT EXISTS ix_prop_income_facility ON l2.property_income_snapshot (facility_id, as_of_date) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_prop_income_cpty ON l2.property_income_snapshot (counterparty_id, as_of_date);

-- ============================================================================
-- L2: counterparty_debt_schedule (FK → counterparty, facility_master, credit_agreement_master, currency_dim)
-- ============================================================================
CREATE TABLE l2.counterparty_debt_schedule (
  debt_item_id                BIGINT          NOT NULL,
  counterparty_id             BIGINT          NOT NULL,
  facility_id                 BIGINT,
  credit_agreement_id         BIGINT,
  debt_type                   VARCHAR(30)     NOT NULL,
  debt_subtype                VARCHAR(50),
  lender_name                 VARCHAR(200),
  lender_counterparty_id      BIGINT,
  is_bank_facility_flag       CHAR(1)         NOT NULL DEFAULT 'N',
  seniority_rank              SMALLINT,
  seniority_class             VARCHAR(30),
  original_amount             NUMERIC(18,2),
  outstanding_balance         NUMERIC(18,2),
  committed_amount            NUMERIC(18,2),
  undrawn_amount              NUMERIC(18,2),
  interest_rate_pct           NUMERIC(10,6),
  rate_type                   VARCHAR(20),
  rate_index_code             VARCHAR(30),
  rate_spread_bps             NUMERIC(8,2),
  rate_floor_pct              NUMERIC(10,4),
  rate_cap_pct                NUMERIC(10,4),
  is_hedged_flag              CHAR(1)         NOT NULL DEFAULT 'N',
  hedged_rate_pct             NUMERIC(10,6),
  annual_interest             NUMERIC(18,2),
  annual_principal            NUMERIC(18,2),
  annual_debt_service         NUMERIC(18,2),
  monthly_payment             NUMERIC(18,2),
  payment_frequency           VARCHAR(20),
  amortization_type           VARCHAR(30),
  amortization_term_months    INTEGER,
  remaining_term_months        INTEGER,
  io_period_end_date          DATE,
  origination_date            DATE,
  maturity_date               DATE,
  is_pik_flag                 CHAR(1)         NOT NULL DEFAULT 'N',
  pik_rate_pct                NUMERIC(10,4),
  is_cross_defaulted_flag     CHAR(1)         NOT NULL DEFAULT 'N',
  is_cross_collateralized_flag CHAR(1)        NOT NULL DEFAULT 'N',
  collateral_description      VARCHAR(2000),
  currency_code               VARCHAR(20)     NOT NULL,
  amount_usd                  NUMERIC(18,2),
  fx_rate_used                NUMERIC(18,8),
  data_source                 VARCHAR(50)     NOT NULL,
  source_system_id            BIGINT,
  data_quality_flag           VARCHAR(20)     NOT NULL DEFAULT 'CLEAN',
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_cpty_debt PRIMARY KEY (debt_item_id, as_of_date),
  CONSTRAINT fk_cpty_debt_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT fk_cpty_debt_facility FOREIGN KEY (facility_id) REFERENCES l1.facility_master (facility_id),
  CONSTRAINT fk_cpty_debt_agreement FOREIGN KEY (credit_agreement_id) REFERENCES l1.credit_agreement_master (credit_agreement_id),
  CONSTRAINT fk_cpty_debt_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code),
  CONSTRAINT ck_debt_type CHECK (debt_type IN ('SENIOR_TERM', 'SENIOR_REVOLVER', 'SENIOR_LOC', 'SENIOR_MORTGAGE', 'MEZZANINE', 'SUBORDINATED', 'SECOND_LIEN', 'CAPITAL_LEASE', 'OPERATING_LEASE', 'FINANCE_LEASE', 'PREFERRED_EQUITY', 'SELLER_NOTE', 'EARNOUT', 'GROUND_LEASE', 'EQUIPMENT_FINANCE', 'BOND', 'NOTE_PAYABLE', 'RELATED_PARTY_LOAN', 'PIK_NOTE', 'CONVERTIBLE', 'OTHER')),
  CONSTRAINT ck_debt_seniority CHECK (seniority_class IS NULL OR seniority_class IN ('SUPER_SENIOR', 'SENIOR_SECURED', 'SENIOR_UNSECURED', 'SECOND_LIEN', 'MEZZANINE', 'SUBORDINATED', 'JUNIOR', 'EQUITY_LIKE')),
  CONSTRAINT ck_debt_rate_type CHECK (rate_type IS NULL OR rate_type IN ('FIXED', 'FLOATING', 'VARIABLE', 'HYBRID', 'STEP_UP', 'PIK', 'ZERO')),
  CONSTRAINT ck_debt_amort CHECK (amortization_type IS NULL OR amortization_type IN ('AMORTIZING', 'INTEREST_ONLY', 'BULLET', 'BALLOON', 'REVOLVING', 'STEP_UP', 'CUSTOM')),
  CONSTRAINT ck_debt_bank CHECK (is_bank_facility_flag IN ('Y', 'N')),
  CONSTRAINT ck_debt_hedged CHECK (is_hedged_flag IN ('Y', 'N')),
  CONSTRAINT ck_debt_pik CHECK (is_pik_flag IN ('Y', 'N')),
  CONSTRAINT ck_debt_cross_default CHECK (is_cross_defaulted_flag IN ('Y', 'N')),
  CONSTRAINT ck_debt_cross_collat CHECK (is_cross_collateralized_flag IN ('Y', 'N')),
  CONSTRAINT ck_debt_payment_freq CHECK (payment_frequency IS NULL OR payment_frequency IN ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AT_MATURITY', 'IRREGULAR')),
  CONSTRAINT ck_debt_data_source CHECK (data_source IN ('BORROWER_FINANCIAL_STATEMENT', 'BORROWER_CERTIFICATION', 'CREDIT_BUREAU', 'INTERNAL_SYSTEM', 'LOAN_AGREEMENT', 'INTERCREDITOR_AGREEMENT', 'MANUAL_ENTRY', 'THIRD_PARTY_REPORT')),
  CONSTRAINT ck_debt_dq_flag CHECK (data_quality_flag IN ('CLEAN', 'ESTIMATED', 'INTERPOLATED', 'MANUAL_OVERRIDE', 'STALE', 'UNVERIFIED', 'FLAGGED'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.counterparty_debt_schedule_default PARTITION OF l2.counterparty_debt_schedule DEFAULT;
CREATE INDEX IF NOT EXISTS ix_cpty_debt_cpty_type ON l2.counterparty_debt_schedule (counterparty_id, debt_type, as_of_date);
CREATE INDEX IF NOT EXISTS ix_cpty_debt_facility ON l2.counterparty_debt_schedule (facility_id, as_of_date) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_cpty_debt_bank_flag ON l2.counterparty_debt_schedule (counterparty_id, is_bank_facility_flag, as_of_date);

-- ============================================================================
-- L2: dscr_calculation_result (FK → dscr_variant_definition, scenario_dim, context_dim, facility_master, counterparty, collateral_asset_master, portfolio_dim, currency_dim, dscr_rollup_recipe, counterparty_financial_statement)
-- ============================================================================
CREATE TABLE l2.dscr_calculation_result (
  calculation_id              BIGINT          NOT NULL,
  variant_id                  BIGINT          NOT NULL,
  scenario_id                 BIGINT,
  context_id                  BIGINT,
  run_version_id              BIGINT,
  entity_type                 VARCHAR(30)     NOT NULL,
  facility_id                 BIGINT,
  counterparty_id             BIGINT,
  collateral_asset_id         BIGINT,
  portfolio_id                BIGINT,
  lob_segment_id              BIGINT,
  credit_agreement_id         BIGINT,
  numerator_value             NUMERIC(18,2)   NOT NULL,
  denominator_value           NUMERIC(18,2)   NOT NULL,
  dscr_value                  NUMERIC(10,4)   NOT NULL,
  threshold_status            VARCHAR(20),
  applicable_threshold        NUMERIC(10,4),
  threshold_delta             NUMERIC(10,4),
  prior_period_dscr           NUMERIC(10,4),
  period_over_period_delta    NUMERIC(10,4),
  rollup_recipe_id            BIGINT,
  rollup_override_id          BIGINT,
  is_recomputed_flag          CHAR(1)         NOT NULL DEFAULT 'N',
  recomputation_method         VARCHAR(30),
  financial_statement_id      BIGINT,
  data_as_of_date             DATE            NOT NULL,
  financials_period_end_date  DATE,
  financials_staleness_days   INTEGER,
  calculation_date            TIMESTAMP       NOT NULL,
  calculated_by               VARCHAR(100)    NOT NULL,
  calculation_source          VARCHAR(30)     NOT NULL DEFAULT 'ENGINE',
  approved_by                 VARCHAR(100),
  approved_ts                 TIMESTAMP,
  approval_status             VARCHAR(20)     NOT NULL DEFAULT 'AUTO_APPROVED',
  is_override_flag            CHAR(1)         NOT NULL DEFAULT 'N',
  override_reason             VARCHAR(4000),
  data_quality_flag           VARCHAR(20)     NOT NULL DEFAULT 'CLEAN',
  currency_code               VARCHAR(20)     NOT NULL,
  numerator_value_usd         NUMERIC(18,2),
  denominator_value_usd       NUMERIC(18,2),
  fx_rate_used                NUMERIC(18,8),
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_dscr_calc_result PRIMARY KEY (calculation_id, as_of_date),
  CONSTRAINT fk_dscr_calc_variant FOREIGN KEY (variant_id) REFERENCES l1.dscr_variant_definition (variant_id),
  CONSTRAINT fk_dscr_calc_scenario FOREIGN KEY (scenario_id) REFERENCES l1.scenario_dim (scenario_id),
  CONSTRAINT fk_dscr_calc_context FOREIGN KEY (context_id) REFERENCES l1.context_dim (context_id),
  CONSTRAINT fk_dscr_calc_facility FOREIGN KEY (facility_id) REFERENCES l1.facility_master (facility_id),
  CONSTRAINT fk_dscr_calc_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT fk_dscr_calc_collateral FOREIGN KEY (collateral_asset_id) REFERENCES l1.collateral_asset_master (collateral_asset_id),
  CONSTRAINT fk_dscr_calc_portfolio FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim (portfolio_id),
  CONSTRAINT fk_dscr_calc_currency FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code),
  CONSTRAINT fk_dscr_calc_recipe FOREIGN KEY (rollup_recipe_id) REFERENCES l1.dscr_rollup_recipe (recipe_id),
  CONSTRAINT fk_dscr_calc_stmt FOREIGN KEY (financial_statement_id) REFERENCES l1.counterparty_financial_statement (financial_statement_id),
  CONSTRAINT ck_dscr_calc_entity_type CHECK (entity_type IN ('FACILITY', 'PROPERTY', 'OBLIGOR', 'GUARANTOR', 'PORTFOLIO', 'LOB', 'ENTERPRISE')),
  CONSTRAINT ck_dscr_calc_threshold_status CHECK (threshold_status IS NULL OR threshold_status IN ('PASS', 'WATCH', 'ESCALATION', 'FAIL', 'NOT_EVALUATED')),
  CONSTRAINT ck_dscr_calc_source CHECK (calculation_source IN ('ENGINE', 'MANUAL', 'IMPORT', 'SPREADING_SYSTEM', 'STRESS_MODEL')),
  CONSTRAINT ck_dscr_calc_approval CHECK (approval_status IN ('AUTO_APPROVED', 'PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED')),
  CONSTRAINT ck_dscr_calc_recomp CHECK (is_recomputed_flag IN ('Y', 'N')),
  CONSTRAINT ck_dscr_calc_override CHECK (is_override_flag IN ('Y', 'N')),
  CONSTRAINT ck_dscr_calc_dq CHECK (data_quality_flag IN ('CLEAN', 'ESTIMATED', 'STALE_FINANCIALS', 'MANUAL_OVERRIDE', 'PARTIAL_DATA', 'FLAGGED'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.dscr_calculation_result_default PARTITION OF l2.dscr_calculation_result DEFAULT;
CREATE INDEX IF NOT EXISTS ix_dscr_calc_facility_variant ON l2.dscr_calculation_result (facility_id, variant_id, as_of_date DESC) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_dscr_calc_cpty ON l2.dscr_calculation_result (counterparty_id, as_of_date DESC) WHERE counterparty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_dscr_calc_portfolio ON l2.dscr_calculation_result (portfolio_id, as_of_date) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_dscr_calc_threshold_status ON l2.dscr_calculation_result (threshold_status, as_of_date) WHERE threshold_status IN ('WATCH', 'ESCALATION', 'FAIL');
CREATE INDEX IF NOT EXISTS ix_dscr_calc_context_scenario ON l2.dscr_calculation_result (context_id, scenario_id, as_of_date);

-- ============================================================================
-- L2: dscr_calculation_input_detail (FK → dscr_calculation_result, dscr_variant_component)
-- ============================================================================
CREATE TABLE l2.dscr_calculation_input_detail (
  input_detail_id             BIGINT          NOT NULL,
  calculation_id              BIGINT          NOT NULL,
  component_id                BIGINT          NOT NULL,
  position_in_formula         VARCHAR(20)     NOT NULL,
  component_code              VARCHAR(50)     NOT NULL,
  component_name              VARCHAR(200)    NOT NULL,
  operation                   VARCHAR(20)     NOT NULL,
  component_order             SMALLINT        NOT NULL,
  raw_value                   NUMERIC(18,2),
  adjustment_value            NUMERIC(18,2),
  cap_applied_value           NUMERIC(18,2),
  stress_adjustment           NUMERIC(18,2),
  final_value                 NUMERIC(18,2)   NOT NULL,
  stress_parameter_key        VARCHAR(50),
  stress_parameter_value      NUMERIC(18,6),
  source_table                VARCHAR(128),
  source_record_id            BIGINT,
  source_field                VARCHAR(128),
  source_period_end_date      DATE,
  is_override_flag            CHAR(1)         NOT NULL DEFAULT 'N',
  override_reason             VARCHAR(4000),
  overridden_by               VARCHAR(100),
  currency_code               VARCHAR(20),
  value_usd                   NUMERIC(18,2),
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_dscr_calc_input PRIMARY KEY (input_detail_id, as_of_date),
  CONSTRAINT fk_dscr_input_calc FOREIGN KEY (calculation_id, as_of_date) REFERENCES l2.dscr_calculation_result (calculation_id, as_of_date),
  CONSTRAINT fk_dscr_input_component FOREIGN KEY (component_id) REFERENCES l1.dscr_variant_component (component_id),
  CONSTRAINT ck_input_position CHECK (position_in_formula IN ('NUMERATOR', 'DENOMINATOR')),
  CONSTRAINT ck_input_operation CHECK (operation IN ('ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'DERIVED')),
  CONSTRAINT ck_input_override CHECK (is_override_flag IN ('Y', 'N'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.dscr_calculation_input_detail_default PARTITION OF l2.dscr_calculation_input_detail DEFAULT;
CREATE INDEX IF NOT EXISTS ix_dscr_input_calc ON l2.dscr_calculation_input_detail (calculation_id, as_of_date);
CREATE INDEX IF NOT EXISTS ix_dscr_input_override ON l2.dscr_calculation_input_detail (as_of_date) WHERE is_override_flag = 'Y';

-- ============================================================================
-- L2: covenant_compliance_observation (FK → covenant_definition, dscr_calculation_result, credit_agreement_master, counterparty)
-- ============================================================================
CREATE TABLE l2.covenant_compliance_observation (
  compliance_id               BIGINT          NOT NULL,
  covenant_id                 BIGINT          NOT NULL,
  calculation_id              BIGINT,
  credit_agreement_id         BIGINT          NOT NULL,
  facility_id                 BIGINT,
  counterparty_id             BIGINT          NOT NULL,
  test_period_start_date      DATE            NOT NULL,
  test_period_end_date        DATE            NOT NULL,
  test_date                   DATE            NOT NULL,
  actual_value                NUMERIC(18,4)   NOT NULL,
  threshold_value             NUMERIC(18,4)   NOT NULL,
  cushion_value               NUMERIC(18,4),
  cushion_pct                 NUMERIC(10,4),
  compliance_status           VARCHAR(20)     NOT NULL,
  breach_date                 DATE,
  breach_amount               NUMERIC(18,4),
  waiver_flag                 CHAR(1)         NOT NULL DEFAULT 'N',
  waiver_date                 DATE,
  waiver_approved_by          VARCHAR(100),
  waiver_conditions           VARCHAR(4000),
  cure_flag                   CHAR(1)         NOT NULL DEFAULT 'N',
  cure_date                   DATE,
  cure_amount                 NUMERIC(18,2),
  cure_type                   VARCHAR(30),
  borrower_notified_date      DATE,
  default_notice_issued_flag  CHAR(1)         NOT NULL DEFAULT 'N',
  cross_default_triggered_flag CHAR(1)        NOT NULL DEFAULT 'N',
  tested_by                   VARCHAR(100),
  reviewed_by                 VARCHAR(100),
  reviewed_ts                 TIMESTAMP,
  notes                       VARCHAR(4000),
  source_system_id            BIGINT,
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_covenant_compliance PRIMARY KEY (compliance_id, as_of_date),
  CONSTRAINT fk_cov_comp_covenant FOREIGN KEY (covenant_id) REFERENCES l1.covenant_definition (covenant_id),
  CONSTRAINT fk_cov_comp_calc FOREIGN KEY (calculation_id, as_of_date) REFERENCES l2.dscr_calculation_result (calculation_id, as_of_date),
  CONSTRAINT fk_cov_comp_agreement FOREIGN KEY (credit_agreement_id) REFERENCES l1.credit_agreement_master (credit_agreement_id),
  CONSTRAINT fk_cov_comp_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT ck_cov_comp_status CHECK (compliance_status IN ('COMPLIANT', 'BREACH', 'WAIVED', 'CURED', 'PENDING', 'TECHNICAL_DEFAULT', 'EVENT_OF_DEFAULT', 'FORBEARANCE')),
  CONSTRAINT ck_cov_comp_waiver CHECK (waiver_flag IN ('Y', 'N')),
  CONSTRAINT ck_cov_comp_cure CHECK (cure_flag IN ('Y', 'N')),
  CONSTRAINT ck_cov_comp_notice CHECK (default_notice_issued_flag IN ('Y', 'N')),
  CONSTRAINT ck_cov_comp_cross CHECK (cross_default_triggered_flag IN ('Y', 'N'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.covenant_compliance_observation_default PARTITION OF l2.covenant_compliance_observation DEFAULT;
CREATE INDEX IF NOT EXISTS ix_cov_comp_covenant ON l2.covenant_compliance_observation (covenant_id, test_period_end_date DESC, as_of_date);
CREATE INDEX IF NOT EXISTS ix_cov_comp_cpty ON l2.covenant_compliance_observation (counterparty_id, as_of_date);
CREATE INDEX IF NOT EXISTS ix_cov_comp_status ON l2.covenant_compliance_observation (compliance_status, as_of_date) WHERE compliance_status IN ('BREACH', 'TECHNICAL_DEFAULT', 'EVENT_OF_DEFAULT');

-- ============================================================================
-- L2: dscr_rollup_override (FK → dscr_rollup_recipe, counterparty, facility_master)
-- ============================================================================
CREATE TABLE l2.dscr_rollup_override (
  override_id                 BIGINT          NOT NULL,
  recipe_id                   BIGINT          NOT NULL,
  counterparty_id             BIGINT          NOT NULL,
  facility_id                 BIGINT,
  override_field              VARCHAR(50)     NOT NULL,
  original_value              VARCHAR(200)    NOT NULL,
  override_value              VARCHAR(200)    NOT NULL,
  override_reason             VARCHAR(4000)   NOT NULL,
  supporting_documentation    VARCHAR(1000),
  requested_by                VARCHAR(100)    NOT NULL,
  requested_ts                TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by                 VARCHAR(100),
  approved_ts                 TIMESTAMP,
  approval_status             VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
  rejection_reason            VARCHAR(4000),
  effective_from_date         DATE            NOT NULL,
  effective_to_date           DATE,
  review_date                 DATE,
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_rollup_override PRIMARY KEY (override_id, as_of_date),
  CONSTRAINT fk_override_recipe FOREIGN KEY (recipe_id) REFERENCES l1.dscr_rollup_recipe (recipe_id),
  CONSTRAINT fk_override_cpty FOREIGN KEY (counterparty_id) REFERENCES l1.counterparty (counterparty_id),
  CONSTRAINT fk_override_facility FOREIGN KEY (facility_id) REFERENCES l1.facility_master (facility_id),
  CONSTRAINT ck_override_field CHECK (override_field IN ('income_consolidation_method', 'debt_scope', 'allocation_method', 'intercompany_treatment', 'minority_interest_treatment', 'guarantor_income_inclusion', 'debt_entity_scope', 'income_entity_scope', 'allocation_basis_field')),
  CONSTRAINT ck_override_approval CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.dscr_rollup_override_default PARTITION OF l2.dscr_rollup_override DEFAULT;
CREATE INDEX IF NOT EXISTS ix_override_cpty_active ON l2.dscr_rollup_override (counterparty_id, as_of_date) WHERE approval_status = 'APPROVED';
CREATE INDEX IF NOT EXISTS ix_override_review ON l2.dscr_rollup_override (review_date) WHERE approval_status = 'APPROVED' AND effective_to_date IS NULL;

-- ============================================================================
-- L2: dscr_aggregation_result (FK → dscr_aggregation_config, enterprise_business_taxonomy, portfolio_dim, scenario_dim, dscr_variant_definition)
-- ============================================================================
CREATE TABLE l2.dscr_aggregation_result (
  agg_result_id               BIGINT          NOT NULL,
  agg_config_id               BIGINT          NOT NULL,
  aggregation_level           VARCHAR(30)     NOT NULL,
  aggregation_method          VARCHAR(30)     NOT NULL,
  segment_type                VARCHAR(50),
  segment_value               VARCHAR(100),
  lob_segment_id              BIGINT,
  portfolio_id                BIGINT,
  org_unit_id                 BIGINT,
  scenario_id                 BIGINT,
  context_id                  BIGINT,
  variant_id                  BIGINT,
  weighted_avg_dscr           NUMERIC(10,4),
  median_dscr                 NUMERIC(10,4),
  min_dscr                    NUMERIC(10,4),
  max_dscr                    NUMERIC(10,4),
  stddev_dscr                 NUMERIC(10,4),
  percentile_25_dscr           NUMERIC(10,4),
  percentile_75_dscr          NUMERIC(10,4),
  facility_count              INTEGER         NOT NULL,
  counterparty_count          INTEGER,
  total_commitment_usd        NUMERIC(18,2)   NOT NULL,
  total_outstanding_usd       NUMERIC(18,2),
  total_ead_usd               NUMERIC(18,2),
  pct_below_1_00x             NUMERIC(10,4),
  pct_1_00_to_1_15x           NUMERIC(10,4),
  pct_1_15_to_1_25x           NUMERIC(10,4),
  pct_1_25_to_1_50x           NUMERIC(10,4),
  pct_above_1_50x             NUMERIC(10,4),
  amt_below_1_00x_usd          NUMERIC(18,2),
  amt_1_00_to_1_25x_usd        NUMERIC(18,2),
  amt_above_1_25x_usd         NUMERIC(18,2),
  prior_period_wa_dscr        NUMERIC(10,4),
  wa_dscr_delta               NUMERIC(10,4),
  prior_pct_below_1_25x       NUMERIC(10,4),
  pct_below_1_25x_delta       NUMERIC(10,4),
  migration_period_months     SMALLINT        NOT NULL DEFAULT 3,
  appetite_wa_floor           NUMERIC(10,4),
  appetite_max_pct_below_100  NUMERIC(10,4),
  appetite_max_pct_below_125   NUMERIC(10,4),
  appetite_breach_flag         CHAR(1)         NOT NULL DEFAULT 'N',
  appetite_breach_details     JSONB,
  computed_ts                 TIMESTAMP       NOT NULL,
  computed_by                 VARCHAR(100)    NOT NULL DEFAULT 'BATCH_ENGINE',
  run_version_id              BIGINT,
  as_of_date                  DATE            NOT NULL,
  created_ts                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_dscr_agg_result PRIMARY KEY (agg_result_id, as_of_date),
  CONSTRAINT fk_agg_result_config FOREIGN KEY (agg_config_id) REFERENCES l1.dscr_aggregation_config (agg_config_id),
  CONSTRAINT fk_agg_result_lob FOREIGN KEY (lob_segment_id) REFERENCES l1.enterprise_business_taxonomy (managed_segment_id),
  CONSTRAINT fk_agg_result_portfolio FOREIGN KEY (portfolio_id) REFERENCES l1.portfolio_dim (portfolio_id),
  CONSTRAINT fk_agg_result_scenario FOREIGN KEY (scenario_id) REFERENCES l1.scenario_dim (scenario_id),
  CONSTRAINT fk_agg_result_variant FOREIGN KEY (variant_id) REFERENCES l1.dscr_variant_definition (variant_id),
  CONSTRAINT ck_agg_result_level CHECK (aggregation_level IN ('DESK', 'PORTFOLIO', 'LOB', 'ENTERPRISE', 'CUSTOM')),
  CONSTRAINT ck_agg_result_method CHECK (aggregation_method IN ('COMMITMENT_WEIGHTED_AVG', 'OUTSTANDING_WEIGHTED_AVG', 'EAD_WEIGHTED_AVG', 'MEDIAN', 'DISTRIBUTION', 'COUNT', 'PERCENTILE', 'CUSTOM')),
  CONSTRAINT ck_agg_result_breach CHECK (appetite_breach_flag IN ('Y', 'N'))
) PARTITION BY RANGE (as_of_date);

CREATE TABLE l2.dscr_aggregation_result_default PARTITION OF l2.dscr_aggregation_result DEFAULT;
CREATE INDEX IF NOT EXISTS ix_agg_result_level_primary ON l2.dscr_aggregation_result (aggregation_level, aggregation_method, as_of_date DESC) WHERE aggregation_method = 'COMMITMENT_WEIGHTED_AVG';
CREATE INDEX IF NOT EXISTS ix_agg_result_lob ON l2.dscr_aggregation_result (lob_segment_id, as_of_date DESC) WHERE lob_segment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_agg_result_portfolio ON l2.dscr_aggregation_result (portfolio_id, as_of_date DESC) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_agg_result_breach ON l2.dscr_aggregation_result (as_of_date) WHERE appetite_breach_flag = 'Y';

-- ============================================================================
-- L2 sequences
-- ============================================================================
CREATE SEQUENCE l2.seq_line_item_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_property_income_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_debt_item_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_calculation_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_input_detail_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_compliance_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_override_id START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE l2.seq_agg_result_id START WITH 1 INCREMENT BY 1;

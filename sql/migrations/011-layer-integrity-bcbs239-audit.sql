-- Migration 011: Layer Integrity, BCBS 239 Traceability, Audit Fields
-- Addresses audit findings for:
--   1. Layer integrity: remove derived fields from L2, create L3 overlays
--   2. BCBS 239: add source_system_id and raw_record_id to L2 tables
--   3. Audit: add updated_ts to L3 tables missing it, created_ts to 3 tables
--   4. Temporal: add event_ts to 4 event tables
--   5. FK/Orphan: wire FK constraints to 4 orphan L2 tables

BEGIN;

SET search_path TO l1, l2, l3, public;

-- ============================================================================
-- SECTION 1: Ensure L3 calc tables have all fields before L2 drops
-- ============================================================================

-- facility_risk_calc: add expected_loss_rate_pct and risk_weight_pct
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "expected_loss_rate_pct" NUMERIC(10,6);
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "risk_weight_pct" NUMERIC(10,6);
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "record_source" VARCHAR(200);
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "load_timestamp" TIMESTAMP;

-- facility_exposure_calc: add total_collateral_mv_usd
ALTER TABLE l3.facility_exposure_calc ADD COLUMN IF NOT EXISTS "total_collateral_mv_usd" NUMERIC(20,4);

-- ============================================================================
-- SECTION 2: Create new L3 overlay tables
-- ============================================================================

-- capital_position_calc: overlay for l2.capital_position_snapshot
-- Moves 7 ratio fields + 3 derived totals to L3
CREATE TABLE IF NOT EXISTS "l3"."capital_position_calc" (
    "legal_entity_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "cet1_ratio_pct" NUMERIC(10,6),
    "tier1_ratio_pct" NUMERIC(10,6),
    "total_capital_ratio_pct" NUMERIC(10,6),
    "tier1_leverage_ratio_pct" NUMERIC(10,6),
    "leverage_ratio_pct" NUMERIC(10,6),
    "tlac_ratio_pct" NUMERIC(10,6),
    "slr_pct" NUMERIC(10,6),
    "rwa_std_amt" NUMERIC(20,4),
    "rwa_erba_amt" NUMERIC(20,4),
    "total_capital_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(64),
    "load_batch_id" VARCHAR(64),
    PRIMARY KEY ("legal_entity_id", "as_of_date")
);

-- counterparty_financial_calc: overlay for l2.counterparty_financial_snapshot
-- Moves 4 derived financial fields to L3
CREATE TABLE IF NOT EXISTS "l3"."counterparty_financial_calc" (
    "counterparty_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "net_income_amt" NUMERIC(20,4),
    "total_assets_amt" NUMERIC(20,4),
    "total_liabilities_amt" NUMERIC(20,4),
    "total_debt_service_amt" NUMERIC(20,4),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(64),
    "load_batch_id" VARCHAR(64),
    PRIMARY KEY ("counterparty_id", "as_of_date")
);

-- exception_event_calc: overlay for l2.exception_event
-- Moves 2 calculated fields to L3
CREATE TABLE IF NOT EXISTS "l3"."exception_event_calc" (
    "exception_id" BIGINT NOT NULL,
    "as_of_date" DATE,
    "days_open" INTEGER,
    "breach_pct" NUMERIC(10,6),
    "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(64),
    "load_batch_id" VARCHAR(64),
    PRIMARY KEY ("exception_id")
);

-- ============================================================================
-- SECTION 3: Migrate data from L2 derived columns to L3 overlays
-- ============================================================================

-- Migrate facility_risk_snapshot derived fields to L3
INSERT INTO l3.facility_risk_calc (facility_id, as_of_date, ead_amt, expected_loss_amt, rwa_amt, expected_loss_rate_pct, risk_weight_pct)
SELECT facility_id, as_of_date, ead_amt, expected_loss_amt, rwa_amt, expected_loss_rate_pct, risk_weight_pct
FROM l2.facility_risk_snapshot
WHERE ead_amt IS NOT NULL OR expected_loss_amt IS NOT NULL OR rwa_amt IS NOT NULL
ON CONFLICT (facility_id, as_of_date) DO UPDATE SET
    expected_loss_rate_pct = EXCLUDED.expected_loss_rate_pct,
    risk_weight_pct = EXCLUDED.risk_weight_pct;

-- Migrate capital_position_snapshot derived fields to L3
INSERT INTO l3.capital_position_calc (legal_entity_id, as_of_date, cet1_ratio_pct, tier1_ratio_pct, total_capital_ratio_pct, tier1_leverage_ratio_pct, leverage_ratio_pct, tlac_ratio_pct, slr_pct, rwa_std_amt, rwa_erba_amt, total_capital_amt)
SELECT legal_entity_id, as_of_date, cet1_ratio_pct, tier1_ratio_pct, total_capital_ratio_pct, tier1_leverage_ratio_pct, leverage_ratio_pct, tlac_ratio_pct, slr_pct, rwa_std_amt, rwa_erba_amt, total_capital_amt
FROM l2.capital_position_snapshot
ON CONFLICT (legal_entity_id, as_of_date) DO NOTHING;

-- Migrate counterparty_financial_snapshot derived fields to L3
INSERT INTO l3.counterparty_financial_calc (counterparty_id, as_of_date, net_income_amt, total_assets_amt, total_liabilities_amt, total_debt_service_amt)
SELECT counterparty_id, as_of_date, net_income_amt, total_assets_amt, total_liabilities_amt, total_debt_service_amt
FROM l2.counterparty_financial_snapshot
WHERE counterparty_id IS NOT NULL AND as_of_date IS NOT NULL
ON CONFLICT (counterparty_id, as_of_date) DO NOTHING;

-- Migrate exception_event derived fields to L3
INSERT INTO l3.exception_event_calc (exception_id, as_of_date, days_open, breach_pct)
SELECT exception_id, as_of_date, days_open, breach_pct
FROM l2.exception_event
ON CONFLICT (exception_id) DO NOTHING;

-- ============================================================================
-- SECTION 4: Drop derived fields from L2 tables
-- ============================================================================

-- 4a. facility_financial_snapshot: 5 derived fields → already in l3.facility_financial_calc
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS "dscr_value";
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS "ltv_pct";
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS "net_income_amt";
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS "interest_rate_sensitivity_pct";
ALTER TABLE l2.facility_financial_snapshot DROP COLUMN IF EXISTS "total_debt_service_amt";

-- 4b. facility_risk_snapshot: 5 derived fields → already in l3.facility_risk_calc
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS "ead_amt";
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS "expected_loss_amt";
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS "rwa_amt";
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS "expected_loss_rate_pct";
ALTER TABLE l2.facility_risk_snapshot DROP COLUMN IF EXISTS "risk_weight_pct";

-- 4c. facility_exposure_snapshot: 4 derived fields → already in l3.facility_exposure_calc
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS "coverage_ratio_pct";
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS "net_exposure_usd";
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS "rwa_amt";
ALTER TABLE l2.facility_exposure_snapshot DROP COLUMN IF EXISTS "total_collateral_mv_usd";

-- 4d. netting_set_exposure_snapshot: 2 derived fields → already in l3.netting_set_exposure_calc
ALTER TABLE l2.netting_set_exposure_snapshot DROP COLUMN IF EXISTS "netted_exposure_amount";
ALTER TABLE l2.netting_set_exposure_snapshot DROP COLUMN IF EXISTS "netting_benefit_amt";

-- 4e. capital_position_snapshot: 10 derived fields → now in l3.capital_position_calc
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "cet1_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "tier1_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "total_capital_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "tier1_leverage_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "leverage_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "tlac_ratio_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "slr_pct";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "rwa_std_amt";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "rwa_erba_amt";
ALTER TABLE l2.capital_position_snapshot DROP COLUMN IF EXISTS "total_capital_amt";

-- 4f. counterparty_financial_snapshot: 4 derived fields → now in l3.counterparty_financial_calc
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS "net_income_amt";
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS "total_assets_amt";
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS "total_liabilities_amt";
ALTER TABLE l2.counterparty_financial_snapshot DROP COLUMN IF EXISTS "total_debt_service_amt";

-- 4g. exception_event: 2 derived fields → now in l3.exception_event_calc
ALTER TABLE l2.exception_event DROP COLUMN IF EXISTS "days_open";
ALTER TABLE l2.exception_event DROP COLUMN IF EXISTS "breach_pct";

-- ============================================================================
-- SECTION 5: BCBS 239 — Add source_system_id to L2 tables (46 tables)
-- ============================================================================

ALTER TABLE l2.amendment_change_detail ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.amendment_event ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.capital_position_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.collateral_asset_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.contract_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.counterparty ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.counterparty_hierarchy ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.counterparty_rating_observation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.credit_agreement_counterparty_participation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.credit_agreement_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.credit_event ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.credit_event_facility_link ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.crm_protection_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.csa_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.deal_pipeline_fact ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.duns_entity_observation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.ecl_staging_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.exception_event ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.exposure_counterparty_attribution ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_counterparty_participation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_credit_approval ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_delinquency_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_financial_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_lender_allocation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_lob_attribution ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_pricing_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_profitability_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.facility_risk_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.financial_metric_observation ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.forbearance_event ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.fx_rate ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.instrument_master ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.legal_entity ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.legal_entity_hierarchy ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.limit_assignment_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.limit_contribution_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.limit_utilization_event ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.netting_set ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.netting_set_exposure_snapshot ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.payment_ledger ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.position_detail ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.risk_flag ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.stress_test_breach ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;
ALTER TABLE l2.watchlist_entry ADD COLUMN IF NOT EXISTS "source_system_id" BIGINT;

-- ============================================================================
-- SECTION 6: BCBS 239 — Add raw_record_id to all L2 tables (60 tables)
-- ============================================================================

ALTER TABLE l2.amendment_change_detail ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.amendment_event ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.capital_position_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.collateral_asset_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.collateral_link ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.collateral_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.contract_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.control_relationship ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.counterparty ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.counterparty_financial_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.counterparty_hierarchy ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.counterparty_rating_observation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.credit_agreement_counterparty_participation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.credit_agreement_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.credit_event ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.credit_event_facility_link ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.crm_protection_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.csa_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.deal_pipeline_fact ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.duns_entity_observation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.ecl_staging_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.economic_interdependence_relationship ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.exception_event ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.exposure_counterparty_attribution ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_counterparty_participation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_credit_approval ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_delinquency_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_exposure_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_financial_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_lender_allocation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_lob_attribution ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_pricing_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_profitability_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.facility_risk_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.financial_metric_observation ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.forbearance_event ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.fx_rate ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.gl_account_balance_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.gl_journal_entry ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.instrument_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.legal_entity ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.legal_entity_hierarchy ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.limit_assignment_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.limit_contribution_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.limit_utilization_event ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.margin_agreement ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.netting_agreement ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.netting_set ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.netting_set_exposure_snapshot ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.netting_set_link ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.payment_ledger ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.position ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.position_detail ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.protection_link ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.risk_flag ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.risk_mitigant_link ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.risk_mitigant_master ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.stress_test_breach ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);
ALTER TABLE l2.watchlist_entry ADD COLUMN IF NOT EXISTS "raw_record_id" VARCHAR(200);

-- ============================================================================
-- SECTION 7: Audit — Add updated_ts to 51 L3 tables, created_ts to 3
-- ============================================================================

-- 7a. Add created_ts to 3 L3 tables missing it
ALTER TABLE l3.calc_audit_log ADD COLUMN IF NOT EXISTS "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.calc_run ADD COLUMN IF NOT EXISTS "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.calc_validation_result ADD COLUMN IF NOT EXISTS "created_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7b. Add updated_ts to 51 L3 tables missing it
ALTER TABLE l3.amendment_detail ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.amendment_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.calc_audit_log ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.calc_run ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.calc_validation_result ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.collateral_portfolio_valuation ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.counterparty_detail_snapshot ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.counterparty_exposure_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.credit_event_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.crm_allocation_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.data_quality_attribute_score ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.data_quality_score_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.data_quality_trend ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.default_loss_recovery_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.executive_highlight_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.exposure_metric_cube ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_detail_snapshot ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_exposure_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_risk_calc ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_stress_test_calc ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.facility_timeline_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.fr2590_counterparty_aggregate ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.fr2590_position_snapshot ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.kpi_period_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.legal_entity_risk_profile ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_attribution_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_breach_fact ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_counterparty_movement ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_current_state ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_tier_status_matrix ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.limit_utilization_timeseries ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.lob_deterioration_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.lob_exposure_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.lob_rating_distribution ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.lob_risk_ratio_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.lob_top_contributors ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.metric_result ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.metric_value_fact ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.netting_set_exposure_calc ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.portfolio_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.rating_migration_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.regulatory_compliance_state ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.report_cell_contribution_fact ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.report_cell_rule_execution ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.report_cell_value ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.report_run ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.report_validation_result ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.risk_appetite_metric_state ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.risk_metric_cube ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.stress_test_breach_detail ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE l3.stress_test_result_summary ADD COLUMN IF NOT EXISTS "updated_ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- SECTION 8: Temporal — Add event_ts to 4 event tables
-- ============================================================================

ALTER TABLE l2.limit_utilization_event ADD COLUMN IF NOT EXISTS "event_ts" TIMESTAMP;
ALTER TABLE l2.amendment_change_detail ADD COLUMN IF NOT EXISTS "event_ts" TIMESTAMP;
ALTER TABLE l2.credit_event_facility_link ADD COLUMN IF NOT EXISTS "event_ts" TIMESTAMP;
ALTER TABLE l2.exception_event ADD COLUMN IF NOT EXISTS "event_ts" TIMESTAMP;

-- ============================================================================
-- SECTION 9: FK/Orphan — Wire FK constraints to 4 orphan L2 tables
-- ============================================================================

-- 9a. contract_master FKs
ALTER TABLE l2.contract_master
    ADD CONSTRAINT fk_contract_counterparty
    FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id);

ALTER TABLE l2.contract_master
    ADD CONSTRAINT fk_contract_facility
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id);

ALTER TABLE l2.contract_master
    ADD CONSTRAINT fk_contract_legal_entity
    FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity(legal_entity_id);

ALTER TABLE l2.contract_master
    ADD CONSTRAINT fk_contract_netting_set
    FOREIGN KEY (netting_set_id) REFERENCES l2.netting_set(netting_set_id);

-- 9b. gl_account_balance_snapshot FKs
ALTER TABLE l2.gl_account_balance_snapshot
    ADD CONSTRAINT fk_gl_bal_currency
    FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code);

ALTER TABLE l2.gl_account_balance_snapshot
    ADD CONSTRAINT fk_gl_bal_source_system
    FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id);

-- 9c. gl_journal_entry FKs
ALTER TABLE l2.gl_journal_entry
    ADD CONSTRAINT fk_gl_jrnl_counterparty
    FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id);

ALTER TABLE l2.gl_journal_entry
    ADD CONSTRAINT fk_gl_jrnl_facility
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id);

ALTER TABLE l2.gl_journal_entry
    ADD CONSTRAINT fk_gl_jrnl_source_system
    FOREIGN KEY (source_system_id) REFERENCES l1.source_system_registry(source_system_id);

-- 9d. limit_assignment_snapshot FKs
ALTER TABLE l2.limit_assignment_snapshot
    ADD CONSTRAINT fk_limit_assign_facility
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id);

ALTER TABLE l2.limit_assignment_snapshot
    ADD CONSTRAINT fk_limit_assign_limit_rule
    FOREIGN KEY (limit_rule_id) REFERENCES l1.limit_rule(limit_rule_id);

ALTER TABLE l2.limit_assignment_snapshot
    ADD CONSTRAINT fk_limit_assign_currency
    FOREIGN KEY (currency_code) REFERENCES l1.currency_dim(currency_code);

COMMIT;

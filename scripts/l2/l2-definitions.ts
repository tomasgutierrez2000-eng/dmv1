/**
 * L2 table definitions: 26 tables (snapshots, events, attributions) for a GSIB-style bank.
 * All FKs reference L1 (or L2) for referential integrity. Order respects dependencies.
 */
import type { L2TableDef } from './types';

export const L2_TABLES: L2TableDef[] = [
  // ----- Position & exposure -----
  {
    tableName: 'position',
    scd: 'Snapshot',
    columns: [
      { name: 'position_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'facility_id', type: 'BIGINT', nullable: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'instrument_id', type: 'BIGINT', nullable: true, fk: 'l1.instrument_master(instrument_id)' },
      { name: 'position_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'balance_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
      { name: 'source_system_id', type: 'BIGINT', nullable: true, fk: 'l1.source_system_registry(source_system_id)' },
    ],
  },
  {
    tableName: 'position_detail',
    scd: 'Snapshot',
    columns: [
      { name: 'position_detail_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'position_id', type: 'BIGINT', nullable: false, fk: 'l2.position(position_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'detail_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'maturity_date', type: 'DATE', nullable: true },
    ],
  },
  {
    tableName: 'exposure_counterparty_attribution',
    scd: 'Snapshot',
    columns: [
      { name: 'attribution_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'exposure_type_id', type: 'BIGINT', nullable: false, fk: 'l1.exposure_type_dim(exposure_type_id)' },
      { name: 'counterparty_id', type: 'BIGINT', nullable: false, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'exposure_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
    ],
  },
  {
    tableName: 'facility_exposure_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'facility_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'exposure_type_id', type: 'BIGINT', nullable: false, fk: 'l1.exposure_type_dim(exposure_type_id)' },
      { name: 'drawn_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'committed_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'undrawn_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'source_system_id', type: 'BIGINT', nullable: true, fk: 'l1.source_system_registry(source_system_id)' },
    ],
  },
  {
    tableName: 'netting_set_exposure_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'netting_set_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.netting_set(netting_set_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'netted_exposure_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'gross_exposure_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
    ],
  },
  {
    tableName: 'facility_lob_attribution',
    scd: 'Snapshot',
    columns: [
      { name: 'attribution_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'facility_id', type: 'BIGINT', nullable: false, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'lob_segment_id', type: 'BIGINT', nullable: false, fk: 'l1.enterprise_business_taxonomy(managed_segment_id)' },
      { name: 'attribution_pct', type: 'DECIMAL(10,4)', nullable: true },
      { name: 'attributed_amount', type: 'DECIMAL(18,2)', nullable: true },
    ],
  },
  {
    tableName: 'collateral_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'collateral_asset_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.collateral_asset_master(collateral_asset_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'valuation_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'haircut_pct', type: 'DECIMAL(10,4)', nullable: true },
      { name: 'eligible_collateral_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'source_system_id', type: 'BIGINT', nullable: true, fk: 'l1.source_system_registry(source_system_id)' },
    ],
  },
  {
    tableName: 'cash_flow',
    scd: 'Event',
    columns: [
      { name: 'cash_flow_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'facility_id', type: 'BIGINT', nullable: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'cash_flow_date', type: 'DATE', nullable: false },
      { name: 'cash_flow_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
    ],
  },
  // ----- Facility snapshots -----
  {
    tableName: 'facility_delinquency_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'facility_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'credit_status_code', type: 'BIGINT', nullable: false, fk: 'l1.credit_status_dim(credit_status_code)' },
      { name: 'days_past_due', type: 'INTEGER', nullable: true },
      { name: 'watch_list_flag', type: 'CHAR(1)', nullable: true },
    ],
  },
  {
    tableName: 'facility_pricing_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'facility_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'spread_bps', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'rate_index_id', type: 'BIGINT', nullable: true, fk: 'l1.interest_rate_index_dim(rate_index_id)' },
      { name: 'all_in_rate_pct', type: 'DECIMAL(10,4)', nullable: true },
      { name: 'floor_pct', type: 'DECIMAL(10,4)', nullable: true },
    ],
  },
  {
    tableName: 'facility_profitability_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'facility_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'nii_ytd', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'fee_income_ytd', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'ledger_account_id', type: 'BIGINT', nullable: true, fk: 'l1.ledger_account_dim(ledger_account_id)' },
    ],
  },
  {
    tableName: 'limit_contribution_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'limit_rule_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.limit_rule(limit_rule_id)' },
      { name: 'counterparty_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'contribution_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
    ],
  },
  {
    tableName: 'limit_utilization_event',
    scd: 'Snapshot',
    columns: [
      { name: 'limit_rule_id', type: 'BIGINT', nullable: false, pk: true, fk: 'l1.limit_rule(limit_rule_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false, pk: true },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'utilized_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'available_amount', type: 'DECIMAL(18,2)', nullable: true },
    ],
  },
  // ----- Amendments -----
  {
    tableName: 'amendment_change_detail',
    scd: 'Event',
    columns: [
      { name: 'change_detail_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'amendment_id', type: 'BIGINT', nullable: false, fk: 'l2.amendment_event(amendment_id)' },
      { name: 'change_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'old_value', type: 'TEXT', nullable: true },
      { name: 'new_value', type: 'TEXT', nullable: true },
    ],
  },
  {
    tableName: 'amendment_event',
    scd: 'Event',
    columns: [
      { name: 'amendment_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'facility_id', type: 'BIGINT', nullable: false, fk: 'l1.facility_master(facility_id)' },
      { name: 'credit_agreement_id', type: 'BIGINT', nullable: false, fk: 'l1.credit_agreement_master(credit_agreement_id)' },
      { name: 'amendment_type_code', type: 'VARCHAR(20)', nullable: false, fk: 'l1.amendment_type_dim(amendment_type_code)' },
      { name: 'amendment_status_code', type: 'VARCHAR(20)', nullable: false, fk: 'l1.amendment_status_dim(amendment_status_code)' },
      { name: 'effective_date', type: 'DATE', nullable: true },
      { name: 'event_ts', type: 'TIMESTAMP', nullable: true },
    ],
  },
  // ----- Credit events -----
  {
    tableName: 'credit_event',
    scd: 'Event',
    columns: [
      { name: 'credit_event_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'counterparty_id', type: 'BIGINT', nullable: false, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'credit_event_type_code', type: 'BIGINT', nullable: false, fk: 'l1.credit_event_type_dim(credit_event_type_code)' },
      { name: 'event_date', type: 'DATE', nullable: false },
      { name: 'event_ts', type: 'TIMESTAMP', nullable: true },
      { name: 'default_definition_id', type: 'BIGINT', nullable: true, fk: 'l1.default_definition_dim(default_definition_id)' },
    ],
  },
  {
    tableName: 'credit_event_facility_link',
    scd: 'Event',
    columns: [
      { name: 'link_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'credit_event_id', type: 'BIGINT', nullable: false, fk: 'l2.credit_event(credit_event_id)' },
      { name: 'facility_id', type: 'BIGINT', nullable: false, fk: 'l1.facility_master(facility_id)' },
      { name: 'exposure_at_default', type: 'DECIMAL(18,2)', nullable: true },
    ],
  },
  // ----- Stress test -----
  {
    tableName: 'stress_test_breach',
    scd: 'Event',
    columns: [
      { name: 'breach_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'scenario_id', type: 'BIGINT', nullable: false, fk: 'l1.scenario_dim(scenario_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'limit_rule_id', type: 'BIGINT', nullable: true, fk: 'l1.limit_rule(limit_rule_id)' },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'breach_amount', type: 'DECIMAL(18,2)', nullable: true },
    ],
  },
  {
    tableName: 'stress_test_result',
    scd: 'Snapshot',
    columns: [
      { name: 'result_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'scenario_id', type: 'BIGINT', nullable: false, fk: 'l1.scenario_dim(scenario_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'portfolio_id', type: 'BIGINT', nullable: true, fk: 'l1.portfolio_dim(portfolio_id)' },
      { name: 'loss_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'pnl_impact', type: 'DECIMAL(18,2)', nullable: true },
    ],
  },
  {
    tableName: 'deal_pipeline_fact',
    scd: 'Event',
    columns: [
      { name: 'pipeline_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'stage_code', type: 'VARCHAR(50)', nullable: true },
      { name: 'proposed_amount', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'currency_code', type: 'VARCHAR(20)', nullable: true, fk: 'l1.currency_dim(currency_code)' },
    ],
  },
  // ----- Ratings & metrics -----
  {
    tableName: 'counterparty_rating_observation',
    scd: 'Snapshot',
    columns: [
      { name: 'observation_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'counterparty_id', type: 'BIGINT', nullable: false, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'rating_grade_id', type: 'BIGINT', nullable: false, fk: 'l1.rating_grade_dim(rating_grade_id)' },
      { name: 'rating_source_id', type: 'BIGINT', nullable: false, fk: 'l1.rating_source(rating_source_id)' },
      { name: 'is_internal_flag', type: 'CHAR(1)', nullable: true },
    ],
  },
  {
    tableName: 'financial_metric_observation',
    scd: 'Snapshot',
    columns: [
      { name: 'observation_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'facility_id', type: 'BIGINT', nullable: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'metric_definition_id', type: 'BIGINT', nullable: false, fk: 'l1.metric_definition_dim(metric_definition_id)' },
      { name: 'value', type: 'DECIMAL(18,4)', nullable: true },
      { name: 'context_id', type: 'BIGINT', nullable: true, fk: 'l1.context_dim(context_id)' },
    ],
  },
  {
    tableName: 'metric_threshold',
    scd: 'SCD-1',
    columns: [
      { name: 'threshold_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'metric_definition_id', type: 'BIGINT', nullable: false, fk: 'l1.metric_definition_dim(metric_definition_id)' },
      { name: 'threshold_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'threshold_value', type: 'DECIMAL(18,4)', nullable: true },
      { name: 'effective_from_date', type: 'DATE', nullable: true },
      { name: 'effective_to_date', type: 'DATE', nullable: true },
    ],
  },
  {
    tableName: 'exception_event',
    scd: 'Event',
    columns: [
      { name: 'exception_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'exception_type', type: 'VARCHAR(50)', nullable: true },
      { name: 'facility_id', type: 'BIGINT', nullable: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'raised_ts', type: 'TIMESTAMP', nullable: true },
      { name: 'resolved_ts', type: 'TIMESTAMP', nullable: true },
    ],
  },
  {
    tableName: 'risk_flag',
    scd: 'Event',
    columns: [
      { name: 'risk_flag_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'facility_id', type: 'BIGINT', nullable: true, fk: 'l1.facility_master(facility_id)' },
      { name: 'counterparty_id', type: 'BIGINT', nullable: true, fk: 'l1.counterparty(counterparty_id)' },
      { name: 'flag_type', type: 'VARCHAR(50)', nullable: false },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'raised_ts', type: 'TIMESTAMP', nullable: true },
      { name: 'cleared_ts', type: 'TIMESTAMP', nullable: true },
    ],
  },
  {
    tableName: 'data_quality_score_snapshot',
    scd: 'Snapshot',
    columns: [
      { name: 'score_id', type: 'BIGINT', nullable: false, pk: true },
      { name: 'as_of_date', type: 'DATE', nullable: false },
      { name: 'target_table', type: 'VARCHAR(100)', nullable: true },
      { name: 'source_system_id', type: 'BIGINT', nullable: true, fk: 'l1.source_system_registry(source_system_id)' },
      { name: 'completeness_pct', type: 'DECIMAL(10,4)', nullable: true },
      { name: 'validity_pct', type: 'DECIMAL(10,4)', nullable: true },
      { name: 'overall_score', type: 'DECIMAL(10,4)', nullable: true },
    ],
  },
];

/**
 * L2 table metadata — non-structural information that the DDL/database doesn't carry.
 * SCD type and category are business metadata, not physical schema properties.
 *
 * The golden source for structural data (tables, columns, types, PKs, FKs) is PostgreSQL.
 * This file provides ONLY display metadata for the Excel exporter and visualizer.
 */

export interface L2TableMeta {
  name: string;
  scd: 'SCD-2' | 'Snapshot' | 'Event';
  category: string;
}

export const L2_TABLE_META: L2TableMeta[] = [
  // ── SCD-2 (Versioned Masters — migrated from L1) ──
  { name: 'counterparty', scd: 'SCD-2', category: 'Business Entity' },
  { name: 'legal_entity', scd: 'SCD-2', category: 'Business Entity' },
  { name: 'instrument_master', scd: 'SCD-2', category: 'Financial' },
  { name: 'credit_agreement_master', scd: 'SCD-2', category: 'Business Entity' },
  { name: 'facility_master', scd: 'SCD-2', category: 'Business Entity' },
  { name: 'contract_master', scd: 'SCD-2', category: 'Financial' },
  { name: 'netting_agreement', scd: 'SCD-2', category: 'Netting' },
  { name: 'netting_set', scd: 'SCD-2', category: 'Netting' },
  { name: 'netting_set_link', scd: 'SCD-2', category: 'Netting' },
  { name: 'csa_master', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'margin_agreement', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'collateral_asset_master', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'collateral_link', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'crm_protection_master', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'protection_link', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'risk_mitigant_master', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'risk_mitigant_link', scd: 'SCD-2', category: 'Collateral & CRM' },
  { name: 'counterparty_hierarchy', scd: 'SCD-2', category: 'Hierarchy' },
  { name: 'legal_entity_hierarchy', scd: 'SCD-2', category: 'Hierarchy' },
  { name: 'control_relationship', scd: 'SCD-2', category: 'Hierarchy' },
  { name: 'economic_interdependence_relationship', scd: 'SCD-2', category: 'Hierarchy' },
  { name: 'credit_agreement_counterparty_participation', scd: 'SCD-2', category: 'Counterparty Participation' },
  { name: 'facility_counterparty_participation', scd: 'SCD-2', category: 'Counterparty Participation' },
  { name: 'facility_lender_allocation', scd: 'SCD-2', category: 'Counterparty Participation' },
  { name: 'fx_rate', scd: 'Snapshot', category: 'Market Data' },

  // ── Snapshots ──
  { name: 'position', scd: 'Snapshot', category: 'Position Core' },
  { name: 'position_detail', scd: 'Snapshot', category: 'Position Detail' },
  { name: 'exposure_counterparty_attribution', scd: 'Snapshot', category: 'Exposure' },
  { name: 'facility_exposure_snapshot', scd: 'Snapshot', category: 'Exposure' },
  { name: 'netting_set_exposure_snapshot', scd: 'Snapshot', category: 'Exposure' },
  { name: 'facility_lob_attribution', scd: 'Snapshot', category: 'Business Segment Attribution' },
  { name: 'collateral_snapshot', scd: 'Snapshot', category: 'CRM' },
  { name: 'facility_financial_snapshot', scd: 'Snapshot', category: 'Financial Metrics' },
  { name: 'facility_delinquency_snapshot', scd: 'Snapshot', category: 'Financial Metrics' },
  { name: 'facility_pricing_snapshot', scd: 'Snapshot', category: 'Financial Metrics' },
  { name: 'facility_profitability_snapshot', scd: 'Snapshot', category: 'Financial Metrics' },
  { name: 'limit_contribution_snapshot', scd: 'Snapshot', category: 'Limits' },
  { name: 'limit_utilization_event', scd: 'Snapshot', category: 'Limits' },
  { name: 'counterparty_rating_observation', scd: 'Snapshot', category: 'Ratings' },
  { name: 'financial_metric_observation', scd: 'Snapshot', category: 'Metrics' },
  { name: 'counterparty_financial_snapshot', scd: 'Snapshot', category: 'Financial Metrics' },
  { name: 'facility_risk_snapshot', scd: 'Snapshot', category: 'Risk Monitoring' },
  { name: 'data_quality_score_snapshot', scd: 'Snapshot', category: 'Data Quality' },

  // ── Events ──
  { name: 'cash_flow', scd: 'Event', category: 'Cash Flows' },
  { name: 'amendment_change_detail', scd: 'Event', category: 'Amendments' },
  { name: 'amendment_event', scd: 'Event', category: 'Amendments' },
  { name: 'credit_event', scd: 'Event', category: 'Credit Events' },
  { name: 'credit_event_facility_link', scd: 'Event', category: 'Credit Events' },
  { name: 'stress_test_breach', scd: 'Event', category: 'Stress Testing' },
  { name: 'stress_test_result', scd: 'Event', category: 'Stress Testing' },
  { name: 'deal_pipeline_fact', scd: 'Event', category: 'Deal Pipeline' },
  { name: 'exception_event', scd: 'Event', category: 'Exceptions' },
  { name: 'risk_flag', scd: 'Event', category: 'Risk Monitoring' },
  { name: 'facility_credit_approval', scd: 'Event', category: 'Approvals' },
  { name: 'payment_ledger', scd: 'Event', category: 'Payments' },
];

/** Lookup helper. Returns undefined if table has no metadata entry. */
export const L2_META_MAP = new Map(L2_TABLE_META.map(t => [t.name, t]));

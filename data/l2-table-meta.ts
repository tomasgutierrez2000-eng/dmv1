/**
 * L2 table metadata — non-structural information that the DDL/database doesn't carry.
 * SCD type and category are business metadata, not physical schema properties.
 *
 * The golden source for structural data (tables, columns, types, PKs, FKs) is PostgreSQL.
 * This file provides ONLY display metadata for the Excel exporter and visualizer.
 *
 * Categories (11 unified across L1/L2/L3):
 *   Counterparty & Entity, Exposure & Position, Credit Risk & Ratings,
 *   Collateral & Risk Mitigation, Limits & Risk Appetite, Financial Performance,
 *   Amendments & Forbearance, Stress Testing, Regulatory & Capital,
 *   Business Segment & Dashboard, Data Quality & Infrastructure
 */

export interface L2TableMeta {
  name: string;
  scd: 'SCD-2' | 'Snapshot' | 'Event';
  category: string;
}

export const L2_TABLE_META: L2TableMeta[] = [
  // ── SCD-2 (Versioned Masters) ──
  { name: 'counterparty', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'legal_entity', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'instrument_master', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'credit_agreement_master', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'facility_master', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'contract_master', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'netting_agreement', scd: 'SCD-2', category: 'Exposure & Position' },
  { name: 'netting_set', scd: 'SCD-2', category: 'Exposure & Position' },
  { name: 'netting_set_link', scd: 'SCD-2', category: 'Exposure & Position' },
  { name: 'csa_master', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'margin_agreement', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'collateral_asset_master', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'collateral_link', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'crm_protection_master', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'protection_link', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'risk_mitigant_master', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'risk_mitigant_link', scd: 'SCD-2', category: 'Collateral & Risk Mitigation' },
  { name: 'counterparty_hierarchy', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'legal_entity_hierarchy', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'control_relationship', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'economic_interdependence_relationship', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'credit_agreement_counterparty_participation', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'facility_counterparty_participation', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'facility_lender_allocation', scd: 'SCD-2', category: 'Counterparty & Entity' },
  { name: 'fx_rate', scd: 'Snapshot', category: 'Financial Performance' },

  // ── Snapshots ──
  { name: 'position', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'position_detail', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'exposure_counterparty_attribution', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'facility_exposure_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'netting_set_exposure_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'facility_lob_attribution', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'collateral_snapshot', scd: 'Snapshot', category: 'Collateral & Risk Mitigation' },
  { name: 'facility_financial_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'facility_delinquency_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'facility_pricing_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'facility_profitability_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'limit_contribution_snapshot', scd: 'Snapshot', category: 'Limits & Risk Appetite' },
  { name: 'limit_utilization_event', scd: 'Snapshot', category: 'Limits & Risk Appetite' },
  { name: 'limit_assignment_snapshot', scd: 'Snapshot', category: 'Limits & Risk Appetite' },
  { name: 'counterparty_rating_observation', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  { name: 'financial_metric_observation', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'counterparty_financial_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'facility_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  { name: 'duns_entity_observation', scd: 'Snapshot', category: 'Counterparty & Entity' },

  // ── Events ──
  { name: 'amendment_change_detail', scd: 'Event', category: 'Amendments & Forbearance' },
  { name: 'amendment_event', scd: 'Event', category: 'Amendments & Forbearance' },
  { name: 'credit_event', scd: 'Event', category: 'Credit Risk & Ratings' },
  { name: 'credit_event_facility_link', scd: 'Event', category: 'Credit Risk & Ratings' },
  { name: 'stress_test_breach', scd: 'Event', category: 'Stress Testing' },
  { name: 'deal_pipeline_fact', scd: 'Event', category: 'Financial Performance' },
  { name: 'exception_event', scd: 'Event', category: 'Limits & Risk Appetite' },
  { name: 'risk_flag', scd: 'Event', category: 'Credit Risk & Ratings' },
  { name: 'facility_credit_approval', scd: 'Event', category: 'Financial Performance' },
  { name: 'payment_ledger', scd: 'Event', category: 'Financial Performance' },
  { name: 'cash_flow', scd: 'Event', category: 'Financial Performance' },
  { name: 'metric_threshold_snapshot', scd: 'Snapshot', category: 'Limits & Risk Appetite' },
  { name: 'gl_journal_entry', scd: 'Event', category: 'Financial Performance' },

  // ── Snapshots (General Ledger) ──
  { name: 'gl_account_balance_snapshot', scd: 'Snapshot', category: 'Financial Performance' },

  // ── ECL / Watchlist / Forbearance (Regulatory Coverage) ──
  { name: 'ecl_staging_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  { name: 'watchlist_entry', scd: 'Event', category: 'Credit Risk & Ratings' },
  { name: 'forbearance_event', scd: 'Event', category: 'Amendments & Forbearance' },

  // ── Product-Specific Snapshot Tables (40 tables, 10 products × 4 categories) ──
  // Loans
  { name: 'loans_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'loans_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'loans_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'loans_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Derivatives
  { name: 'derivatives_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'derivatives_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'derivatives_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'derivatives_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Off-BS Commitments
  { name: 'offbs_commitments_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'offbs_commitments_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'offbs_commitments_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'offbs_commitments_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // SFT (Secured Financing Transactions)
  { name: 'sft_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'sft_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'sft_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'sft_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Securities
  { name: 'securities_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'securities_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'securities_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'securities_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Deposits
  { name: 'deposits_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'deposits_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'deposits_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'deposits_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Borrowings
  { name: 'borrowings_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'borrowings_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'borrowings_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'borrowings_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Debt
  { name: 'debt_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'debt_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'debt_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'debt_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Equities
  { name: 'equities_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'equities_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'equities_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'equities_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Stock
  { name: 'stock_accounting_snapshot', scd: 'Snapshot', category: 'Financial Performance' },
  { name: 'stock_classification_snapshot', scd: 'Snapshot', category: 'Counterparty & Entity' },
  { name: 'stock_indicative_snapshot', scd: 'Snapshot', category: 'Exposure & Position' },
  { name: 'stock_risk_snapshot', scd: 'Snapshot', category: 'Credit Risk & Ratings' },
  // Capital
  { name: 'capital_position_snapshot', scd: 'Snapshot', category: 'Regulatory & Capital' },
];

/** Lookup helper. Returns undefined if table has no metadata entry. */
export const L2_META_MAP = new Map(L2_TABLE_META.map(t => [t.name, t]));

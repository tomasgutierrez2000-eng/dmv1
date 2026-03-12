/**
 * L3 Table manifest — 82 tables (69 original + 8 capital + 5 dashboard derived).
 * Matches sql/l3/01_DDL_all_tables.sql and execution order in 06_ORCHESTRATOR.sql.
 * T51-T52: Calculated overlay tables (derived fields split from L2 snapshots).
 * T53-T54: Promoted from L2 (entirely computed tables).
 * T55-T56: Additional calculated overlay tables (derived fields split from L2 snapshots).
 */

export type L3Tier = 1 | 2 | 3 | 4;

export interface L3TableDef {
  id: string;           // T01..T50
  name: string;         // table name (e.g. exposure_metric_cube)
  category: string;    // from DDL comment (e.g. "Exposure & Risk Metrics")
  tier: L3Tier;        // population tier: 1 = L1+L2 only, 2 = reads T1, 3 = reads T1–2, 4 = reads all
  description?: string;
}

/** Execution order: TIER 1 → TIER 2 → TIER 3 → TIER 4 (see sql/l3/00_README.md) */
export const L3_TABLES: L3TableDef[] = [
  { id: 'T01', name: 'exposure_metric_cube',              category: 'Exposure & Risk Metrics',    tier: 1 },
  { id: 'T02', name: 'risk_metric_cube',                   category: 'Exposure & Risk Metrics',    tier: 1 },
  { id: 'T03', name: 'counterparty_exposure_summary',     category: 'Exposure & Risk Metrics',    tier: 2 },
  { id: 'T04', name: 'facility_exposure_summary',         category: 'Exposure & Risk Metrics',    tier: 1 },
  { id: 'T05', name: 'portfolio_summary',                 category: 'Exposure & Risk Metrics',    tier: 1 },
  { id: 'T06', name: 'crm_allocation_summary',            category: 'Credit Risk Mitigation (CRM)', tier: 1 },
  { id: 'T07', name: 'collateral_portfolio_valuation',   category: 'Credit Risk Mitigation (CRM)', tier: 1 },
  { id: 'T08', name: 'limit_current_state',               category: 'Limits & Appetite',          tier: 1 },
  { id: 'T09', name: 'limit_utilization_timeseries',      category: 'Limits & Appetite',          tier: 1 },
  { id: 'T10', name: 'limit_attribution_summary',         category: 'Limits & Appetite',          tier: 1 },
  { id: 'T11', name: 'limit_breach_fact',                  category: 'Limits & Appetite',          tier: 1 },
  { id: 'T12', name: 'credit_event_summary',              category: 'Credit Events & Performance', tier: 1 },
  { id: 'T13', name: 'rating_migration_summary',          category: 'Credit Events & Performance', tier: 1 },
  { id: 'T14', name: 'default_loss_recovery_summary',    category: 'Credit Events & Performance', tier: 1 },
  { id: 'T15', name: 'report_run',                        category: 'Regulatory Reporting Output', tier: 1 },
  { id: 'T16', name: 'report_cell_value',                 category: 'Regulatory Reporting Output', tier: 1 },
  { id: 'T17', name: 'report_cell_contribution_fact',     category: 'Regulatory Reporting Output', tier: 1 },
  { id: 'T18', name: 'report_cell_rule_execution',        category: 'Regulatory Reporting Output', tier: 1 },
  { id: 'T19', name: 'report_validation_result',          category: 'Regulatory Reporting Output', tier: 1 },
  { id: 'T20', name: 'fr2590_position_snapshot',           category: 'FR 2590 Helper Artifacts',   tier: 1 },
  { id: 'T21', name: 'fr2590_counterparty_aggregate',     category: 'FR 2590 Helper Artifacts',   tier: 1 },
  { id: 'T22', name: 'lob_exposure_summary',              category: 'Business Segment Summary',                tier: 3 },
  { id: 'T23', name: 'lob_profitability_summary',         category: 'Business Segment Summary',                tier: 3 },
  { id: 'T24', name: 'lob_pricing_summary',               category: 'Business Segment Summary',                tier: 3 },
  { id: 'T25', name: 'lob_delinquency_summary',           category: 'Business Segment Summary',                tier: 3 },
  { id: 'T26', name: 'lob_profitability_allocation_summary', category: 'Business Segment Summary',           tier: 3 },
  { id: 'T27', name: 'deal_pipeline_stage_summary',       category: 'Business Segment Summary',                tier: 3 },
  { id: 'T28', name: 'lob_credit_quality_summary',       category: 'Business Segment Summary',                tier: 3 },
  { id: 'T29', name: 'kpi_period_summary',                category: 'Business Segment Summary',                tier: 4 },
  { id: 'T30', name: 'risk_appetite_metric_state',        category: 'Executive Dashboard',         tier: 3 },
  { id: 'T31', name: 'executive_highlight_summary',       category: 'Executive Dashboard',         tier: 4 },
  { id: 'T32', name: 'counterparty_detail_snapshot',      category: 'Counterparty Analytics',     tier: 3 },
  { id: 'T33', name: 'limit_tier_status_matrix',          category: 'Limits & Appetite',          tier: 2 },
  { id: 'T34', name: 'limit_counterparty_movement',       category: 'Limits & Appetite',          tier: 2 },
  { id: 'T35', name: 'data_quality_score_summary',        category: 'Data Quality',               tier: 3 },
  { id: 'T36', name: 'legal_entity_risk_profile',         category: 'Legal Entity Analytics',     tier: 3 },
  { id: 'T37', name: 'data_quality_attribute_score',      category: 'Data Quality',               tier: 3 },
  { id: 'T38', name: 'data_quality_trend',                 category: 'Data Quality',               tier: 3 },
  { id: 'T39', name: 'stress_test_result_summary',        category: 'Stress Testing',             tier: 1 },
  { id: 'T40', name: 'stress_test_breach_detail',         category: 'Stress Testing',             tier: 1 },
  { id: 'T41', name: 'regulatory_compliance_state',       category: 'Regulatory Reporting Output', tier: 3 },
  { id: 'T42', name: 'facility_timeline_summary',         category: 'Facility Analytics',         tier: 3 },
  { id: 'T43', name: 'amendment_summary',                  category: 'Amendment Analytics',       tier: 3 },
  { id: 'T44', name: 'amendment_detail',                  category: 'Amendment Analytics',       tier: 3 },
  { id: 'T45', name: 'facility_detail_snapshot',          category: 'Facility Analytics',         tier: 3 },
  { id: 'T46', name: 'lob_risk_ratio_summary',            category: 'Business Segment Summary',                tier: 3 },
  { id: 'T47', name: 'lob_deterioration_summary',         category: 'Business Segment Summary',                tier: 3 },
  { id: 'T48', name: 'lob_rating_distribution',           category: 'Business Segment Summary',                tier: 3 },
  { id: 'T49', name: 'lob_top_contributors',               category: 'Business Segment Summary',                tier: 3 },
  { id: 'T50', name: 'metric_value_fact',                  category: 'Dashboard Consumption',                   tier: 1 },
  // T51-T52: Calculated overlay tables (derived fields split from L2 snapshots)
  { id: 'T51', name: 'facility_financial_calc',            category: 'Facility Analytics',                      tier: 1 },
  { id: 'T52', name: 'facility_exposure_calc',             category: 'Exposure & Risk Metrics',                 tier: 1 },
  // T53-T54: Promoted from L2 (entirely computed tables)
  { id: 'T53', name: 'data_quality_score_snapshot',        category: 'Data Quality',                            tier: 1 },
  { id: 'T54', name: 'facility_stress_test_calc',          category: 'Stress Testing',                          tier: 1 },
  // T55-T56: Additional calculated overlay tables (derived fields split from L2 snapshots)
  { id: 'T55', name: 'facility_risk_calc',                  category: 'Exposure & Risk Metrics',                 tier: 1 },
  { id: 'T56', name: 'netting_set_exposure_calc',           category: 'Exposure & Risk Metrics',                 tier: 1 },
  // T57-T61: Layer reassignment overlay tables (derived fields split from L2 per architecture review)
  { id: 'T57', name: 'counterparty_rating_calc',            category: 'Credit Events & Performance',             tier: 1 },
  { id: 'T58', name: 'facility_pricing_calc',               category: 'Facility Analytics',                      tier: 1 },
  { id: 'T60', name: 'collateral_calc',                     category: 'Credit Risk Mitigation (CRM)',            tier: 1 },
  { id: 'T61', name: 'cash_flow_calc',                      category: 'Cash Flows',                              tier: 1 },
  // T62: GL calculated overlay (derived fields split from L2 gl_account_balance_snapshot)
  { id: 'T62', name: 'gl_account_balance_calc',             category: 'General Ledger',                          tier: 1 },
  // T63-T66: Calculation engine infrastructure tables
  { id: 'T63', name: 'calc_run',                             category: 'Calculation Engine',                      tier: 1 },
  { id: 'T64', name: 'calc_audit_log',                       category: 'Calculation Engine',                      tier: 1 },
  { id: 'T65', name: 'calc_validation_result',               category: 'Calculation Engine',                      tier: 1 },
  { id: 'T66', name: 'metric_result',                        category: 'Calculation Engine',                      tier: 1 },

  // ── ECL / Watchlist / Forbearance (Regulatory Coverage) ──
  { id: 'T67', name: 'ecl_provision_calc',                  category: 'ECL/Impairment',                          tier: 1 },
  { id: 'T68', name: 'ecl_allowance_movement',              category: 'ECL/Impairment',                          tier: 2 },
  { id: 'T69', name: 'watchlist_movement_summary',           category: 'Watchlist',                               tier: 2 },

  // ── Capital Metrics (migration 002-capital-metrics) ──
  { id: 'T70', name: 'stress_test_result',                   category: 'Stress Testing',                          tier: 1 },
  { id: 'T71', name: 'facility_rwa_calc',                    category: 'Capital & Equity',                        tier: 1 },
  { id: 'T72', name: 'capital_binding_constraint',           category: 'Capital & Equity',                        tier: 1 },
  { id: 'T73', name: 'facility_capital_consumption',         category: 'Capital & Equity',                        tier: 2 },
  { id: 'T74', name: 'counterparty_capital_consumption',     category: 'Capital & Equity',                        tier: 2 },
  { id: 'T75', name: 'desk_capital_consumption',             category: 'Capital & Equity',                        tier: 2 },
  { id: 'T76', name: 'portfolio_capital_consumption',        category: 'Capital & Equity',                        tier: 2 },
  { id: 'T77', name: 'segment_capital_consumption',          category: 'Capital & Equity',                        tier: 3 },

  // ── Dashboard Derived (wide denormalized tables for CRO dashboard) ──
  { id: 'T78', name: 'facility_derived',                     category: 'Dashboard Derived',                       tier: 4 },
  { id: 'T79', name: 'counterparty_derived',                 category: 'Dashboard Derived',                       tier: 4 },
  { id: 'T80', name: 'desk_derived',                         category: 'Dashboard Derived',                       tier: 4 },
  { id: 'T81', name: 'portfolio_derived',                    category: 'Dashboard Derived',                       tier: 4 },
  { id: 'T82', name: 'segment_derived',                      category: 'Dashboard Derived',                       tier: 4 },
];

export const L3_TABLE_BY_NAME = new Map(L3_TABLES.map(t => [t.name, t]));
export const L3_TABLE_BY_ID = new Map(L3_TABLES.map(t => [t.id, t]));

export function getL3TablesByTier(tier: L3Tier): L3TableDef[] {
  return L3_TABLES.filter(t => t.tier === tier);
}

export function getL3TablesByCategory(category: string): L3TableDef[] {
  return L3_TABLES.filter(t => t.category === category);
}

export function getL3Categories(): string[] {
  return [...new Set(L3_TABLES.map(t => t.category))].sort();
}

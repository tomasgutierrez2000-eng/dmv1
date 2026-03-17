/**
 * L3 Table manifest — 79 tables.
 * Matches sql/l3/01_DDL_all_tables.sql and execution order in 06_ORCHESTRATOR.sql.
 * T51-T52: Calculated overlay tables (derived fields split from L2 snapshots).
 * T53-T54: Promoted from L2 (entirely computed tables).
 * T55-T56: Additional calculated overlay tables (derived fields split from L2 snapshots).
 *
 * Categories (11 unified across L1/L2/L3):
 *   Counterparty & Entity, Exposure & Position, Credit Risk & Ratings,
 *   Collateral & Risk Mitigation, Limits & Risk Appetite, Financial Performance,
 *   Amendments & Forbearance, Stress Testing, Regulatory & Capital,
 *   Business Segment & Dashboard, Data Quality & Infrastructure
 */

export type L3Tier = 1 | 2 | 3 | 4;

export interface L3TableDef {
  id: string;           // T01..T50
  name: string;         // table name (e.g. exposure_metric_cube)
  category: string;    // unified category (e.g. "Exposure & Position")
  tier: L3Tier;        // population tier: 1 = L1+L2 only, 2 = reads T1, 3 = reads T1–2, 4 = reads all
  description?: string;
}

/** Execution order: TIER 1 → TIER 2 → TIER 3 → TIER 4 (see sql/l3/00_README.md) */
export const L3_TABLES: L3TableDef[] = [
  { id: 'T01', name: 'exposure_metric_cube',              category: 'Exposure & Position',            tier: 1 },
  { id: 'T02', name: 'risk_metric_cube',                   category: 'Exposure & Position',            tier: 1 },
  { id: 'T03', name: 'counterparty_exposure_summary',     category: 'Exposure & Position',            tier: 2 },
  { id: 'T04', name: 'facility_exposure_summary',         category: 'Exposure & Position',            tier: 1 },
  { id: 'T05', name: 'portfolio_summary',                 category: 'Exposure & Position',            tier: 1 },
  { id: 'T06', name: 'crm_allocation_summary',            category: 'Collateral & Risk Mitigation',   tier: 1 },
  { id: 'T07', name: 'collateral_portfolio_valuation',   category: 'Collateral & Risk Mitigation',   tier: 1 },
  { id: 'T08', name: 'limit_current_state',               category: 'Limits & Risk Appetite',         tier: 1 },
  { id: 'T09', name: 'limit_utilization_timeseries',      category: 'Limits & Risk Appetite',         tier: 1 },
  { id: 'T10', name: 'limit_attribution_summary',         category: 'Limits & Risk Appetite',         tier: 1 },
  { id: 'T11', name: 'limit_breach_fact',                  category: 'Limits & Risk Appetite',         tier: 1 },
  { id: 'T12', name: 'credit_event_summary',              category: 'Credit Risk & Ratings',          tier: 1 },
  { id: 'T13', name: 'rating_migration_summary',          category: 'Credit Risk & Ratings',          tier: 1 },
  { id: 'T14', name: 'default_loss_recovery_summary',    category: 'Credit Risk & Ratings',          tier: 1 },
  { id: 'T15', name: 'report_run',                        category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T16', name: 'report_cell_value',                 category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T17', name: 'report_cell_contribution_fact',     category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T18', name: 'report_cell_rule_execution',        category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T19', name: 'report_validation_result',          category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T20', name: 'fr2590_position_snapshot',           category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T21', name: 'fr2590_counterparty_aggregate',     category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T22', name: 'lob_exposure_summary',              category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T23', name: 'lob_profitability_summary',         category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T24', name: 'lob_pricing_summary',               category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T25', name: 'lob_delinquency_summary',           category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T26', name: 'lob_profitability_allocation_summary', category: 'Business Segment & Dashboard', tier: 3 },
  { id: 'T27', name: 'deal_pipeline_stage_summary',       category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T28', name: 'lob_credit_quality_summary',       category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T29', name: 'kpi_period_summary',                category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T30', name: 'risk_appetite_metric_state',        category: 'Limits & Risk Appetite',         tier: 3 },
  { id: 'T31', name: 'executive_highlight_summary',       category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T32', name: 'counterparty_detail_snapshot',      category: 'Counterparty & Entity',          tier: 3 },
  { id: 'T33', name: 'limit_tier_status_matrix',          category: 'Limits & Risk Appetite',         tier: 2 },
  { id: 'T34', name: 'limit_counterparty_movement',       category: 'Limits & Risk Appetite',         tier: 2 },
  { id: 'T35', name: 'data_quality_score_summary',        category: 'Data Quality & Infrastructure',  tier: 3 },
  { id: 'T36', name: 'legal_entity_risk_profile',         category: 'Counterparty & Entity',          tier: 3 },
  { id: 'T37', name: 'data_quality_attribute_score',      category: 'Data Quality & Infrastructure',  tier: 3 },
  { id: 'T38', name: 'data_quality_trend',                 category: 'Data Quality & Infrastructure',  tier: 3 },
  { id: 'T39', name: 'stress_test_result_summary',        category: 'Stress Testing',                 tier: 1 },
  { id: 'T40', name: 'stress_test_breach_detail',         category: 'Stress Testing',                 tier: 1 },
  { id: 'T41', name: 'regulatory_compliance_state',       category: 'Regulatory & Capital',           tier: 3 },
  { id: 'T42', name: 'facility_timeline_summary',         category: 'Financial Performance',          tier: 3 },
  { id: 'T43', name: 'amendment_summary',                  category: 'Amendments & Forbearance',      tier: 3 },
  { id: 'T44', name: 'amendment_detail',                  category: 'Amendments & Forbearance',      tier: 3 },
  { id: 'T45', name: 'facility_detail_snapshot',          category: 'Financial Performance',          tier: 3 },
  { id: 'T46', name: 'lob_risk_ratio_summary',            category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T47', name: 'lob_deterioration_summary',         category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T48', name: 'lob_rating_distribution',           category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T49', name: 'lob_top_contributors',               category: 'Business Segment & Dashboard',   tier: 3 },
  { id: 'T50', name: 'metric_value_fact',                  category: 'Data Quality & Infrastructure',  tier: 1 },
  // T51-T52: Calculated overlay tables (derived fields split from L2 snapshots)
  { id: 'T51', name: 'facility_financial_calc',            category: 'Financial Performance',          tier: 1 },
  { id: 'T52', name: 'facility_exposure_calc',             category: 'Exposure & Position',            tier: 1 },
  // T53-T54: Promoted from L2 (entirely computed tables)
  { id: 'T53', name: 'data_quality_score_calc',             category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T54', name: 'facility_stress_test_calc',          category: 'Stress Testing',                 tier: 1 },
  // T55-T56: Additional calculated overlay tables (derived fields split from L2 snapshots)
  { id: 'T55', name: 'facility_risk_calc',                  category: 'Exposure & Position',            tier: 1 },
  { id: 'T56', name: 'netting_set_exposure_calc',           category: 'Exposure & Position',            tier: 1 },
  // T57-T61: Layer reassignment overlay tables (derived fields split from L2 per architecture review)
  { id: 'T57', name: 'counterparty_rating_calc',            category: 'Credit Risk & Ratings',          tier: 1 },
  { id: 'T58', name: 'facility_pricing_calc',               category: 'Financial Performance',          tier: 1 },
  { id: 'T60', name: 'collateral_calc',                     category: 'Collateral & Risk Mitigation',   tier: 1 },
  // T62: GL calculated overlay (derived fields split from L2 gl_account_balance_snapshot)
  { id: 'T62', name: 'gl_account_balance_calc',             category: 'Financial Performance',          tier: 1 },
  // T63-T66: Calculation engine infrastructure tables
  { id: 'T63', name: 'calc_run',                             category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T64', name: 'calc_audit_log',                       category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T65', name: 'calc_validation_result',               category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T66', name: 'metric_result',                        category: 'Data Quality & Infrastructure',  tier: 1 },

  // ── ECL / Watchlist (Credit Risk) ──
  { id: 'T67', name: 'ecl_provision_calc',                  category: 'Credit Risk & Ratings',          tier: 1 },
  { id: 'T68', name: 'ecl_allowance_movement',              category: 'Credit Risk & Ratings',          tier: 2 },
  { id: 'T69', name: 'watchlist_movement_summary',           category: 'Credit Risk & Ratings',          tier: 2 },

  // ── Stress Testing ──
  { id: 'T70', name: 'stress_test_result_calc',              category: 'Stress Testing',                 tier: 1 },

  // ── Dashboard Derived (wide denormalized tables for CRO dashboard) ──
  { id: 'T78', name: 'facility_derived',                     category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T79', name: 'counterparty_derived',                 category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T80', name: 'desk_derived',                         category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T81', name: 'portfolio_derived',                    category: 'Business Segment & Dashboard',   tier: 4 },
  { id: 'T82', name: 'segment_derived',                      category: 'Business Segment & Dashboard',   tier: 4 },

  // ── Layer Integrity Overlays (migration 011) ──
  { id: 'T83', name: 'capital_position_calc',                category: 'Regulatory & Capital',           tier: 1 },
  { id: 'T84', name: 'counterparty_financial_calc',          category: 'Counterparty & Entity',          tier: 1 },
  { id: 'T85', name: 'exception_event_calc',                 category: 'Limits & Risk Appetite',         tier: 1 },

  // ── Metric Governance (migration 011) ──
  { id: 'T86', name: 'metric_change_log',                    category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T87', name: 'metric_sandbox_run',                   category: 'Data Quality & Infrastructure',  tier: 1 },
  { id: 'T88', name: 'schema_change_log',                    category: 'Data Quality & Infrastructure',  tier: 1 },
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

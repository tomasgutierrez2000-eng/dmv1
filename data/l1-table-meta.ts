/**
 * L1 table metadata — non-structural information that the DDL/database doesn't carry.
 * SCD type and category are business metadata, not physical schema properties.
 *
 * The golden source for structural data (tables, columns, types, PKs, FKs) is PostgreSQL.
 * This file provides ONLY display metadata for the Excel exporter and visualizer.
 */

export interface L1TableMeta {
  name: string;
  scd: 'SCD-0' | 'SCD-1' | 'SCD-2' | 'Snapshot';
  category: string;
}

export const L1_TABLE_META: L1TableMeta[] = [
  // ── SCD-0 (Fixed Reference Dims) ──
  { name: 'currency_dim', scd: 'SCD-0', category: 'Currency' },
  { name: 'country_dim', scd: 'SCD-0', category: 'Geography' },
  { name: 'region_dim', scd: 'SCD-0', category: 'Geography' },
  { name: 'regulatory_jurisdiction', scd: 'SCD-0', category: 'Regulatory' },
  { name: 'entity_type_dim', scd: 'SCD-0', category: 'Counterparty' },
  { name: 'credit_event_type_dim', scd: 'SCD-0', category: 'Credit Risk Status' },
  { name: 'credit_status_dim', scd: 'SCD-0', category: 'Credit Risk Status' },
  { name: 'exposure_type_dim', scd: 'SCD-0', category: 'Exposure Classification' },
  { name: 'amendment_status_dim', scd: 'SCD-0', category: 'Credit Events / Amendments' },
  { name: 'amendment_type_dim', scd: 'SCD-0', category: 'Credit Events / Amendments' },
  { name: 'default_definition_dim', scd: 'SCD-0', category: 'Default Rules' },
  { name: 'internal_risk_rating_bucket_dim', scd: 'SCD-0', category: 'Ratings' },
  { name: 'pricing_tier_dim', scd: 'SCD-0', category: 'Facility' },
  { name: 'risk_rating_tier_dim', scd: 'SCD-0', category: 'Ratings' },
  { name: 'dpd_bucket_dim', scd: 'SCD-0', category: 'Credit Risk Status' },
  { name: 'utilization_status_dim', scd: 'SCD-0', category: 'Facility' },
  { name: 'origination_date_bucket_dim', scd: 'SCD-0', category: 'Calendar & Time' },
  { name: 'limit_status_dim', scd: 'SCD-0', category: 'Limits & Thresholds' },
  { name: 'exception_status_dim', scd: 'SCD-0', category: 'Facility' },
  { name: 'rating_change_status_dim', scd: 'SCD-0', category: 'Ratings' },
  { name: 'maturity_bucket_dim', scd: 'SCD-0', category: 'Calendar & Time' },
  { name: 'fr2590_category_dim', scd: 'SCD-0', category: 'Regulatory Mapping' },
  { name: 'counterparty_role_dim', scd: 'SCD-0', category: 'Counterparty Participation' },
  { name: 'rating_scale_dim', scd: 'SCD-0', category: 'Ratings' },
  { name: 'crm_type_dim', scd: 'SCD-0', category: 'Collateral & CRM' },
  { name: 'risk_mitigant_type_dim', scd: 'SCD-0', category: 'Collateral & CRM' },
  { name: 'date_dim', scd: 'SCD-0', category: 'Calendar & Time' },
  { name: 'date_time_dim', scd: 'SCD-0', category: 'Calendar & Time' },
  { name: 'regulatory_capital_basis_dim', scd: 'SCD-0', category: 'Regulatory' },
  { name: 'reporting_calendar_dim', scd: 'SCD-0', category: 'Calendar & Time' },

  // ── SCD-1 (Overwrite) ──
  { name: 'source_system_registry', scd: 'SCD-1', category: 'Run Control & Lineage' },
  { name: 'industry_dim', scd: 'SCD-1', category: 'Industry' },
  { name: 'enterprise_business_taxonomy', scd: 'SCD-1', category: 'Business Taxonomy' },
  { name: 'enterprise_product_taxonomy', scd: 'SCD-1', category: 'Product Taxonomy' },
  { name: 'portfolio_dim', scd: 'SCD-1', category: 'Portfolio' },
  { name: 'org_unit_dim', scd: 'SCD-1', category: 'Organization' },
  { name: 'rating_source', scd: 'SCD-1', category: 'Ratings' },
  { name: 'rating_grade_dim', scd: 'SCD-1', category: 'Ratings' },
  { name: 'collateral_type', scd: 'SCD-1', category: 'Collateral & CRM' },
  { name: 'interest_rate_index_dim', scd: 'SCD-1', category: 'Market Data' },
  { name: 'ledger_account_dim', scd: 'SCD-1', category: 'General Ledger' },
  { name: 'context_dim', scd: 'SCD-1', category: 'Metrics & Context' },
  { name: 'metric_definition_dim', scd: 'SCD-1', category: 'Metrics & Context' },
  { name: 'instrument_identifier', scd: 'SCD-1', category: 'Instrument' },
  { name: 'collateral_eligibility_dim', scd: 'SCD-1', category: 'Collateral & CRM' },
  { name: 'collateral_haircut_dim', scd: 'SCD-1', category: 'Collateral & CRM' },
  { name: 'crm_eligibility_dim', scd: 'SCD-1', category: 'Collateral & CRM' },
  { name: 'collateral_portfolio', scd: 'SCD-1', category: 'Portfolio' },
  { name: 'sccl_counterparty_group', scd: 'SCD-1', category: 'SCCL Grouping' },
  { name: 'sccl_counterparty_group_member', scd: 'SCD-1', category: 'SCCL Grouping' },
  { name: 'limit_rule', scd: 'SCD-1', category: 'Limits & Thresholds' },
  { name: 'limit_threshold', scd: 'SCD-1', category: 'Limits & Thresholds' },
  { name: 'run_control', scd: 'SCD-1', category: 'Run Control & Lineage' },
  { name: 'report_registry', scd: 'SCD-1', category: 'Run Control & Lineage' },
  { name: 'reporting_entity_dim', scd: 'SCD-1', category: 'Legal Entity' },
  { name: 'model_registry_dim', scd: 'SCD-1', category: 'Models' },
  { name: 'rule_registry', scd: 'SCD-1', category: 'Models' },
  { name: 'validation_check_registry', scd: 'SCD-1', category: 'Run Control & Lineage' },
  { name: 'reconciliation_control', scd: 'SCD-1', category: 'Run Control & Lineage' },
  { name: 'regulatory_mapping', scd: 'SCD-1', category: 'Regulatory' },
  { name: 'report_cell_definition', scd: 'SCD-1', category: 'Regulatory' },
  { name: 'rating_mapping', scd: 'SCD-1', category: 'Ratings' },
  { name: 'scenario_dim', scd: 'SCD-1', category: 'Scenario' },

  // ── Tables in DB but not in original TS definitions ──
  { name: 'metric_threshold', scd: 'SCD-1', category: 'Limits & Thresholds' },

  // ── Capital Allocation ──
  { name: 'capital_allocation', scd: 'SCD-1', category: 'Capital Allocation' },
];

/** Lookup helper. Returns undefined if table has no metadata entry. */
export const L1_META_MAP = new Map(L1_TABLE_META.map(t => [t.name, t]));

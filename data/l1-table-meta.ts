/**
 * L1 table metadata — non-structural information that the DDL/database doesn't carry.
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

export interface L1TableMeta {
  name: string;
  scd: 'SCD-0' | 'SCD-1' | 'SCD-2' | 'Snapshot';
  category: string;
}

export const L1_TABLE_META: L1TableMeta[] = [
  // ── SCD-0 (Fixed Reference Dims) ──
  { name: 'currency_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'country_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'region_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'regulatory_jurisdiction', scd: 'SCD-0', category: 'Regulatory & Capital' },
  { name: 'entity_type_dim', scd: 'SCD-0', category: 'Counterparty & Entity' },
  { name: 'duns_entity_dim', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'credit_event_type_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'credit_status_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'exposure_type_dim', scd: 'SCD-0', category: 'Exposure & Position' },
  { name: 'amendment_status_dim', scd: 'SCD-0', category: 'Amendments & Forbearance' },
  { name: 'amendment_type_dim', scd: 'SCD-0', category: 'Amendments & Forbearance' },
  { name: 'default_definition_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'internal_risk_rating_bucket_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'pricing_tier_dim', scd: 'SCD-0', category: 'Financial Performance' },
  { name: 'risk_rating_tier_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'dpd_bucket_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'utilization_status_dim', scd: 'SCD-0', category: 'Financial Performance' },
  { name: 'origination_date_bucket_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'limit_status_dim', scd: 'SCD-0', category: 'Limits & Risk Appetite' },
  { name: 'rating_change_status_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'maturity_bucket_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'fr2590_category_dim', scd: 'SCD-0', category: 'Regulatory & Capital' },
  { name: 'counterparty_role_dim', scd: 'SCD-0', category: 'Counterparty & Entity' },
  { name: 'rating_scale_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'crm_type_dim', scd: 'SCD-0', category: 'Collateral & Risk Mitigation' },
  { name: 'risk_mitigant_type_dim', scd: 'SCD-0', category: 'Collateral & Risk Mitigation' },
  { name: 'date_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'date_time_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },
  { name: 'regulatory_capital_basis_dim', scd: 'SCD-0', category: 'Regulatory & Capital' },
  { name: 'reporting_calendar_dim', scd: 'SCD-0', category: 'Data Quality & Infrastructure' },

  // ── SCD-1 (Overwrite) ──
  { name: 'source_system_registry', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'industry_dim', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'enterprise_business_taxonomy', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'enterprise_product_taxonomy', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'portfolio_dim', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'org_unit_dim', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'rating_source', scd: 'SCD-1', category: 'Credit Risk & Ratings' },
  { name: 'rating_grade_dim', scd: 'SCD-1', category: 'Credit Risk & Ratings' },
  { name: 'collateral_type', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'interest_rate_index_dim', scd: 'SCD-1', category: 'Financial Performance' },
  { name: 'ledger_account_dim', scd: 'SCD-1', category: 'Financial Performance' },
  { name: 'context_dim', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'metric_definition_dim', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'instrument_identifier', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'collateral_eligibility_dim', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'collateral_haircut_dim', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'crm_eligibility_dim', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'collateral_portfolio', scd: 'SCD-1', category: 'Collateral & Risk Mitigation' },
  { name: 'sccl_counterparty_group', scd: 'SCD-1', category: 'Limits & Risk Appetite' },
  { name: 'sccl_counterparty_group_member', scd: 'SCD-1', category: 'Limits & Risk Appetite' },
  { name: 'limit_rule', scd: 'SCD-1', category: 'Limits & Risk Appetite' },
  { name: 'limit_threshold', scd: 'SCD-1', category: 'Limits & Risk Appetite' },
  { name: 'run_control', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'report_registry', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'reporting_entity_dim', scd: 'SCD-1', category: 'Counterparty & Entity' },
  { name: 'model_registry_dim', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'rule_registry', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'validation_check_registry', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'reconciliation_control', scd: 'SCD-1', category: 'Data Quality & Infrastructure' },
  { name: 'regulatory_mapping', scd: 'SCD-1', category: 'Regulatory & Capital' },
  { name: 'report_cell_definition', scd: 'SCD-1', category: 'Regulatory & Capital' },
  { name: 'rating_mapping', scd: 'SCD-1', category: 'Credit Risk & Ratings' },
  { name: 'scenario_dim', scd: 'SCD-1', category: 'Stress Testing' },

  // ── Tables added via migrations ──
  { name: 'metric_threshold', scd: 'SCD-1', category: 'Limits & Risk Appetite' },
  { name: 'equity_allocation_config', scd: 'SCD-1', category: 'Regulatory & Capital' },
  { name: 'capital_allocation', scd: 'SCD-2', category: 'Regulatory & Capital' }, // SCD-2: allocation targets change with regulatory updates; has as_of_date in PK
  { name: 'ecl_stage_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'impairment_model_dim', scd: 'SCD-1', category: 'Credit Risk & Ratings' },
  { name: 'forbearance_type_dim', scd: 'SCD-0', category: 'Amendments & Forbearance' },
  { name: 'watchlist_category_dim', scd: 'SCD-0', category: 'Credit Risk & Ratings' },
  { name: 'basel_exposure_type_dim', scd: 'SCD-0', category: 'Regulatory & Capital' }, // Basel III exposure classes (migration 002)
  { name: 'regulatory_capital_requirement', scd: 'SCD-1', category: 'Regulatory & Capital' }, // Fed-published capital reqs (migration 002). EXCEPTION: 5 total_*_req_pct fields are additive sums kept in L1 because the Fed publishes these totals directly in GSIB disclosures.

  // ── Accepted L1→L2 FK exceptions ──
  // These L1 tables reference L2 operational masters. This is an accepted architectural
  // exception: counterparty, legal_entity, and instrument_master are foundational entities
  // that sit in L2 due to SCD-2 versioning but serve as reference points for L1 config.
  // Pattern: CONFIG_TO_MASTER / REFERENCE_TO_MASTER — L1 configuration tables
  // legitimately reference L2 masters for entity-keyed lookups.
  //
  // Affected tables:
  //   sccl_counterparty_group_member  → l2.counterparty          (group membership)
  //   instrument_identifier           → l2.instrument_master      (identifier mapping)
  //   reporting_entity_dim            → l2.legal_entity           (reporting view)
  //   capital_allocation              → l2.legal_entity           (allocation config)
  //   regulatory_capital_requirement  → l2.legal_entity           (Fed capital reqs)
  //
  // Reviewed and accepted per GSIB data model audit (2026-03).
];

/** Lookup helper. Returns undefined if table has no metadata entry. */
export const L1_META_MAP = new Map(L1_TABLE_META.map(t => [t.name, t]));

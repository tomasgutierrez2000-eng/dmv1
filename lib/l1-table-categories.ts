/**
 * Canonical order for categories in the main view (domain-overview).
 * Use this so the canvas groups tables in a consistent, logical order.
 */
export const L1_CATEGORY_ORDER = [
  'Reference',
  'Date & time',
  'Source & taxonomy',
  'Entity masters',
  'Facility & agreement',
  'Netting, collateral & CRM',
  'Hierarchies & participation',
  'Limits & FX',
  'Run & reporting',
] as const;

/**
 * Maps L1 table names to the same category labels used in the Excel upload (table category column).
 * Use this so "Load L1 demo" groups tables like an uploaded data dictionary.
 */
export const L1_TABLE_CATEGORIES: Record<string, string> = {
  // Reference dimensions
  currency_dim: 'Reference',
  country_dim: 'Reference',
  region_dim: 'Reference',
  regulatory_jurisdiction: 'Reference',
  entity_type_dim: 'Reference',
  credit_event_type_dim: 'Reference',
  credit_status_dim: 'Reference',
  exposure_type_dim: 'Reference',
  amendment_status_dim: 'Reference',
  amendment_type_dim: 'Reference',
  default_definition_dim: 'Reference',
  maturity_bucket_dim: 'Reference',
  fr2590_category_dim: 'Reference',
  counterparty_role_dim: 'Reference',
  rating_scale_dim: 'Reference',
  crm_type_dim: 'Reference',
  // Date & time
  date_dim: 'Date & time',
  date_time_dim: 'Date & time',
  // Source & taxonomy
  source_system_registry: 'Source & taxonomy',
  regulatory_capital_basis_dim: 'Source & taxonomy',
  industry_dim: 'Source & taxonomy',
  enterprise_business_taxonomy: 'Source & taxonomy',
  enterprise_product_taxonomy: 'Source & taxonomy',
  portfolio_dim: 'Source & taxonomy',
  org_unit_dim: 'Source & taxonomy',
  rating_source: 'Source & taxonomy',
  rating_grade_dim: 'Source & taxonomy',
  collateral_type: 'Source & taxonomy',
  interest_rate_index_dim: 'Source & taxonomy',
  ledger_account_dim: 'Source & taxonomy',
  context_dim: 'Source & taxonomy',
  metric_definition_dim: 'Source & taxonomy',
  // Entity masters
  counterparty: 'Entity masters',
  legal_entity: 'Entity masters',
  instrument_master: 'Entity masters',
  instrument_identifier: 'Entity masters',
  // Facility & agreement
  credit_agreement_master: 'Facility & agreement',
  facility_master: 'Facility & agreement',
  contract_master: 'Facility & agreement',
  // Netting, collateral & CRM
  netting_agreement: 'Netting, collateral & CRM',
  netting_set: 'Netting, collateral & CRM',
  netting_set_link: 'Netting, collateral & CRM',
  csa_master: 'Netting, collateral & CRM',
  margin_agreement: 'Netting, collateral & CRM',
  collateral_asset_master: 'Netting, collateral & CRM',
  collateral_link: 'Netting, collateral & CRM',
  collateral_eligibility_dim: 'Netting, collateral & CRM',
  collateral_haircut_dim: 'Netting, collateral & CRM',
  crm_eligibility_dim: 'Netting, collateral & CRM',
  crm_protection_master: 'Netting, collateral & CRM',
  protection_link: 'Netting, collateral & CRM',
  risk_mitigant_type_dim: 'Netting, collateral & CRM',
  risk_mitigant_master: 'Netting, collateral & CRM',
  risk_mitigant_link: 'Netting, collateral & CRM',
  collateral_portfolio: 'Netting, collateral & CRM',
  // Hierarchies & participation
  counterparty_hierarchy: 'Hierarchies & participation',
  legal_entity_hierarchy: 'Hierarchies & participation',
  control_relationship: 'Hierarchies & participation',
  economic_interdependence_relationship: 'Hierarchies & participation',
  credit_agreement_counterparty_participation: 'Hierarchies & participation',
  facility_counterparty_participation: 'Hierarchies & participation',
  sccl_counterparty_group: 'Hierarchies & participation',
  sccl_counterparty_group_member: 'Hierarchies & participation',
  // Limits & FX
  limit_rule: 'Limits & FX',
  limit_threshold: 'Limits & FX',
  fx_rate: 'Limits & FX',
  // Run & reporting
  run_control: 'Run & reporting',
  report_registry: 'Run & reporting',
  reporting_calendar_dim: 'Run & reporting',
  reporting_entity_dim: 'Run & reporting',
  model_registry_dim: 'Run & reporting',
  rule_registry: 'Run & reporting',
  validation_check_registry: 'Run & reporting',
  reconciliation_control: 'Run & reporting',
  regulatory_mapping: 'Run & reporting',
  report_cell_definition: 'Run & reporting',
  rating_mapping: 'Run & reporting',
  scenario_dim: 'Run & reporting',
};

const DEFAULT_CATEGORY = 'L1';

export function getL1Category(tableName: string): string {
  return L1_TABLE_CATEGORIES[tableName] ?? DEFAULT_CATEGORY;
}

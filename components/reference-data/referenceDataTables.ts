/**
 * Curated list of L1 reference data tables that are "customizable per bank".
 * Used as both UI config (grouping, descriptions) and API safelist (prevents arbitrary table access).
 */

export interface ReferenceDataTableDef {
  name: string;
  category: string;
  description: string;
  scd: 'SCD-0' | 'SCD-1' | 'SCD-2' | 'Snapshot';
  importance: 'core' | 'supporting';
}

export const REFERENCE_DATA_TABLES: ReferenceDataTableDef[] = [
  // ── Fixed Dimensions (SCD-0) ──
  { name: 'currency_dim', category: 'Currency & FX', description: 'ISO currency codes and attributes', scd: 'SCD-0', importance: 'core' },
  { name: 'country_dim', category: 'Geography', description: 'Country codes, names, and region mappings', scd: 'SCD-0', importance: 'core' },
  { name: 'region_dim', category: 'Geography', description: 'Geographic regions for country grouping', scd: 'SCD-0', importance: 'supporting' },
  { name: 'credit_status_dim', category: 'Credit Risk', description: 'Credit status codes (current, watch, default, etc.)', scd: 'SCD-0', importance: 'core' },
  { name: 'credit_event_type_dim', category: 'Credit Risk', description: 'Types of credit events (default, restructure, etc.)', scd: 'SCD-0', importance: 'supporting' },
  { name: 'entity_type_dim', category: 'Counterparty', description: 'Legal entity types (corporation, sovereign, etc.)', scd: 'SCD-0', importance: 'supporting' },
  { name: 'exposure_type_dim', category: 'Exposure Classification', description: 'Exposure type codes (drawn, undrawn, contingent)', scd: 'SCD-0', importance: 'core' },
  { name: 'pricing_tier_dim', category: 'Facility', description: 'Pricing tier grid for facility pricing', scd: 'SCD-0', importance: 'supporting' },
  { name: 'maturity_bucket_dim', category: 'Calendar & Time', description: 'Maturity tenor buckets for exposure grouping', scd: 'SCD-0', importance: 'supporting' },
  { name: 'rating_scale_dim', category: 'Ratings', description: 'Rating agency scales (S&P, Moody\'s, internal)', scd: 'SCD-0', importance: 'core' },
  { name: 'internal_risk_rating_bucket_dim', category: 'Ratings', description: 'Internal risk grade buckets', scd: 'SCD-0', importance: 'supporting' },
  { name: 'risk_rating_tier_dim', category: 'Ratings', description: 'Risk rating tier boundaries and labels', scd: 'SCD-0', importance: 'supporting' },
  { name: 'dpd_bucket_dim', category: 'Credit Risk', description: 'Days-past-due delinquency buckets', scd: 'SCD-0', importance: 'supporting' },
  { name: 'utilization_status_dim', category: 'Facility', description: 'Facility utilization status classifications', scd: 'SCD-0', importance: 'supporting' },
  { name: 'origination_date_bucket_dim', category: 'Calendar & Time', description: 'Origination vintage buckets for cohort analysis', scd: 'SCD-0', importance: 'supporting' },
  { name: 'default_definition_dim', category: 'Credit Risk', description: 'Default definition rules per regulatory framework', scd: 'SCD-0', importance: 'supporting' },
  { name: 'collateral_type', category: 'Collateral & CRM', description: 'Collateral asset type classification', scd: 'SCD-1', importance: 'core' },
  { name: 'crm_type_dim', category: 'Collateral & CRM', description: 'Credit risk mitigation technique types', scd: 'SCD-0', importance: 'supporting' },
  { name: 'risk_mitigant_type_dim', category: 'Collateral & CRM', description: 'Risk mitigant types (guarantee, credit derivative, etc.)', scd: 'SCD-0', importance: 'supporting' },
  { name: 'regulatory_jurisdiction', category: 'Regulatory', description: 'Regulatory jurisdictions and frameworks', scd: 'SCD-0', importance: 'core' },
  { name: 'regulatory_capital_basis_dim', category: 'Regulatory', description: 'Capital calculation approaches (SA, IRB, etc.)', scd: 'SCD-0', importance: 'supporting' },
  { name: 'fr2590_category_dim', category: 'Regulatory', description: 'FR 2590 regulatory report categories', scd: 'SCD-0', importance: 'supporting' },
  { name: 'amendment_type_dim', category: 'Credit Events', description: 'Credit amendment types (waiver, modification, etc.)', scd: 'SCD-0', importance: 'supporting' },
  { name: 'amendment_status_dim', category: 'Credit Events', description: 'Amendment workflow status codes', scd: 'SCD-0', importance: 'supporting' },
  { name: 'counterparty_role_dim', category: 'Counterparty', description: 'Counterparty participation roles (borrower, guarantor, etc.)', scd: 'SCD-0', importance: 'supporting' },

  // ── Taxonomy & Lookup (SCD-1) ──
  { name: 'industry_dim', category: 'Industry & Taxonomy', description: 'Industry classification codes (NAICS, SIC, GICS)', scd: 'SCD-1', importance: 'core' },
  { name: 'enterprise_business_taxonomy', category: 'Industry & Taxonomy', description: 'Business segment and line-of-business hierarchy', scd: 'SCD-1', importance: 'core' },
  { name: 'enterprise_product_taxonomy', category: 'Industry & Taxonomy', description: 'Product type hierarchy and classification', scd: 'SCD-1', importance: 'core' },
  { name: 'portfolio_dim', category: 'Portfolio & Organization', description: 'Portfolio definitions for grouping facilities', scd: 'SCD-1', importance: 'core' },
  { name: 'org_unit_dim', category: 'Portfolio & Organization', description: 'Organizational units (desks, divisions, teams)', scd: 'SCD-1', importance: 'supporting' },
  { name: 'rating_grade_dim', category: 'Ratings', description: 'Rating grade definitions within each scale', scd: 'SCD-1', importance: 'core' },
  { name: 'rating_source', category: 'Ratings', description: 'Rating agency/source identifiers', scd: 'SCD-1', importance: 'supporting' },
  { name: 'rating_mapping', category: 'Ratings', description: 'Cross-walk mapping between rating scales', scd: 'SCD-1', importance: 'supporting' },
  { name: 'metric_definition_dim', category: 'Metrics & Thresholds', description: 'Metric identifiers and definitions', scd: 'SCD-1', importance: 'core' },
  { name: 'metric_threshold', category: 'Metrics & Thresholds', description: 'Metric threshold and alert configuration', scd: 'SCD-1', importance: 'supporting' },
  { name: 'limit_rule', category: 'Metrics & Thresholds', description: 'Concentration limit rules', scd: 'SCD-1', importance: 'core' },
  { name: 'limit_threshold', category: 'Metrics & Thresholds', description: 'Limit breach threshold definitions', scd: 'SCD-1', importance: 'supporting' },
  { name: 'interest_rate_index_dim', category: 'Market Data', description: 'Interest rate benchmark indices (SOFR, LIBOR, etc.)', scd: 'SCD-1', importance: 'supporting' },
  { name: 'scenario_dim', category: 'Scenario', description: 'Stress test and scenario definitions', scd: 'SCD-1', importance: 'core' },
  { name: 'collateral_eligibility_dim', category: 'Collateral & CRM', description: 'Collateral eligibility criteria by type and jurisdiction', scd: 'SCD-1', importance: 'supporting' },
  { name: 'collateral_haircut_dim', category: 'Collateral & CRM', description: 'Haircut percentages by collateral type', scd: 'SCD-1', importance: 'supporting' },
  { name: 'regulatory_mapping', category: 'Regulatory', description: 'Regulatory report field mapping rules', scd: 'SCD-1', importance: 'supporting' },
  { name: 'reporting_entity_dim', category: 'Regulatory', description: 'Reporting legal entities for regulatory submissions', scd: 'SCD-1', importance: 'supporting' },
  { name: 'ledger_account_dim', category: 'General Ledger', description: 'Chart of accounts / GL account definitions', scd: 'SCD-1', importance: 'supporting' },
];

/** Set of valid table names for API safelist. */
export const REFERENCE_TABLE_NAMES = new Set(REFERENCE_DATA_TABLES.map(t => t.name));

/** Group tables by category, preserving insertion order. */
export function groupByCategory(tables: ReferenceDataTableDef[]): Record<string, ReferenceDataTableDef[]> {
  const groups: Record<string, ReferenceDataTableDef[]> = {};
  for (const t of tables) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}

/** All unique categories in display order. */
export const CATEGORIES = [...new Set(REFERENCE_DATA_TABLES.map(t => t.category))];

/** All unique SCD types. */
export const SCD_TYPES = ['SCD-0', 'SCD-1'] as const;

/**
 * Metric Library Excel template: sheet names, column mapping, required fields.
 * Used by export/template, export (current library), and import API.
 */

export const LIBRARY_SHEET_NAMES = {
  INSTRUCTIONS: 'Instructions',
  DOMAINS: 'Domains',
  PARENT_METRICS: 'ParentMetrics',
  VARIANTS: 'Variants',
} as const;

/** Required column keys per sheet (at least one header must match). */
export const REQUIRED_COLUMNS = {
  Domains: ['domain_id', 'domain_name'],
  ParentMetrics: ['metric_id', 'metric_name', 'definition', 'generic_formula', 'metric_class', 'unit_type', 'direction', 'domain_ids'],
  Variants: ['variant_id', 'variant_name', 'parent_metric_id', 'variant_type', 'status', 'version', 'effective_date', 'formula_display'],
} as const;

/** Alternate header names for flexible parsing (case-insensitive match). */
export const COLUMN_ALIASES: Record<string, string[][]> = {
  domain_id: [['domain_id', 'domain id', 'id']],
  domain_name: [['domain_name', 'domain name', 'name']],
  domain_description: [['domain_description', 'domain description', 'description']],
  icon: [['icon']],
  color: [['color']],
  regulatory_relevance: [['regulatory_relevance', 'regulatory relevance']],
  primary_stakeholders: [['primary_stakeholders', 'primary stakeholders', 'stakeholders']],

  metric_id: [['metric_id', 'metric id']],
  metric_name: [['metric_name', 'metric name', 'name']],
  definition: [['definition']],
  generic_formula: [['generic_formula', 'generic formula', 'formula']],
  metric_class: [['metric_class', 'metric class', 'class']],
  unit_type: [['unit_type', 'unit type', 'unit']],
  direction: [['direction']],
  risk_appetite_relevant: [['risk_appetite_relevant', 'risk appetite relevant']],
  rollup_philosophy: [['rollup_philosophy', 'rollup philosophy']],
  rollup_description: [['rollup_description', 'rollup description']],
  domain_ids: [['domain_ids', 'domain ids', 'domains']],
  regulatory_references: [['regulatory_references', 'regulatory references']],

  variant_id: [['variant_id', 'variant id', 'id']],
  variant_name: [['variant_name', 'variant name', 'name']],
  parent_metric_id: [['parent_metric_id', 'parent metric id', 'parent_id', 'parent id']],
  variant_type: [['variant_type', 'variant type', 'type']],
  status: [['status']],
  version: [['version']],
  effective_date: [['effective_date', 'effective date', 'effective date']],
  formula_display: [['formula_display', 'formula display', 'formula']],
  formula_specification: [['formula_specification', 'formula specification']],
  detailed_description: [['detailed_description', 'detailed description', 'description']],
  rollup_facility: [['rollup_facility', 'rollup facility', 'facility']],
  rollup_counterparty: [['rollup_counterparty', 'rollup counterparty', 'counterparty']],
  rollup_desk: [['rollup_desk', 'rollup desk', 'desk']],
  rollup_portfolio: [['rollup_portfolio', 'rollup portfolio', 'portfolio']],
  rollup_lob: [['rollup_lob', 'rollup lob', 'lob']],
  weighting_basis: [['weighting_basis', 'weighting basis']],
  executable_metric_id: [['executable_metric_id', 'executable metric id']],
  owner_team: [['owner_team', 'owner team', 'owner']],
  approver: [['approver']],
  review_cycle: [['review_cycle', 'review cycle']],
  source_system: [['source_system', 'source system']],
  source_field_name: [['source_field_name', 'source field name']],
  refresh_frequency: [['refresh_frequency', 'refresh frequency']],
  used_by_dashboards: [['used_by_dashboards', 'used by dashboards', 'dashboards']],

  calculation_authority_tier: [['calculation_authority_tier', 'calculation authority tier', 'authority tier']],
  calculation_authority_tier_future: [['calculation_authority_tier_future', 'calculation authority tier future']],
  calculation_authority_rationale: [['calculation_authority_rationale', 'calculation authority rationale']],
  calculation_authority_components: [['calculation_authority_components', 'calculation authority components']],
  calculation_authority_future_evolution: [['calculation_authority_future_evolution', 'calculation authority future evolution']],
  calculation_authority_migration_path: [['calculation_authority_migration_path', 'calculation authority migration path']],
  expected_gsib_data_source: [['expected_gsib_data_source', 'expected gsib data source', 'gsib data source']],
  source_integration_pattern: [['source_integration_pattern', 'source integration pattern', 'integration pattern']],
  source_delivery_method: [['source_delivery_method', 'source delivery method', 'delivery method']],
  source_endpoint_or_feed: [['source_endpoint_or_feed', 'source endpoint or feed', 'endpoint or feed']],
  source_variant_identifier: [['source_variant_identifier', 'source variant identifier', 'variant identifier']],
  source_payload_spec: [['source_payload_spec', 'source payload spec', 'payload spec']],
  source_setup_validation_notes: [['source_setup_validation_notes', 'source setup validation notes', 'setup validation notes']],
  atomic_sourcing_level: [['atomic_sourcing_level', 'atomic sourcing level', 'sourcing level']],
  reconciliation_anchor_levels: [['reconciliation_anchor_levels', 'reconciliation anchor levels', 'anchor levels']],
  sourcing_level_rationale: [['sourcing_level_rationale', 'sourcing level rationale', 'sourcing rationale']],
  sourcing_do_not_source: [['sourcing_do_not_source', 'sourcing do not source', 'do not source']],
  sourcing_category: [['sourcing_category', 'sourcing category', 'sourcing category']],
  data_format: [['data_format', 'data format']],
  data_lag: [['data_lag', 'data lag']],
};

/** Find column index by header row and possible keys (uses COLUMN_ALIASES). */
export function findLibraryColumnIndex(
  headers: string[],
  keys: string[]
): number {
  const normalized = headers.map((h) => String(h ?? '').trim().toLowerCase());
  for (const key of keys) {
    const aliases = COLUMN_ALIASES[key];
    if (!aliases) {
      const idx = normalized.findIndex((h) => h === key.toLowerCase());
      if (idx >= 0) return idx;
      continue;
    }
    for (const group of aliases) {
      for (const alt of group) {
        const idx = normalized.findIndex((h) => h === alt.toLowerCase());
        if (idx >= 0) return idx;
      }
    }
  }
  return -1;
}

/** Get value from row by column index, trimmed string. */
export function getCell(row: unknown[], colIdx: number): string {
  if (colIdx < 0 || !row || colIdx >= row.length) return '';
  const v = row[colIdx];
  if (v == null) return '';
  return String(v).trim();
}

/** Parse comma-separated list. */
export function parseCommaList(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Parse boolean from cell (true, 1, yes). */
export function parseBool(value: string): boolean {
  const v = value.toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

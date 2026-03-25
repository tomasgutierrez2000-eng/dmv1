/**
 * Metric Studio — L3 Destination Table Mapping.
 *
 * Maps YAML metric ID prefixes to their primary L3 destination tables.
 * Used by the template API to resolve where a metric's results land.
 */

/** Maps YAML metric ID prefix → primary L3 destination table name. */
export const PREFIX_TO_L3_TABLE: Record<string, string> = {
  EXP: 'exposure_metric_cube',
  RSK: 'risk_metric_cube',
  CAP: 'facility_rwa_calc',
  PRC: 'lob_pricing_summary',
  PROF: 'lob_profitability_summary',
  REF: 'facility_derived',
  AMD: 'amendment_summary',
};

/**
 * Resolve L3 destination table from a metric's executable_metric_id (e.g., "EXP-015").
 * Returns null if the prefix is not in the mapping (ghost node case).
 */
export function resolveL3Destination(metricId: string): string | null {
  const prefix = metricId.split('-')[0];
  return PREFIX_TO_L3_TABLE[prefix] ?? null;
}

/**
 * Naming Convention Exceptions Registry
 *
 * Per GSIB data model naming rules, all `_id` suffixed fields should be BIGINT.
 * The fields below are documented exceptions where VARCHAR is intentional
 * because the identifier is not a surrogate numeric key.
 *
 * This file is consumed by validate-data-model.ts (Group 9, check 9.6)
 * to suppress false positives when scanning for `_id` VARCHAR mismatches.
 */

export interface NamingException {
  field_name: string;
  data_type: string;
  rationale: string;
}

export const varcharIdExceptions: NamingException[] = [
  {
    field_name: 'run_id',
    data_type: 'VARCHAR(64)',
    rationale: 'UUID-based calculation run identifier assigned by L3 orchestrator',
  },
  {
    field_name: 'hierarchy_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Composite hierarchy path (e.g., "SEG/PORT/DESK") — not a surrogate key',
  },
  {
    field_name: 'load_batch_id',
    data_type: 'VARCHAR(100)',
    rationale: 'ETL batch identifier from source system — format varies by source',
  },
  {
    field_name: 'raw_record_id',
    data_type: 'VARCHAR(200)',
    rationale: 'Source-system record identifier — opaque string, not a surrogate key',
  },
  {
    field_name: 'metric_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Metric catalogue identifier — human-readable code like "EAD_TOTAL"',
  },
  {
    field_name: 'variant_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Scenario variant identifier — human-readable code like "BASE" or "STRESS_1"',
  },
];

export const varcharIdFieldNames = new Set(
  varcharIdExceptions.map((e) => e.field_name),
);

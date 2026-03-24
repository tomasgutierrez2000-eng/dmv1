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
  {
    field_name: 'source_customer_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Customer identifier from source system — opaque string, not a surrogate key',
  },
  {
    field_name: 'customer_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Source-system customer identifier — varies by source, may be alphanumeric',
  },
  {
    field_name: 'qmna_id',
    data_type: 'VARCHAR(64)',
    rationale: 'FR2590 QMNA identifier — regulatory reference code, not a surrogate key',
  },
  {
    field_name: 'source_system_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Source system identifier code — human-readable label like "MUREX" or "CALYPSO"',
  },
  {
    field_name: 'borrowing_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Source-system borrowing identifier — opaque string from treasury system',
  },
  {
    field_name: 'hedge_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Hedge relationship identifier — source-system assigned, not a surrogate key',
  },
  {
    field_name: 'source_metric_id',
    data_type: 'VARCHAR(64)',
    rationale: 'Source metric identifier reference — catalogue code like "MET-001"',
  },
  {
    field_name: 'mdrm_id',
    data_type: 'VARCHAR(64)',
    rationale: 'FFIEC MDRM identifier code — regulatory standard alphanumeric key',
  },
  {
    field_name: 'mapped_line_id',
    data_type: 'VARCHAR(64)',
    rationale: 'FR2590 mapped line identifier — regulatory reference code',
  },
  {
    field_name: 'mapped_column_id',
    data_type: 'VARCHAR(64)',
    rationale: 'FR2590 mapped column identifier — regulatory reference code',
  },
  // Product-level tables (migrations 033+) use VARCHAR for source-system identifiers
  { field_name: 'changed_by_id', data_type: 'VARCHAR', rationale: 'Audit field — user/system identifier from source' },
  { field_name: 'commitment_id', data_type: 'VARCHAR', rationale: 'Source-system commitment identifier' },
  { field_name: 'deposit_id', data_type: 'VARCHAR', rationale: 'Source-system deposit identifier' },
  { field_name: 'derivative_id', data_type: 'VARCHAR', rationale: 'Source-system derivative contract identifier' },
  { field_name: 'entity_internal_id', data_type: 'VARCHAR', rationale: 'Internal entity identifier from source system' },
  { field_name: 'facility_id', data_type: 'VARCHAR', rationale: 'VARCHAR facility_id in product tables — source-system key' },
  { field_name: 'guarantor_id', data_type: 'VARCHAR', rationale: 'Source-system guarantor identifier' },
  { field_name: 'guarantor_internal_id', data_type: 'VARCHAR', rationale: 'Internal guarantor identifier from source system' },
  { field_name: 'hedging_id', data_type: 'VARCHAR', rationale: 'Source-system hedging relationship identifier' },
  { field_name: 'internal_credit_facility_id', data_type: 'VARCHAR', rationale: 'Internal credit facility identifier from source system' },
  { field_name: 'isda_id', data_type: 'VARCHAR', rationale: 'ISDA Master Agreement identifier' },
  { field_name: 'issuer_id', data_type: 'VARCHAR', rationale: 'Source-system issuer identifier' },
  { field_name: 'item_id', data_type: 'VARCHAR', rationale: 'Generic item identifier — catalogue or reference code' },
  { field_name: 'legal_entity_id', data_type: 'VARCHAR', rationale: 'VARCHAR legal_entity_id in product tables — source-system key' },
  { field_name: 'maturity_bucket_id', data_type: 'VARCHAR', rationale: 'Maturity bucket classification identifier' },
  { field_name: 'obligor_internal_id', data_type: 'VARCHAR', rationale: 'Internal obligor identifier from source system' },
  { field_name: 'original_internal_credit_facility_id', data_type: 'VARCHAR', rationale: 'Original internal credit facility identifier' },
  { field_name: 'portfolio_segment_id', data_type: 'VARCHAR', rationale: 'Portfolio segment classification identifier' },
  { field_name: 'primary_repayer_id', data_type: 'VARCHAR', rationale: 'Source-system primary repayer identifier' },
  { field_name: 'qmna_netting_id', data_type: 'VARCHAR', rationale: 'QMNA netting set identifier — regulatory reference' },
  { field_name: 'run_by_id', data_type: 'VARCHAR', rationale: 'Audit field — user/system that triggered the run' },
  { field_name: 'sft_contract_id', data_type: 'VARCHAR', rationale: 'Securities financing transaction contract identifier' },
  { field_name: 'snc_internal_credit_id', data_type: 'VARCHAR', rationale: 'SNC internal credit identifier from source system' },
  { field_name: 'stock_position_id', data_type: 'VARCHAR', rationale: 'Source-system stock position identifier' },
  { field_name: 'transaction_id', data_type: 'VARCHAR', rationale: 'Source-system transaction identifier' },
  { field_name: 'unique_id', data_type: 'VARCHAR', rationale: 'Generic unique identifier from source system' },
];

export const varcharIdFieldNames = new Set(
  varcharIdExceptions.map((e) => e.field_name),
);

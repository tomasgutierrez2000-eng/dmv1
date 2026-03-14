#!/usr/bin/env npx tsx
/**
 * Add ECL/Watchlist/Forbearance regulatory tables to the data dictionary.
 * These tables were created by migration 009.
 */
import fs from 'fs';
import path from 'path';

const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

const regulatoryTables = [
  // L1
  {
    name: 'ecl_stage_dim', layer: 'L1' as const, category: 'ECL/Impairment',
    data_owner: 'Risk Management', data_steward: 'Model Risk',
    fields: [
      { name: 'ecl_stage_code', description: 'ECL stage classification code (STAGE_1, STAGE_2, STAGE_3, POCI)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'stage_name', description: 'Human-readable stage name', data_type: 'VARCHAR(200)' },
      { name: 'description', description: 'Detailed description of the ECL stage', data_type: 'VARCHAR(500)' },
      { name: 'ifrs9_stage_mapping', description: 'Mapping to IFRS 9 stage designation', data_type: 'VARCHAR(50)' },
      { name: 'cecl_equivalent', description: 'Equivalent CECL (US GAAP) classification', data_type: 'VARCHAR(50)' },
      { name: 'display_order', description: 'Display order for UI rendering', data_type: 'INTEGER' },
      { name: 'is_active_flag', description: 'Whether this record is currently active', data_type: 'BOOLEAN' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'impairment_model_dim', layer: 'L1' as const, category: 'ECL/Impairment',
    data_owner: 'Risk Management', data_steward: 'Model Risk',
    fields: [
      { name: 'model_code', description: 'Impairment model code (IFRS9, CECL)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'model_name', description: 'Human-readable model name', data_type: 'VARCHAR(200)' },
      { name: 'regulatory_framework', description: 'Regulatory framework (IFRS, US_GAAP)', data_type: 'VARCHAR(50)' },
      { name: 'description', description: 'Detailed description of the impairment model', data_type: 'VARCHAR(500)' },
      { name: 'is_active_flag', description: 'Whether this record is currently active', data_type: 'BOOLEAN' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'watchlist_category_dim', layer: 'L1' as const, category: 'Watchlist',
    data_owner: 'Risk Management', data_steward: 'Data Governance',
    fields: [
      { name: 'watchlist_category_code', description: 'Watchlist category code (EARLY_WARNING, SPECIAL_MENTION, SUBSTANDARD, DOUBTFUL, LOSS)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'category_name', description: 'Human-readable category name', data_type: 'VARCHAR(200)' },
      { name: 'description', description: 'Detailed description of the watchlist category', data_type: 'VARCHAR(500)' },
      { name: 'severity_ordinal', description: 'Numeric severity ranking (1=lowest, 5=highest)', data_type: 'INTEGER' },
      { name: 'display_order', description: 'Display order for UI rendering', data_type: 'INTEGER' },
      { name: 'is_active_flag', description: 'Whether this record is currently active', data_type: 'BOOLEAN' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'forbearance_type_dim', layer: 'L1' as const, category: 'Forbearance',
    data_owner: 'Risk Management', data_steward: 'Data Governance',
    fields: [
      { name: 'forbearance_type_code', description: 'Forbearance type code (TERM_EXT, RATE_RED, PMT_HOLIDAY, etc.)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'type_name', description: 'Human-readable forbearance type name', data_type: 'VARCHAR(200)' },
      { name: 'description', description: 'Detailed description of the forbearance type', data_type: 'VARCHAR(500)' },
      { name: 'display_order', description: 'Display order for UI rendering', data_type: 'INTEGER' },
      { name: 'is_active_flag', description: 'Whether this record is currently active', data_type: 'BOOLEAN' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  // L2
  {
    name: 'ecl_staging_snapshot', layer: 'L2' as const, category: 'ECL/Impairment',
    data_owner: 'Credit Risk Operations', data_steward: 'Data Operations',
    fields: [
      { name: 'ecl_staging_id', description: 'Primary key for ECL staging record', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the staging snapshot', data_type: 'DATE' },
      { name: 'ecl_stage_code', description: 'Current ECL stage (FK to ecl_stage_dim)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'ecl_stage_dim', field: 'ecl_stage_code' } } },
      { name: 'prior_stage_code', description: 'Prior period ECL stage', data_type: 'VARCHAR(20)' },
      { name: 'stage_change_date', description: 'Date when stage transition occurred', data_type: 'DATE' },
      { name: 'stage_change_reason', description: 'Reason for stage transition', data_type: 'VARCHAR(500)' },
      { name: 'model_code', description: 'Impairment model used (FK to impairment_model_dim)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'impairment_model_dim', field: 'model_code' } } },
      { name: 'days_past_due', description: 'Number of days the payment is past due', data_type: 'INTEGER' },
      { name: 'is_significant_increase_flag', description: 'Whether a significant increase in credit risk was identified', data_type: 'BOOLEAN' },
      { name: 'is_credit_impaired_flag', description: 'Whether the exposure is credit-impaired', data_type: 'BOOLEAN' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(20)' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'watchlist_entry', layer: 'L2' as const, category: 'Watchlist',
    data_owner: 'Credit Risk Operations', data_steward: 'Data Operations',
    fields: [
      { name: 'watchlist_entry_id', description: 'Primary key for watchlist entry', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'watchlist_category_code', description: 'Watchlist category (FK to watchlist_category_dim)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'watchlist_category_dim', field: 'watchlist_category_code' } } },
      { name: 'entry_date', description: 'Date the entity was added to the watchlist', data_type: 'DATE' },
      { name: 'exit_date', description: 'Date the entity was removed from the watchlist', data_type: 'DATE' },
      { name: 'entry_reason', description: 'Reason for watchlist entry', data_type: 'VARCHAR(500)' },
      { name: 'exit_reason', description: 'Reason for watchlist exit', data_type: 'VARCHAR(500)' },
      { name: 'assigned_officer', description: 'Credit officer assigned to manage the watchlist entry', data_type: 'VARCHAR(200)' },
      { name: 'review_frequency', description: 'Required review frequency (e.g., Monthly, Quarterly)', data_type: 'VARCHAR(50)' },
      { name: 'next_review_date', description: 'Date of next scheduled review', data_type: 'DATE' },
      { name: 'as_of_date', description: 'Reporting date for the watchlist entry', data_type: 'DATE' },
      { name: 'is_current_flag', description: 'Whether this entry is currently active', data_type: 'BOOLEAN' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'forbearance_event', layer: 'L2' as const, category: 'Forbearance',
    data_owner: 'Credit Risk Operations', data_steward: 'Data Operations',
    fields: [
      { name: 'forbearance_event_id', description: 'Primary key for forbearance event', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'forbearance_type_code', description: 'Type of forbearance action (FK to forbearance_type_dim)', data_type: 'VARCHAR(20)', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'forbearance_type_dim', field: 'forbearance_type_code' } } },
      { name: 'event_date', description: 'Date the forbearance action was taken', data_type: 'DATE' },
      { name: 'original_maturity_date', description: 'Original maturity date before forbearance', data_type: 'DATE' },
      { name: 'modified_maturity_date', description: 'Modified maturity date after forbearance', data_type: 'DATE' },
      { name: 'original_rate_pct', description: 'Original interest rate before forbearance', data_type: 'NUMERIC(10,6)' },
      { name: 'modified_rate_pct', description: 'Modified interest rate after forbearance', data_type: 'NUMERIC(10,6)' },
      { name: 'maturity_extension_months', description: 'Number of months the maturity was extended', data_type: 'INTEGER' },
      { name: 'principal_forgiven_amt', description: 'Principal amount forgiven in reporting currency', data_type: 'NUMERIC(20,4)' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(20)' },
      { name: 'approval_date', description: 'Date the forbearance was approved', data_type: 'DATE' },
      { name: 'approved_by', description: 'Name or ID of the approving authority', data_type: 'VARCHAR(200)' },
      { name: 'as_of_date', description: 'Reporting date', data_type: 'DATE' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  // L3
  {
    name: 'ecl_provision_calc', layer: 'L3' as const, category: 'ECL/Impairment',
    data_owner: 'Analytics Engineering', data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'ecl_provision_id', description: 'Primary key for ECL provision calculation', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the ECL calculation', data_type: 'DATE' },
      { name: 'ecl_stage_code', description: 'ECL stage at time of calculation', data_type: 'VARCHAR(20)' },
      { name: 'twelve_month_ecl_amt', description: '12-month expected credit loss amount', data_type: 'NUMERIC(20,4)' },
      { name: 'lifetime_ecl_amt', description: 'Lifetime expected credit loss amount', data_type: 'NUMERIC(20,4)' },
      { name: 'provision_amt', description: 'Provision amount (12-month or lifetime based on stage)', data_type: 'NUMERIC(20,4)' },
      { name: 'lifetime_pd_pct', description: 'Lifetime probability of default', data_type: 'NUMERIC(10,6)' },
      { name: 'twelve_month_pd_pct', description: '12-month probability of default', data_type: 'NUMERIC(10,6)' },
      { name: 'lgd_pct', description: 'Loss given default for ECL calculation', data_type: 'NUMERIC(10,6)' },
      { name: 'ead_amt', description: 'Exposure at default for ECL calculation', data_type: 'NUMERIC(20,4)' },
      { name: 'is_stage_transfer_flag', description: 'Whether a stage transfer occurred this period', data_type: 'BOOLEAN' },
      { name: 'model_code', description: 'Impairment model used for calculation', data_type: 'VARCHAR(20)' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(20)' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'ecl_allowance_movement', layer: 'L3' as const, category: 'ECL/Impairment',
    data_owner: 'Analytics Engineering', data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'allowance_movement_id', description: 'Primary key for allowance movement record', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'legal_entity_id', description: 'Foreign key linking to legal entity', data_type: 'BIGINT' },
      { name: 'as_of_date', description: 'Reporting date for the allowance movement', data_type: 'DATE' },
      { name: 'ecl_stage_code', description: 'ECL stage for the movement', data_type: 'VARCHAR(20)' },
      { name: 'opening_balance_amt', description: 'Opening allowance balance at start of period', data_type: 'NUMERIC(20,4)' },
      { name: 'provision_charge_amt', description: 'Provision charge for the period', data_type: 'NUMERIC(20,4)' },
      { name: 'write_off_amt', description: 'Write-off amount for the period', data_type: 'NUMERIC(20,4)' },
      { name: 'recovery_amt', description: 'Recovery amount for the period', data_type: 'NUMERIC(20,4)' },
      { name: 'fx_adjustment_amt', description: 'Foreign exchange adjustment amount', data_type: 'NUMERIC(20,4)' },
      { name: 'stage_transfer_amt', description: 'Net amount transferred between stages', data_type: 'NUMERIC(20,4)' },
      { name: 'closing_balance_amt', description: 'Closing allowance balance at end of period', data_type: 'NUMERIC(20,4)' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(20)' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'watchlist_movement_summary', layer: 'L3' as const, category: 'Watchlist',
    data_owner: 'Analytics Engineering', data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'movement_summary_id', description: 'Primary key for watchlist movement summary', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'as_of_date', description: 'Reporting date for the movement summary', data_type: 'DATE' },
      { name: 'watchlist_category_code', description: 'Watchlist category for the summary', data_type: 'VARCHAR(20)' },
      { name: 'legal_entity_id', description: 'Foreign key linking to legal entity', data_type: 'BIGINT' },
      { name: 'entry_count', description: 'Number of watchlist entries during the period', data_type: 'INTEGER' },
      { name: 'exit_count', description: 'Number of watchlist exits during the period', data_type: 'INTEGER' },
      { name: 'net_change', description: 'Net change in watchlist count (entries - exits)', data_type: 'INTEGER' },
      { name: 'total_exposure_amt', description: 'Total exposure amount for watchlisted entities', data_type: 'NUMERIC(20,4)' },
      { name: 'total_facilities_count', description: 'Total number of facilities on the watchlist', data_type: 'INTEGER' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(20)' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP' },
      { name: 'updated_ts', description: 'Timestamp of last record modification', data_type: 'TIMESTAMP' },
      { name: 'record_source', description: 'Source system or feed that provided this record', data_type: 'VARCHAR(100)' },
      { name: 'created_by', description: 'User or process that created the record', data_type: 'VARCHAR(100)' },
    ],
  },
];

function main() {
  const raw = fs.readFileSync(DD_PATH, 'utf-8');
  const dd = JSON.parse(raw);
  let added = 0;

  for (const table of regulatoryTables) {
    const layer = table.layer;
    const exists = dd[layer].some((t: any) => t.name === table.name);
    if (!exists) {
      dd[layer].push(table);
      added++;
      console.log(`  Added ${layer}.${table.name} (${table.fields.length} fields)`);
    } else {
      console.log(`  Skipped ${layer}.${table.name} (already exists)`);
    }
  }

  // Add relationships for new tables
  const newRelationships = [
    { from_table: 'ecl_staging_snapshot', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
    { from_table: 'ecl_staging_snapshot', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'ecl_staging_snapshot', from_field: 'ecl_stage_code', to_table: 'ecl_stage_dim', to_field: 'ecl_stage_code', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'ecl_staging_snapshot', from_field: 'model_code', to_table: 'impairment_model_dim', to_field: 'model_code', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'watchlist_entry', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'watchlist_entry', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
    { from_table: 'watchlist_entry', from_field: 'watchlist_category_code', to_table: 'watchlist_category_dim', to_field: 'watchlist_category_code', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'forbearance_event', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
    { from_table: 'forbearance_event', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'forbearance_event', from_field: 'forbearance_type_code', to_table: 'forbearance_type_dim', to_field: 'forbearance_type_code', from_layer: 'L2', to_layer: 'L1' },
    { from_table: 'ecl_provision_calc', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L3', to_layer: 'L2' },
    { from_table: 'ecl_provision_calc', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L3', to_layer: 'L1' },
  ];

  let relAdded = 0;
  for (const rel of newRelationships) {
    const exists = dd.relationships.some((r: any) =>
      r.from_table === rel.from_table && r.from_field === rel.from_field &&
      r.to_table === rel.to_table && r.to_field === rel.to_field
    );
    if (!exists) {
      dd.relationships.push(rel);
      relAdded++;
    }
  }

  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');
  console.log(`\nAdded ${added} regulatory tables and ${relAdded} relationships.`);
  console.log(`Totals: L1=${dd.L1.length}, L2=${dd.L2.length}, L3=${dd.L3.length}, rels=${dd.relationships.length}`);
}

main();

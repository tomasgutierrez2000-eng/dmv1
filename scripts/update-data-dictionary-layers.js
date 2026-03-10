#!/usr/bin/env node
/**
 * Updates the data dictionary JSON for the layer reassignment migration.
 * - Adds new L1 dimension tables
 * - Adds new L2 table (limit_assignment_snapshot)
 * - Adds new L3 overlay tables
 * - Modifies existing L2 tables (add/remove fields)
 * - Modifies existing L3 tables (add fields)
 */

const fs = require('fs');
const path = require('path');

const DD_PATH = path.join(__dirname, '..', 'facility-summary-mvp', 'output', 'data-dictionary', 'data-dictionary.json');

const dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));

// ============================================================================
// Helper: create a field object
// ============================================================================
function field(name, description, category, dataType, opts = {}) {
  const f = {
    name,
    description,
    category,
    why_required: opts.why || description,
    data_type: dataType,
    pk_fk: {
      is_pk: opts.isPk || false,
      is_composite: opts.isComposite || false,
      ...(opts.fkTarget ? { fk_target: opts.fkTarget } : {})
    }
  };
  if (opts.note) f.simplification_note = opts.note;
  return f;
}

// ============================================================================
// PART 1: Add new L1 dimension tables
// ============================================================================

const newL1Tables = [
  {
    name: 'limit_status_dim',
    layer: 'L1',
    category: 'Limits & Thresholds',
    fields: [
      field('limit_status_code', 'Unique code for limit utilization status', 'Limits & Thresholds', 'VARCHAR(20)', { isPk: true }),
      field('status_name', 'Display name for the limit status', 'Limits & Thresholds', 'VARCHAR(200)'),
      field('description', 'Detailed description of the status', 'Limits & Thresholds', 'VARCHAR(500)'),
      field('severity_ordinal', 'Numeric severity ranking', 'Limits & Thresholds', 'INTEGER'),
      field('display_order', 'UI display order', 'Limits & Thresholds', 'INTEGER'),
      field('active_flag', 'Whether this status is currently active', 'Limits & Thresholds', 'BOOLEAN'),
    ]
  },
  {
    name: 'exception_status_dim',
    layer: 'L1',
    category: 'Facility',
    fields: [
      field('exception_status_code', 'Unique code for pricing exception status', 'Facility', 'VARCHAR(20)', { isPk: true }),
      field('status_name', 'Display name for the exception status', 'Facility', 'VARCHAR(200)'),
      field('description', 'Detailed description of the status', 'Facility', 'VARCHAR(500)'),
      field('requires_approval_flag', 'Whether this status requires approval', 'Facility', 'BOOLEAN'),
      field('display_order', 'UI display order', 'Facility', 'INTEGER'),
      field('active_flag', 'Whether this status is currently active', 'Facility', 'BOOLEAN'),
    ]
  },
  {
    name: 'rating_change_status_dim',
    layer: 'L1',
    category: 'Ratings',
    fields: [
      field('rating_change_status_code', 'Unique code for rating change direction', 'Ratings', 'VARCHAR(20)', { isPk: true }),
      field('status_name', 'Display name for the rating change status', 'Ratings', 'VARCHAR(200)'),
      field('description', 'Detailed description of the change status', 'Ratings', 'VARCHAR(500)'),
      field('direction', 'Direction of change: positive, negative, neutral', 'Ratings', 'VARCHAR(20)'),
      field('display_order', 'UI display order', 'Ratings', 'INTEGER'),
      field('active_flag', 'Whether this status is currently active', 'Ratings', 'BOOLEAN'),
    ]
  },
];

for (const t of newL1Tables) {
  const existing = dd.L1.find(e => e.name === t.name);
  if (!existing) {
    dd.L1.push(t);
    console.log(`  Added L1 table: ${t.name}`);
  } else {
    console.log(`  L1 table already exists: ${t.name}`);
  }
}

// ============================================================================
// PART 2: Add new L2 table
// ============================================================================

const newL2Tables = [
  {
    name: 'limit_assignment_snapshot',
    layer: 'L2',
    category: 'Limits',
    fields: [
      field('facility_id', 'Facility receiving the limit assignment', 'Limits', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'facility_master', field: 'facility_id' } }),
      field('limit_rule_id', 'Reference to the limit rule definition', 'Limits', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L1', table: 'limit_rule', field: 'limit_rule_id' } }),
      field('as_of_date', 'Snapshot date', 'Limits', 'DATE', { isPk: true, isComposite: true }),
      field('limit_amt', 'Assigned limit amount', 'Limits', 'NUMERIC(20,4)'),
      field('assigned_date', 'Date limit was assigned', 'Limits', 'DATE'),
      field('expiry_date', 'Date limit expires', 'Limits', 'DATE'),
      field('status_code', 'Current status of the limit assignment', 'Limits', 'VARCHAR(20)'),
      field('currency_code', 'Currency of the limit amount', 'Limits', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'currency_dim', field: 'currency_code' } }),
      field('created_ts', 'Record creation timestamp', 'Limits', 'TIMESTAMP'),
      field('updated_ts', 'Record last update timestamp', 'Limits', 'TIMESTAMP'),
    ]
  },
];

for (const t of newL2Tables) {
  const existing = dd.L2.find(e => e.name === t.name);
  if (!existing) {
    dd.L2.push(t);
    console.log(`  Added L2 table: ${t.name}`);
  } else {
    console.log(`  L2 table already exists: ${t.name}`);
  }
}

// ============================================================================
// PART 3: Add new L3 overlay tables
// ============================================================================

const newL3Tables = [
  {
    name: 'facility_exposure_calc',
    layer: 'L3',
    category: 'Exposure & Risk Metrics',
    fields: [
      field('facility_id', 'FK to source L2 facility_exposure_snapshot', 'Exposure & Risk Metrics', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'facility_master', field: 'facility_id' } }),
      field('as_of_date', 'Snapshot date matching source L2 row', 'Exposure & Risk Metrics', 'DATE', { isPk: true, isComposite: true }),
      field('number_of_loans', 'Aggregate count of loans under facility', 'Exposure & Risk Metrics', 'INTEGER'),
      field('number_of_facilities', 'Aggregate count of sub-facilities', 'Exposure & Risk Metrics', 'INTEGER'),
      field('days_until_maturity', 'Calculated days from as_of_date to maturity_date', 'Exposure & Risk Metrics', 'INTEGER'),
      field('rwa_amt', 'Risk-weighted asset amount (EAD × risk_weight)', 'Exposure & Risk Metrics', 'NUMERIC(20,4)'),
      field('utilization_status_code', 'Calculated utilization bucket from drawn/committed ratio', 'Exposure & Risk Metrics', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'utilization_status_dim', field: 'utilization_status_code' } }),
      field('risk_rating_tier_code', 'Calculated risk rating tier assignment', 'Exposure & Risk Metrics', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'risk_rating_tier_dim', field: 'tier_code' } }),
      field('limit_status_code', 'Calculated limit utilization status', 'Exposure & Risk Metrics', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'limit_status_dim', field: 'limit_status_code' } }),
      field('coverage_ratio_pct', 'Calculated coverage ratio (drawn / committed)', 'Exposure & Risk Metrics', 'NUMERIC(10,6)'),
      field('created_ts', 'Record creation timestamp', 'Exposure & Risk Metrics', 'TIMESTAMP'),
    ]
  },
  {
    name: 'facility_financial_calc',
    layer: 'L3',
    category: 'Facility Analytics',
    fields: [
      field('facility_id', 'FK to source L2 facility_financial_snapshot', 'Facility Analytics', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'facility_master', field: 'facility_id' } }),
      field('as_of_date', 'Snapshot date matching source L2 row', 'Facility Analytics', 'DATE', { isPk: true, isComposite: true }),
      field('dscr_value', 'Debt Service Coverage Ratio (EBITDA / Debt Service)', 'Facility Analytics', 'NUMERIC(12,6)'),
      field('ltv_pct', 'Loan-to-Value ratio (loan / collateral)', 'Facility Analytics', 'NUMERIC(10,6)'),
      field('net_income_amt', 'Calculated net income (revenue - expenses)', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('total_debt_service_amt', 'Total debt service (principal + interest)', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('revenue_amt', 'Revenue amount (moved from L2)', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('interest_expense_amt', 'Calculated interest expense', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('interest_income_amt', 'Calculated interest income', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('avg_earning_assets_amt', 'Average earning assets (aggregated)', 'Facility Analytics', 'NUMERIC(20,4)'),
      field('fee_rate_pct', 'Fee rate percentage (derived)', 'Facility Analytics', 'NUMERIC(10,6)'),
      field('interest_rate_sensitivity_pct', 'Interest rate sensitivity measure', 'Facility Analytics', 'NUMERIC(10,6)'),
      field('created_ts', 'Record creation timestamp', 'Facility Analytics', 'TIMESTAMP'),
    ]
  },
  {
    name: 'counterparty_rating_calc',
    layer: 'L3',
    category: 'Credit Events & Performance',
    fields: [
      field('counterparty_id', 'FK to source L2 counterparty', 'Credit Events & Performance', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'counterparty', field: 'counterparty_id' } }),
      field('as_of_date', 'Rating observation date', 'Credit Events & Performance', 'DATE', { isPk: true, isComposite: true }),
      field('rating_type', 'Type of rating (internal/external)', 'Credit Events & Performance', 'VARCHAR(30)', { isPk: true, isComposite: true }),
      field('risk_rating_change_steps', 'Number of rating notches changed', 'Credit Events & Performance', 'INTEGER'),
      field('rating_change_status_code', 'Calculated rating change direction', 'Credit Events & Performance', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'rating_change_status_dim', field: 'rating_change_status_code' } }),
      field('created_ts', 'Record creation timestamp', 'Credit Events & Performance', 'TIMESTAMP'),
    ]
  },
  {
    name: 'facility_pricing_calc',
    layer: 'L3',
    category: 'Facility Analytics',
    fields: [
      field('facility_id', 'FK to source L2 facility_pricing_snapshot', 'Facility Analytics', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'facility_master', field: 'facility_id' } }),
      field('as_of_date', 'Snapshot date matching source L2 row', 'Facility Analytics', 'DATE', { isPk: true, isComposite: true }),
      field('pricing_exception_flag', 'Whether facility has a pricing exception', 'Facility Analytics', 'BOOLEAN'),
      field('exception_status_code', 'Calculated exception status assignment', 'Facility Analytics', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'exception_status_dim', field: 'exception_status_code' } }),
      field('pricing_tier_code', 'Calculated pricing tier assignment', 'Facility Analytics', 'VARCHAR(20)', { fkTarget: { layer: 'L1', table: 'pricing_tier_dim', field: 'pricing_tier_code' } }),
      field('fee_rate_pct', 'Fee rate percentage (derived)', 'Facility Analytics', 'NUMERIC(10,6)'),
      field('created_ts', 'Record creation timestamp', 'Facility Analytics', 'TIMESTAMP'),
    ]
  },
  {
    name: 'deal_pipeline_calc',
    layer: 'L3',
    category: 'Business Segment Summary',
    fields: [
      field('deal_id', 'FK to source L2 deal_pipeline_fact', 'Business Segment Summary', 'BIGINT', { isPk: true, isComposite: true }),
      field('as_of_date', 'Calculation date', 'Business Segment Summary', 'DATE', { isPk: true, isComposite: true }),
      field('expected_tenor_months', 'Calculated expected tenor in months', 'Business Segment Summary', 'NUMERIC(10,2)'),
      field('created_ts', 'Record creation timestamp', 'Business Segment Summary', 'TIMESTAMP'),
    ]
  },
  {
    name: 'collateral_calc',
    layer: 'L3',
    category: 'Credit Risk Mitigation (CRM)',
    fields: [
      field('collateral_asset_id', 'FK to source L2 collateral_snapshot', 'Credit Risk Mitigation (CRM)', 'BIGINT', { isPk: true, isComposite: true, fkTarget: { layer: 'L2', table: 'collateral_asset_master', field: 'collateral_asset_id' } }),
      field('as_of_date', 'Calculation date', 'Credit Risk Mitigation (CRM)', 'DATE', { isPk: true, isComposite: true }),
      field('allocated_amount_usd', 'Calculated proportional allocation amount in USD', 'Credit Risk Mitigation (CRM)', 'NUMERIC(20,4)'),
      field('created_ts', 'Record creation timestamp', 'Credit Risk Mitigation (CRM)', 'TIMESTAMP'),
    ]
  },
  {
    name: 'cash_flow_calc',
    layer: 'L3',
    category: 'Cash Flows',
    fields: [
      field('cash_flow_id', 'FK to source L2 cash_flow', 'Cash Flows', 'BIGINT', { isPk: true }),
      field('contractual_amt', 'Projected/modeled cash flow amount', 'Cash Flows', 'NUMERIC(20,4)'),
      field('created_ts', 'Record creation timestamp', 'Cash Flows', 'TIMESTAMP'),
    ]
  },
];

for (const t of newL3Tables) {
  const existing = dd.L3.find(e => e.name === t.name);
  if (!existing) {
    dd.L3.push(t);
    console.log(`  Added L3 table: ${t.name}`);
  } else {
    console.log(`  L3 table already exists: ${t.name} — updating fields`);
    const idx = dd.L3.indexOf(existing);
    dd.L3[idx] = t;
  }
}

// ============================================================================
// PART 4: Modify existing L3 table — facility_risk_calc (add fields)
// ============================================================================

const frc = dd.L3.find(e => e.name === 'facility_risk_calc');
if (frc) {
  const newFields = [
    field('exposure_at_default', 'Estimated/modeled EAD (moved from L2)', 'Exposure & Risk Metrics', 'NUMERIC(20,4)'),
    field('lgd_estimate', 'Model-derived LGD estimate in $ (moved from L2, fixed from VARCHAR to NUMERIC)', 'Exposure & Risk Metrics', 'NUMERIC(20,4)'),
  ];
  for (const nf of newFields) {
    if (!frc.fields.find(f => f.name === nf.name)) {
      // Insert before created_ts
      const tsIdx = frc.fields.findIndex(f => f.name === 'created_ts');
      if (tsIdx >= 0) frc.fields.splice(tsIdx, 0, nf);
      else frc.fields.push(nf);
      console.log(`  Added field ${nf.name} to L3.facility_risk_calc`);
    }
  }
}

// ============================================================================
// PART 5: Add fields to existing L2 tables
// ============================================================================

function addFieldToTable(layer, tableName, newField) {
  const arr = dd[layer];
  const table = arr.find(t => t.name === tableName);
  if (!table) { console.warn(`  WARNING: ${layer}.${tableName} not found!`); return; }
  if (table.fields.find(f => f.name === newField.name)) {
    console.log(`  Field ${newField.name} already exists in ${layer}.${tableName}`);
    return;
  }
  // Insert before timestamps
  const tsIdx = table.fields.findIndex(f => f.name === 'created_ts' || f.name === 'updated_ts');
  if (tsIdx >= 0) table.fields.splice(tsIdx, 0, newField);
  else table.fields.push(newField);
  console.log(`  Added field ${newField.name} to ${layer}.${tableName}`);
}

// counterparty: add fees_income_amt, pd_pct, lgd_pct
addFieldToTable('L2', 'counterparty',
  field('fees_income_amt', 'Fee income amount for the counterparty', 'Business Entity', 'NUMERIC(20,4)'));
addFieldToTable('L2', 'counterparty',
  field('pd_pct', 'Probability of default percentage (at counterparty level)', 'Business Entity', 'NUMERIC(10,6)'));
addFieldToTable('L2', 'counterparty',
  field('lgd_pct', 'Loss given default percentage (at counterparty level)', 'Business Entity', 'NUMERIC(10,6)'));

// counterparty_financial_snapshot: add allocated_equity_amt
addFieldToTable('L2', 'counterparty_financial_snapshot',
  field('allocated_equity_amt', 'Allocated equity amount from balance sheet', 'Financial Metrics', 'NUMERIC(20,4)'));

// position_detail: add rwa_density_pct
addFieldToTable('L2', 'position_detail',
  field('rwa_density_pct', 'RWA density percentage (source system output)', 'Position Detail', 'NUMERIC(10,6)'));

// ============================================================================
// PART 6: Remove fields from L2 tables (moved to L3 overlays)
// ============================================================================

function removeFieldFromTable(layer, tableName, fieldName) {
  const arr = dd[layer];
  const table = arr.find(t => t.name === tableName);
  if (!table) { console.warn(`  WARNING: ${layer}.${tableName} not found!`); return; }
  const idx = table.fields.findIndex(f => f.name === fieldName);
  if (idx < 0) {
    console.log(`  Field ${fieldName} not found in ${layer}.${tableName} (already removed?)`);
    return;
  }
  table.fields.splice(idx, 1);
  console.log(`  Removed field ${fieldName} from ${layer}.${tableName}`);
}

// facility_exposure_snapshot
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'number_of_loans');
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'days_until_maturity');
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'rwa_amt');
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'number_of_facilities');
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'coverage_ratio_pct');
removeFieldFromTable('L2', 'facility_exposure_snapshot', 'limit_status_code');

// facility_financial_snapshot
removeFieldFromTable('L2', 'facility_financial_snapshot', 'dscr_value');
removeFieldFromTable('L2', 'facility_financial_snapshot', 'ltv_pct');
removeFieldFromTable('L2', 'facility_financial_snapshot', 'net_income_amt');
removeFieldFromTable('L2', 'facility_financial_snapshot', 'total_debt_service_amt');
removeFieldFromTable('L2', 'facility_financial_snapshot', 'interest_rate_sensitivity_pct');

// facility_risk_snapshot
removeFieldFromTable('L2', 'facility_risk_snapshot', 'expected_loss_amt');
removeFieldFromTable('L2', 'facility_risk_snapshot', 'rwa_amt');

// facility_pricing_snapshot
removeFieldFromTable('L2', 'facility_pricing_snapshot', 'pricing_exception_flag');

// facility_master
removeFieldFromTable('L2', 'facility_master', 'revenue_amt');

// ============================================================================
// WRITE UPDATED DATA DICTIONARY
// ============================================================================

fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2) + '\n');
console.log(`\nData dictionary updated: ${DD_PATH}`);
console.log(`  L1 tables: ${dd.L1.length}`);
console.log(`  L2 tables: ${dd.L2.length}`);
console.log(`  L3 tables: ${dd.L3.length}`);

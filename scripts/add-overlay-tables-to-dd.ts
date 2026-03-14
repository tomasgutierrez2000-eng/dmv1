#!/usr/bin/env npx tsx
/**
 * Add missing L3 overlay tables (T51-T62) to the data dictionary.
 * These tables exist in l3-tables.ts and now in PostgreSQL but were missing from DD.
 */
import fs from 'fs';
import path from 'path';

const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

interface DDField {
  name: string;
  description?: string;
  category?: string;
  pk_fk?: { is_pk: boolean; is_composite?: boolean; fk_target?: { layer: string; table: string; field: string } };
  data_type?: string;
  [key: string]: unknown;
}

interface DDTable {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: DDField[];
  data_owner?: string;
  data_steward?: string;
  [key: string]: unknown;
}

// Define the overlay tables and their fields from the DDL
const overlayTables: DDTable[] = [
  {
    name: 'facility_exposure_calc',
    layer: 'L3',
    category: 'Exposure & Risk Metrics',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the snapshot', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'number_of_loans', description: 'Count of individual loans within the facility', data_type: 'INTEGER', category: 'Exposure & Risk Metrics' },
      { name: 'number_of_facilities', description: 'Count of facilities', data_type: 'INTEGER', category: 'Exposure & Risk Metrics' },
      { name: 'days_until_maturity', description: 'Number of days from as_of_date until maturity_date', data_type: 'INTEGER', category: 'Exposure & Risk Metrics' },
      { name: 'rwa_amt', description: 'Risk-weighted asset amount per Basel III methodology', data_type: 'NUMERIC(20,4)', category: 'Exposure & Risk Metrics' },
      { name: 'utilization_status_code', description: 'Facility utilization status classification code', data_type: 'VARCHAR(20)', category: 'Exposure & Risk Metrics' },
      { name: 'risk_rating_tier_code', description: 'Risk rating tier classification code', data_type: 'VARCHAR(20)', category: 'Exposure & Risk Metrics' },
      { name: 'limit_status_code', description: 'Facility limit status classification code', data_type: 'VARCHAR(20)', category: 'Exposure & Risk Metrics' },
      { name: 'coverage_ratio_pct', description: 'Coverage ratio: collateral value / exposure amount x 100', data_type: 'NUMERIC(10,6)', category: 'Exposure & Risk Metrics' },
      { name: 'utilization_pct', description: 'Facility utilization rate: drawn / committed x 100', data_type: 'NUMERIC(10,6)', category: 'Exposure & Risk Metrics' },
      { name: 'undrawn_amt', description: 'Undrawn commitment amount available to the borrower', data_type: 'NUMERIC(20,4)', category: 'Exposure & Risk Metrics' },
      { name: 'net_exposure_amt', description: 'Net exposure after credit risk mitigation', data_type: 'NUMERIC(20,4)', category: 'Exposure & Risk Metrics' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'facility_financial_calc',
    layer: 'L3',
    category: 'Facility Analytics',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the snapshot', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'dscr_value', description: 'Debt service coverage ratio: NOI / total debt service', data_type: 'NUMERIC(12,6)', category: 'Facility Analytics' },
      { name: 'dscr', description: 'Debt service coverage ratio: NOI / total debt service', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'ltv_pct', description: 'Loan-to-value ratio: loan balance / collateral value x 100', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'net_income_amt', description: 'Net income (revenue minus all expenses)', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'total_debt_service_amt', description: 'Total debt service (principal + interest payments)', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'revenue_amt', description: 'Total revenue from most recent financial statement', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'interest_expense_amt', description: 'Total interest expense for the period', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'interest_income_amt', description: 'Total interest income for the period', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'avg_earning_assets_amt', description: 'Average earning assets for the period', data_type: 'NUMERIC(20,4)', category: 'Facility Analytics' },
      { name: 'fee_rate_pct', description: 'Fee rate as a percentage', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'interest_rate_sensitivity_pct', description: 'Interest rate sensitivity expressed as a percentage', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'interest_coverage_ratio', description: 'Interest coverage ratio: EBITDA / interest expense', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'debt_yield_pct', description: 'Debt yield: NOI / loan balance x 100', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'counterparty_rating_calc',
    layer: 'L3',
    category: 'Credit Events & Performance',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the calculation', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'rating_type', description: 'Type of credit rating (internal/external)', data_type: 'VARCHAR(30)', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'risk_rating_change_steps', description: 'Number of rating notches changed from prior period', data_type: 'INTEGER', category: 'Credit Events & Performance' },
      { name: 'rating_change_status_code', description: 'Rating change direction code (upgrade/downgrade/stable)', data_type: 'VARCHAR(20)', category: 'Credit Events & Performance' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'facility_pricing_calc',
    layer: 'L3',
    category: 'Facility Analytics',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'as_of_date', description: 'Reporting date for the snapshot', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'is_pricing_exception_flag', description: 'Whether pricing exception applies to this facility', data_type: 'BOOLEAN', category: 'Facility Analytics' },
      { name: 'pricing_tier_code', description: 'Pricing tier classification code', data_type: 'VARCHAR(20)', category: 'Facility Analytics' },
      { name: 'fee_rate_pct', description: 'Fee rate as a percentage', data_type: 'NUMERIC(10,6)', category: 'Facility Analytics' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'collateral_calc',
    layer: 'L3',
    category: 'Credit Risk Mitigation (CRM)',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'collateral_asset_id', description: 'Foreign key linking to collateral asset', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'as_of_date', description: 'Reporting date for the calculation', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'allocated_amount_usd', description: 'Allocated collateral amount in USD', data_type: 'NUMERIC(20,4)', category: 'Credit Risk Mitigation (CRM)' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'cash_flow_calc',
    layer: 'L3',
    category: 'Cash Flows',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'cash_flow_id', description: 'Foreign key linking to cash flow record', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'contractual_amt', description: 'Contractual cash flow amount', data_type: 'NUMERIC(20,4)', category: 'Cash Flows' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'data_quality_score_snapshot',
    layer: 'L3',
    category: 'Data Quality',
    data_owner: 'Analytics Engineering',
    data_steward: 'Data Governance',
    fields: [
      { name: 'table_name', description: 'Name of the table being quality-scored', data_type: 'VARCHAR(100)', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'as_of_date', description: 'Reporting date for the quality score', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'completeness_score_pct', description: 'Completeness component of data quality score', data_type: 'NUMERIC(10,6)', category: 'Data Quality' },
      { name: 'accuracy_score_pct', description: 'Accuracy component of data quality score', data_type: 'NUMERIC(10,6)', category: 'Data Quality' },
      { name: 'timeliness_score_pct', description: 'Timeliness component of data quality score', data_type: 'NUMERIC(10,6)', category: 'Data Quality' },
      { name: 'overall_dq_score_pct', description: 'Overall data quality score percentage', data_type: 'NUMERIC(10,6)', category: 'Data Quality' },
      { name: 'total_row_count', description: 'Total number of rows in the table', data_type: 'INTEGER', category: 'Data Quality' },
      { name: 'null_field_count', description: 'Count of null field values', data_type: 'INTEGER', category: 'Data Quality' },
      { name: 'anomaly_count', description: 'Count of detected anomalies', data_type: 'INTEGER', category: 'Data Quality' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'stress_test_result',
    layer: 'L3',
    category: 'Stress Testing',
    data_owner: 'Analytics Engineering',
    data_steward: 'Credit Risk Analytics',
    fields: [
      { name: 'stress_test_result_id', description: 'Primary key for stress test result', data_type: 'BIGSERIAL', pk_fk: { is_pk: true, is_composite: false } },
      { name: 'position_id', description: 'Foreign key linking to position', data_type: 'BIGINT', category: 'Stress Testing' },
      { name: 'facility_id', description: 'Foreign key linking to facility master', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L2', table: 'facility_master', field: 'facility_id' } } },
      { name: 'counterparty_id', description: 'Foreign key linking to counterparty', data_type: 'BIGINT', pk_fk: { is_pk: false, fk_target: { layer: 'L1', table: 'counterparty', field: 'counterparty_id' } } },
      { name: 'scenario_id', description: 'Foreign key linking to stress scenario', data_type: 'BIGINT', category: 'Stress Testing' },
      { name: 'as_of_date', description: 'Reporting date for the stress test', data_type: 'DATE', category: 'Stress Testing' },
      { name: 'stressed_exposure_amt', description: 'Exposure amount under stress scenario conditions', data_type: 'NUMERIC(20,4)', category: 'Stress Testing' },
      { name: 'stressed_expected_loss', description: 'Expected loss under stress scenario conditions', data_type: 'NUMERIC(20,4)', category: 'Stress Testing' },
      { name: 'capital_impact_pct', description: 'Impact on capital ratios under stress scenario', data_type: 'NUMERIC(10,6)', category: 'Stress Testing' },
      { name: 'currency_code', description: 'ISO 4217 currency code', data_type: 'VARCHAR(30)', category: 'Stress Testing' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
  {
    name: 'gl_account_balance_calc',
    layer: 'L3',
    category: 'General Ledger',
    data_owner: 'Finance Operations',
    data_steward: 'Financial Reporting',
    fields: [
      { name: 'ledger_account_id', description: 'Foreign key linking to ledger account', data_type: 'BIGINT', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'as_of_date', description: 'Reporting date for the balance', data_type: 'DATE', pk_fk: { is_pk: true, is_composite: true } },
      { name: 'ending_balance_net_amt', description: 'Net ending balance amount for the period', data_type: 'NUMERIC(20,4)', category: 'General Ledger' },
      { name: 'period_net_activity_amt', description: 'Net activity amount for the period', data_type: 'NUMERIC(20,4)', category: 'General Ledger' },
      { name: 'balance_change_pct', description: 'Period-over-period balance change percentage', data_type: 'NUMERIC(10,6)', category: 'General Ledger' },
      { name: 'created_ts', description: 'Timestamp when the record was created', data_type: 'TIMESTAMP', category: 'Audit' },
    ],
  },
];

function main() {
  const raw = fs.readFileSync(DD_PATH, 'utf-8');
  const dd = JSON.parse(raw);

  let added = 0;
  for (const table of overlayTables) {
    const exists = dd.L3.some((t: DDTable) => t.name === table.name);
    if (!exists) {
      dd.L3.push(table);
      added++;
      console.log(`  Added L3.${table.name} (${table.fields.length} fields)`);
    } else {
      console.log(`  Skipped L3.${table.name} (already exists)`);
    }
  }

  // Also fix data_quality_score_snapshot if it's in L2 — move to L3
  const dqIdx = dd.L2.findIndex((t: DDTable) => t.name === 'data_quality_score_snapshot');
  if (dqIdx >= 0) {
    console.log(`  Removed L2.data_quality_score_snapshot (layer reassignment to L3)`);
    dd.L2.splice(dqIdx, 1);
  }

  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');
  console.log(`\nAdded ${added} overlay tables to data dictionary.`);
  console.log(`New L3 count: ${dd.L3.length}`);
}

main();

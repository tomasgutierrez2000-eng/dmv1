/**
 * Structured prerequisite L1 dim data for factory scenarios.
 *
 * Single source of truth replacing duplicate hard-coded SQL strings
 * in sql-emitter.ts and v2/db-writer.ts.
 *
 * Data is stored as typed objects and emitted to SQL via formatSqlValue()
 * for type-safe, schema-validated output.
 */

import { formatSqlValue, quoteColumn } from '../../lib/sql-value-formatter';

/* ────────────────── Data Structures ────────────────── */

export interface PrerequisiteRow {
  [column: string]: string | number | boolean | null;
}

export interface PrerequisiteTable {
  schema: string;
  table: string;
  conflictColumn: string;
  rows: PrerequisiteRow[];
}

/* ────────────────── Country Dim ────────────────── */

const FACTORY_COUNTRIES: PrerequisiteRow[] = [
  { country_code: 'BR', country_name: 'Brazil', is_active_flag: 'Y', region_code: 'AMER', basel_country_risk_weight: '50%', is_developed_market_flag: 'N', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'BRA', iso_numeric: '076', jurisdiction_id: 11 },
  { country_code: 'IN', country_name: 'India', is_active_flag: 'Y', region_code: 'APAC', basel_country_risk_weight: '50%', is_developed_market_flag: 'N', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'IND', iso_numeric: '356', jurisdiction_id: 12 },
  { country_code: 'MX', country_name: 'Mexico', is_active_flag: 'Y', region_code: 'AMER', basel_country_risk_weight: '50%', is_developed_market_flag: 'N', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'MEX', iso_numeric: '484', jurisdiction_id: 13 },
  { country_code: 'AE', country_name: 'United Arab Emirates', is_active_flag: 'Y', region_code: 'EMEA', basel_country_risk_weight: '50%', is_developed_market_flag: 'N', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'ARE', iso_numeric: '784', jurisdiction_id: 14 },
  { country_code: 'KR', country_name: 'South Korea', is_active_flag: 'Y', region_code: 'APAC', basel_country_risk_weight: '0%', is_developed_market_flag: 'Y', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'KOR', iso_numeric: '410', jurisdiction_id: 15 },
  { country_code: 'HK', country_name: 'Hong Kong', is_active_flag: 'Y', region_code: 'APAC', basel_country_risk_weight: '0%', is_developed_market_flag: 'Y', is_fatf_high_risk_flag: 'N', is_ofac_sanctioned_flag: 'N', iso_alpha_3: 'HKG', iso_numeric: '344', jurisdiction_id: 16 },
];

/* ────────────────── Currency Dim ────────────────── */

const FACTORY_CURRENCIES: PrerequisiteRow[] = [
  { currency_code: 'BRL', currency_name: 'Brazilian Real', currency_symbol: 'R$', is_active_flag: 'Y', iso_numeric: '986', minor_unit_decimals: 2, is_g10_currency_flag: 'N' },
  { currency_code: 'INR', currency_name: 'Indian Rupee', currency_symbol: 'Rs', is_active_flag: 'Y', iso_numeric: '356', minor_unit_decimals: 2, is_g10_currency_flag: 'N' },
  { currency_code: 'MXN', currency_name: 'Mexican Peso', currency_symbol: 'Mex$', is_active_flag: 'Y', iso_numeric: '484', minor_unit_decimals: 2, is_g10_currency_flag: 'N' },
  { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'AED', is_active_flag: 'Y', iso_numeric: '784', minor_unit_decimals: 2, is_g10_currency_flag: 'N' },
  { currency_code: 'KRW', currency_name: 'South Korean Won', currency_symbol: 'W', is_active_flag: 'Y', iso_numeric: '410', minor_unit_decimals: 0, is_g10_currency_flag: 'N' },
];

/* ────────────────── Metric Threshold ────────────────── */

const FACTORY_THRESHOLDS: PrerequisiteRow[] = [
  { threshold_id: 1, metric_definition_id: 1, threshold_type: 'WARNING', threshold_value: 1.25, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'DSCR', metric_name: 'Debt Service Coverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 2, metric_definition_id: 1, threshold_type: 'BREACH', threshold_value: 1.00, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'DSCR', metric_name: 'Debt Service Coverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 3, metric_definition_id: 2, threshold_type: 'WARNING', threshold_value: 0.75, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'LTV', metric_name: 'Loan-to-Value Ratio', metric_category: 'CREDIT' },
  { threshold_id: 4, metric_definition_id: 2, threshold_type: 'BREACH', threshold_value: 0.90, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'LTV', metric_name: 'Loan-to-Value Ratio', metric_category: 'CREDIT' },
  { threshold_id: 5, metric_definition_id: 3, threshold_type: 'WARNING', threshold_value: 1.50, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'ICR', metric_name: 'Interest Coverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 6, metric_definition_id: 3, threshold_type: 'BREACH', threshold_value: 1.00, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'ICR', metric_name: 'Interest Coverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 7, metric_definition_id: 4, threshold_type: 'WARNING', threshold_value: 4.00, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'LEVERAGE', metric_name: 'Total Leverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 8, metric_definition_id: 4, threshold_type: 'BREACH', threshold_value: 6.00, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'LEVERAGE', metric_name: 'Total Leverage Ratio', metric_category: 'CREDIT' },
  { threshold_id: 9, metric_definition_id: 5, threshold_type: 'WARNING', threshold_value: 1.20, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'CURRENT_RATIO', metric_name: 'Current Ratio', metric_category: 'LIQUIDITY' },
  { threshold_id: 10, metric_definition_id: 5, threshold_type: 'BREACH', threshold_value: 1.00, effective_start_date: '2024-01-01', is_active_flag: 'Y', metric_code: 'CURRENT_RATIO', metric_name: 'Current Ratio', metric_category: 'LIQUIDITY' },
];

/* ────────────────── Source System Registry ────────────────── */

const FACTORY_SOURCE_SYSTEMS: PrerequisiteRow[] = [
  { source_system_id: 1400001, source_system_name: 'DATA_FACTORY_V2', data_domain: 'SYNTHETIC', ingestion_frequency: 'ON_DEMAND', system_owner: 'Data Factory', active_flag: 'Y' },
];

/* ────────────────── Public API ────────────────── */

/**
 * All prerequisite tables needed by factory scenarios.
 */
export function getFactoryPrerequisites(): PrerequisiteTable[] {
  return [
    { schema: 'l1', table: 'source_system_registry', conflictColumn: 'source_system_id', rows: FACTORY_SOURCE_SYSTEMS },
    { schema: 'l1', table: 'country_dim', conflictColumn: 'country_code', rows: FACTORY_COUNTRIES },
    { schema: 'l1', table: 'currency_dim', conflictColumn: 'currency_code', rows: FACTORY_CURRENCIES },
    { schema: 'l1', table: 'metric_threshold', conflictColumn: 'threshold_id', rows: FACTORY_THRESHOLDS },
  ];
}

/**
 * Emit prerequisite data as SQL INSERT statements with ON CONFLICT DO NOTHING.
 */
export function emitPrerequisiteSql(): string {
  const lines: string[] = [];

  for (const pt of getFactoryPrerequisites()) {
    lines.push(`-- Factory prerequisite: ${pt.schema}.${pt.table} (${pt.rows.length} rows)`);
    for (const row of pt.rows) {
      const columns = Object.keys(row);
      const colList = columns.map(quoteColumn).join(', ');
      const valList = columns.map(col => formatSqlValue(col, row[col])).join(', ');
      lines.push(
        `INSERT INTO ${pt.schema}.${pt.table} (${colList}) VALUES (${valList}) ON CONFLICT (${pt.conflictColumn}) DO NOTHING;`
      );
    }
  }

  return lines.join('\n');
}

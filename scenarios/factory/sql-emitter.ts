/**
 * SQL Emitter — generates INSERT statements with correct load ordering and type formatting.
 *
 * Handles:
 *   - Load order: L1 dims → L1 masters → L2 snapshots → L2 events
 *   - Type-correct value formatting (BIGINT unquoted, VARCHAR quoted, etc.)
 *   - SET search_path header
 *   - Scenario header comments with narrative
 */

/* ────────────────── Load Order ────────────────── */

/**
 * Strict load order for INSERT statements.
 * Parents before children. L1 before L2. Dims before masters.
 */
export const LOAD_ORDER: string[] = [
  // L1 dim tables (prerequisite for masters)
  'l1.country_dim',
  'l1.currency_dim',

  // L1 reference data (parents first)
  'l1.counterparty',
  'l1.credit_agreement_master',
  'l1.facility_master',
  'l1.counterparty_hierarchy',
  'l1.sccl_counterparty_group',
  'l1.sccl_counterparty_group_member',
  'l1.control_relationship',
  'l1.collateral_asset_master',
  'l1.collateral_link',
  'l1.limit_rule',
  'l1.limit_threshold',
  'l1.facility_lender_allocation',
  'l1.facility_counterparty_participation',
  'l1.credit_agreement_counterparty_participation',
  'l1.crm_protection_master',
  'l1.protection_link',
  'l1.metric_threshold',

  // L2 snapshots (facility-level first, then counterparty-level)
  'l2.facility_exposure_snapshot',
  'l2.facility_pricing_snapshot',
  'l2.facility_delinquency_snapshot',
  'l2.facility_profitability_snapshot',
  'l2.facility_financial_snapshot',
  'l2.facility_risk_snapshot',
  'l2.collateral_snapshot',
  'l2.counterparty_rating_observation',
  'l2.counterparty_financial_snapshot',
  'l2.financial_metric_observation',
  'l2.limit_contribution_snapshot',
  'l2.limit_utilization_event',
  'l2.exposure_counterparty_attribution',
  'l2.data_quality_score_snapshot',

  // L2 events
  'l2.credit_event',
  'l2.credit_event_facility_link',
  'l2.amendment_event',
  'l2.amendment_change_detail',
  'l2.exception_event',
  'l2.risk_flag',
  'l2.stress_test_result',
  'l2.stress_test_breach',
  'l2.deal_pipeline_fact',
  'l2.facility_credit_approval',
];

/* ────────────────── Value Formatting ────────────────── */

/**
 * Format a value for SQL INSERT based on its type.
 * Follows the naming convention contract from CLAUDE.md:
 *   _id → BIGINT (unquoted)
 *   _code → VARCHAR (quoted)
 *   _amt → NUMERIC (unquoted)
 *   _pct → NUMERIC (unquoted)
 *   _date → DATE (quoted)
 *   _flag → BOOLEAN (quoted Y/N)
 *   _ts → TIMESTAMP (quoted or NULL)
 *   etc.
 */
export function formatSqlValue(columnName: string, value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  // Exception IDs that are VARCHAR despite _id suffix
  const varcharIds = new Set([
    'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
    'mapped_line_id', 'mapped_column_id',
  ]);

  if (varcharIds.has(columnName)) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  // BIGINT columns: _id suffix → unquoted integer
  if (columnName.endsWith('_id')) {
    const n = Number(value);
    if (isNaN(n)) return 'NULL';
    return String(n);
  }

  // NUMERIC columns: _amt, _pct, _value, _bps → unquoted number
  if (columnName.endsWith('_amt') || columnName.endsWith('_pct') ||
      columnName.endsWith('_value') || columnName.endsWith('_bps')) {
    const n = Number(value);
    if (isNaN(n)) return '0';
    return String(n);
  }

  // INTEGER columns: _count → unquoted integer
  if (columnName.endsWith('_count')) {
    const n = Number(value);
    if (isNaN(n)) return '0';
    return String(Math.round(n));
  }

  // DATE columns: _date → quoted string
  if (columnName.endsWith('_date')) {
    return `'${String(value)}'`;
  }

  // TIMESTAMP columns: _ts → quoted or DEFAULT
  if (columnName.endsWith('_ts')) {
    if (value === 'DEFAULT' || value === 'CURRENT_TIMESTAMP') return 'DEFAULT';
    return value ? `'${String(value)}'` : 'NULL';
  }

  // BOOLEAN-like columns: _flag → quoted string
  if (columnName.endsWith('_flag')) {
    const v = String(value).toUpperCase();
    if (v === 'TRUE' || v === 'Y' || v === '1') return "'Y'";
    if (v === 'FALSE' || v === 'N' || v === '0') return "'N'";
    return `'${v}'`;
  }

  // String columns: everything else → quoted string
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  // Numbers that don't match a suffix → unquoted (guard NaN)
  if (typeof value === 'number') {
    if (isNaN(value)) return 'NULL';
    return String(value);
  }

  // Boolean → quoted Y/N
  if (typeof value === 'boolean') {
    return value ? "'Y'" : "'N'";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

/* ────────────────── Row Types ────────────────── */

export type SqlRow = Record<string, unknown>;

export interface TableData {
  table: string;     // e.g. 'l1.counterparty'
  rows: SqlRow[];
}

/* ────────────────── INSERT Builder ────────────────── */

/**
 * Build a single INSERT statement from a table name and row data.
 * Handles reserved-word quoting (e.g. "value") automatically.
 */
const RESERVED_WORDS = new Set([
  'value', 'all', 'and', 'array', 'as', 'between', 'case', 'check',
  'column', 'constraint', 'create', 'cross', 'default', 'distinct',
  'do', 'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign',
  'from', 'full', 'grant', 'group', 'having', 'in', 'inner', 'into',
  'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
  'offset', 'on', 'only', 'or', 'order', 'outer', 'primary',
  'references', 'right', 'select', 'table', 'then', 'to', 'true',
  'union', 'unique', 'user', 'using', 'when', 'where', 'window', 'with',
]);

function quoteColumn(col: string): string {
  return RESERVED_WORDS.has(col.toLowerCase()) ? `"${col}"` : col;
}

export function buildInsert(table: string, row: SqlRow): string {
  const columns = Object.keys(row);
  const colList = columns.map(quoteColumn).join(', ');
  const valList = columns.map(col => formatSqlValue(col, row[col])).join(', ');
  return `INSERT INTO ${table} (${colList}) VALUES (${valList});`;
}

/* ────────────────── Full Scenario SQL ────────────────── */

export interface EmitOptions {
  scenarioId: string;
  scenarioName: string;
  narrative: string;
}

/**
 * Emit a complete SQL file for a scenario, with tables in correct load order.
 */
export function emitScenarioSql(tables: TableData[], opts: EmitOptions): string {
  const lines: string[] = [
    `-- ${'═'.repeat(65)}`,
    `-- Scenario ${opts.scenarioId}: ${opts.scenarioName}`,
    `-- ${opts.narrative.slice(0, 120)}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- ${'═'.repeat(65)}`,
    '',
    'SET search_path TO l1, l2, public;',
    '',
  ];

  // Build lookup for fast table access
  const tableMap = new Map<string, SqlRow[]>();
  for (const td of tables) {
    tableMap.set(td.table, td.rows);
  }

  // Emit in load order
  for (const tableName of LOAD_ORDER) {
    const rows = tableMap.get(tableName);
    if (!rows || rows.length === 0) continue;

    lines.push(`-- ${'─'.repeat(40)}`);
    lines.push(`-- ${tableName} (${rows.length} rows)`);
    lines.push(`-- ${'─'.repeat(40)}`);
    for (const row of rows) {
      lines.push(buildInsert(tableName, row));
    }
    lines.push('');
  }

  // Emit any tables not in LOAD_ORDER (safety net)
  for (const td of tables) {
    if (!LOAD_ORDER.includes(td.table) && td.rows.length > 0) {
      lines.push(`-- WARNING: ${td.table} not in LOAD_ORDER, appended at end`);
      for (const row of td.rows) {
        lines.push(buildInsert(td.table, row));
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Country codes used by factory scenarios but missing from seed country_dim.
 * These INSERTs are idempotent (ON CONFLICT DO NOTHING).
 */
const FACTORY_COUNTRY_SETUP = `-- Factory prerequisite: additional country_dim entries
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('BR', 'Brazil', 'Y', 'AMER', '50%', 'N', 'N', 'N', 'BRA', '076', 11) ON CONFLICT (country_code) DO NOTHING;
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('IN', 'India', 'Y', 'APAC', '50%', 'N', 'N', 'N', 'IND', '356', 12) ON CONFLICT (country_code) DO NOTHING;
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('MX', 'Mexico', 'Y', 'AMER', '50%', 'N', 'N', 'N', 'MEX', '484', 13) ON CONFLICT (country_code) DO NOTHING;
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('AE', 'United Arab Emirates', 'Y', 'EMEA', '50%', 'N', 'N', 'N', 'ARE', '784', 14) ON CONFLICT (country_code) DO NOTHING;
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('KR', 'South Korea', 'Y', 'APAC', '0%', 'Y', 'N', 'N', 'KOR', '410', 15) ON CONFLICT (country_code) DO NOTHING;
INSERT INTO l1.country_dim (country_code, country_name, is_active, region_code, basel_country_risk_weight, is_developed_market, is_fatf_high_risk, is_ofac_sanctioned, iso_alpha_3, iso_numeric, jurisdiction_id) VALUES ('HK', 'Hong Kong', 'Y', 'APAC', '0%', 'Y', 'N', 'N', 'HKG', '344', 16) ON CONFLICT (country_code) DO NOTHING;
-- Factory prerequisite: additional currency_dim entries
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES ('BRL', 'Brazilian Real', 'R$', 'Y', '986', 2, 'N') ON CONFLICT (currency_code) DO NOTHING;
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES ('INR', 'Indian Rupee', 'Rs', 'Y', '356', 2, 'N') ON CONFLICT (currency_code) DO NOTHING;
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES ('MXN', 'Mexican Peso', 'Mex$', 'Y', '484', 2, 'N') ON CONFLICT (currency_code) DO NOTHING;
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES ('AED', 'UAE Dirham', 'AED', 'Y', '784', 2, 'N') ON CONFLICT (currency_code) DO NOTHING;
INSERT INTO l1.currency_dim (currency_code, currency_name, currency_symbol, is_active, iso_numeric, minor_unit_decimals, is_g10_currency) VALUES ('KRW', 'South Korean Won', 'W', 'Y', '410', 0, 'N') ON CONFLICT (currency_code) DO NOTHING;
-- Factory prerequisite: metric_threshold entries (L1 reference data)
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (1, 1, 'WARNING', 0.0200, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 0.0500, 'CREDIT_RISK', 'PD', 'Probability of Default', 'Credit Risk', 'MET-PD-001', 90.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Warning threshold for portfolio-level PD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (2, 1, 'CRITICAL', 0.0500, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 0.1000, 'CREDIT_RISK', 'PD', 'Probability of Default', 'Credit Risk', 'MET-PD-001', 95.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Critical threshold for portfolio-level PD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (3, 2, 'WARNING', 0.4500, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 0.6000, 'CREDIT_RISK', 'LGD', 'Loss Given Default', 'Credit Risk', 'MET-LGD-001', 90.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Warning threshold for LGD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (4, 2, 'CRITICAL', 0.6000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 0.8000, 'CREDIT_RISK', 'LGD', 'Loss Given Default', 'Credit Risk', 'MET-LGD-001', 95.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Critical threshold for LGD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (5, 3, 'WARNING', 500000000.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 750000000.0000, 'CREDIT_RISK', 'EAD', 'Exposure at Default', 'Credit Risk', 'MET-EAD-001', 90.0000, 'DAILY', 'CRO', 'Risk Committee', '5th business day', 'Warning threshold for single-name EAD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (6, 3, 'CRITICAL', 750000000.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 1000000000.0000, 'CREDIT_RISK', 'EAD', 'Exposure at Default', 'Credit Risk', 'MET-EAD-001', 95.0000, 'DAILY', 'CRO', 'Risk Committee', '5th business day', 'Critical threshold for single-name EAD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (7, 4, 'WARNING', 2000000000.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 3000000000.0000, 'CAPITAL', 'RWA', 'Risk-Weighted Assets', 'Capital Management', 'MET-RWA-001', 90.0000, 'QUARTERLY', 'CFO', 'ALCO', '20th business day', 'Warning threshold for portfolio RWA', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (8, 4, 'CRITICAL', 3000000000.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 4000000000.0000, 'CAPITAL', 'RWA', 'Risk-Weighted Assets', 'Capital Management', 'MET-RWA-001', 95.0000, 'QUARTERLY', 'CFO', 'ALCO', '20th business day', 'Critical threshold for portfolio RWA', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (9, 5, 'WARNING', 100000000.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 150000000.0000, 'LOSS', 'ECL', 'Expected Credit Loss', 'Credit Risk', 'MET-ECL-001', 90.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Warning threshold for portfolio ECL', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (10, 5, 'CRITICAL', 150000000.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 250000000.0000, 'LOSS', 'ECL', 'Expected Credit Loss', 'Credit Risk', 'MET-ECL-001', 95.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Critical threshold for portfolio ECL', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (11, 6, 'WARNING', 1.2000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'LOWER', 1.0000, 'CREDIT_RISK', 'DSCR', 'Debt Service Coverage Ratio', 'Credit Risk', 'MET-DSCR-001', 90.0000, 'QUARTERLY', 'CRO', 'Risk Committee', '20th business day', 'Warning threshold for DSCR (below this is concern)', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (12, 6, 'CRITICAL', 1.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'LOWER', 0.8000, 'CREDIT_RISK', 'DSCR', 'Debt Service Coverage Ratio', 'Credit Risk', 'MET-DSCR-001', 95.0000, 'QUARTERLY', 'CRO', 'Risk Committee', '20th business day', 'Critical threshold for DSCR (below = default risk)', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (13, 7, 'WARNING', 75.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 85.0000, 'CREDIT_RISK', 'LTV', 'Loan-to-Value Ratio', 'Credit Risk', 'MET-LTV-001', 90.0000, 'QUARTERLY', 'CRO', 'Risk Committee', '20th business day', 'Warning threshold for LTV', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (14, 7, 'CRITICAL', 85.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 100.0000, 'CREDIT_RISK', 'LTV', 'Loan-to-Value Ratio', 'Credit Risk', 'MET-LTV-001', 95.0000, 'QUARTERLY', 'CRO', 'Risk Committee', '20th business day', 'Critical threshold for LTV', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (15, 8, 'WARNING', 85.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 95.0000, 'EXPOSURE', 'UTIL', 'Utilization Rate', 'Portfolio Management', 'MET-UTIL-001', 90.0000, 'DAILY', 'COO', 'ALCO', '5th business day', 'Warning threshold for facility utilization', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (16, 8, 'CRITICAL', 95.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 100.0000, 'EXPOSURE', 'UTIL', 'Utilization Rate', 'Portfolio Management', 'MET-UTIL-001', 95.0000, 'DAILY', 'COO', 'ALCO', '5th business day', 'Critical threshold for facility utilization', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (17, 9, 'WARNING', 8.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'LOWER', 5.0000, 'PROFITABILITY', 'ROE', 'Return on Equity', 'Finance', 'MET-ROE-001', 90.0000, 'QUARTERLY', 'CFO', 'Board', '20th business day', 'Warning threshold for ROE (below target)', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (18, 9, 'CRITICAL', 5.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'LOWER', 2.0000, 'PROFITABILITY', 'ROE', 'Return on Equity', 'Finance', 'MET-ROE-001', 95.0000, 'QUARTERLY', 'CFO', 'Board', '20th business day', 'Critical threshold for ROE (minimum acceptable)', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (19, 10, 'WARNING', 15.0000, '2024-01-01', '9999-12-31', 'Y', 80.0000, 'UPPER', 20.0000, 'CONCENTRATION', 'CONC', 'Concentration Ratio', 'Portfolio Management', 'MET-CONC-001', 90.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Warning threshold for single-name concentration', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (20, 10, 'CRITICAL', 20.0000, '2024-01-01', '9999-12-31', 'Y', 90.0000, 'UPPER', 25.0000, 'CONCENTRATION', 'CONC', 'Concentration Ratio', 'Portfolio Management', 'MET-CONC-001', 95.0000, 'MONTHLY', 'CRO', 'Risk Committee', '15th business day', 'Critical threshold for single-name concentration', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (21, 1, 'APPETITE', 0.0100, '2024-01-01', '9999-12-31', 'Y', 70.0000, 'UPPER', 0.0200, 'CREDIT_RISK', 'PD', 'Probability of Default', 'Credit Risk', 'MET-PD-002', 80.0000, 'QUARTERLY', 'CRO', 'Board', '20th business day', 'Risk appetite for portfolio PD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (22, 3, 'APPETITE', 300000000.0000, '2024-01-01', '9999-12-31', 'Y', 70.0000, 'UPPER', 500000000.0000, 'CREDIT_RISK', 'EAD', 'Exposure at Default', 'Credit Risk', 'MET-EAD-002', 80.0000, 'DAILY', 'CRO', 'Board', '5th business day', 'Risk appetite for single-name EAD', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (23, 4, 'APPETITE', 1500000000.0000, '2024-01-01', '9999-12-31', 'Y', 70.0000, 'UPPER', 2000000000.0000, 'CAPITAL', 'RWA', 'Risk-Weighted Assets', 'Capital Management', 'MET-RWA-002', 80.0000, 'QUARTERLY', 'CFO', 'Board', '20th business day', 'Risk appetite for portfolio RWA', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (24, 5, 'APPETITE', 50000000.0000, '2024-01-01', '9999-12-31', 'Y', 70.0000, 'UPPER', 100000000.0000, 'LOSS', 'ECL', 'Expected Credit Loss', 'Credit Risk', 'MET-ECL-002', 80.0000, 'QUARTERLY', 'CRO', 'Board', '15th business day', 'Risk appetite for portfolio ECL', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;
INSERT INTO l1.metric_threshold (threshold_id, metric_definition_id, threshold_type, threshold_value, effective_from_date, effective_to_date, active_flag, inner_threshold_pct, limit_type, limit_value, metric_category, metric_code, metric_name, metric_owner, metric_id_display, outer_threshold_pct, report_frequency, lod1_sponsor, lod2_sponsor, report_deadline, metric_description, last_threshold_updated_date) VALUES (25, 8, 'APPETITE', 70.0000, '2024-01-01', '9999-12-31', 'Y', 70.0000, 'UPPER', 85.0000, 'EXPOSURE', 'UTIL', 'Utilization Rate', 'Portfolio Management', 'MET-UTIL-002', 80.0000, 'MONTHLY', 'COO', 'Board', '15th business day', 'Risk appetite for portfolio utilization', '2024-06-15') ON CONFLICT (threshold_id) DO NOTHING;`;

/**
 * Emit combined SQL for multiple scenarios.
 */
export function emitCombinedSql(scenarioSqls: string[]): string {
  const header = [
    `-- ${'═'.repeat(65)}`,
    '-- Factory-Generated Scenario Data',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Scenarios: ${scenarioSqls.length}`,
    '-- Load AFTER: 05-scenario-seed.sql',
    `-- ${'═'.repeat(65)}`,
    '',
    'SET search_path TO l1, l2, public;',
    '',
    FACTORY_COUNTRY_SETUP,
  ].join('\n');

  return header + scenarioSqls.join('\n\n');
}

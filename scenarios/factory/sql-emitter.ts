/**
 * SQL Emitter — generates INSERT statements with correct load ordering and type formatting.
 *
 * Handles:
 *   - Load order: L1 dims → L1 masters → L2 snapshots → L2 events
 *   - Type-correct value formatting (BIGINT unquoted, VARCHAR quoted, etc.)
 *   - SET search_path header
 *   - Scenario header comments with narrative
 */

import {
  formatSqlValue as _formatSqlValue,
  quoteColumn as _quoteColumn,
  PG_RESERVED_WORDS,
} from '../../lib/sql-value-formatter';

/* ────────────────── Load Order ────────────────── */

/**
 * Strict load order for INSERT statements.
 * Parents before children. L1 before L2. Dims before masters.
 */
export const LOAD_ORDER: string[] = [
  // L1 dim tables (prerequisite for masters)
  'l1.country_dim',
  'l1.currency_dim',
  'l1.metric_threshold',

  // L1 master tables (parents first)
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
  'l2.facility_lender_allocation',
  'l2.facility_counterparty_participation',
  'l1.credit_agreement_counterparty_participation',
  'l1.crm_protection_master',
  'l1.protection_link',

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
  // 'l2.ecl_provision_snapshot',  // Table does not exist in PG — re-enable after DDL migration
  'l2.financial_metric_observation',
  'l2.limit_contribution_snapshot',
  'l2.limit_utilization_event',
  'l2.exposure_counterparty_attribution',
  'l2.data_quality_score_snapshot',
  'l2.facility_lob_attribution',
  'l2.netting_set_exposure_snapshot',
  'l2.metric_threshold',

  // L2 position tables (position before position_detail, then product tables)
  'l2.position',
  'l2.position_detail',
  // 'l2.cash_flow',  // Table does not exist in PG — re-enable after DDL migration

  // L2 product-specific snapshot tables (40 tables, 10 products × 4 categories)
  // All keyed on (position_id, as_of_date) with FK to l2.position
  // Loans
  'l2.loans_indicative_snapshot',
  'l2.loans_accounting_snapshot',
  'l2.loans_classification_snapshot',
  'l2.loans_risk_snapshot',
  // Derivatives
  'l2.derivatives_indicative_snapshot',
  'l2.derivatives_accounting_snapshot',
  'l2.derivatives_classification_snapshot',
  'l2.derivatives_risk_snapshot',
  // Off-BS Commitments
  'l2.offbs_commitments_indicative_snapshot',
  'l2.offbs_commitments_accounting_snapshot',
  'l2.offbs_commitments_classification_snapshot',
  'l2.offbs_commitments_risk_snapshot',
  // SFT
  'l2.sft_indicative_snapshot',
  'l2.sft_accounting_snapshot',
  'l2.sft_classification_snapshot',
  'l2.sft_risk_snapshot',
  // Securities
  'l2.securities_indicative_snapshot',
  'l2.securities_accounting_snapshot',
  'l2.securities_classification_snapshot',
  'l2.securities_risk_snapshot',
  // Deposits
  'l2.deposits_indicative_snapshot',
  'l2.deposits_accounting_snapshot',
  'l2.deposits_classification_snapshot',
  'l2.deposits_risk_snapshot',
  // Borrowings
  'l2.borrowings_indicative_snapshot',
  'l2.borrowings_accounting_snapshot',
  'l2.borrowings_classification_snapshot',
  'l2.borrowings_risk_snapshot',
  // Debt
  'l2.debt_indicative_snapshot',
  'l2.debt_accounting_snapshot',
  'l2.debt_classification_snapshot',
  'l2.debt_risk_snapshot',
  // Equities
  'l2.equities_indicative_snapshot',
  'l2.equities_accounting_snapshot',
  'l2.equities_classification_snapshot',
  'l2.equities_risk_snapshot',
  // Stock
  'l2.stock_indicative_snapshot',
  'l2.stock_accounting_snapshot',
  'l2.stock_classification_snapshot',
  'l2.stock_risk_snapshot',

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

// Re-export from shared module for backwards compatibility
export const formatSqlValue = _formatSqlValue;

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
const quoteColumn = _quoteColumn;

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
  generatedAt?: string;
}

/**
 * Emit a complete SQL file for a scenario, with tables in correct load order.
 */
export function emitScenarioSql(tables: TableData[], opts: EmitOptions): string {
  const ts = opts.generatedAt ?? new Date().toISOString();
  const lines: string[] = [
    `-- ${'═'.repeat(65)}`,
    `-- Scenario ${opts.scenarioId}: ${opts.scenarioName}`,
    `-- ${opts.narrative.slice(0, 120)}`,
    `-- Generated: ${ts}`,
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

// Factory prerequisite data — single source of truth in factory-prerequisites.ts
import { emitPrerequisiteSql } from './factory-prerequisites';

/**
 * Emit combined SQL for multiple scenarios.
 */
export function emitCombinedSql(scenarioSqls: string[], generatedAt?: string): string {
  const ts = generatedAt ?? new Date().toISOString();
  const header = [
    `-- ${'═'.repeat(65)}`,
    '-- Factory-Generated Scenario Data',
    `-- Generated: ${ts}`,
    `-- Scenarios: ${scenarioSqls.length}`,
    '-- Load AFTER: 05-scenario-seed.sql',
    `-- ${'═'.repeat(65)}`,
    '',
    'SET search_path TO l1, l2, public;',
    '',
    emitPrerequisiteSql(),
  ].join('\n');

  return header + scenarioSqls.join('\n\n');
}

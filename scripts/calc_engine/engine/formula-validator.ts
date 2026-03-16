/**
 * GSIB Calculation Engine — Formula Validator
 *
 * Validates YAML metric formulas by executing them against PostgreSQL.
 * For each metric × level:
 *   - Executes formula_sql with parameterized as_of_date
 *   - Checks row count > 0
 *   - Verifies metric_value column exists and has non-null values
 *   - Structural SCD2 check (is_current_flag / is_active_flag)
 *   - FX weighting check for WEIGHTED_AVG with currency amounts
 *   - Cross-level reconciliation for SUM/COUNT metrics
 *
 * Usage:
 *   npx tsx scripts/calc_engine/cli.ts validate [options]
 */

import { loadMetricDefinitions } from '../loader';
import { SqlExecutor } from './executor';
import { loadEngineConfig } from '../config/engine-config';
import type {
  MetricDefinition,
  AggregationLevel,
  AggregationType,
} from '../types';

// ── Types ────────────────────────────────────────────────

export type FormulaCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'SKIP';

export interface FormulaCheckResult {
  metricId: string;
  level: AggregationLevel;
  status: FormulaCheckStatus;
  rowCount: number;
  durationMs: number;
  error?: string;
  warnings: string[];
}

export interface FormulaValidationSummary {
  totalChecks: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  results: FormulaCheckResult[];
  reconciliationResults: ReconciliationResult[];
}

export interface ReconciliationResult {
  metricId: string;
  facilitySum: number;
  segmentSum: number;
  diffPct: number;
  status: FormulaCheckStatus;
}

export interface ValidateFormulaOptions {
  metricIds?: string[];
  domains?: string[];
  statuses?: string[];
  levels?: AggregationLevel[];
  asOfDate: string;
  includeDraft?: boolean;
  verbose?: boolean;
}

// ── SCD2 tables known to have is_current_flag ────────────

const SCD2_TABLES = new Set([
  'l2.facility_master',
  'l1.enterprise_business_taxonomy',
  'l2.facility_lender_allocation',
  'l2.facility_counterparty_participation',
  'l1.regulatory_capital_requirement',
  'l2.fx_rate',
]);

// ── Main validator ───────────────────────────────────────

export async function validateFormulas(
  opts: ValidateFormulaOptions
): Promise<FormulaValidationSummary> {
  const { metrics, errors, warnings: yamlWarnings } = loadMetricDefinitions();
  if (errors.length > 0 && opts.verbose) {
    for (const err of errors) console.warn(`  YAML error: ${err}`);
  }
  if (yamlWarnings.length > 0 && opts.verbose) {
    for (const w of yamlWarnings) console.warn(`  YAML lint: ${w}`);
  }

  // Filter metrics
  let filtered = metrics;
  if (opts.metricIds && opts.metricIds.length > 0) {
    const ids = new Set(opts.metricIds);
    filtered = filtered.filter((m) => ids.has(m.metric_id));
  }
  if (opts.domains && opts.domains.length > 0) {
    const doms = new Set(opts.domains);
    filtered = filtered.filter((m) => doms.has(m.domain));
  }
  if (opts.statuses && opts.statuses.length > 0) {
    const stats = new Set(opts.statuses);
    filtered = filtered.filter((m) => stats.has(m.status));
  } else if (!opts.includeDraft) {
    filtered = filtered.filter((m) => m.status === 'ACTIVE');
  }

  if (filtered.length === 0) {
    console.log('  No metrics match the filter criteria.');
    return { totalChecks: 0, passed: 0, warned: 0, failed: 0, skipped: 0, results: [], reconciliationResults: [] };
  }

  const levelsToCheck: AggregationLevel[] = opts.levels ?? [
    'facility', 'counterparty', 'desk', 'portfolio', 'business_segment',
  ];

  console.log(`  Validating ${filtered.length} metric(s) × ${levelsToCheck.length} level(s)\n`);

  // Connect to DB
  const config = loadEngineConfig({ verbose: opts.verbose });
  if (!config.databaseUrl) {
    console.error('  DATABASE_URL is required for formula validation.');
    process.exit(1);
  }

  const executor = new SqlExecutor(config);
  const results: FormulaCheckResult[] = [];
  const reconciliationResults: ReconciliationResult[] = [];

  try {
    for (const metric of filtered) {
      if (opts.verbose) {
        console.log(`  ── ${metric.metric_id}: ${metric.name} ──`);
      }

      const facilitySum: number[] = [];
      const segmentSum: number[] = [];

      for (const level of levelsToCheck) {
        const formula = metric.levels[level];
        if (!formula?.formula_sql?.trim()) {
          results.push({
            metricId: metric.metric_id,
            level,
            status: 'FAIL',
            rowCount: 0,
            durationMs: 0,
            error: 'Empty formula_sql',
            warnings: [],
          });
          continue;
        }

        const checkResult = await validateSingleFormula(
          executor, metric, level, formula.formula_sql, formula.aggregation_type, opts
        );
        results.push(checkResult);

        // Collect sums for reconciliation
        if (level === 'facility' && checkResult.status !== 'FAIL') {
          facilitySum.push(checkResult._sum ?? 0);
        }
        if (level === 'business_segment' && checkResult.status !== 'FAIL') {
          segmentSum.push(checkResult._sum ?? 0);
        }
      }

      // Cross-level reconciliation for SUM/COUNT metrics only
      const facilityAgg = metric.levels.facility?.aggregation_type;
      const segmentAgg = metric.levels.business_segment?.aggregation_type;
      const isAdditive =
        (facilityAgg === 'SUM' || facilityAgg === 'COUNT' || facilityAgg === 'RAW') &&
        (segmentAgg === 'SUM' || segmentAgg === 'COUNT');

      if (
        isAdditive &&
        levelsToCheck.includes('facility') &&
        levelsToCheck.includes('business_segment') &&
        facilitySum.length > 0 &&
        segmentSum.length > 0
      ) {
        const fSum = facilitySum[0];
        const sSum = segmentSum[0];
        const diffPct = fSum === 0 ? 0 : Math.abs((fSum - sSum) / fSum) * 100;
        const recon: ReconciliationResult = {
          metricId: metric.metric_id,
          facilitySum: fSum,
          segmentSum: sSum,
          diffPct,
          status: diffPct <= 0.01 ? 'PASS' : diffPct <= 1 ? 'WARN' : 'FAIL',
        };
        reconciliationResults.push(recon);
      }
    }
  } finally {
    await executor.close();
  }

  // Build summary
  const summary: FormulaValidationSummary = {
    totalChecks: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    warned: results.filter((r) => r.status === 'WARN').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    skipped: results.filter((r) => r.status === 'SKIP').length,
    results,
    reconciliationResults,
  };

  return summary;
}

// ── Single formula validation ────────────────────────────

interface ExtendedCheckResult extends FormulaCheckResult {
  _sum?: number;
}

async function validateSingleFormula(
  executor: SqlExecutor,
  metric: MetricDefinition,
  level: AggregationLevel,
  sql: string,
  aggType: AggregationType,
  opts: ValidateFormulaOptions
): Promise<ExtendedCheckResult> {
  const warnings: string[] = [];

  // Structural check 1: SCD2 filtering (per-alias — generic sql.includes misses
  // cases where is_current_flag appears for one table but not another)
  for (const st of metric.source_tables) {
    const qualifiedName = `${st.schema}.${st.table}`;
    if (SCD2_TABLES.has(qualifiedName)) {
      const alias = st.alias ?? st.table;
      // Check that this specific alias has its own is_current_flag or is_active_flag filter
      const aliasCurrentRegex = new RegExp(`${alias}\\.is_current_flag`, 'i');
      const aliasActiveRegex = new RegExp(`${alias}\\.is_active_flag`, 'i');
      // Also check join_on in source_tables definition (not just formula_sql)
      const joinOn = st.join_on ?? '';
      const hasScdInSql = aliasCurrentRegex.test(sql) || aliasActiveRegex.test(sql);
      const hasScdInJoinOn = aliasCurrentRegex.test(joinOn) || aliasActiveRegex.test(joinOn);
      if (!hasScdInSql && !hasScdInJoinOn) {
        warnings.push(`SCD2: ${qualifiedName} (alias: ${alias}) used but no ${alias}.is_current_flag/${alias}.is_active_flag filter`);
      }
    }
  }

  // Structural check 2: FX on WEIGHTED_AVG with currency amounts
  if (aggType === 'WEIGHTED_AVG') {
    const weight = metric.levels[level]?.weighting_field ?? '';
    const usesCurrencyWeight = /committed_amount|_amt/i.test(weight) || /committed_amount|_amt/i.test(sql);
    if (usesCurrencyWeight) {
      const hasFx = sql.includes('fx_rate') || sql.includes('fx.rate');
      if (!hasFx) {
        warnings.push('FX: WEIGHTED_AVG with currency amount weight but no fx_rate in SQL');
      }
    }
  }

  // Execute SQL
  const wrappedSql = `SELECT * FROM (${sql}) _v LIMIT 1000`;
  const start = performance.now();

  try {
    const result = await executor.query(wrappedSql, { as_of_date: opts.asOfDate });
    const durationMs = Math.round(performance.now() - start);

    // Check row count
    if (result.rowCount === 0) {
      return {
        metricId: metric.metric_id,
        level,
        status: 'WARN',
        rowCount: 0,
        durationMs,
        warnings: [...warnings, 'Query returned 0 rows'],
        _sum: 0,
      };
    }

    // Check metric_value column
    const firstRow = result.rows[0];
    const hasMetricValue = 'metric_value' in firstRow;
    if (!hasMetricValue) {
      warnings.push('Missing metric_value column in result');
    }

    // Check for at least one non-null metric_value
    const hasNonNull = result.rows.some(
      (r) => r.metric_value !== null && r.metric_value !== undefined
    );
    if (hasMetricValue && !hasNonNull) {
      warnings.push('All metric_value values are NULL');
    }

    // Compute sum for reconciliation
    let sum = 0;
    if (hasMetricValue) {
      // For full sum, run a SUM query
      try {
        const sumResult = await executor.query(
          `SELECT COALESCE(SUM(metric_value), 0) AS total FROM (${sql}) _s`,
          { as_of_date: opts.asOfDate }
        );
        sum = Number(sumResult.rows[0]?.total ?? 0);
      } catch {
        // Sum query failed — not critical
      }
    }

    const status: FormulaCheckStatus =
      warnings.length > 0 ? 'WARN' : 'PASS';

    if (opts.verbose) {
      const statusIcon = status === 'PASS' ? 'OK' : status === 'WARN' ? 'WARN' : 'FAIL';
      console.log(
        `    ${statusIcon}  ${metric.metric_id}:${level}  rows=${result.rowCount}  ${durationMs}ms` +
        (warnings.length > 0 ? `  [${warnings.join('; ')}]` : '')
      );
    }

    return {
      metricId: metric.metric_id,
      level,
      status,
      rowCount: result.rowCount,
      durationMs,
      warnings,
      _sum: sum,
    };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);

    if (opts.verbose) {
      console.log(`    FAIL  ${metric.metric_id}:${level}  ${msg}`);
    }

    return {
      metricId: metric.metric_id,
      level,
      status: 'FAIL',
      rowCount: 0,
      durationMs,
      error: msg,
      warnings,
    };
  }
}

// ── Output formatting ────────────────────────────────────

export function printValidationSummary(summary: FormulaValidationSummary): void {
  console.log(`\n  ${'═'.repeat(90)}`);
  console.log(`  Formula Validation Results`);
  console.log(`  ${'═'.repeat(90)}`);

  // Results table
  console.log(
    `\n  ${'Metric'.padEnd(12)} ${'Level'.padEnd(18)} ${'Status'.padEnd(8)} ${'Rows'.padEnd(8)} ${'Time'.padEnd(8)} ${'Notes'}`
  );
  console.log(`  ${'─'.repeat(12)} ${'─'.repeat(18)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(30)}`);

  for (const r of summary.results) {
    const notes = r.error
      ? r.error.slice(0, 50)
      : r.warnings.length > 0
        ? r.warnings.join('; ').slice(0, 50)
        : '';
    console.log(
      `  ${r.metricId.padEnd(12)} ${r.level.padEnd(18)} ${r.status.padEnd(8)} ${String(r.rowCount).padEnd(8)} ${(r.durationMs + 'ms').padEnd(8)} ${notes}`
    );
  }

  // Reconciliation
  if (summary.reconciliationResults.length > 0) {
    console.log(`\n  Cross-Level Reconciliation (facility vs business_segment):`);
    console.log(
      `  ${'Metric'.padEnd(12)} ${'Facility SUM'.padEnd(18)} ${'Segment SUM'.padEnd(18)} ${'Diff %'.padEnd(10)} ${'Status'}`
    );
    console.log(`  ${'─'.repeat(12)} ${'─'.repeat(18)} ${'─'.repeat(18)} ${'─'.repeat(10)} ${'─'.repeat(8)}`);

    for (const r of summary.reconciliationResults) {
      console.log(
        `  ${r.metricId.padEnd(12)} ${r.facilitySum.toFixed(2).padEnd(18)} ${r.segmentSum.toFixed(2).padEnd(18)} ${r.diffPct.toFixed(4).padEnd(10)} ${r.status}`
      );
    }
  }

  // Summary
  console.log(`\n  ${'─'.repeat(60)}`);
  console.log(`  Total: ${summary.totalChecks}  |  PASS: ${summary.passed}  |  WARN: ${summary.warned}  |  FAIL: ${summary.failed}  |  SKIP: ${summary.skipped}`);
  console.log(`  ${'─'.repeat(60)}`);
}

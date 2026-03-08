/**
 * GSIB Calculation Engine — Runner (Orchestrator)
 *
 * Orchestrates a full calculation run:
 *   1. Load metric definitions
 *   2. Build execution plan (DAG)
 *   3. Execute batches (parallel within batch, sequential across)
 *   4. Run validations and reconciliation
 *   5. Finalize run record
 */

import crypto from 'crypto';
import { execSync } from 'child_process';
import { loadMetricDefinitions } from '../loader';
import { buildExecutionPlan, formatExecutionPlanAscii } from './dag';
import { SqlExecutor, sqlHash } from './executor';
import { writeResults, initCalcRun, finalizeCalcRun } from './result-writer';
import { logAudit } from './audit-logger';
import { runValidations } from './validation-runner';
import { runReconciliation } from './reconciliation-runner';
import type {
  MetricDefinition,
  AggregationLevel,
  AGGREGATION_LEVELS,
  CalcRunContext,
  CalcRunSummary,
  MetricExecutionResult,
  LevelExecutionResult,
  EngineConfig,
  MetricExecStatus,
} from '../types';
import { ENGINE_VERSION } from '../config/defaults';

export interface RunOptions {
  asOfDate: string;
  priorAsOfDate?: string;
  baseCurrency?: string;
  runVersionId?: string;
  metricIds?: string[];
  domains?: string[];
  levels?: AggregationLevel[];
  parallel?: number;
  includeDraft?: boolean;
  skipValidation?: boolean;
  skipReconciliation?: boolean;
  config: EngineConfig;
  cliArgs: string;
}

function getGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Compute the prior month's date for period-over-period comparisons.
 * Handles month-end edge cases: 2026-03-31 → 2026-02-28, 2026-01-31 → 2025-12-31.
 */
function computePriorDate(asOfDate: string): string {
  const [year, month, day] = asOfDate.split('-').map(Number);
  const priorMonth = month - 1;
  const priorYear = priorMonth < 1 ? year - 1 : year;
  const priorMonthAdj = priorMonth < 1 ? 12 : priorMonth;
  // Use day 0 of the next month to get last day of the target month
  const lastDayOfPriorMonth = new Date(priorYear, priorMonthAdj, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfPriorMonth);
  return `${priorYear}-${String(priorMonthAdj).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/** Validate YYYY-MM-DD date format */
function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Execute a full calculation run.
 */
export async function run(options: RunOptions): Promise<CalcRunSummary> {
  const {
    asOfDate,
    baseCurrency = 'USD',
    config,
    cliArgs,
  } = options;

  // Validate date format
  if (!isValidDate(asOfDate)) {
    console.error(`\n  ERROR: Invalid as-of-date format: "${asOfDate}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const priorAsOfDate = options.priorAsOfDate ?? computePriorDate(asOfDate);
  if (options.priorAsOfDate && !isValidDate(options.priorAsOfDate)) {
    console.error(`\n  ERROR: Invalid prior-date format: "${options.priorAsOfDate}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }
  const runVersionId = options.runVersionId ?? `RUN_${asOfDate.replace(/-/g, '_')}_${Date.now().toString(36)}`;
  const runId = crypto.randomUUID();
  const levelsToRun: AggregationLevel[] = options.levels ?? [
    'facility', 'counterparty', 'desk', 'portfolio', 'business_segment'
  ];

  const ctx: CalcRunContext = {
    runId,
    runVersionId,
    asOfDate,
    priorAsOfDate,
    baseCurrency,
    config,
    gitSha: getGitSha(),
    engineVersion: ENGINE_VERSION,
    startedAt: new Date(),
  };

  // ── STEP 1: Load definitions ──
  console.log(`\n  Loading metric definitions...`);
  const { metrics: allMetrics, errors: loadErrors } = loadMetricDefinitions();

  if (loadErrors.length > 0) {
    console.error(`\n  YAML load errors:`);
    for (const err of loadErrors) {
      console.error(`    ${err}`);
    }
  }

  // Filter by status
  let metrics = allMetrics.filter(
    (m) => m.status === 'ACTIVE' || (options.includeDraft && m.status === 'DRAFT')
  );

  // Filter by domain
  if (options.domains?.length) {
    const domainSet = new Set(options.domains);
    metrics = metrics.filter((m) => domainSet.has(m.domain));
  }

  console.log(`  Found ${metrics.length} metrics (of ${allMetrics.length} total)`);

  if (metrics.length === 0) {
    console.log(`\n  No metrics to execute. Done.`);
    return {
      runId,
      runVersionId,
      asOfDate,
      status: 'COMPLETED',
      metricsRequested: 0,
      metricsSucceeded: 0,
      metricsFailed: 0,
      metricsSkipped: 0,
      totalRowsWritten: 0,
      durationMs: 0,
      validationSummary: { passed: 0, failed: 0, warnings: 0 },
      failedMetrics: [],
      skippedMetrics: [],
    };
  }

  // ── STEP 2: Build execution plan ──
  console.log(`\n  Building execution plan...`);
  const plan = buildExecutionPlan(metrics, options.metricIds);

  if (plan.hasCycles) {
    console.error(`\n  FATAL: Cycle detected: ${plan.cyclePath?.join(' → ')}`);
    process.exit(1);
  }

  console.log(formatExecutionPlanAscii(plan));

  if (config.dryRun) {
    console.log(`\n  DRY RUN — no SQL will be executed.`);
    return {
      runId,
      runVersionId,
      asOfDate,
      status: 'COMPLETED',
      metricsRequested: plan.totalMetrics,
      metricsSucceeded: 0,
      metricsFailed: 0,
      metricsSkipped: 0,
      totalRowsWritten: 0,
      durationMs: Math.round(Date.now() - ctx.startedAt.getTime()),
      validationSummary: { passed: 0, failed: 0, warnings: 0 },
      failedMetrics: [],
      skippedMetrics: [],
    };
  }

  // ── STEP 3: Connect and initialize ──
  if (!config.databaseUrl) {
    console.error(`\n  ERROR: DATABASE_URL not set. Use --dry-run or set DATABASE_URL in .env`);
    process.exit(1);
  }

  const executor = new SqlExecutor(config);

  try {
    // Health check: verify required tables exist
    console.log(`\n  Checking database connectivity...`);
    const healthErrors = await executor.healthCheck();
    if (healthErrors.length > 0) {
      console.error(`\n  Database health check failed:`);
      for (const err of healthErrors) {
        console.error(`    - ${err}`);
      }
      console.error(`\n  Run the DDL script first: psql $DATABASE_URL -f scripts/calc_engine/ddl/calc-engine-tables.sql`);
      process.exit(1);
    }
    console.log(`  Database OK`);

    console.log(`\n  Initializing run ${runId}...`);
    await initCalcRun(executor, ctx, plan.totalMetrics, cliArgs);

    // ── STEP 4: Execute batches ──
    const metricResults = new Map<string, MetricExecutionResult>();
    const metricStatusMap = new Map<string, MetricExecStatus>();
    let totalRowsWritten = 0;

    for (const batch of plan.batches) {
      console.log(`\n  ── Tier ${batch.tier} (${batch.metrics.length} metrics) ──`);

      const maxParallel = options.parallel ?? config.poolSize;
      const batchMetrics = batch.metrics
        .map((id) => metrics.find((m) => m.metric_id === id))
        .filter((m): m is MetricDefinition => m !== undefined);

      // Execute metrics in parallel within batch (limited concurrency)
      const chunks = chunkArray(batchMetrics, maxParallel);
      for (const chunk of chunks) {
        const promises = chunk.map((metric) =>
          executeMetric(executor, ctx, metric, levelsToRun, metricStatusMap, options.skipValidation ?? false)
        );
        const results = await Promise.allSettled(promises);

        for (const r of results) {
          if (r.status === 'fulfilled') {
            metricResults.set(r.value.metricId, r.value);
            metricStatusMap.set(r.value.metricId, r.value.overallStatus);
            totalRowsWritten += r.value.totalRowsWritten;
          }
        }
      }
    }

    // ── STEP 5: Reconciliation ──
    let reconResults: { passed: number; failed: number; warnings: number } = {
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    if (!options.skipReconciliation && metricResults.size > 0) {
      console.log(`\n  Running cross-metric reconciliation...`);
      const reconChecks = await runReconciliation(executor, ctx);
      for (const r of reconChecks) {
        if (r.status === 'PASS') reconResults.passed++;
        else if (r.status === 'FAIL') {
          if (r.severity === 'WARNING') reconResults.warnings++;
          else reconResults.failed++;
        }
        const icon = r.status === 'PASS' ? 'OK' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
        console.log(`    [${icon}] ${r.ruleId}: ${r.message}`);
      }
    }

    // ── STEP 6: Finalize ──
    const succeeded = Array.from(metricResults.values()).filter(
      (r) => r.overallStatus === 'SUCCEEDED'
    ).length;
    const failed = Array.from(metricResults.values()).filter(
      (r) => r.overallStatus === 'FAILED'
    ).length;
    const skipped = Array.from(metricResults.values()).filter(
      (r) => r.overallStatus === 'SKIPPED'
    ).length;

    const status = failed > 0
      ? (succeeded > 0 ? 'PARTIAL' : 'FAILED')
      : 'COMPLETED';

    const failedMetrics = Array.from(metricResults.values())
      .filter((r) => r.overallStatus === 'FAILED')
      .map((r) => r.metricId);
    const skippedMetrics = Array.from(metricResults.values())
      .filter((r) => r.overallStatus === 'SKIPPED')
      .map((r) => r.metricId);

    await finalizeCalcRun(executor, ctx, {
      status,
      metricsSucceeded: succeeded,
      metricsFailed: failed,
      metricsSkipped: skipped,
      totalRowsWritten,
      errorSummary: failedMetrics.length > 0
        ? `Failed metrics: ${failedMetrics.join(', ')}`
        : undefined,
    });

    // Count validation results across all metrics
    const valSummary = { passed: reconResults.passed, failed: reconResults.failed, warnings: reconResults.warnings };
    for (const r of metricResults.values()) {
      for (const v of r.validationResults) {
        if (v.status === 'PASS') valSummary.passed++;
        else if (v.severity === 'WARNING') valSummary.warnings++;
        else valSummary.failed++;
      }
    }

    const summary: CalcRunSummary = {
      runId,
      runVersionId,
      asOfDate,
      status: status as CalcRunSummary['status'],
      metricsRequested: plan.totalMetrics,
      metricsSucceeded: succeeded,
      metricsFailed: failed,
      metricsSkipped: skipped,
      totalRowsWritten,
      durationMs: Math.round(Date.now() - ctx.startedAt.getTime()),
      validationSummary: valSummary,
      failedMetrics,
      skippedMetrics,
    };

    printSummary(summary);
    return summary;
  } finally {
    await executor.close();
  }
}

/**
 * Execute a single metric at all requested levels.
 */
async function executeMetric(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  levels: AggregationLevel[],
  statusMap: Map<string, MetricExecStatus>,
  skipValidation: boolean
): Promise<MetricExecutionResult> {
  const metricStart = performance.now();

  // Check dependencies
  for (const depId of metric.depends_on) {
    const depStatus = statusMap.get(depId);
    if (depStatus !== 'SUCCEEDED') {
      console.log(`    SKIP ${metric.metric_id} — dependency ${depId} not succeeded (${depStatus ?? 'not run'})`);

      await logAudit(executor, ctx, {
        metricId: metric.metric_id,
        metricVersion: metric.version,
        level: levels[0],
        status: 'SKIPPED',
        startedAt: new Date(),
        errorMessage: `Dependency ${depId} not succeeded`,
        errorCode: 'DEPENDENCY_FAILED',
        dependencyChain: metric.depends_on,
      });

      return {
        metricId: metric.metric_id,
        metricVersion: metric.version,
        overallStatus: 'SKIPPED',
        levels: [],
        validationResults: [],
        totalRowsWritten: 0,
        totalDurationMs: Math.round(performance.now() - metricStart),
      };
    }
  }

  const levelResults: LevelExecutionResult[] = [];
  let anyFailed = false;

  for (const level of levels) {
    const formula = metric.levels[level];
    if (!formula) continue;

    const levelStart = performance.now();
    const startedAt = new Date();

    await logAudit(executor, ctx, {
      metricId: metric.metric_id,
      metricVersion: metric.version,
      level,
      status: 'STARTED',
      startedAt,
      bindParams: { as_of_date: ctx.asOfDate, base_currency: ctx.baseCurrency },
    });

    try {
      const queryResult = await executor.query(formula.formula_sql, {
        as_of_date: ctx.asOfDate,
        base_currency: ctx.baseCurrency,
        prior_as_of_date: ctx.priorAsOfDate,
        run_id: ctx.runId,
      });

      // Validate required columns in query results
      if (queryResult.rows.length > 0) {
        const firstRow = queryResult.rows[0];
        const missingCols: string[] = [];
        if (!('dimension_key' in firstRow)) missingCols.push('dimension_key');
        if (!('metric_value' in firstRow)) missingCols.push('metric_value');
        if (missingCols.length > 0) {
          throw new Error(
            `Query result missing required columns: ${missingCols.join(', ')}. ` +
            `Got columns: ${Object.keys(firstRow).join(', ')}`
          );
        }
      }

      const writeResult = await writeResults(executor, ctx, {
        metric,
        level,
        rows: queryResult.rows,
        sqlExecuted: formula.formula_sql,
        sourceRowCount: queryResult.rowCount,
      });

      const durationMs = Math.round(performance.now() - levelStart);
      const hash = sqlHash(formula.formula_sql);

      const levelResult: LevelExecutionResult = {
        metricId: metric.metric_id,
        level,
        status: 'SUCCEEDED',
        rowsReturned: queryResult.rowCount,
        rowsWritten: writeResult.rowsWritten,
        durationMs,
        sqlExecuted: formula.formula_sql,
        sqlHash: hash,
        sourceRowCounts: {},
      };
      levelResults.push(levelResult);

      await logAudit(executor, ctx, {
        metricId: metric.metric_id,
        metricVersion: metric.version,
        level,
        status: 'SUCCEEDED',
        startedAt,
        completedAt: new Date(),
        durationMs,
        rowsReturned: queryResult.rowCount,
        rowsWritten: writeResult.rowsWritten,
        sqlExecuted: formula.formula_sql,
        sourceTables: metric.source_tables.map((t) => `${t.schema}.${t.table}`),
        bindParams: { as_of_date: ctx.asOfDate, base_currency: ctx.baseCurrency },
      });

      if (ctx.config.verbose) {
        console.log(
          `    ${metric.metric_id}/${level}: ${queryResult.rowCount} rows → ${writeResult.rowsWritten} written (${durationMs}ms)`
        );
      }
    } catch (err) {
      anyFailed = true;
      const durationMs = Math.round(performance.now() - levelStart);
      const errMsg = err instanceof Error ? err.message : String(err);
      const errCode = getCalcErrorCode(err);

      const levelResult: LevelExecutionResult = {
        metricId: metric.metric_id,
        level,
        status: 'FAILED',
        rowsReturned: 0,
        rowsWritten: 0,
        durationMs,
        sqlExecuted: formula.formula_sql,
        sqlHash: sqlHash(formula.formula_sql),
        sourceRowCounts: {},
        error: { message: errMsg, code: errCode },
      };
      levelResults.push(levelResult);

      await logAudit(executor, ctx, {
        metricId: metric.metric_id,
        metricVersion: metric.version,
        level,
        status: 'FAILED',
        startedAt,
        completedAt: new Date(),
        durationMs,
        sqlExecuted: formula.formula_sql,
        errorMessage: errMsg,
        errorCode: errCode,
        errorDetail: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
      });

      console.error(`    FAIL ${metric.metric_id}/${level}: ${errMsg}`);
    }
  }

  // Run validations for this metric
  let validationResults: MetricExecutionResult['validationResults'] = [];
  if (!skipValidation && !anyFailed && metric.validations.length > 0) {
    validationResults = await runValidations(executor, ctx, metric);
  }

  const overallStatus: MetricExecStatus = anyFailed ? 'FAILED' : 'SUCCEEDED';
  const totalRowsWritten = levelResults.reduce((sum, r) => sum + r.rowsWritten, 0);

  console.log(
    `    ${overallStatus === 'SUCCEEDED' ? 'OK' : 'FAIL'} ${metric.metric_id} — ${totalRowsWritten} rows (${Math.round(performance.now() - metricStart)}ms)`
  );

  return {
    metricId: metric.metric_id,
    metricVersion: metric.version,
    overallStatus,
    levels: levelResults,
    validationResults,
    totalRowsWritten,
    totalDurationMs: Math.round(performance.now() - metricStart),
  };
}

function getCalcErrorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    if ('code' in err) {
      const code = String((err as { code: string }).code);
      if (code === '57014') return 'TIMEOUT';
      return `SQL_ERROR_${code}`;
    }
  }
  return 'SQL_ERROR';
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function printSummary(summary: CalcRunSummary): void {
  console.log(`\n  ═══════════════════════════════════════════`);
  console.log(`  Run Summary`);
  console.log(`  ═══════════════════════════════════════════`);
  console.log(`  Run ID:      ${summary.runId}`);
  console.log(`  Version:     ${summary.runVersionId}`);
  console.log(`  As-of Date:  ${summary.asOfDate}`);
  console.log(`  Status:      ${summary.status}`);
  console.log(`  Duration:    ${(summary.durationMs / 1000).toFixed(1)}s`);
  console.log(`  ───────────────────────────────────────────`);
  console.log(`  Metrics:     ${summary.metricsRequested} requested`);
  console.log(`    Succeeded: ${summary.metricsSucceeded}`);
  console.log(`    Failed:    ${summary.metricsFailed}`);
  console.log(`    Skipped:   ${summary.metricsSkipped}`);
  console.log(`  Rows:        ${summary.totalRowsWritten.toLocaleString()}`);
  console.log(`  ───────────────────────────────────────────`);
  console.log(`  Validation:  ${summary.validationSummary.passed} passed, ${summary.validationSummary.failed} failed, ${summary.validationSummary.warnings} warnings`);

  if (summary.failedMetrics.length > 0) {
    console.log(`  Failed:      ${summary.failedMetrics.join(', ')}`);
  }
  if (summary.skippedMetrics.length > 0) {
    console.log(`  Skipped:     ${summary.skippedMetrics.join(', ')}`);
  }
  console.log(`  ═══════════════════════════════════════════\n`);
}

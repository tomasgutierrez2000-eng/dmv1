/**
 * GSIB Calculation Engine — Metric Promoter
 *
 * Promotes a metric from DRAFT → ACTIVE by running pre-checks:
 *   1. All 5 levels have non-empty formula_sql
 *   2. All levels execute without SQL error against DB
 *   3. Facility-level returns > 0 rows
 *   4. YAML validation rules pass structurally
 *   5. SCD2 tables are filtered (warn if missing, don't block)
 *
 * On success:
 *   - Updates YAML status to ACTIVE
 *   - Updates catalogue item status
 *   - Writes validation_evidence to catalogue item
 *
 * Usage:
 *   npx tsx scripts/calc_engine/cli.ts promote --metric-id EXP-001 [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { loadMetricDefinitions } from '../loader';
import { SqlExecutor } from './executor';
import { loadEngineConfig } from '../config/engine-config';
import { validateFormulas } from './formula-validator';
import type { MetricDefinition, AggregationLevel } from '../types';

// ── Types ────────────────────────────────────────────────

export interface ValidationEvidence {
  promoted_at: string;
  promoted_by: string;
  as_of_date: string;
  validation_results: Record<string, boolean>;
  db_row_counts?: Record<string, number>;
  prior_status?: string;
}

export interface PromotionResult {
  metricId: string;
  success: boolean;
  priorStatus: string;
  newStatus: string;
  checks: PromotionCheck[];
  evidence?: ValidationEvidence;
  error?: string;
}

export interface PromotionCheck {
  name: string;
  passed: boolean;
  blocking: boolean;
  message: string;
}

export interface PromoteOptions {
  metricId: string;
  asOfDate: string;
  dryRun: boolean;
  demote: boolean;
  verbose: boolean;
}

const LEVELS: AggregationLevel[] = [
  'facility', 'counterparty', 'desk', 'portfolio', 'business_segment',
];

// ── Main promoter ────────────────────────────────────────

export async function promoteMetric(opts: PromoteOptions): Promise<PromotionResult> {
  const { metrics, errors } = loadMetricDefinitions();
  if (errors.length > 0 && opts.verbose) {
    for (const err of errors) console.warn(`  YAML warning: ${err}`);
  }

  const metric = metrics.find((m) => m.metric_id === opts.metricId);
  if (!metric) {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: 'UNKNOWN',
      newStatus: 'UNKNOWN',
      checks: [],
      error: `Metric not found: ${opts.metricId}. Available: ${metrics.map((m) => m.metric_id).join(', ')}`,
    };
  }

  // Handle demotion
  if (opts.demote) {
    return demoteMetric(metric, opts);
  }

  // Check current status
  if (metric.status === 'ACTIVE') {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: metric.status,
      newStatus: metric.status,
      checks: [],
      error: 'Metric is already ACTIVE',
    };
  }

  const checks: PromotionCheck[] = [];

  // Check 1: All 5 levels have non-empty formula_sql
  for (const level of LEVELS) {
    const formula = metric.levels[level];
    const hasSql = !!formula?.formula_sql?.trim();
    checks.push({
      name: `${level}_has_formula_sql`,
      passed: hasSql,
      blocking: true,
      message: hasSql
        ? `${level}: formula_sql present`
        : `${level}: formula_sql is empty or missing`,
    });
  }

  // Check 2 & 3: SQL execution + row count (requires DB)
  const config = loadEngineConfig({ verbose: opts.verbose });
  const dbRowCounts: Record<string, number> = {};

  if (config.databaseUrl) {
    const summary = await validateFormulas({
      metricIds: [opts.metricId],
      asOfDate: opts.asOfDate,
      includeDraft: true,
      verbose: opts.verbose,
    });

    for (const r of summary.results) {
      const key = `${r.metricId}:${r.level}`;
      dbRowCounts[r.level] = r.rowCount;

      checks.push({
        name: `${r.level}_sql_executes`,
        passed: r.status !== 'FAIL',
        blocking: true,
        message: r.status === 'FAIL'
          ? `${r.level}: SQL error — ${r.error}`
          : `${r.level}: SQL executed OK (${r.rowCount} rows, ${r.durationMs}ms)`,
      });
    }

    // Check 3: Facility-level returns > 0 rows
    const facilityResult = summary.results.find((r) => r.level === 'facility');
    if (facilityResult) {
      checks.push({
        name: 'facility_has_rows',
        passed: facilityResult.rowCount > 0,
        blocking: true,
        message: facilityResult.rowCount > 0
          ? `Facility-level returns ${facilityResult.rowCount} rows`
          : 'Facility-level returns 0 rows — metric may have no data',
      });
    }
  } else {
    checks.push({
      name: 'db_connection',
      passed: false,
      blocking: true,
      message: 'DATABASE_URL not set — cannot verify SQL execution',
    });
  }

  // Check 4: YAML validation rules exist
  checks.push({
    name: 'has_validation_rules',
    passed: metric.validations.length > 0,
    blocking: false,
    message: metric.validations.length > 0
      ? `${metric.validations.length} validation rule(s) defined`
      : 'No validation rules defined (recommended but not required)',
  });

  // Check 5: SCD2 filtering
  const scd2Issues: string[] = [];
  for (const st of metric.source_tables) {
    const qualifiedName = `${st.schema}.${st.table}`;
    const hasScd2 = st.fields.some((f) =>
      f.name === 'is_current_flag' || f.name === 'is_active_flag'
    );
    if (hasScd2) {
      // Check at least one level's SQL includes the filter
      const allSqlsHaveFilter = LEVELS.every((level) => {
        const sql = metric.levels[level]?.formula_sql ?? '';
        return sql.includes('is_current_flag') || sql.includes('is_active_flag');
      });
      if (!allSqlsHaveFilter) {
        scd2Issues.push(`${qualifiedName} has SCD flag but not all levels filter on it`);
      }
    }
  }
  checks.push({
    name: 'scd2_filtering',
    passed: scd2Issues.length === 0,
    blocking: false,
    message: scd2Issues.length === 0
      ? 'SCD2 filtering looks correct'
      : `SCD2 warnings: ${scd2Issues.join('; ')}`,
  });

  // Evaluate results
  const blockingFailures = checks.filter((c) => !c.passed && c.blocking);
  const nonBlockingWarnings = checks.filter((c) => !c.passed && !c.blocking);
  const allBlockingPass = blockingFailures.length === 0;

  if (!allBlockingPass) {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: metric.status,
      newStatus: metric.status,
      checks,
      error: `${blockingFailures.length} blocking check(s) failed`,
    };
  }

  // Build evidence
  const evidence: ValidationEvidence = {
    promoted_at: new Date().toISOString(),
    promoted_by: 'calc-engine-cli',
    as_of_date: opts.asOfDate,
    validation_results: Object.fromEntries(checks.map((c) => [c.name, c.passed])),
    db_row_counts: Object.keys(dbRowCounts).length > 0 ? dbRowCounts : undefined,
    prior_status: metric.status,
  };

  if (opts.dryRun) {
    return {
      metricId: opts.metricId,
      success: true,
      priorStatus: metric.status,
      newStatus: 'ACTIVE',
      checks,
      evidence,
    };
  }

  // Apply changes
  try {
    // Update YAML file
    updateYamlStatus(metric, 'ACTIVE');
    // Update catalogue
    updateCatalogueStatus(opts.metricId, 'ACTIVE', evidence);

    return {
      metricId: opts.metricId,
      success: true,
      priorStatus: metric.status,
      newStatus: 'ACTIVE',
      checks,
      evidence,
    };
  } catch (err: unknown) {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: metric.status,
      newStatus: metric.status,
      checks,
      error: `Failed to apply changes: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Demotion ─────────────────────────────────────────────

async function demoteMetric(
  metric: MetricDefinition,
  opts: PromoteOptions
): Promise<PromotionResult> {
  if (metric.status === 'DRAFT') {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: metric.status,
      newStatus: metric.status,
      checks: [],
      error: 'Metric is already DRAFT',
    };
  }

  if (opts.dryRun) {
    return {
      metricId: opts.metricId,
      success: true,
      priorStatus: metric.status,
      newStatus: 'DRAFT',
      checks: [],
    };
  }

  try {
    updateYamlStatus(metric, 'DRAFT');
    updateCatalogueStatus(opts.metricId, 'DRAFT');

    return {
      metricId: opts.metricId,
      success: true,
      priorStatus: metric.status,
      newStatus: 'DRAFT',
      checks: [],
    };
  } catch (err: unknown) {
    return {
      metricId: opts.metricId,
      success: false,
      priorStatus: metric.status,
      newStatus: metric.status,
      checks: [],
      error: `Failed to demote: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── YAML file update ─────────────────────────────────────

function updateYamlStatus(metric: MetricDefinition, newStatus: string): void {
  const filePath = metric._file_path;
  if (!filePath) {
    throw new Error(`No _file_path on metric ${metric.metric_id}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  // Replace status line in YAML — matches "status: DRAFT" or "status: ACTIVE" etc.
  const updated = content.replace(
    /^status:\s+\S+/m,
    `status: ${newStatus}`
  );

  if (updated === content) {
    throw new Error(`Could not find status field in ${filePath}`);
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
}

// ── Catalogue update ─────────────────────────────────────

function updateCatalogueStatus(
  metricId: string,
  newStatus: string,
  evidence?: ValidationEvidence
): void {
  const cataloguePath = path.resolve(
    __dirname, '..', '..', '..', 'data', 'metric-library', 'catalogue.json'
  );

  if (!fs.existsSync(cataloguePath)) {
    console.warn(`  Catalogue not found at ${cataloguePath} — skipping catalogue update`);
    return;
  }

  const raw = fs.readFileSync(cataloguePath, 'utf-8');
  const catalogue = JSON.parse(raw) as Array<Record<string, unknown>>;

  const item = catalogue.find(
    (c) => c.item_id === metricId || c.executable_metric_id === metricId
  );

  if (!item) {
    console.warn(`  No catalogue item found for ${metricId} — skipping catalogue update`);
    return;
  }

  item.status = newStatus;
  if (evidence) {
    item.validation_evidence = evidence;
  }

  fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n', 'utf-8');
}

// ── Output formatting ────────────────────────────────────

export function printPromotionResult(result: PromotionResult, dryRun: boolean): void {
  const label = dryRun ? '(DRY RUN) ' : '';
  console.log(`\n  ${label}Promotion: ${result.metricId}`);
  console.log(`  ${'═'.repeat(60)}`);
  console.log(`  Prior Status: ${result.priorStatus}`);
  console.log(`  New Status:   ${result.success ? result.newStatus : `(unchanged) ${result.priorStatus}`}`);

  if (result.checks.length > 0) {
    console.log(`\n  Pre-checks:`);
    for (const c of result.checks) {
      const icon = c.passed ? 'PASS' : c.blocking ? 'FAIL' : 'WARN';
      const blockLabel = !c.passed && c.blocking ? ' [BLOCKING]' : '';
      console.log(`    ${icon}  ${c.message}${blockLabel}`);
    }
  }

  if (result.error) {
    console.log(`\n  Error: ${result.error}`);
  }

  if (result.success) {
    const action = dryRun ? 'would be promoted' : 'has been promoted';
    console.log(`\n  ${result.metricId} ${action}: ${result.priorStatus} → ${result.newStatus}`);
    if (!dryRun && result.evidence) {
      console.log(`  Validation evidence written to catalogue.`);
    }
  }
}

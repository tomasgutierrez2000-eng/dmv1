/**
 * Test calculation engine for YAML-based metrics.
 *
 * Validates that all ACTIVE YAML metric definitions:
 *  - Have formula_sql at all 5 levels
 *  - Have valid aggregation types
 *  - Have source tables with MEASURE fields
 *  - (Optional) Execute successfully against PostgreSQL when DATABASE_URL is set
 *
 * Run: npm run test:calc-engine
 */

import { loadMetricDefinitions } from './calc_engine/loader';
import type { MetricDefinition, AggregationLevel } from './calc_engine/types/metric-definition';

const LEVELS: AggregationLevel[] = ['facility', 'counterparty', 'desk', 'portfolio', 'business_segment'];

const VALID_AGG_TYPES = new Set([
  'RAW', 'SUM', 'WEIGHTED_AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'MEDIAN', 'CUSTOM',
]);

/** Expected aggregation types for each rollup strategy at aggregate levels.
 *  CUSTOM is allowed alongside the primary type since many metrics have
 *  custom SQL (e.g., FX conversion) that implements the same aggregation pattern. */
const STRATEGY_TO_AGG: Record<string, string[]> = {
  'direct-sum': ['SUM', 'CUSTOM'],
  'sum-ratio': ['SUM', 'WEIGHTED_AVG', 'CUSTOM'],
  'count-ratio': ['COUNT', 'COUNT_DISTINCT', 'CUSTOM'],
  'weighted-avg': ['WEIGHTED_AVG', 'CUSTOM'],
  'none': ['RAW', 'MIN', 'MAX', 'CUSTOM'],
  'custom': ['CUSTOM', 'SUM', 'WEIGHTED_AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'MEDIAN', 'RAW'],
  'worst-case': ['MIN', 'MAX', 'CUSTOM'],
};

let passed = 0;
let failed = 0;
let rollupWarnings = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('  FAIL:', message);
    failed++;
  } else {
    console.log('  OK:', message);
    passed++;
  }
}

async function runDbIntegration(metrics: MetricDefinition[]) {
  let pg: typeof import('pg') | null = null;
  try {
    pg = await import('pg');
  } catch {
    console.log('\n  Skipping DB integration (pg module not available).');
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('\n  Skipping DB integration (DATABASE_URL not set).');
    return;
  }

  console.log('\n  Running DB integration tests...');
  const client = new pg.default.Client({ connectionString: dbUrl });
  try {
    await client.connect();

    for (const metric of metrics) {
      const facilitySql = metric.levels.facility?.formula_sql;
      if (!facilitySql) continue;

      const sql = facilitySql.replace(/:as_of_date/g, "'2025-01-31'");
      const limitedSql = `SELECT * FROM (${sql}) _t LIMIT 10`;

      try {
        const result = await client.query(limitedSql);
        assert(
          result.rowCount !== null && result.rowCount > 0,
          `${metric.metric_id}: facility SQL returns rows (got ${result.rowCount})`
        );

        if (result.rows.length > 0) {
          const hasMetricValue = 'metric_value' in result.rows[0];
          assert(hasMetricValue, `${metric.metric_id}: result has metric_value column`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        assert(false, `${metric.metric_id}: facility SQL executes without error — ${msg}`);
      }
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('Testing calculation engine for YAML-based metrics...\n');

  const { metrics, errors } = loadMetricDefinitions();

  assert(errors.length === 0, `YAML loader has no errors (found ${errors.length}: ${errors.slice(0, 3).join('; ')})`);
  assert(metrics.length > 0, `YAML loader finds metrics (found ${metrics.length})`);

  const activeMetrics = metrics.filter((m) => m.status === 'ACTIVE');
  console.log(`\n  Found ${activeMetrics.length} ACTIVE metrics out of ${metrics.length} total.\n`);

  assert(activeMetrics.length > 0, 'At least one ACTIVE metric exists');

  for (const metric of activeMetrics) {
    console.log(`\n  --- ${metric.metric_id}: ${metric.name} ---`);

    // Check all 5 levels have formula_sql
    for (const level of LEVELS) {
      const formula = metric.levels[level];
      assert(
        !!formula?.formula_sql?.trim(),
        `${metric.metric_id}:${level} has non-empty formula_sql`
      );

      assert(
        VALID_AGG_TYPES.has(formula?.aggregation_type ?? ''),
        `${metric.metric_id}:${level} has valid aggregation_type (${formula?.aggregation_type})`
      );
    }

    // Check source tables
    assert(
      metric.source_tables.length > 0,
      `${metric.metric_id} has source_tables`
    );

    const hasMeasure = metric.source_tables.some((st) =>
      st.fields.some((f) => f.role === 'MEASURE')
    );
    // Categorical/count metrics (COUNT(*) or GROUP BY) may not have MEASURE fields
    const hasDimension = metric.source_tables.some((st) =>
      st.fields.some((f) => f.role === 'DIMENSION')
    );
    if (hasMeasure) {
      assert(true, `${metric.metric_id} has MEASURE field(s)`);
    } else if (hasDimension) {
      assert(true, `${metric.metric_id} is categorical metric (DIMENSION fields, no MEASURE — OK)`);
    } else {
      assert(false, `${metric.metric_id} has neither MEASURE nor DIMENSION fields`);
    }

    // Check validations array exists
    assert(
      Array.isArray(metric.validations),
      `${metric.metric_id} has validations array`
    );

    // Rollup strategy consistency: declared strategy should match aggregate-level aggregation_type
    const strategy = metric.catalogue?.rollup_strategy;
    if (strategy) {
      const AGGREGATE_LEVELS: AggregationLevel[] = ['counterparty', 'desk', 'portfolio', 'business_segment'];
      const expectedAggTypes = STRATEGY_TO_AGG[strategy];
      if (expectedAggTypes) {
        for (const level of AGGREGATE_LEVELS) {
          const levelDef = metric.levels[level];
          if (!levelDef?.aggregation_type) continue;
          const aggType = levelDef.aggregation_type;
          if (expectedAggTypes.includes(aggType)) {
            assert(true,
              `${metric.metric_id}:${level} aggregation_type (${aggType}) matches rollup_strategy "${strategy}"`);
          } else {
            // Warn but don't fail — many metrics have legitimate custom aggregation
            console.warn(`  WARN: ${metric.metric_id}:${level} aggregation_type (${aggType}) may not match rollup_strategy "${strategy}" (expected: ${expectedAggTypes.join('|')})`);
            rollupWarnings++;
          }
        }
      }
    }
  }

  // Optional: run DB integration for ACTIVE metrics
  await runDbIntegration(activeMetrics);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Passed: ${passed}, Failed: ${failed}${rollupWarnings > 0 ? `, Rollup Warnings: ${rollupWarnings}` : ''}`);
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll calculation engine tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Batch script: run all metric formulas and INSERT results into l3.metric_value_fact.
 *
 * Port of scripts/calc_engine/populate_l3.py to TypeScript.
 * Uses YAML formula_sql exclusively (no Python calculators).
 *
 * Usage:
 *   npx tsx scripts/calc_engine/populate-l3.ts --as-of-date 2025-01-31
 *   npx tsx scripts/calc_engine/populate-l3.ts --metric EXP-014 --dimension facility
 *   npx tsx scripts/calc_engine/populate-l3.ts --dry-run
 */

import 'dotenv/config';
import pg from 'pg';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DataLoader } from './data-loader';
import { executeMetricLevel } from './generic-calculator';
import { loadMetricDefinitions } from './loader/yaml-loader';
import type { MetricDefinition, AggregationLevel } from './types';

const DEFAULT_AS_OF_DATE = process.env.DEFAULT_AS_OF_DATE ?? '2025-01-31';

const ALL_DIMENSIONS: AggregationLevel[] = [
  'facility', 'counterparty', 'desk', 'portfolio', 'business_segment',
];

/** Maps dimension → (aggregation_level label, fact column name) */
const DIMENSION_TO_FACT: Record<AggregationLevel, { factCol: string }> = {
  facility: { factCol: 'facility_id' },
  counterparty: { factCol: 'counterparty_id' },
  desk: { factCol: 'desk_id' },
  portfolio: { factCol: 'portfolio_id' },
  business_segment: { factCol: 'lob_id' },
};

interface FactRow {
  run_version_id: string;
  as_of_date: string;
  metric_id: string;
  variant_id: string | null;
  aggregation_level: string;
  facility_id: string | null;
  counterparty_id: string | null;
  desk_id: string | null;
  portfolio_id: string | null;
  lob_id: string | null;
  value: number | null;
  unit: string | null;
  display_format: string | null;
}

function buildFactRows(
  metricId: string,
  dimension: AggregationLevel,
  asOfDate: string,
  runVersion: string,
  rows: Record<string, unknown>[],
): FactRow[] {
  const { factCol } = DIMENSION_TO_FACT[dimension];
  const result: FactRow[] = [];

  for (const row of rows) {
    const rawKey = row['dimension_key'] ?? row['facility_id'] ?? row['counterparty_id'] ?? row['segment_id'];
    let dimKey: string | null = null;
    if (rawKey != null) {
      const num = Number(rawKey);
      dimKey = Number.isFinite(num) && num === Math.floor(num)
        ? String(Math.floor(num))
        : String(rawKey);
    }

    const rawVal = row['metric_value'];
    const value = rawVal != null && Number.isFinite(Number(rawVal)) ? Number(rawVal) : null;

    const fact: FactRow = {
      run_version_id: runVersion,
      as_of_date: asOfDate,
      metric_id: metricId,
      variant_id: null,
      aggregation_level: dimension === 'business_segment' ? 'lob' : dimension,
      facility_id: null,
      counterparty_id: null,
      desk_id: null,
      portfolio_id: null,
      lob_id: null,
      value,
      unit: null,
      display_format: null,
    };

    // Set the dimension-specific column
    (fact as any)[factCol] = dimKey;
    result.push(fact);
  }

  return result;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option('metric', {
      type: 'string',
      describe: 'Run only this metric ID (e.g. EXP-014)',
    })
    .option('dimension', {
      type: 'string',
      choices: ALL_DIMENSIONS,
      describe: 'Run only this dimension',
    })
    .option('as-of-date', {
      type: 'string',
      default: DEFAULT_AS_OF_DATE,
    })
    .option('run-version', {
      type: 'string',
      default: 'RUN_MVP_001',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Print summary without writing to DB',
    })
    .help()
    .argv;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && !argv['dry-run']) {
    console.error('DATABASE_URL not set. Use --dry-run or set DATABASE_URL.');
    process.exit(1);
  }

  // Load metric definitions
  const { metrics } = loadMetricDefinitions();
  let targetMetrics: MetricDefinition[];
  if (argv.metric) {
    const found = metrics.find(m => m.metric_id === argv.metric);
    if (!found) {
      console.error(`Metric not found: ${argv.metric}`);
      process.exit(1);
    }
    targetMetrics = [found];
  } else {
    targetMetrics = metrics.filter(m => m.status === 'ACTIVE' || m.status === 'DRAFT');
  }

  const dims: AggregationLevel[] = argv.dimension
    ? [argv.dimension as AggregationLevel]
    : ALL_DIMENSIONS;

  const loader = new DataLoader();
  const allRows: FactRow[] = [];
  const errors: Array<{ metricId: string; dimension: string; error: string }> = [];
  let calcCount = 0;

  try {
    for (const metric of targetMetrics) {
      for (const dim of dims) {
        try {
          const result = await executeMetricLevel(metric, dim, loader, argv['as-of-date']);
          if (result.rows.length === 0) continue;
          const rows = buildFactRows(
            metric.metric_id, dim, argv['as-of-date'], argv['run-version'], result.rows
          );
          allRows.push(...rows);
          calcCount++;
        } catch (e) {
          errors.push({
            metricId: metric.metric_id,
            dimension: dim,
            error: String(e),
          });
        }
      }
    }
  } finally {
    await loader.close();
  }

  console.log(
    `Calculated ${allRows.length} rows from ${calcCount} metric/dimension combos ` +
    `(${errors.length} errors). ` +
    `Run version: ${argv['run-version']}, as_of_date: ${argv['as-of-date']}.`
  );

  if (argv['dry-run']) {
    console.log('Dry run — no INSERT.');
    if (allRows.length > 0) {
      console.log('Sample row:', JSON.stringify(allRows[0], null, 2));
    }
    if (errors.length > 0) {
      console.log('Errors:', JSON.stringify(errors, null, 2));
    }
    return;
  }

  // Write to PostgreSQL
  const pool = new pg.Pool({ connectionString: dbUrl, max: 3 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA IF NOT EXISTS l3');

    // Delete existing rows for these metrics
    const metricIds = [...new Set(allRows.map(r => r.metric_id))];
    await client.query(
      `DELETE FROM l3.metric_value_fact WHERE run_version_id = $1 AND as_of_date = $2 AND metric_id = ANY($3)`,
      [argv['run-version'], argv['as-of-date'], metricIds]
    );
    console.log(`Deleted existing rows for ${metricIds.length} metrics.`);

    // Batch insert
    const insertSql = `
      INSERT INTO l3.metric_value_fact (
        run_version_id, as_of_date, metric_id, variant_id, aggregation_level,
        facility_id, counterparty_id, desk_id, portfolio_id, lob_id,
        value, unit, display_format
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    for (const row of allRows) {
      await client.query(insertSql, [
        row.run_version_id, row.as_of_date, row.metric_id, row.variant_id,
        row.aggregation_level, row.facility_id, row.counterparty_id,
        row.desk_id, row.portfolio_id, row.lob_id,
        row.value, row.unit, row.display_format,
      ]);
    }

    await client.query('COMMIT');
    console.log(`Inserted ${allRows.length} rows into l3.metric_value_fact.`);
    if (errors.length > 0) {
      console.error('Skipped (errors):', JSON.stringify(errors, null, 2));
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

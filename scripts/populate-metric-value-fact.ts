/**
 * Batch script: run metric calculations and insert results into l3.metric_value_fact.
 * Run: npx tsx scripts/populate-metric-value-fact.ts
 * Env: DATABASE_URL (required for INSERT), RUN_VERSION (default RUN_MVP_001), AS_OF_DATE (default 2025-01-31).
 * When DATABASE_URL is not set, prints JSON summary of would-be rows (dry run).
 */
import 'dotenv/config';
import { getMergedMetrics } from '@/lib/metrics-store';
import {
  resolveAllowedDimensions,
  runMetricCalculation,
} from '@/lib/metrics-calculation';
import {
  buildMetricValueRowsFromRunOutput,
  type MetricValueRow,
} from '@/lib/metrics-value-store';

const RUN_VERSION = process.env.RUN_VERSION ?? 'RUN_MVP_001';
const AS_OF_DATE = process.env.AS_OF_DATE ?? '2025-01-31';

function rowToInsertValues(row: MetricValueRow): unknown[] {
  return [
    row.run_version_id,
    row.as_of_date,
    row.metric_id,
    row.variant_id ?? null,
    row.aggregation_level,
    row.facility_id ?? null,
    row.counterparty_id ?? null,
    row.desk_id ?? null,
    row.portfolio_id ?? null,
    row.lob_id ?? null,
    row.value ?? null,
    row.unit ?? null,
    row.display_format ?? null,
  ];
}

async function main() {
  const merged = getMergedMetrics();
  const allRows: MetricValueRow[] = [];
  const errors: { metricId: string; dimension: string; error: string }[] = [];

  for (const metric of merged) {
    const dimensions = resolveAllowedDimensions(metric);
    for (const dimension of dimensions) {
      const runOutput = await runMetricCalculation({
        metric,
        dimension,
        asOfDate: AS_OF_DATE,
      });
      if (!runOutput.ok) {
        errors.push({
          metricId: metric.id,
          dimension,
          error: runOutput.error ?? 'Calculation failed',
        });
        continue;
      }
      const asOfDateUsed = runOutput.asOfDateUsed ?? AS_OF_DATE;
      const rows = buildMetricValueRowsFromRunOutput(
        metric.id,
        dimension,
        asOfDateUsed,
        RUN_VERSION,
        runOutput,
        undefined
      );
      allRows.push(...rows);
    }
  }

  console.log(`Calculated ${allRows.length} rows (${errors.length} errors). Run version: ${RUN_VERSION}, as_of_date: ${AS_OF_DATE}.`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set. Dry run — no INSERT. Sample rows:', JSON.stringify(allRows.slice(0, 5), null, 2));
    if (errors.length) console.error('Errors:', errors);
    process.exit(0);
    return;
  }

  const pg = await import('pg');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS l3;');
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM l3.metric_value_fact WHERE run_version_id = $1 AND as_of_date = $2',
      [RUN_VERSION, AS_OF_DATE]
    );

    const insertSql = `
      INSERT INTO l3.metric_value_fact (
        run_version_id, as_of_date, metric_id, variant_id, aggregation_level,
        facility_id, counterparty_id, desk_id, portfolio_id, lob_id,
        value, unit, display_format
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    for (const row of allRows) {
      await client.query(insertSql, rowToInsertValues(row));
    }

    await client.query('COMMIT');
    console.log(`Inserted ${allRows.length} rows into l3.metric_value_fact.`);
    if (errors.length) console.error('Skipped (errors):', errors);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

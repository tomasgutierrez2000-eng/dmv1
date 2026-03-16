#!/usr/bin/env tsx
/**
 * Generate demo_data for catalogue items from real L1/L2 data.
 *
 * Port of scripts/calc_engine/generate_demo_data.py to TypeScript.
 *
 * Usage:
 *   npx tsx scripts/calc_engine/generate-demo-data.ts --metric DSCR
 *   npx tsx scripts/calc_engine/generate-demo-data.ts --metric LTV --count 5 --persist
 *   npx tsx scripts/calc_engine/generate-demo-data.ts --all --persist --force
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getMetricLibraryDir } from '@/lib/config';
import { DataLoader } from './data-loader';
import { generateDemoData } from './demo-generator';
import { loadMetricDefinitions } from './loader';
import type { CatalogueItem } from '@/lib/metric-library/types';

const DEFAULT_AS_OF_DATE = process.env.DEFAULT_AS_OF_DATE ?? '2025-01-31';

function getCataloguePath(): string {
  return path.join(getMetricLibraryDir(), 'catalogue.json');
}

function loadCatalogue(): CatalogueItem[] {
  const p = getCataloguePath();
  if (!fs.existsSync(p)) {
    console.error(`Catalogue not found: ${p}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as CatalogueItem[];
}

function saveCatalogue(items: CatalogueItem[]): void {
  const catPath = getCataloguePath();
  const tmpPath = path.join(
    path.dirname(catPath),
    `.catalogue-${Date.now()}.tmp`
  );
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmpPath, catPath);
    console.log(`Catalogue saved: ${catPath}`);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    throw e;
  }
}

async function generateSingle(
  catalogue: CatalogueItem[],
  loader: DataLoader,
  args: { metric: string; count: number; strategy: string; asOfDate: string; output?: string; persist: boolean; force: boolean },
): Promise<void> {
  const item = catalogue.find(i => i.item_id === args.metric);
  if (!item) {
    console.error(`Catalogue item not found: ${args.metric}`);
    console.error('Available items:');
    for (const it of catalogue) {
      console.error(`  ${it.item_id} — ${it.item_name}`);
    }
    process.exit(1);
  }

  // Skip if already has demo data
  if (!args.force && item.demo_data?.facilities?.length) {
    console.log(`[${args.metric}] Already has demo_data (${item.demo_data.facilities.length} facilities). Use --force to overwrite.`);
    return;
  }

  console.log(`[${args.metric}] Generating demo data...`);

  const result = await generateDemoData(item, loader, {
    facilityCount: args.count,
    strategy: args.strategy as 'diverse' | 'range-spread' | 'top-values',
    asOfDate: args.asOfDate,
  });

  if (!result.ok) {
    console.error(`[${args.metric}] Error: ${result.error}`);
    process.exit(1);
  }

  const output = {
    item_id: args.metric,
    demo_data: result.demoData,
    diagnostics: result.diagnostics,
  };

  if (args.output) {
    fs.writeFileSync(args.output, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    console.log(`[${args.metric}] Demo data written to: ${args.output}`);
  } else if (args.persist) {
    item.demo_data = result.demoData;
    saveCatalogue(catalogue);
    console.log(`[${args.metric}] Demo data persisted to catalogue.json (${result.diagnostics?.facilitiesSelected} facilities)`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }

  if (result.diagnostics) {
    const d = result.diagnostics;
    console.log('\n--- Diagnostics ---');
    console.log(`  Total facilities in sample: ${d.totalFacilitiesInSample}`);
    console.log(`  Facilities selected: ${d.facilitiesSelected}`);
    console.log(`  Metric calculation: ${d.metricCalculationSuccess ? 'OK' : 'N/A'}`);
    console.log(`  Calculator: ${d.calculatorUsed ?? 'None'}`);
    console.log(`  As-of date: ${d.asOfDateUsed}`);
  }
}

async function generateAll(
  catalogue: CatalogueItem[],
  loader: DataLoader,
  args: { count: number; strategy: string; asOfDate: string; persist: boolean; force: boolean },
): Promise<void> {
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of catalogue) {
    // Skip items without executable metric
    if (!item.executable_metric_id && !item.item_id) continue;

    // Skip if already has demo data
    if (!args.force && item.demo_data?.facilities?.length) {
      console.log(`[${item.item_id}] Skipping — already has demo_data`);
      skipped++;
      continue;
    }

    console.log(`[${item.item_id}] Generating...`);
    const result = await generateDemoData(item, loader, {
      facilityCount: args.count,
      strategy: args.strategy as 'diverse' | 'range-spread' | 'top-values',
      asOfDate: args.asOfDate,
    });

    if (result.ok) {
      item.demo_data = result.demoData;
      generated++;
      console.log(`  OK — ${result.diagnostics?.facilitiesSelected} facilities`);
    } else {
      failed++;
      console.log(`  FAILED — ${result.error}`);
    }
  }

  if (args.persist && generated > 0) {
    saveCatalogue(catalogue);
  }

  console.log('\n=== Summary ===');
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
}

/**
 * Compare existing demo_data metric values against live DB values.
 * Diagnostic only — does not edit catalogue.
 */
async function validateDemoData(catalogue: CatalogueItem[], asOfDate: string): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required for --validate');
    process.exit(1);
  }

  const { metrics } = loadMetricDefinitions();
  const loader = new DataLoader();

  console.log('\n  Demo Data Validation — Comparing demo vs DB');
  console.log('  ' + '═'.repeat(80));

  let totalFacilities = 0;
  let driftCount = 0;
  const itemsChecked: string[] = [];

  try {
    for (const item of catalogue) {
      if (!item.demo_data?.facilities?.length) continue;

      // Find matching YAML metric
      const metric = metrics.find(
        (m) => m.metric_id === item.item_id || m.metric_id === item.executable_metric_id
      );
      if (!metric) continue;

      const facilitySql = metric.levels.facility?.formula_sql;
      if (!facilitySql) continue;

      // Execute facility-level SQL against DB
      let dbResult;
      try {
        dbResult = await loader.query(facilitySql, { as_of_date: asOfDate });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`\n  ${item.item_id} (${item.item_name}): SQL error — ${msg.slice(0, 80)}`);
        continue;
      }
      if (!dbResult || dbResult.rows.length === 0) continue;

      // Build lookup: dimension_key → metric_value
      const dbValues = new Map<string, number>();
      for (const row of dbResult.rows) {
        const key = String(row.dimension_key ?? '');
        const val = Number(row.metric_value ?? 0);
        if (key) dbValues.set(key, val);
      }

      // Compare each demo facility
      let itemDriftCount = 0;
      const facilityResults: Array<{ id: string; demo: number; db: number; pct: number; status: string }> = [];

      for (const fac of item.demo_data.facilities) {
        totalFacilities++;
        const facId = fac.facility_id;

        // Try to find a demo metric value
        const demoValue = fac.extra_fields
          ? Number(Object.values(fac.extra_fields).find((v) => typeof v === 'number') ?? fac.ltv_pct ?? 0)
          : fac.dscr_value ?? fac.ltv_pct ?? 0;

        const dbValue = dbValues.get(facId) ?? dbValues.get(String(Number(facId)));
        if (dbValue === undefined) {
          facilityResults.push({ id: facId, demo: demoValue, db: NaN, pct: NaN, status: 'NOT_IN_DB' });
          continue;
        }

        const diff = Math.abs(demoValue - dbValue);
        const pct = dbValue === 0 ? (demoValue === 0 ? 0 : 100) : (diff / Math.abs(dbValue)) * 100;
        const status = pct > 5 ? 'DRIFT' : 'OK';
        if (pct > 5) {
          itemDriftCount++;
          driftCount++;
        }

        facilityResults.push({ id: facId, demo: demoValue, db: dbValue, pct, status });
      }

      itemsChecked.push(item.item_id);

      // Print per-item results
      console.log(`\n  ${item.item_id} (${item.item_name}):`);
      console.log(`  ${'Facility'.padEnd(12)} ${'Demo'.padEnd(14)} ${'DB'.padEnd(14)} ${'Drift %'.padEnd(10)} Status`);
      console.log(`  ${'─'.repeat(12)} ${'─'.repeat(14)} ${'─'.repeat(14)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);

      for (const r of facilityResults) {
        console.log(
          `  ${r.id.padEnd(12)} ${(isNaN(r.demo) ? 'N/A' : r.demo.toFixed(4)).padEnd(14)} ${(isNaN(r.db) ? 'N/A' : r.db.toFixed(4)).padEnd(14)} ${(isNaN(r.pct) ? 'N/A' : r.pct.toFixed(2) + '%').padEnd(10)} ${r.status}`
        );
      }

      if (itemDriftCount > 0) {
        console.log(`  ⚠ ${itemDriftCount}/${item.demo_data.facilities.length} facilities have drift > 5%`);
      }
    }
  } finally {
    await loader.close();
  }

  // Summary
  console.log(`\n  ${'─'.repeat(60)}`);
  console.log(`  Items checked: ${itemsChecked.length}`);
  console.log(`  Total facilities: ${totalFacilities}`);
  console.log(`  Facilities with drift > 5%: ${driftCount}`);
  console.log(`  ${'─'.repeat(60)}`);

  if (itemsChecked.length === 0) {
    console.log('\n  No catalogue items with demo_data and matching YAML metrics found.');
  }
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option('metric', {
      type: 'string',
      describe: 'Catalogue item_id (e.g. MET-028, DSCR)',
    })
    .option('all', {
      type: 'boolean',
      default: false,
      describe: 'Generate for all items',
    })
    .option('count', {
      type: 'number',
      default: 5,
      describe: 'Number of facilities',
    })
    .option('strategy', {
      type: 'string',
      default: 'diverse',
      choices: ['diverse', 'range-spread', 'top-values'] as const,
      describe: 'Facility selection strategy',
    })
    .option('as-of-date', {
      type: 'string',
      default: DEFAULT_AS_OF_DATE,
      describe: 'Snapshot date',
    })
    .option('output', {
      type: 'string',
      describe: 'Write JSON output to file',
    })
    .option('persist', {
      type: 'boolean',
      default: false,
      describe: 'Update catalogue.json in-place',
    })
    .option('force', {
      type: 'boolean',
      default: false,
      describe: 'Overwrite existing demo_data',
    })
    .option('force-json', {
      type: 'boolean',
      default: false,
      describe: 'Force JSON sample data (skip PostgreSQL)',
    })
    .option('validate', {
      type: 'boolean',
      default: false,
      describe: 'Compare existing demo_data against DB values (diagnostic only, no edits)',
    })
    .option('from-db', {
      type: 'boolean',
      default: false,
      describe: 'Generate demo data from live DB instead of sample data',
    })
    .check((argv) => {
      if (!argv.metric && !argv.all && !argv.validate) {
        throw new Error('--metric, --all, or --validate is required');
      }
      return true;
    })
    .help()
    .argv;

  const catalogue = loadCatalogue();

  // ── Validate mode: compare demo data against DB ──────────
  if (argv.validate) {
    await validateDemoData(catalogue, argv['as-of-date']);
    return;
  }

  const loader = new DataLoader({
    forceJson: argv['force-json'] || !argv['from-db'],
  });

  try {
    if (argv.all) {
      await generateAll(catalogue, loader, {
        count: argv.count,
        strategy: argv.strategy,
        asOfDate: argv['as-of-date'],
        persist: argv.persist,
        force: argv.force,
      });
    } else {
      await generateSingle(catalogue, loader, {
        metric: argv.metric!,
        count: argv.count,
        strategy: argv.strategy,
        asOfDate: argv['as-of-date'],
        output: argv.output,
        persist: argv.persist,
        force: argv.force,
      });
    }
  } finally {
    await loader.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

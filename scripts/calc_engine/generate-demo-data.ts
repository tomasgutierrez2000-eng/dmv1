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
    .check((argv) => {
      if (!argv.metric && !argv.all) {
        throw new Error('--metric or --all is required');
      }
      return true;
    })
    .help()
    .argv;

  const catalogue = loadCatalogue();
  const loader = new DataLoader({ forceJson: argv['force-json'] });

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

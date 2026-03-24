/**
 * Non-Credit Product Runner — generates GSIB-quality data for derivatives, SFT,
 * securities, deposits, borrowings, debt, equities, stock.
 *
 * Parallel to scenario-runner.ts but for standalone positions (no L1 facility chain).
 *
 * Usage:
 *   npx tsx scenarios/factory/nc-product-runner.ts
 *   npx tsx scenarios/factory/nc-product-runner.ts --dry-run
 *   npx tsx scenarios/factory/nc-product-runner.ts --positions-per-category 50
 *   npx tsx scenarios/factory/nc-product-runner.ts --start 2024-07-01 --end 2025-01-31
 */

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { IDRegistry } from './id-registry';
import { buildPositionPool, type PoolConfig } from './position-pool-builder';
import { PositionStateManager } from './v2/position-state';
import { generateNCPositionRows } from './v2/generators/nc-position';
import { generateNCProductTableRows } from './v2/generators/nc-product-tables';
import { runFinancialCoherence } from './quality-controls/financial-coherence';
import { SchemaRegistry, validateAgainstSchema } from './schema-validator';
import { buildInsert, LOAD_ORDER, type TableData } from './sql-emitter';
import { generateDateGrid } from './v2/time-series';
import { MarketEnvironment } from './v2/market-environment';
import type { TimeFrequency, SqlRow } from './v2/types';
import { seededRng } from './v2/prng';
import type { NonCreditCategory } from './v2/position-types';
import { ALL_NC_CATEGORIES } from './v2/position-types';
import { loadEnv } from './load-env';

loadEnv();

// ─── Configuration ───────────────────────────────────────────────────────

const DEFAULT_START = '2024-07-01';
const DEFAULT_END = '2025-01-31';
const DEFAULT_FREQUENCY: TimeFrequency = 'WEEKLY';
const DEFAULT_POSITIONS_PER_CATEGORY = 100;
const OUTPUT_FILE = 'sql/gsib-export/08-nc-products.sql';
const NC_SOURCE = 'NC_PRODUCT_FACTORY';

// ─── CLI Args ────────────────────────────────────────────────────────────

interface CliArgs {
  dryRun: boolean;
  startDate: string;
  endDate: string;
  frequency: TimeFrequency;
  positionsPerCategory: number;
  output: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    frequency: DEFAULT_FREQUENCY,
    positionsPerCategory: DEFAULT_POSITIONS_PER_CATEGORY,
    output: OUTPUT_FILE,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': result.dryRun = true; break;
      case '--start': result.startDate = args[++i]; break;
      case '--end': result.endDate = args[++i]; break;
      case '--frequency': result.frequency = args[++i] as TimeFrequency; break;
      case '--positions-per-category': result.positionsPerCategory = parseInt(args[++i]); break;
      case '--output': result.output = args[++i]; break;
    }
  }

  return result;
}

// ─── Main Pipeline ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log('  Non-Credit Product Factory');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Positions per category: ${args.positionsPerCategory}`);
  console.log(`  Categories: ${ALL_NC_CATEGORIES.length}`);
  console.log(`  Date range: ${args.startDate} → ${args.endDate}`);
  console.log(`  Frequency: ${args.frequency}`);
  console.log(`  Dry run: ${args.dryRun}`);
  console.log('');

  // ── Step 1: Read existing counterparties from PG ──
  console.log('[1/8] Reading counterparty pool from PostgreSQL...');
  const counterpartyIds = await readCounterpartyIds();
  const nettingSetIds = await readNettingSetIds();
  console.log(`  → ${counterpartyIds.length} counterparties, ${nettingSetIds.length} netting sets`);

  // ── Step 2: Build position pool ──
  console.log('[2/8] Building position pool...');
  const registry = new IDRegistry();
  const pool = buildPositionPool(registry, {
    positionsPerCategory: args.positionsPerCategory,
    counterpartyIds,
    nettingSetIds,
    baseDate: args.startDate,
  });
  const totalPositions = pool.positions.length;
  console.log(`  → ${totalPositions} positions across ${ALL_NC_CATEGORIES.length} categories`);
  for (const [cat, ids] of pool.idsByCategory) {
    console.log(`     ${cat}: ${ids.length} positions`);
  }

  // ── Step 3: Generate date grid ──
  console.log('[3/8] Generating date grid...');
  const dates = generateDateGrid({
    start_date: args.startDate,
    end_date: args.endDate,
    frequency: args.frequency,
  });
  console.log(`  → ${dates.length} dates (${args.frequency})`);

  // ── Step 4: Evolve position states ──
  console.log('[4/8] Running position state machine...');
  const marketEnv = new MarketEnvironment('CURRENT_2024');
  const stateManager = new PositionStateManager();
  stateManager.initialize(pool.positions, dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const rng = seededRng(`market-${dates[i]}`);
    const market = marketEnv.getSnapshot(dates[i], rng);
    stateManager.step(dates[i - 1], dates[i], market);
  }

  const stateMap = stateManager.getStateMap();
  const positionIds = stateManager.getPositionIds();
  console.log(`  → ${stateMap.size} total state entries (${positionIds.length} positions × ${dates.length} dates)`);

  // ── Step 5: Generate rows ──
  console.log('[5/8] Generating position + product table rows...');
  const { positions, positionDetails, positionIdMap } = generateNCPositionRows(stateMap, positionIds, dates, registry);
  const productOutput = generateNCProductTableRows(stateMap, positionIds, dates, positionIdMap);
  console.log(`  → ${positions.length} position rows`);
  console.log(`  → ${positionDetails.length} position_detail rows`);

  let productRowCount = 0;
  for (const [tbl, rows] of productOutput.tables) {
    if (rows.length > 0) {
      console.log(`     ${tbl}: ${rows.length} rows`);
      productRowCount += rows.length;
    }
  }
  console.log(`  → ${productRowCount} total product snapshot rows`);

  // ── Step 6: Schema validation ──
  console.log('[6/8] Running schema validation...');
  const schemaRegistry = SchemaRegistry.fromDataDictionary();
  // Schema validator uses { schema, table } format; sql-emitter uses "schema.table"
  interface SchemaTableData { schema: string; table: string; rows: SqlRow[] }
  const schemaValidationTables: SchemaTableData[] = [
    { schema: 'l2', table: 'position', rows: positions },
    { schema: 'l2', table: 'position_detail', rows: positionDetails },
  ];
  for (const [tbl, rows] of productOutput.tables) {
    if (rows.length > 0) {
      schemaValidationTables.push({ schema: 'l2', table: tbl, rows });
    }
  }

  // For SQL emission, use "schema.table" format
  const allTables: TableData[] = [
    { table: 'l2.position', rows: positions },
    { table: 'l2.position_detail', rows: positionDetails },
  ];
  for (const [tbl, rows] of productOutput.tables) {
    if (rows.length > 0) {
      allTables.push({ table: `l2.${tbl}`, rows });
    }
  }

  const schemaResult = validateAgainstSchema(schemaValidationTables, schemaRegistry);
  if (!schemaResult.valid) {
    console.error('  ✗ Schema validation FAILED:');
    for (const err of schemaResult.errors.slice(0, 20)) {
      console.error(`    ${err}`);
    }
    if (!args.dryRun) {
      console.error('  Aborting SQL emission.');
      process.exit(1);
    }
  } else {
    console.log(`  ✓ Schema validation passed (${schemaResult.stats.tablesChecked} tables, ${schemaResult.stats.columnsChecked} columns)`);
  }

  // ── Step 7: Financial coherence validation ──
  console.log('[7/8] Running financial coherence checks...');
  const fcTables = [...productOutput.tables.entries()]
    .filter(([_, rows]) => rows.length > 0)
    .map(([table, rows]) => ({ table, rows }));
  const fcResult = runFinancialCoherence(fcTables);

  if (fcResult.errors.length > 0) {
    console.error(`  ✗ ${fcResult.errors.length} financial coherence errors:`);
    for (const err of fcResult.errors.slice(0, 10)) {
      console.error(`    ${err}`);
    }
  }
  if (fcResult.warnings.length > 0) {
    console.warn(`  ⚠ ${fcResult.warnings.length} financial coherence warnings:`);
    for (const w of fcResult.warnings.slice(0, 5)) {
      console.warn(`    ${w}`);
    }
  }
  if (fcResult.errors.length === 0) {
    console.log(`  ✓ Financial coherence passed (${fcResult.warnings.length} warnings)`);
  }

  if (args.dryRun) {
    console.log('\n[DRY RUN] Would generate SQL to:', args.output);
    console.log(`  Positions: ${positions.length}`);
    console.log(`  Product snapshots: ${productRowCount}`);
    console.log(`  Total rows: ${positions.length + positionDetails.length + productRowCount}`);
    console.log(`\nElapsed: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return;
  }

  // ── Step 8: Emit SQL ──
  console.log('[8/8] Emitting SQL...');
  const sql = buildNCProductSql(allTables);

  const outDir = path.dirname(args.output);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(args.output, sql);
  console.log(`  → Written to ${args.output}`);
  console.log(`  → ${sql.length.toLocaleString()} bytes, ${sql.split('\n').length.toLocaleString()} lines`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Complete in ${elapsed}s`);
  console.log(`  ${positions.length} positions + ${productRowCount} product snapshots = ${positions.length + positionDetails.length + productRowCount} total rows`);
}

// ─── SQL Builder ─────────────────────────────────────────────────────────

function buildNCProductSql(tables: TableData[]): string {
  const ts = new Date().toISOString();
  const lines: string[] = [
    `-- ═══════════════════════════════════════════════════════════════`,
    `-- Non-Credit Product Factory Output`,
    `-- Generated: ${ts}`,
    `-- Source: nc-product-runner.ts`,
    `-- ═══════════════════════════════════════════════════════════════`,
    '',
    'SET search_path TO l1, l2, l3, public;',
    '',
    '-- Clean previous NC factory data (non-transactional for large datasets)',
  ];

  // Build cleanup: delete in reverse load order (children first)
  const productTables = tables
    .filter(t => t.table !== 'l2.position' && t.table !== 'l2.position_detail')
    .map(t => t.table);

  for (const tbl of [...productTables].reverse()) {
    lines.push(`DELETE FROM ${tbl} WHERE position_id IN (SELECT position_id FROM l2.position WHERE record_source = '${NC_SOURCE}');`);
  }
  lines.push(`DELETE FROM l2.position_detail WHERE position_id IN (SELECT position_id FROM l2.position WHERE record_source = '${NC_SOURCE}');`);
  lines.push(`DELETE FROM l2.position WHERE record_source = '${NC_SOURCE}';`);

  // Also clean migration 035 data
  lines.push(`DELETE FROM l2.position WHERE record_source = 'MIGRATION_035';`);
  lines.push('');

  // Build lookup for load-order emission
  const tableMap = new Map<string, SqlRow[]>();
  for (const td of tables) {
    tableMap.set(td.table, td.rows);
  }

  // Emit positions first
  const posRows = tableMap.get('l2.position');
  if (posRows && posRows.length > 0) {
    lines.push(`-- l2.position (${posRows.length} rows)`);
    for (const row of posRows) {
      lines.push(buildInsert('l2.position', row) .replace(';', ' ON CONFLICT DO NOTHING;'));
    }
    lines.push('');
  }

  const detailRows = tableMap.get('l2.position_detail');
  if (detailRows && detailRows.length > 0) {
    lines.push(`-- l2.position_detail (${detailRows.length} rows)`);
    for (const row of detailRows) {
      lines.push(buildInsert('l2.position_detail', row).replace(';', ' ON CONFLICT DO NOTHING;'));
    }
    lines.push('');
  }

  // Emit product tables in LOAD_ORDER
  for (const loadOrderTable of LOAD_ORDER) {
    const rows = tableMap.get(loadOrderTable);
    if (!rows || rows.length === 0) continue;

    lines.push(`-- ${loadOrderTable} (${rows.length} rows)`);
    for (const row of rows) {
      lines.push(buildInsert(loadOrderTable, row).replace(';', ' ON CONFLICT DO NOTHING;'));
    }
    lines.push('');
  }

  // Safety net: emit any tables not in LOAD_ORDER
  for (const td of tables) {
    if (td.table === 'l2.position' || td.table === 'l2.position_detail') continue;
    if (LOAD_ORDER.includes(td.table)) continue;
    if (td.rows.length === 0) continue;
    lines.push(`-- WARNING: ${td.table} not in LOAD_ORDER`);
    for (const row of td.rows) {
      lines.push(buildInsert(td.table, row).replace(';', ' ON CONFLICT DO NOTHING;'));
    }
    lines.push('');
  }

  lines.push('-- Load complete');
  return lines.join('\n');
}

// ─── PG Readers ──────────────────────────────────────────────────────────

async function readCounterpartyIds(): Promise<number[]> {
  try {
    const pg = await import('pg');
    const PgClient = (pg as any).default?.Client ?? (pg as any).Client;
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error('DATABASE_URL not set');

    const client = new PgClient({ connectionString: connStr });
    await client.connect();
    const res = await client.query(
      'SELECT counterparty_id FROM l2.counterparty WHERE counterparty_id <= 100 ORDER BY counterparty_id'
    );
    await client.end();
    return res.rows.map((r: any) => r.counterparty_id);
  } catch (err) {
    console.warn('  ⚠ Could not read counterparties from PG, using default 1-100');
    return Array.from({ length: 100 }, (_, i) => i + 1);
  }
}

async function readNettingSetIds(): Promise<number[]> {
  try {
    const pg = await import('pg');
    const PgClient = (pg as any).default?.Client ?? (pg as any).Client;
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error('DATABASE_URL not set');

    const client = new PgClient({ connectionString: connStr });
    await client.connect();
    const res = await client.query(
      'SELECT netting_set_id FROM l2.netting_set WHERE netting_set_id <= 60 ORDER BY netting_set_id'
    );
    await client.end();
    return res.rows.map((r: any) => r.netting_set_id);
  } catch (err) {
    console.warn('  ⚠ Could not read netting sets from PG, using default 1-60');
    return Array.from({ length: 60 }, (_, i) => i + 1);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

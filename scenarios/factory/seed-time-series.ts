/**
 * Seed Time-Series Expander — generates weekly L2 snapshots for existing seed data.
 *
 * Phase 2 of the data scaling initiative:
 *   - Reads existing L1 chain from PostgreSQL (counterparties 1-100, facilities 1-410)
 *   - Assigns story arcs based on existing risk profiles
 *   - Runs the V2 state machine with WEEKLY frequency
 *   - Emits SQL with ON CONFLICT DO NOTHING (preserves existing monthly snapshots)
 *
 * Usage:
 *   npx tsx scenarios/factory/seed-time-series.ts
 *   npx tsx scenarios/factory/seed-time-series.ts --dry-run
 *   npx tsx scenarios/factory/seed-time-series.ts --start 2024-07-01 --end 2025-01-31
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { IDRegistry } from './id-registry';
import { generateV2Data, type V2GeneratorConfig } from './v2/generators';
import type { L1Chain, CollateralAssetRow, LimitRuleRow } from './chain-builder';
import type { EnrichedCounterparty, EnrichedAgreement, EnrichedFacility } from './gsib-enrichment';
import type { TableData as V2TableData, TimeFrequency } from './v2/types';
import type { StoryArc, RatingTier, SizeProfile } from '../../scripts/shared/mvp-config';
import { SchemaRegistry, validateAgainstSchema } from './schema-validator';
import { config as loadDotenv } from 'dotenv';

// Load .env — try worktree root first, then main repo root
const envPath1 = path.join(__dirname, '..', '..', '.env');
const envPath2 = path.resolve('/Users/tomas/120/.env');
if (existsSync(envPath1)) {
  loadDotenv({ path: envPath1 });
} else if (existsSync(envPath2)) {
  loadDotenv({ path: envPath2 });
}

/* ────────────────── Configuration ────────────────── */

const DEFAULT_START = '2024-07-01';
const DEFAULT_END = '2025-01-31';
const DEFAULT_FREQUENCY: TimeFrequency = 'WEEKLY';
const OUTPUT_FILE = 'sql/gsib-export/07-seed-time-series.sql';

// Seed data boundaries
const MAX_SEED_COUNTERPARTY = 100;
const MAX_SEED_FACILITY = 410;

/* ────────────────── CLI Args ────────────────── */

interface CliArgs {
  dryRun: boolean;
  startDate: string;
  endDate: string;
  frequency: TimeFrequency;
  output: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    frequency: DEFAULT_FREQUENCY,
    output: OUTPUT_FILE,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': result.dryRun = true; break;
      case '--start': result.startDate = args[++i]; break;
      case '--end': result.endDate = args[++i]; break;
      case '--frequency': result.frequency = args[++i] as TimeFrequency; break;
      case '--output': result.output = args[++i]; break;
    }
  }

  return result;
}

/* ────────────────── PG Reader ────────────────── */

async function readSeedChainFromPG(): Promise<L1Chain> {
  const pg = await import('pg');
  const PgClient = (pg as any).default?.Client ?? (pg as any).Client;
  const connStr = process.env.DATABASE_URL;
  if (!connStr) throw new Error('DATABASE_URL not set');
  const client = new PgClient({ connectionString: connStr });
  await client.connect();

  try {
    // Set search path
    await client.query('SET search_path TO l1, l2, public;');

    // Read counterparties
    const cpResult = await client.query(`
      SELECT counterparty_id, legal_name, counterparty_type, country_code,
             entity_type_code, industry_id, internal_risk_rating, pd_annual,
             lgd_unsecured, is_current_flag, effective_start_date,
             record_source, created_by
      FROM counterparty
      WHERE counterparty_id <= $1
      ORDER BY counterparty_id
    `, [MAX_SEED_COUNTERPARTY]);

    // Read agreements
    const agrResult = await client.query(`
      SELECT credit_agreement_id, borrower_counterparty_id, agreement_type,
             status_code, currency_code, origination_date, maturity_date,
             is_current_flag, effective_start_date, record_source, created_by
      FROM credit_agreement_master
      WHERE credit_agreement_id <= $1
      ORDER BY credit_agreement_id
    `, [MAX_SEED_COUNTERPARTY]);

    // Read facilities
    const facResult = await client.query(`
      SELECT facility_id, credit_agreement_id, counterparty_id, facility_name,
             facility_type, facility_status, committed_facility_amt, currency_code,
             origination_date, maturity_date, lob_segment_id, product_id,
             interest_rate_spread_bps, is_revolving_flag, is_active_flag,
             is_current_flag, effective_start_date, record_source, created_by,
             region_code, interest_rate_type, day_count_convention
      FROM facility_master
      WHERE facility_id <= $1
      ORDER BY facility_id
    `, [MAX_SEED_FACILITY]);

    // Read collateral assets if any
    const collResult = await client.query(`
      SELECT collateral_asset_id, collateral_type_id, counterparty_id,
             country_code, currency_code, legal_entity_id,
             effective_start_date, description, collateral_status,
             is_current_flag, is_regulatory_eligible_flag,
             source_system_id, record_source, created_by
      FROM collateral_asset_master
      WHERE counterparty_id <= $1
      ORDER BY collateral_asset_id
    `, [MAX_SEED_COUNTERPARTY]);

    // Read limit rules
    const limitResult = await client.query(`
      SELECT limit_rule_id, limit_type, limit_amount_usd, counterparty_id,
             record_source, created_by
      FROM limit_rule
      WHERE counterparty_id <= $1
      ORDER BY limit_rule_id
    `, [MAX_SEED_COUNTERPARTY]);

    // node-postgres returns NUMERIC as strings and DATE as Date objects — normalize
    const numericize = (rows: Record<string, unknown>[]) => rows.map(row => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v instanceof Date) {
          // Convert Date objects to 'YYYY-MM-DD' strings
          const y = v.getFullYear();
          const m = String(v.getMonth() + 1).padStart(2, '0');
          const d = String(v.getDate()).padStart(2, '0');
          out[k] = `${y}-${m}-${d}`;
        } else if (v !== null && typeof v === 'string' && (
          k.endsWith('_amt') || k.endsWith('_pct') || k.endsWith('_bps') ||
          k.endsWith('_value') || k === 'pd_annual' || k === 'lgd_unsecured'
        )) {
          out[k] = parseFloat(v);
        } else if (v !== null && typeof v === 'string' && k.endsWith('_id') && !isNaN(Number(v))) {
          out[k] = Number(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    });

    return {
      counterparties: numericize(cpResult.rows) as unknown as EnrichedCounterparty[],
      agreements: numericize(agrResult.rows) as unknown as EnrichedAgreement[],
      facilities: numericize(facResult.rows) as unknown as EnrichedFacility[],
      collateral_assets: collResult.rows.length > 0 ? numericize(collResult.rows) as unknown as CollateralAssetRow[] : undefined,
      limit_rules: limitResult.rows.length > 0 ? numericize(limitResult.rows) as unknown as LimitRuleRow[] : undefined,
    };
  } finally {
    await client.end();
  }
}

/* ────────────────── Story Arc Assignment ────────────────── */

/**
 * Assign story arcs based on existing counterparty risk profiles.
 * Uses internal_risk_rating and pd_annual to determine the narrative.
 */
function assignStoryArcs(chain: L1Chain): {
  storyArcs: Map<number, StoryArc>;
  ratingTiers: Map<number, RatingTier>;
  sizeProfiles: Map<number, SizeProfile>;
} {
  const storyArcs = new Map<number, StoryArc>();
  const ratingTiers = new Map<number, RatingTier>();
  const sizeProfiles = new Map<number, SizeProfile>();

  // Build facility map for size estimation
  const cpFacilityAmts = new Map<number, number>();
  for (const fac of chain.facilities) {
    const amt = Number(fac.committed_facility_amt) || 0;
    cpFacilityAmts.set(
      fac.counterparty_id,
      (cpFacilityAmts.get(fac.counterparty_id) || 0) + amt,
    );
  }

  for (const cp of chain.counterparties) {
    const id = cp.counterparty_id;
    const pd = Number(cp.pd_annual) || 0.01;
    const totalAmt = cpFacilityAmts.get(id) || 0;

    // Rating tier from PD — must match RatingTier union: IG_HIGH|IG_MID|IG_LOW|HY_HIGH|HY_MID|HY_LOW
    let tier: RatingTier;
    if (pd <= 0.001) tier = 'IG_HIGH';
    else if (pd <= 0.004) tier = 'IG_MID';
    else if (pd <= 0.02) tier = 'IG_LOW';
    else if (pd <= 0.05) tier = 'HY_HIGH';
    else if (pd <= 0.10) tier = 'HY_MID';
    else tier = 'HY_LOW';
    ratingTiers.set(id, tier);

    // Size profile from total committed — must match SizeProfile: LARGE|MID|SMALL
    let size: SizeProfile;
    if (totalAmt >= 1_000_000_000) size = 'LARGE';
    else if (totalAmt >= 100_000_000) size = 'MID';
    else size = 'SMALL';
    sizeProfiles.set(id, size);

    // Story arc: distribute across counterparties for diverse time-series
    // Use modulo-based assignment for deterministic, balanced distribution
    const arcIndex = id % 6;
    const arcs: StoryArc[] = [
      'STABLE_IG',           // ~17% — investment grade, steady
      'STEADY_HY',           // ~17% — high yield, steady
      'DETERIORATING',       // ~17% — gradual decline
      'RECOVERING',          // ~17% — improving from stress
      'STRESSED_SECTOR',     // ~17% — sector-wide stress
      'NEW_RELATIONSHIP',    // ~17% — new client onboarding
    ];
    storyArcs.set(id, arcs[arcIndex]);
  }

  return { storyArcs, ratingTiers, sizeProfiles };
}

/* ────────────────── SQL Emitter ────────────────── */

const RESERVED_WORDS = new Set([
  'value', 'all', 'and', 'array', 'as', 'between', 'case', 'check',
  'column', 'constraint', 'create', 'cross', 'default', 'distinct',
  'do', 'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign',
  'from', 'full', 'grant', 'group', 'having', 'in', 'inner', 'into',
  'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
  'offset', 'on', 'only', 'or', 'order', 'outer', 'primary',
  'references', 'right', 'select', 'table', 'then', 'to', 'true',
  'union', 'unique', 'user', 'using', 'when', 'where', 'window', 'with',
]);

function quoteCol(col: string): string {
  return RESERVED_WORDS.has(col.toLowerCase()) ? `"${col}"` : col;
}

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return isNaN(value) ? 'NULL' : String(value);
  // Handle Date objects → 'YYYY-MM-DD' format
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `'${y}-${m}-${d}'`;
  }
  const s = String(value);
  if (s === 'true' || s === 'TRUE' || s === 'Y') return 'TRUE';
  if (s === 'false' || s === 'FALSE' || s === 'N') return 'FALSE';
  return `'${s.replace(/'/g, "''")}'`;
}

function emitTableSql(td: V2TableData): string[] {
  if (td.rows.length === 0) return [];

  const lines: string[] = [];
  const columns = Object.keys(td.rows[0]);
  const colList = columns.map(quoteCol).join(', ');

  lines.push(`-- ${td.schema}.${td.table} (${td.rows.length} rows)`);

  // Batch into 1000-row INSERTs
  const BATCH_SIZE = 1000;
  for (let offset = 0; offset < td.rows.length; offset += BATCH_SIZE) {
    const batch = td.rows.slice(offset, offset + BATCH_SIZE);
    lines.push(`INSERT INTO ${td.schema}.${td.table} (${colList}) VALUES`);

    const valueSets = batch.map((row, i) => {
      const vals = columns.map(col => formatSqlValue(row[col]));
      const comma = i < batch.length - 1 ? ',' : '';
      return `(${vals.join(', ')})${comma}`;
    });

    lines.push(...valueSets);
    lines.push('ON CONFLICT DO NOTHING;');
    lines.push('');
  }

  return lines;
}

/* ────────────────── Main ────────────────── */

async function main() {
  const args = parseArgs();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    Seed Time-Series Expander (Phase 2)              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Frequency: ${args.frequency} | Dates: ${args.startDate} → ${args.endDate}`);
  console.log(`Output: ${args.output}`);

  // ── Step 1: Load schema registry for validation ──
  let schemaRegistry: SchemaRegistry | undefined;
  try {
    schemaRegistry = SchemaRegistry.fromDataDictionary();
    const summary = schemaRegistry.summary();
    console.log(`Schema Registry: ${summary.tables} tables, ${summary.totalColumns} columns`);
  } catch (err) {
    console.log(`⚠ Schema registry unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Step 2: Read seed L1 chain from PG ──
  console.log('\nReading seed L1 chain from PostgreSQL...');
  const chain = await readSeedChainFromPG();
  console.log(`  Counterparties: ${chain.counterparties.length}`);
  console.log(`  Agreements: ${chain.agreements.length}`);
  console.log(`  Facilities: ${chain.facilities.length}`);
  console.log(`  Collateral assets: ${chain.collateral_assets?.length ?? 0}`);
  console.log(`  Limit rules: ${chain.limit_rules?.length ?? 0}`);

  // ── Step 3: Assign story arcs ──
  const { storyArcs, ratingTiers, sizeProfiles } = assignStoryArcs(chain);
  console.log(`\nStory arcs assigned: ${storyArcs.size} counterparties`);

  // Count by arc type
  const arcCounts = new Map<string, number>();
  for (const arc of storyArcs.values()) {
    arcCounts.set(arc, (arcCounts.get(arc) || 0) + 1);
  }
  for (const [arc, count] of arcCounts) {
    console.log(`  ${arc}: ${count}`);
  }

  // ── Step 4: Initialize ID registry ──
  const registryPath = path.join(__dirname, '..', 'config', 'id-registry.json');
  const registry = new IDRegistry(registryPath);

  // Deallocate previous seed-time-series run
  registry.deallocate('SEED_TS');

  // ── Step 5: Configure V2 generator ──
  const v2Config: V2GeneratorConfig = {
    scenarioId: 'SEED_TS',
    timeSeries: {
      start_date: args.startDate,
      end_date: args.endDate,
      frequency: args.frequency,
    },
    frequency: args.frequency,
    storyArcs,
    ratingTiers,
    sizeProfiles,
  };

  // ── Step 6: Generate L2 data ──
  console.log('\nRunning V2 state machine...');
  const v2Output = generateV2Data(chain, v2Config, registry);

  console.log(`  Dates generated: ${v2Output.dates.length} (${v2Output.dates[0]} → ${v2Output.dates[v2Output.dates.length - 1]})`);
  console.log(`  Total rows: ${v2Output.stats.totalRows}`);
  console.log(`  Tables: ${v2Output.tables.length}`);

  // Show breakdown
  const breakdown = Object.entries(v2Output.stats.tableBreakdown)
    .sort((a, b) => b[1] - a[1]);
  for (const [tbl, count] of breakdown) {
    console.log(`    ${tbl}: ${count}`);
  }

  // ── Step 7: Schema validation ──
  if (schemaRegistry) {
    console.log('\nValidating against data dictionary...');
    const schemaCheck = validateAgainstSchema(v2Output.tables, schemaRegistry);
    if (!schemaCheck.valid) {
      console.log(`  ✗ SCHEMA DRIFT: ${schemaCheck.errors.length} error(s)`);
      for (const err of schemaCheck.errors) {
        console.log(`    ${err}`);
      }
      process.exit(1);
    }
    console.log(`  ✓ Schema validation passed (${schemaCheck.stats.tablesChecked} tables, ${schemaCheck.stats.columnsChecked} columns)`);
  }

  if (args.dryRun) {
    console.log('\nDry run complete. No SQL written.');
    return;
  }

  // ── Step 8: Emit SQL ──
  console.log('\nEmitting SQL...');
  const lines: string[] = [
    '-- Seed Time-Series Expansion (Phase 2)',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Frequency: ${args.frequency}`,
    `-- Date range: ${args.startDate} → ${args.endDate}`,
    `-- Facilities: ${chain.facilities.length} (seed only, ids 1-${MAX_SEED_FACILITY})`,
    `-- Dates: ${v2Output.dates.length} snapshots`,
    '',
    'SET search_path TO l1, l2, public;',
    '',
  ];

  // L2 tables only — no L1 inserts (seed L1 already exists)
  for (const td of v2Output.tables) {
    lines.push(...emitTableSql(td));
  }

  // Write file
  const outputPath = path.resolve(args.output);
  const dir = path.dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`SQL written to ${outputPath} (${lines.length} lines)`);

  // Save registry
  registry.save();
  console.log(`Registry saved.`);

  console.log(`\n✓ Phase 2 complete. Load with:`);
  console.log(`  psql -f ${args.output}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

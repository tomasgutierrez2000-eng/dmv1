/**
 * Scenario Runner — CLI orchestrator for the data factory.
 *
 * Usage:
 *   npx tsx scenarios/factory/scenario-runner.ts --scenario S019
 *   npx tsx scenarios/factory/scenario-runner.ts --all
 *   npx tsx scenarios/factory/scenario-runner.ts --all --start 2024-07-01 --end 2025-01-31
 *   npx tsx scenarios/factory/scenario-runner.ts --all --frequency daily
 *   npx tsx scenarios/factory/scenario-runner.ts --all --output sql/generated/factory.sql
 *   npx tsx scenarios/factory/scenario-runner.ts --all --clean
 *   npx tsx scenarios/factory/scenario-runner.ts --dry-run --all
 *   npx tsx scenarios/factory/scenario-runner.ts --validate
 *
 * Pipeline: YAML config → ID allocation → L1 chain → v2 state machine → L2 data → validate → DB/SQL
 */

import { writeFileSync } from 'fs';
import path from 'path';
import { IDRegistry } from './id-registry';
import { parseScenarioYaml, loadAllScenarios, type ScenarioConfig } from './scenario-config';
import { buildL1Chain, type L1Chain } from './chain-builder';
import { generateV2Data, type V2GeneratorConfig, type V2GeneratorOutput } from './v2/generators';
import { DBWriter, writeToSqlFile } from './v2/db-writer';
import {
  emitScenarioSql,
  emitCombinedSql,
  type TableData as SqlEmitterTableData,
} from './sql-emitter';
import type { TableData as V2TableData } from './v2/types';
import { validateV2Output } from './validator';
import type { StoryArc, RatingTier, SizeProfile } from '../../scripts/shared/mvp-config';
import type { TimeFrequency } from './v2/types';

/* ────────────────── CLI Argument Parsing ────────────────── */

interface CliArgs {
  scenarios: string[];     // Scenario IDs to process, or 'ALL'
  dryRun: boolean;         // Show volume stats, no writes
  validateOnly: boolean;   // Show validation stats only
  output: string | null;   // Output SQL file path (null = direct DB)
  verbose: boolean;
  clean: boolean;          // Clean existing factory data before generating
  frequency: TimeFrequency; // Time series frequency
  startDate: string;       // Time series start date
  endDate: string;         // Time series end date
  deterministic: boolean;  // Freeze metadata timestamps for deterministic output
}

const DEFAULT_START = '2024-07-01';
const DEFAULT_END = '2025-01-31';
const DEFAULT_FREQUENCY: TimeFrequency = 'WEEKLY';

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    scenarios: [],
    dryRun: false,
    validateOnly: false,
    output: null, // null = direct DB (default)
    verbose: false,
    clean: false,
    frequency: DEFAULT_FREQUENCY,
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    deterministic: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
      case '-s':
        result.scenarios.push(args[++i]);
        break;
      case '--all':
      case '-a':
        result.scenarios = ['ALL'];
        break;
      case '--dry-run':
      case '-n':
        result.dryRun = true;
        break;
      case '--validate':
      case '-v':
        result.validateOnly = true;
        break;
      case '--output':
      case '-o':
        result.output = args[++i];
        break;
      case '--verbose':
        result.verbose = true;
        break;
      case '--clean':
        result.clean = true;
        break;
      case '--deterministic':
        result.deterministic = true;
        break;
      case '--frequency':
      case '-f':
        result.frequency = args[++i].toUpperCase() as TimeFrequency;
        break;
      case '--start':
        result.startDate = args[++i];
        break;
      case '--end':
        result.endDate = args[++i];
        break;
      default:
        // Treat bare args as scenario IDs
        if (!args[i].startsWith('-')) {
          result.scenarios.push(args[i]);
        }
    }
  }

  if (result.scenarios.length === 0) {
    result.scenarios = ['ALL'];
  }

  return result;
}

/** Normalize scenario ID: strip leading zeros from numeric portion (S019 → S19). */
function normalizeScenarioId(id: string): string {
  return id.replace(/^(S)0+(\d+)$/i, '$1$2').toUpperCase();
}

/* ────────────────── V2 Config Builder ────────────────── */

/**
 * Build V2GeneratorConfig from a ScenarioConfig + L1 chain.
 * Maps counterparty profiles to the story arc / rating tier / size maps.
 */
function buildV2Config(
  config: ScenarioConfig,
  chain: L1Chain,
  cliArgs: CliArgs,
): V2GeneratorConfig {
  const storyArcs = new Map<number, StoryArc>();
  const ratingTiers = new Map<number, RatingTier>();
  const sizeProfiles = new Map<number, SizeProfile>();

  // Map counterparty profiles to their allocated IDs
  for (let i = 0; i < config.counterparties.length; i++) {
    const profile = config.counterparties[i];
    const cp = chain.counterparties[i];
    if (cp) {
      storyArcs.set(cp.counterparty_id, profile.story_arc);
      ratingTiers.set(cp.counterparty_id, profile.rating_tier);
      sizeProfiles.set(cp.counterparty_id, profile.size);
    }
  }

  // Time series: YAML config > CLI args > defaults
  const timeSeries = config.time_series ?? {
    start_date: cliArgs.startDate,
    end_date: cliArgs.endDate,
    frequency: cliArgs.frequency,
  };

  // Backward compat: if YAML specifies as_of_dates, use those
  const snapshotDates = config.timeline?.as_of_dates;

  // Market environment from YAML or default
  const market = config.market_environment ?? undefined;

  // Limit rules from chain
  const limitRules = new Map<number, number>();
  if (chain.limit_rules) {
    for (const rule of chain.limit_rules) {
      if (rule.counterparty_id !== null) {
        limitRules.set(rule.counterparty_id, rule.limit_rule_id);
      }
    }
  }

  return {
    scenarioId: config.scenario_id,
    market,
    timeSeries: {
      start_date: timeSeries.start_date ?? cliArgs.startDate,
      end_date: timeSeries.end_date ?? cliArgs.endDate,
      frequency: (timeSeries.frequency ?? cliArgs.frequency) as TimeFrequency,
    },
    frequency: (timeSeries.frequency ?? cliArgs.frequency) as TimeFrequency,
    storyArcs,
    ratingTiers,
    sizeProfiles,
    snapshotDates,
    limitRules,
  };
}

/* ────────────────── L1 Chain → TableData Converter ────────────────── */

function chainToV2Tables(chain: L1Chain): V2TableData[] {
  const tables: V2TableData[] = [];
  const push = (schema: string, table: string, rows: Record<string, unknown>[]) => {
    if (rows.length > 0) tables.push({ schema, table, rows });
  };

  // Schema must match actual PostgreSQL DDL (02-l2-ddl.sql for master tables, 01-l1-ddl.sql for dims)
  push('l2', 'counterparty', chain.counterparties as unknown as Record<string, unknown>[]);
  push('l2', 'credit_agreement_master', chain.agreements as unknown as Record<string, unknown>[]);
  push('l2', 'facility_master', chain.facilities as unknown as Record<string, unknown>[]);
  if (chain.hierarchies) push('l2', 'counterparty_hierarchy', chain.hierarchies as unknown as Record<string, unknown>[]);
  if (chain.collateral_assets) push('l2', 'collateral_asset_master', chain.collateral_assets as unknown as Record<string, unknown>[]);
  if (chain.limit_rules) push('l1', 'limit_rule', chain.limit_rules as unknown as Record<string, unknown>[]);
  if (chain.facility_lender_allocations) push('l2', 'facility_lender_allocation', chain.facility_lender_allocations as unknown as Record<string, unknown>[]);

  return tables;
}

/** Convert v2 TableData (schema + table) to sql-emitter TableData (schema.table). */
function toSqlEmitterFormat(tables: V2TableData[]): SqlEmitterTableData[] {
  return tables.map(t => ({
    table: `${t.schema}.${t.table}`,
    rows: t.rows,
  }));
}

/* ────────────────── Main ────────────────── */

async function main() {
  const args = parseArgs();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        GSIB Scenario Data Factory v2                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Load scenario configs
  let configs: ScenarioConfig[];
  if (args.scenarios.includes('ALL')) {
    configs = loadAllScenarios();
    console.log(`Loaded ${configs.length} scenario(s) from narratives/`);
  } else {
    const narrativesDir = path.join(__dirname, '..', 'narratives');
    configs = args.scenarios.map(id => {
      const normalizedId = normalizeScenarioId(id);
      const patterns = [
        `${id}.yaml`, `${id}.yml`,
        `${id.toUpperCase()}.yaml`, `${id.toLowerCase()}.yaml`,
      ];
      for (const p of patterns) {
        try {
          return parseScenarioYaml(path.join(narrativesDir, p));
        } catch { /* continue */ }
      }
      const all = loadAllScenarios(narrativesDir);
      const match = all.find(c =>
        normalizeScenarioId(c.scenario_id) === normalizedId
      );
      if (match) return match;
      throw new Error(`Scenario not found: ${id} (normalized: ${normalizedId})`);
    });
    console.log(`Processing ${configs.length} scenario(s): ${configs.map(c => c.scenario_id).join(', ')}`);
  }

  if (configs.length === 0) {
    console.log('No scenarios found. Create YAML files in scenarios/narratives/');
    process.exit(0);
  }

  console.log(`Frequency: ${args.frequency} | Dates: ${args.startDate} → ${args.endDate}`);

  // Initialize ID registry
  const registryPath = path.join(__dirname, '..', 'config', 'id-registry.json');
  const registry = new IDRegistry(registryPath);

  // Determine output mode
  const dbWriter = new DBWriter();
  const useDb = dbWriter.isAvailable() && args.output === null;
  const sqlOutputPath = args.output ?? path.join(__dirname, '..', '..', 'sql', 'gsib-export', '06-factory-scenarios.sql');

  if (useDb) {
    console.log('Output: Direct PostgreSQL insert');
    await dbWriter.connect();

    if (args.clean) {
      console.log('Cleaning existing factory data...');
      await dbWriter.clean();
    }
  } else if (args.output) {
    console.log(`Output: SQL file → ${sqlOutputPath}`);
  } else {
    console.log('Output: SQL file (DATABASE_URL not set, use --output to specify path)');
  }

  const allV2Tables: V2TableData[] = [];
  const allSqlEmitterTables: SqlEmitterTableData[] = [];
  let totalRows = 0;
  let allValid = true;

  for (const config of configs) {
    const cpCount = config.counterparties.length;
    const facCount = cpCount * config.facilities.per_counterparty;
    console.log(`\n── ${config.scenario_id}: ${config.name} ──`);
    console.log(`   Type: ${config.type} | CPs: ${cpCount} | Facs: ${facCount}`);

    try {
      // Deallocate previous run of same scenario (allows re-generation)
      registry.deallocate(config.scenario_id);

      // Build L1 chain
      const chain = buildL1Chain(config, registry);

      // Build v2 config from scenario + chain
      const v2Config = buildV2Config(config, chain, args);

      // Generate L2 data via v2 engine
      const v2Output = generateV2Data(chain, v2Config, registry);

      // Validate before any write — catches FK, PK, financial, covenant, IFRS9 issues
      const validation = validateV2Output(chain, v2Output, config);
      if (!validation.valid) {
        console.log(`   ⚠ Validation FAILED: ${validation.errors.length} error(s)`);
        for (const err of validation.errors.slice(0, 5)) {
          console.log(`     ✗ ${err}`);
        }
        if (validation.errors.length > 5) {
          console.log(`     ... and ${validation.errors.length - 5} more`);
        }
        allValid = false;
        continue; // Skip this scenario — do not write bad data
      }
      if (validation.warnings.length > 0) {
        console.log(`   ⚠ ${validation.warnings.length} warning(s)${args.verbose ? ':' : ' (use --verbose to see)'}`);
        if (args.verbose) {
          for (const w of validation.warnings.slice(0, 10)) {
            console.log(`     ⚡ ${w}`);
          }
        }
      }

      // Combine L1 + L2 tables
      const l1Tables = chainToV2Tables(chain);
      const allTables = [...l1Tables, ...v2Output.tables];
      const scenarioRows = v2Output.stats.totalRows + l1Tables.reduce((s, t) => s + t.rows.length, 0);

      // Show stats
      const { tableBreakdown } = v2Output.stats;
      console.log(`   ✓ Validated + Generated | ${scenarioRows} rows across ${allTables.length} tables`);
      console.log(`   Dates: ${v2Output.dates.length} snapshots (${v2Output.dates[0]} → ${v2Output.dates[v2Output.dates.length - 1]})`);

      if (args.verbose) {
        for (const [tbl, count] of Object.entries(tableBreakdown).sort((a, b) => b[1] - a[1])) {
          console.log(`      ${tbl}: ${count} rows`);
        }
      }

      totalRows += scenarioRows;

      if (args.dryRun || args.validateOnly) {
        continue;
      }

      if (useDb) {
        // Direct DB insert — wrap each scenario in a transaction
        await dbWriter.withinTransaction(async () => {
          const results = await dbWriter.writeAll(allTables);
          const inserted = results.reduce((s, r) => s + r.rowsInserted, 0);
          const duration = results.reduce((s, r) => s + r.duration_ms, 0);
          console.log(`   DB: ${inserted} rows inserted (${duration}ms)`);
        });
      } else {
        // SQL file mode — collect for combined output
        allV2Tables.push(...allTables);
        const sqlTables = toSqlEmitterFormat(allTables);
        const sql = emitScenarioSql(sqlTables, {
          scenarioId: config.scenario_id,
          scenarioName: config.name,
          narrative: config.narrative,
          generatedAt: args.deterministic ? 'DETERMINISTIC' : undefined,
        });
        allSqlEmitterTables.push(...sqlTables);
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err instanceof Error ? err.message : String(err)}`);
      if (args.verbose && err instanceof Error && err.stack) {
        console.log(`   ${err.stack.split('\n').slice(1, 4).join('\n   ')}`);
      }
      allValid = false;
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Total: ${configs.length} scenarios, ${totalRows} rows`);

  if (args.dryRun) {
    console.log(`\nDry run complete. Would generate ${totalRows} rows.`);
  }

  // SQL file output
  if (!args.dryRun && !args.validateOnly && !useDb && allV2Tables.length > 0) {
    writeToSqlFile(allV2Tables, sqlOutputPath, args.deterministic ? 'DETERMINISTIC' : undefined);
  }

  // Post-insert verification (DB mode)
  if (useDb && !args.dryRun && !args.validateOnly) {
    console.log('\nRunning post-insert verification...');
    const verification = await dbWriter.verify();
    for (const check of verification.checks) {
      const icon = check.passed ? '✓' : '✗';
      console.log(`   ${icon} ${check.name}: ${check.message}`);
    }
    if (!verification.passed) {
      console.log('   ⚠ Some verification checks failed');
      allValid = false;
    }
  }

  // Disconnect DB
  if (useDb) {
    await dbWriter.disconnect();
  }

  // Save registry state
  if (!args.dryRun) {
    registry.save();
    console.log(`Registry: saved to ${registryPath}`);
  }

  const summary = registry.summary();
  console.log(`Registry: ${summary.scenarios} scenarios, ${summary.totalIds} IDs across ${summary.tables} tables`);

  if (!allValid) {
    console.log('\n⚠ Some scenarios had errors. Fix the YAML configs and re-run.');
    process.exit(1);
  }

  console.log('\n✓ All scenarios generated successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

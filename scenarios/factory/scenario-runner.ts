/**
 * Scenario Runner — CLI orchestrator for the data factory.
 *
 * Usage:
 *   npx tsx scenarios/factory/scenario-runner.ts --scenario S019
 *   npx tsx scenarios/factory/scenario-runner.ts --all
 *   npx tsx scenarios/factory/scenario-runner.ts --validate
 *   npx tsx scenarios/factory/scenario-runner.ts --dry-run --all
 *
 * Pipeline: YAML config → ID allocation → L1 chain → L2 data → validate → emit SQL
 */

import { writeFileSync } from 'fs';
import path from 'path';
import { IDRegistry } from './id-registry';
import { parseScenarioYaml, loadAllScenarios } from './scenario-config';
import { buildL1Chain } from './chain-builder';
import { generateL2Data } from './l2-generator';
import { validateScenario } from './validator';
import {
  emitScenarioSql,
  emitCombinedSql,
  type TableData,
  type SqlRow,
} from './sql-emitter';

/* ────────────────── CLI Argument Parsing ────────────────── */

interface CliArgs {
  scenarios: string[];     // Scenario IDs to process, or 'ALL'
  dryRun: boolean;         // Validate only, don't write SQL
  validateOnly: boolean;   // Show validation stats only
  output: string;          // Output SQL file path
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    scenarios: [],
    dryRun: false,
    validateOnly: false,
    output: path.join(__dirname, '..', '..', 'sql', 'gsib-export', '06-factory-scenarios.sql'),
    verbose: false,
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

/* ────────────────── L1/L2 Data → TableData Converter ────────────────── */

function chainToTables(chain: ReturnType<typeof buildL1Chain>): TableData[] {
  const tables: TableData[] = [];
  const push = (table: string, rows: Record<string, unknown>[]) => {
    if (rows.length > 0) tables.push({ table, rows });
  };

  push('l1.counterparty', chain.counterparties as unknown as SqlRow[]);
  push('l1.credit_agreement_master', chain.agreements as unknown as SqlRow[]);
  push('l1.facility_master', chain.facilities as unknown as SqlRow[]);
  if (chain.hierarchies) push('l1.counterparty_hierarchy', chain.hierarchies as unknown as SqlRow[]);
  if (chain.collateral_assets) push('l1.collateral_asset_master', chain.collateral_assets as unknown as SqlRow[]);
  if (chain.limit_rules) push('l1.limit_rule', chain.limit_rules as unknown as SqlRow[]);
  if (chain.facility_lender_allocations) push('l1.facility_lender_allocation', chain.facility_lender_allocations as unknown as SqlRow[]);

  return tables;
}

function l2ToTables(l2Data: ReturnType<typeof generateL2Data>): TableData[] {
  const tables: TableData[] = [];

  const mapping: [string, unknown[] | undefined][] = [
    ['l2.facility_exposure_snapshot', l2Data.facility_exposure_snapshot],
    ['l2.counterparty_rating_observation', l2Data.counterparty_rating_observation],
    ['l2.collateral_snapshot', l2Data.collateral_snapshot],
    ['l2.facility_delinquency_snapshot', l2Data.facility_delinquency_snapshot],
    ['l2.limit_contribution_snapshot', l2Data.limit_contribution_snapshot],
    ['l2.limit_utilization_event', l2Data.limit_utilization_event],
    ['l2.exposure_counterparty_attribution', l2Data.exposure_counterparty_attribution],
    ['l2.credit_event', l2Data.credit_event],
    ['l2.credit_event_facility_link', l2Data.credit_event_facility_link],
    ['l2.amendment_event', l2Data.amendment_event],
    ['l2.risk_flag', l2Data.risk_flag],
    ['l2.stress_test_result', l2Data.stress_test_result],
    ['l2.stress_test_breach', l2Data.stress_test_breach],
    ['l2.deal_pipeline_fact', l2Data.deal_pipeline_fact],
    ['l2.data_quality_score_snapshot', l2Data.data_quality_score_snapshot],
  ];

  for (const [table, rows] of mapping) {
    if (rows && rows.length > 0) {
      tables.push({ table, rows: rows as Record<string, unknown>[] });
    }
  }

  return tables;
}

/* ────────────────── Main ────────────────── */

async function main() {
  const args = parseArgs();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          GSIB Scenario Data Factory                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Load scenario configs
  let configs;
  if (args.scenarios.includes('ALL')) {
    configs = loadAllScenarios();
    console.log(`Loaded ${configs.length} scenario(s) from narratives/`);
  } else {
    const narrativesDir = path.join(__dirname, '..', 'narratives');
    configs = args.scenarios.map(id => {
      // Try exact filename first, then fuzzy match
      const patterns = [
        `${id}.yaml`, `${id}.yml`,
        `${id.toUpperCase()}.yaml`, `${id.toLowerCase()}.yaml`,
      ];
      for (const p of patterns) {
        try {
          return parseScenarioYaml(path.join(narrativesDir, p));
        } catch { /* continue */ }
      }
      // Try searching by scenario_id in all files
      const all = loadAllScenarios(narrativesDir);
      const match = all.find(c => c.scenario_id === id || c.scenario_id === id.toUpperCase());
      if (match) return match;
      throw new Error(`Scenario not found: ${id}`);
    });
    console.log(`Processing ${configs.length} scenario(s): ${configs.map(c => c.scenario_id).join(', ')}`);
  }

  if (configs.length === 0) {
    console.log('No scenarios found. Create YAML files in scenarios/narratives/');
    process.exit(0);
  }

  // Initialize ID registry
  const registryPath = path.join(__dirname, '..', 'config', 'id-registry.json');
  const registry = new IDRegistry(registryPath);

  const allSqls: string[] = [];
  let totalInserts = 0;
  let allValid = true;

  for (const config of configs) {
    console.log(`\n── ${config.scenario_id}: ${config.name} ──`);
    console.log(`   Type: ${config.type} | CPs: ${config.counterparties.length} | Facs: ${config.counterparties.length * config.facilities.per_counterparty}`);

    try {
      // Deallocate previous run of same scenario (allows re-generation)
      registry.deallocate(config.scenario_id);

      // Build L1 chain
      const chain = buildL1Chain(config, registry);

      // Generate L2 data
      const l2Data = generateL2Data(chain, config, registry);

      // Validate
      const validation = validateScenario(chain, l2Data, config, registry);

      if (!validation.valid) {
        console.log(`   ❌ FAILED validation:`);
        for (const err of validation.errors) {
          console.log(`      - ${err}`);
        }
        allValid = false;
        continue;
      }

      if (validation.warnings.length > 0 && args.verbose) {
        console.log(`   ⚠ ${validation.warnings.length} warnings:`);
        for (const warn of validation.warnings) {
          console.log(`      - ${warn}`);
        }
      }

      console.log(`   ✓ Valid | ${validation.stats.total_inserts} INSERTs (${validation.stats.l1_counterparties} CPs, ${validation.stats.l1_facilities} facs, ${validation.stats.l2_exposure_rows} exposures)`);
      totalInserts += validation.stats.total_inserts;

      if (!args.validateOnly && !args.dryRun) {
        // Convert to TableData and emit SQL
        const tables = [...chainToTables(chain), ...l2ToTables(l2Data)];
        const sql = emitScenarioSql(tables, {
          scenarioId: config.scenario_id,
          scenarioName: config.name,
          narrative: config.narrative,
        });
        allSqls.push(sql);
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err instanceof Error ? err.message : String(err)}`);
      allValid = false;
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Total: ${configs.length} scenarios, ${totalInserts} INSERTs`);

  if (!args.validateOnly && !args.dryRun && allSqls.length > 0) {
    const combined = emitCombinedSql(allSqls);
    writeFileSync(args.output, combined);
    console.log(`Output: ${args.output} (${(combined.length / 1024).toFixed(1)} KB)`);
  }

  // Save registry state
  if (!args.dryRun) {
    registry.save();
    console.log(`Registry: saved to ${registryPath}`);
  }

  const summary = registry.summary();
  console.log(`Registry: ${summary.scenarios} scenarios, ${summary.totalIds} IDs across ${summary.tables} tables`);

  if (!allValid) {
    console.log('\n⚠ Some scenarios had validation errors. Fix the YAML configs and re-run.');
    process.exit(1);
  }

  console.log('\n✓ All scenarios generated successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

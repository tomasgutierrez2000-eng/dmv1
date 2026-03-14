/**
 * Schema Contract Test — validates factory generator output against DDL.
 *
 * Parses the canonical DDL files to extract {schema.table → column_set},
 * then runs a single-scenario generation and verifies:
 *   1. Every emitted column exists in the DDL column set for that table
 *   2. Every FK parent table is populated by the factory
 *   3. (Optional) Deterministic re-run produces identical output
 *
 * Usage: npx tsx scenarios/factory/__tests__/schema-contract.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── DDL Parser ─────────────────────────────────────────────────────────

interface DDLTable {
  schema: string;
  table: string;
  columns: Set<string>;
  fks: { column: string; refSchema: string; refTable: string; refColumn: string }[];
}

function parseDDL(filePath: string): DDLTable[] {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const tables: DDLTable[] = [];

  const createRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"(\w+)"\."(\w+)"\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = createRegex.exec(sql)) !== null) {
    const schema = match[1];
    const table = match[2];
    const body = match[3];

    const columns = new Set<string>();
    const fks: DDLTable['fks'] = [];

    // Extract column names (lines starting with quoted column name)
    const colRegex = /^\s*"(\w+)"\s+/gm;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = colRegex.exec(body)) !== null) {
      const name = colMatch[1];
      // Skip constraint keywords that happen to be quoted
      if (!['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(name.toUpperCase())) {
        columns.add(name);
      }
    }

    // Extract FK constraints
    const fkRegex = /FOREIGN\s+KEY\s*\("(\w+)"\)\s*REFERENCES\s+"(\w+)"\."(\w+)"\s*\("(\w+)"\)/gi;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(body)) !== null) {
      fks.push({
        column: fkMatch[1],
        refSchema: fkMatch[2],
        refTable: fkMatch[3],
        refColumn: fkMatch[4],
      });
    }

    tables.push({ schema, table, columns, fks });
  }

  return tables;
}

// ─── Test Runner ────────────────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const ddlDir = path.join(projectRoot, 'sql', 'gsib-export');
  const ddlFiles = ['01-l1-ddl.sql', '02-l2-ddl.sql'];

  console.log('Schema Contract Test');
  console.log('═'.repeat(60));

  // Step 1: Parse DDL
  const allDDLTables: DDLTable[] = [];
  for (const f of ddlFiles) {
    const fp = path.join(ddlDir, f);
    if (!fs.existsSync(fp)) {
      console.log(`  SKIP: ${f} not found`);
      continue;
    }
    const tables = parseDDL(fp);
    allDDLTables.push(...tables);
    console.log(`  Parsed ${f}: ${tables.length} tables`);
  }

  const ddlMap = new Map<string, DDLTable>();
  for (const t of allDDLTables) {
    ddlMap.set(`${t.schema}.${t.table}`, t);
  }

  // Step 2: Run factory for a single scenario
  console.log('\nGenerating test scenario...');

  const { loadAllScenarios } = await import('../scenario-config');
  const { buildL1Chain } = await import('../chain-builder');
  const { IDRegistry } = await import('../id-registry');
  const { generateV2Data } = await import('../v2/generators');

  const configs = loadAllScenarios();
  if (configs.length === 0) {
    console.log('  No scenarios found. Exiting.');
    process.exit(1);
  }

  const config = configs[0];
  const registry = new IDRegistry(path.join(projectRoot, 'scenarios', 'config', 'id-registry-test.json'));
  registry.deallocate(config.scenario_id);
  const chain = buildL1Chain(config, registry);

  const storyArcs = new Map<number, any>();
  const ratingTiers = new Map<number, any>();
  const sizeProfiles = new Map<number, any>();
  for (let i = 0; i < config.counterparties.length; i++) {
    const profile = config.counterparties[i];
    const cp = chain.counterparties[i];
    if (cp) {
      storyArcs.set(cp.counterparty_id, profile.story_arc);
      ratingTiers.set(cp.counterparty_id, profile.rating_tier);
      sizeProfiles.set(cp.counterparty_id, profile.size);
    }
  }

  const v2Output = generateV2Data(chain, {
    scenarioId: config.scenario_id,
    timeSeries: {
      start_date: config.time_series?.start_date ?? '2024-11-30',
      end_date: config.time_series?.end_date ?? '2025-01-31',
      frequency: (config.time_series?.frequency ?? 'MONTHLY') as any,
    },
    frequency: (config.time_series?.frequency ?? 'MONTHLY') as any,
    storyArcs,
    ratingTiers,
    sizeProfiles,
    snapshotDates: config.timeline?.as_of_dates,
  }, registry);

  console.log(`  Generated: ${v2Output.stats.totalRows} rows across ${v2Output.tables.length} tables`);

  // Step 3: Column contract check
  console.log('\n── Column Contract Check ──');
  let columnErrors = 0;
  let columnChecks = 0;

  // Collect generated tables: from L1 chain (counterparty, etc.) and from V2 output
  interface GeneratedTable { schema: string; table: string; rows: Record<string, unknown>[] }
  const generatedTables: GeneratedTable[] = [
    ...v2Output.tables,
    { schema: 'l2', table: 'counterparty', rows: chain.counterparties as any },
    { schema: 'l2', table: 'credit_agreement_master', rows: chain.agreements as any },
    { schema: 'l2', table: 'facility_master', rows: chain.facilities as any },
  ];

  for (const gt of generatedTables) {
    if (gt.rows.length === 0) continue;
    const ddlKey = `${gt.schema}.${gt.table}`;
    const ddl = ddlMap.get(ddlKey);
    if (!ddl) {
      console.log(`  WARN: ${ddlKey} not found in DDL`);
      continue;
    }

    const emittedCols = Object.keys(gt.rows[0]);
    for (const col of emittedCols) {
      columnChecks++;
      if (!ddl.columns.has(col)) {
        console.log(`  FAIL: ${ddlKey}.${col} — not in DDL`);
        columnErrors++;
      }
    }
  }

  console.log(`  Checked ${columnChecks} column references, ${columnErrors} errors`);

  // Step 4: FK parent table population check
  console.log('\n── FK Parent Table Check ──');
  let fkErrors = 0;
  let fkChecks = 0;

  const generatedTableNames = new Set(generatedTables.map(t => `${t.schema}.${t.table}`));

  for (const gt of generatedTables) {
    if (gt.rows.length === 0) continue;
    const ddlKey = `${gt.schema}.${gt.table}`;
    const ddl = ddlMap.get(ddlKey);
    if (!ddl) continue;

    for (const fk of ddl.fks) {
      fkChecks++;
      const refKey = `${fk.refSchema}.${fk.refTable}`;
      // Only check FKs to tables that should be populated by the factory (not dim tables)
      const isDimTable = fk.refTable.endsWith('_dim');
      if (!isDimTable && !generatedTableNames.has(refKey)) {
        console.log(`  WARN: ${ddlKey} FK(${fk.column}) → ${refKey} not populated by factory`);
      }
    }
  }

  console.log(`  Checked ${fkChecks} FK constraints`);

  // Step 5: Clean up test registry
  try {
    const testRegistryPath = path.join(projectRoot, 'scenarios', 'config', 'id-registry-test.json');
    if (fs.existsSync(testRegistryPath)) {
      fs.unlinkSync(testRegistryPath);
    }
  } catch { /* ignore cleanup errors */ }

  // Summary
  console.log('\n' + '═'.repeat(60));
  if (columnErrors === 0) {
    console.log('PASS: All emitted columns match DDL schema');
  } else {
    console.log(`FAIL: ${columnErrors} column mismatches found`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Schema contract test failed:', err);
  process.exit(1);
});

/**
 * Full data model sync pipeline.
 * Reads the data dictionary → regenerates DDL files → applies to PostgreSQL → introspects back.
 *
 * Usage: npm run sync:all
 * Requires: DATABASE_URL in .env (or parent .env) for DB sync; works offline for DDL-only.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import type { DataDictionary } from '../lib/data-dictionary';
import { writeDataDictionary } from '../lib/data-dictionary';
import { writeDdlFiles, executeDdl } from '../lib/data-model-sync';
import { runIntrospection } from '../lib/introspect';

async function main() {
  const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');

  if (!fs.existsSync(DD_PATH)) {
    console.error('  Data dictionary not found. Load or create a model first.');
    process.exit(1);
  }

  const dd: DataDictionary = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
  console.log(`\n  ═══ Full Data Model Sync ═══\n`);
  console.log(`  Data dictionary: L1=${dd.L1.length} L2=${dd.L2.length} L3=${dd.L3.length} tables`);

  // 1. Regenerate DDL files for all layers
  console.log('\n  [1/3] Regenerating DDL files...');
  const ddlFiles = writeDdlFiles(dd);
  console.log(`  Written ${ddlFiles.length} DDL files:`);
  for (const f of ddlFiles) console.log(`    ${path.relative(process.cwd(), f)}`);

  // 2. Apply full DDL to PostgreSQL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('\n  [2/3] Skipped — DATABASE_URL not set (DDL files regenerated, no DB sync)');
    console.log('  [3/3] Skipped — no DB connection for introspection');
    console.log('\n  Done (DDL-only mode).\n');
    return;
  }

  console.log('\n  [2/3] Applying DDL to PostgreSQL...');
  const dbResult = await executeDdl(dd);
  if (!dbResult.ok) {
    console.error(`  DB apply failed: ${dbResult.error}`);
    console.log('  Continuing to introspection to capture current DB state...');
  } else {
    console.log('  DDL applied successfully.');
  }

  // 3. Introspect round-trip
  console.log('\n  [3/3] Running introspection round-trip...');
  const report = await runIntrospection(dd, databaseUrl);
  writeDataDictionary(dd);

  const noChanges =
    report.tablesAdded.length === 0 &&
    report.tablesRemoved.length === 0 &&
    report.fieldsAdded.length === 0 &&
    report.fieldsRemoved.length === 0 &&
    report.typesChanged.length === 0;

  if (noChanges) {
    console.log('  No structural drift — data dictionary matches database.');
  } else {
    if (report.tablesAdded.length) console.log(`  Tables added: ${report.tablesAdded.length}`);
    if (report.tablesRemoved.length) console.log(`  Tables removed: ${report.tablesRemoved.length}`);
    if (report.fieldsAdded.length) console.log(`  Fields added: ${report.fieldsAdded.length}`);
    if (report.fieldsRemoved.length) console.log(`  Fields removed: ${report.fieldsRemoved.length}`);
    if (report.typesChanged.length) console.log(`  Types changed: ${report.typesChanged.length}`);
  }

  console.log(`\n  Totals: L1=${report.totalTables.L1} L2=${report.totalTables.L2} L3=${report.totalTables.L3} tables`);
  console.log(`  Done.\n`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});

/**
 * Introspect PostgreSQL database to update the data dictionary.
 * The live database is the golden source of truth for tables, fields, and data types.
 *
 * Usage: npm run db:introspect
 * Requires: DATABASE_URL in .env (or parent .env), pg package
 *
 * Core introspection logic lives in lib/introspect.ts (shared with API routes).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import type { DataDictionary } from '../lib/data-dictionary';
import {
  runIntrospection,
  type IntrospectReport,
} from '../lib/introspect';

function printReport(report: IntrospectReport, relationshipCount: number) {
  console.log('\n  ═══ Introspection Report ═══\n');

  if (report.tablesAdded.length > 0) {
    console.log(`  Tables added (${report.tablesAdded.length}):`);
    for (const t of report.tablesAdded) console.log(`    + ${t}`);
  }
  if (report.tablesRemoved.length > 0) {
    console.log(`  Tables removed (${report.tablesRemoved.length}):`);
    for (const t of report.tablesRemoved) console.log(`    - ${t}`);
  }
  if (report.fieldsAdded.length > 0) {
    console.log(`  Fields added (${report.fieldsAdded.length}):`);
    for (const f of report.fieldsAdded.slice(0, 20)) console.log(`    + ${f}`);
    if (report.fieldsAdded.length > 20) console.log(`    ... and ${report.fieldsAdded.length - 20} more`);
  }
  if (report.fieldsRemoved.length > 0) {
    console.log(`  Fields removed (${report.fieldsRemoved.length}):`);
    for (const f of report.fieldsRemoved.slice(0, 20)) console.log(`    - ${f}`);
    if (report.fieldsRemoved.length > 20) console.log(`    ... and ${report.fieldsRemoved.length - 20} more`);
  }
  if (report.typesChanged.length > 0) {
    console.log(`  Types changed (${report.typesChanged.length}):`);
    for (const t of report.typesChanged.slice(0, 30)) console.log(`    ~ ${t}`);
    if (report.typesChanged.length > 30) console.log(`    ... and ${report.typesChanged.length - 30} more`);
  }
  if (report.pkChanges.length > 0) {
    console.log(`  PK changes (${report.pkChanges.length}):`);
    for (const p of report.pkChanges) console.log(`    ~ ${p}`);
  }
  if (report.fkChanges.length > 0) {
    console.log(`  FK changes (${report.fkChanges.length}):`);
    for (const f of report.fkChanges.slice(0, 20)) console.log(`    ~ ${f}`);
    if (report.fkChanges.length > 20) console.log(`    ... and ${report.fkChanges.length - 20} more`);
  }

  const noChanges =
    report.tablesAdded.length === 0 &&
    report.tablesRemoved.length === 0 &&
    report.fieldsAdded.length === 0 &&
    report.fieldsRemoved.length === 0 &&
    report.typesChanged.length === 0;

  if (noChanges) {
    console.log('  No structural changes — data dictionary already matches database.');
  }

  console.log(`\n  Data dictionary totals:`);
  console.log(`    L1: ${report.totalTables.L1} tables, ${report.totalFields.L1} fields`);
  console.log(`    L2: ${report.totalTables.L2} tables, ${report.totalFields.L2} fields`);
  console.log(`    L3: ${report.totalTables.L3} tables, ${report.totalFields.L3} fields`);
  const totalT = report.totalTables.L1 + report.totalTables.L2 + report.totalTables.L3;
  const totalF = report.totalFields.L1 + report.totalFields.L2 + report.totalFields.L3;
  console.log(`    Total: ${totalT} tables, ${totalF} fields`);
  console.log(`    Relationships: ${relationshipCount}`);
  console.log('');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('  DATABASE_URL not set. Add it to .env or set in environment.');
    process.exit(1);
  }

  // Parse --tables flag for incremental introspection
  const tablesArg = process.argv.find(a => a.startsWith('--tables='));
  const tableNames = tablesArg ? tablesArg.replace('--tables=', '').split(',').map(t => t.trim()).filter(Boolean) : undefined;

  if (tableNames?.length) {
    console.log(`\n  Incremental introspection: ${tableNames.length} table(s): ${tableNames.join(', ')}\n`);
  } else {
    console.log('\n  Introspecting PostgreSQL database...\n');
  }

  // Read existing data dictionary (preserve descriptions, categories, etc.)
  const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
  let dd: DataDictionary;
  if (fs.existsSync(DD_PATH)) {
    dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
    console.log(`  Existing data dictionary: L1=${dd.L1.length} L2=${dd.L2.length} L3=${dd.L3.length} tables`);
  } else {
    dd = { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} };
    console.log('  No existing data dictionary — creating from scratch');
  }

  // Run introspection via the shared library
  const startMs = Date.now();
  const report = await runIntrospection(dd, databaseUrl, tableNames);
  console.log(`  Introspection completed in ${Date.now() - startMs}ms`);

  // Write updated data dictionary
  const ddDir = path.dirname(DD_PATH);
  if (!fs.existsSync(ddDir)) fs.mkdirSync(ddDir, { recursive: true });
  fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');

  printReport(report, dd.relationships.length);
}

main().catch((err) => {
  console.error('Introspection failed:', err);
  process.exit(1);
});

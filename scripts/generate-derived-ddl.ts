/**
 * Generate DDL for L3 dashboard derived tables from data dictionary.
 *
 * These tables (T78-T82) have 100-500+ fields each and are too large to
 * maintain by hand. This script reads their definitions from the data
 * dictionary and appends them to sql/l3/01_DDL_all_tables.sql.
 *
 * Run:  npx tsx scripts/generate-derived-ddl.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { readDataDictionary, type DataDictionaryTable } from '../lib/data-dictionary';
import { buildCreateTable } from '../lib/ddl-generator';

const L3_DDL_PATH = path.resolve(__dirname, '../sql/l3/01_DDL_all_tables.sql');

const DERIVED_TABLES = [
  'facility_derived',
  'counterparty_derived',
  'desk_derived',
  'portfolio_derived',
  'segment_derived',
];

function main() {
  const dd = readDataDictionary();
  if (!dd) {
    console.error('ERROR: data-dictionary.json not found.');
    process.exit(1);
  }

  // Check which derived tables already exist in DDL
  const existing = fs.readFileSync(L3_DDL_PATH, 'utf-8');
  const missing: DataDictionaryTable[] = [];

  for (const name of DERIVED_TABLES) {
    if (existing.includes(`"${name}"`)) {
      console.log(`  ${name}: already in DDL — skipping`);
      continue;
    }
    const table = dd.L3.find(t => t.name === name);
    if (!table) {
      console.error(`  ${name}: NOT FOUND in data dictionary — skipping`);
      continue;
    }
    missing.push(table);
  }

  if (missing.length === 0) {
    console.log('All derived tables already present in DDL. Nothing to do.');
    return;
  }

  // Generate DDL for missing tables
  const ddlBlocks: string[] = [];
  for (const table of missing) {
    // Ensure the surrogate key has a PK
    const skField = table.fields.find(f => f.name.endsWith('_sk'));
    if (skField && !skField.pk_fk?.is_pk) {
      // Force PK on the surrogate key
      if (!skField.pk_fk) (skField as Record<string, unknown>).pk_fk = {};
      (skField.pk_fk as Record<string, unknown>).is_pk = true;
    }

    const ddl = buildCreateTable(table, 'l3');
    ddlBlocks.push(`\n-- ${table.name} (Dashboard Derived)\n${ddl}`);
    console.log(`  ${table.name}: ${table.fields.length} fields — DDL generated`);
  }

  // Append to L3 DDL file
  fs.appendFileSync(L3_DDL_PATH, '\n' + ddlBlocks.join('\n') + '\n');
  console.log(`\nAppended ${missing.length} tables to ${L3_DDL_PATH}`);
}

main();

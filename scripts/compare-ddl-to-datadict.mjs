#!/usr/bin/env node
/**
 * Compare DDL tables/columns to facility-summary-mvp/output/data-dictionary/data-dictionary.json
 * for L1, L2, and L3. Reports any DDL columns or tables missing from the data dictionary
 * so the visualizer can show everything.
 *
 * DDL sources:
 *   L1: scripts/l1/output/ddl.sql
 *   L2: scripts/l2/output/ddl.sql
 *   L3: sql/l3/01_DDL_all_tables.sql
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DD_PATH = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');

function parseDdlFile(filePath, schemaPrefix) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  const re = new RegExp(
    `CREATE TABLE IF NOT EXISTS ${schemaPrefix}\\.(\\w+)\\s*\\(([\\s\\S]*?)\\)\\s*;`,
    'g'
  );
  let m;
  while ((m = re.exec(raw)) !== null) {
    const tableName = m[1];
    const body = m[2];
    const columns = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY KEY') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('FOREIGN KEY')) continue;
      const colMatch = line.match(/^\s+([a-z][a-z0-9_]*)\s+/);
      if (colMatch) columns.push(colMatch[1]);
    }
    tables[tableName] = columns;
  }
  return tables;
}

const dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf8'));

function ddTablesForLayer(layer) {
  const key = layer === 'L1' ? 'L1' : layer === 'L2' ? 'L2' : 'L3';
  const arr = dd[key] || [];
  const out = {};
  for (const t of arr) {
    out[t.name] = (t.fields || []).map((f) => f.name);
  }
  return out;
}

const configs = [
  { layer: 'L1', ddlPath: path.join(ROOT, 'scripts/l1/output/ddl.sql'), schema: 'l1' },
  { layer: 'L2', ddlPath: path.join(ROOT, 'scripts/l2/output/ddl.sql'), schema: 'l2' },
  { layer: 'L3', ddlPath: path.join(ROOT, 'sql/l3/01_DDL_all_tables.sql'), schema: 'l3' },
];

let exitCode = 0;
const allMissing = { L1: {}, L2: {}, L3: {} };
const tablesOnlyInDdl = { L1: [], L2: [], L3: [] };
const tablesOnlyInDd = { L1: [], L2: [], L3: [] };

for (const { layer, ddlPath, schema } of configs) {
  if (!fs.existsSync(ddlPath)) {
    console.warn(`Skip ${layer}: DDL not found at ${ddlPath}`);
    continue;
  }

  const ddlTables = parseDdlFile(ddlPath, schema);
  const ddTables = ddTablesForLayer(layer);
  const ddlTableNames = new Set(Object.keys(ddlTables));
  const ddTableNames = new Set(Object.keys(ddTables));

  for (const name of ddlTableNames) {
    if (!ddTableNames.has(name)) {
      tablesOnlyInDdl[layer].push(name);
      continue;
    }
    const ddlCols = ddlTables[name] || [];
    const ddFields = ddTables[name] || [];
    const missing = ddlCols.filter((c) => !ddFields.includes(c));
    if (missing.length > 0) {
      allMissing[layer][name] = missing;
      exitCode = 1;
    }
  }
  for (const name of ddTableNames) {
    if (!ddlTableNames.has(name)) tablesOnlyInDd[layer].push(name);
  }
}

// Report
function report() {
  let hasIssue = false;

  for (const layer of ['L1', 'L2', 'L3']) {
    const onlyDdl = tablesOnlyInDdl[layer].filter(Boolean).sort();
    const onlyDd = tablesOnlyInDd[layer].filter(Boolean).sort();
    const missing = allMissing[layer];
    const missingTableNames = Object.keys(missing).sort();

    if (onlyDdl.length > 0) {
      hasIssue = true;
      console.log(`[${layer}] Tables in DDL but not in data dictionary (${onlyDdl.length}):`);
      onlyDdl.forEach((t) => console.log(`  - ${t}`));
      console.log('');
    }
    if (onlyDd.length > 0) {
      console.log(`[${layer}] Tables in data dictionary but not in DDL (${onlyDd.length}):`);
      onlyDd.forEach((t) => console.log(`  - ${t}`));
      console.log('');
    }
    if (missingTableNames.length > 0) {
      hasIssue = true;
      console.log(`[${layer}] Missing columns (in DDL but not in data dictionary):`);
      for (const table of missingTableNames) {
        console.log(`  ${table}:`);
        missing[table].forEach((c) => console.log(`    - ${c}`));
      }
      console.log('');
    }
  }

  if (!hasIssue && exitCode === 0) {
    console.log('OK: All DDL tables and columns (L1, L2, L3) are present in the data dictionary.');
    console.log('The visualizer can show the full data model.');
  } else if (exitCode === 1) {
    const total = Object.values(allMissing).reduce(
      (sum, byTable) => sum + Object.values(byTable).reduce((s, cols) => s + cols.length, 0),
      0
    );
    console.log(`Total: ${total} missing column(s); ${Object.values(tablesOnlyInDdl).flat().length} table(s) only in DDL.`);
  }
}

report();
process.exit(exitCode);

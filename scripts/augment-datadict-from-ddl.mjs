#!/usr/bin/env node
/**
 * Augment facility-summary-mvp/output/data-dictionary/data-dictionary.json with any
 * tables/columns from L1, L2, L3 DDL that are missing. Preserves existing data.
 * Run after compare-ddl-to-datadict.mjs to fix gaps.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DD_PATH = path.join(ROOT, 'facility-summary-mvp/output/data-dictionary/data-dictionary.json');

function parseDdlWithTypes(filePath, schemaPrefix) {
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
      const colMatch = line.match(/^\s+([a-z][a-z0-9_]*)\s+([A-Za-z][A-Za-z0-9_]*(?:\([^)]*\))?)/);
      if (colMatch) {
        columns.push({ name: colMatch[1], dataType: colMatch[2].toUpperCase() });
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

const dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf8'));

const configs = [
  { layer: 'L1', ddlPath: path.join(ROOT, 'scripts/l1/output/ddl.sql'), schema: 'l1' },
  { layer: 'L2', ddlPath: path.join(ROOT, 'scripts/l2/output/ddl.sql'), schema: 'l2' },
  { layer: 'L3', ddlPath: path.join(ROOT, 'sql/l3/01_DDL_all_tables.sql'), schema: 'l3' },
];

for (const { layer, ddlPath, schema } of configs) {
  if (!fs.existsSync(ddlPath)) continue;
  const ddlTables = parseDdlWithTypes(ddlPath, schema);
  const arr = dd[layer] || [];
  const tableIndex = {};
  arr.forEach((t, i) => { tableIndex[t.name] = i; });

  for (const [tableName, ddlCols] of Object.entries(ddlTables)) {
    const idx = tableIndex[tableName];
    const category = idx !== undefined ? (arr[idx].category || 'Uncategorized') : 'Uncategorized';

    if (idx !== undefined) {
      const existing = arr[idx].fields || [];
      const existingNames = new Set(existing.map((f) => f.name));
      const ddlColNames = ddlCols.map((c) => c.name);
      const missing = ddlCols.filter((c) => !existingNames.has(c.name));
      if (missing.length === 0) continue;

      const newFields = [...existing];
      for (const ddlCol of missing) {
        const ddlIdx = ddlColNames.indexOf(ddlCol.name);
        let insertAfter = -1;
        for (let i = ddlIdx - 1; i >= 0; i--) {
          const prevName = ddlColNames[i];
          const pos = newFields.findIndex((f) => f.name === prevName);
          if (pos !== -1) {
            insertAfter = pos;
            break;
          }
        }
        const newField = {
          name: ddlCol.name,
          description: '',
          category: arr[idx].fields?.[0]?.category || category,
          data_type: ddlCol.dataType,
        };
        newFields.splice(insertAfter + 1, 0, newField);
      }
      arr[idx].fields = newFields;
    } else {
      const fields = ddlCols.map((c) => ({
        name: c.name,
        description: '',
        category,
        data_type: c.dataType,
      }));
      dd[layer].push({
        name: tableName,
        layer,
        category: 'Uncategorized',
        fields,
      });
      tableIndex[tableName] = dd[layer].length - 1;
    }
  }
}

fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf8');
console.log('Augmented data dictionary written to', DD_PATH);

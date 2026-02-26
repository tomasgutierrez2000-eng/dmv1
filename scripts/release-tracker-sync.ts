#!/usr/bin/env tsx
/**
 * release-tracker-sync.ts
 *
 * Compares current L1/L2/L3 table definitions against a stored snapshot.
 * If tables or fields were added/removed, appends entries to
 * lib/release-tracker-data.ts and updates the snapshot.
 *
 * Usage:
 *   npx tsx scripts/release-tracker-sync.ts          # normal run
 *   npx tsx scripts/release-tracker-sync.ts --init    # create initial snapshot (no diff)
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldInfo {
  name: string;
}

interface TableInfo {
  layer: 'L1' | 'L2' | 'L3';
  tableName: string;
  fields: FieldInfo[];
}

interface Snapshot {
  /** ISO date when snapshot was taken */
  createdAt: string;
  tables: TableInfo[];
}

interface Change {
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  changeType: 'Added' | 'Removed';
  rationale: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT, 'scripts', 'release-tracker-snapshot.json');
const DATA_PATH = path.join(ROOT, 'lib', 'release-tracker-data.ts');
const L1_DEFS = path.join(ROOT, 'scripts', 'l1', 'l1-definitions.ts');
const L2_DEFS = path.join(ROOT, 'scripts', 'l2', 'l2-definitions.ts');
const L3_DDL = path.join(ROOT, 'sql', 'l3', '01_DDL_all_tables.sql');

// ---------------------------------------------------------------------------
// Parsers — extract table+field lists from each layer
// ---------------------------------------------------------------------------

/** Parse L1/L2 TypeScript definitions by evaluating exported array shape. */
function parseTsDefinitions(filePath: string, layer: 'L1' | 'L2'): TableInfo[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const tables: TableInfo[] = [];

  // Match each object literal with tableName and columns
  const tableRegex = /\{\s*tableName:\s*'([^']+)'[\s\S]*?columns:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(src)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];

    const fields: FieldInfo[] = [];
    const fieldRegex = /name:\s*'([^']+)'/g;
    let fm: RegExpExecArray | null;
    while ((fm = fieldRegex.exec(columnsBlock)) !== null) {
      fields.push({ name: fm[1] });
    }

    tables.push({ layer, tableName, fields });
  }

  return tables;
}

/** Parse L3 SQL DDL — extract CREATE TABLE statements and column names. */
function parseL3Ddl(filePath: string): TableInfo[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const tables: TableInfo[] = [];

  // Match: CREATE TABLE IF NOT EXISTS l3.table_name ( ... );
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?l3\.(\w+)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(src)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const fields: FieldInfo[] = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip constraints, comments, empty lines
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY KEY') ||
          trimmed.startsWith('FOREIGN KEY') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK')) {
        continue;
      }
      // Column: first word is the column name
      const colMatch = trimmed.match(/^(\w+)\s+/);
      if (colMatch) {
        fields.push({ name: colMatch[1] });
      }
    }

    tables.push({ layer: 'L3', tableName, fields });
  }

  return tables;
}

/** Read all current definitions. */
function getCurrentState(): TableInfo[] {
  const l1 = parseTsDefinitions(L1_DEFS, 'L1');
  const l2 = parseTsDefinitions(L2_DEFS, 'L2');
  const l3 = parseL3Ddl(L3_DDL);
  return [...l1, ...l2, ...l3];
}

// ---------------------------------------------------------------------------
// Diff engine
// ---------------------------------------------------------------------------

function buildIndex(tables: TableInfo[]): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const t of tables) {
    const key = `${t.layer}.${t.tableName}`;
    idx.set(key, new Set(t.fields.map((f) => f.name)));
  }
  return idx;
}

function diff(prev: TableInfo[], curr: TableInfo[]): Change[] {
  const prevIdx = buildIndex(prev);
  const currIdx = buildIndex(curr);
  const changes: Change[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Find added tables and fields
  for (const [key, currFields] of currIdx) {
    const [layer, tableName] = key.split('.') as ['L1' | 'L2' | 'L3', string];
    const prevFields = prevIdx.get(key);

    if (!prevFields) {
      // Entire table is new
      changes.push({
        layer, table: tableName, field: '(new table)', changeType: 'Added',
        rationale: `New ${layer} table added`,
      });
      for (const f of currFields) {
        changes.push({
          layer, table: tableName, field: f, changeType: 'Added',
          rationale: `Field added to new ${layer}.${tableName}`,
        });
      }
    } else {
      // Check for new fields
      for (const f of currFields) {
        if (!prevFields.has(f)) {
          changes.push({
            layer, table: tableName, field: f, changeType: 'Added',
            rationale: `Field added to ${layer}.${tableName}`,
          });
        }
      }
    }
  }

  // Find removed tables and fields
  for (const [key, prevFields] of prevIdx) {
    const [layer, tableName] = key.split('.') as ['L1' | 'L2' | 'L3', string];
    const currFields = currIdx.get(key);

    if (!currFields) {
      // Entire table removed
      changes.push({
        layer, table: tableName, field: '(entire table)', changeType: 'Removed',
        rationale: `${layer} table removed`,
      });
    } else {
      // Check for removed fields
      for (const f of prevFields) {
        if (!currFields.has(f)) {
          changes.push({
            layer, table: tableName, field: f, changeType: 'Removed',
            rationale: `Field removed from ${layer}.${tableName}`,
          });
        }
      }
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Writer — append entries to release-tracker-data.ts
// ---------------------------------------------------------------------------

function appendEntries(changes: Change[]): void {
  const src = fs.readFileSync(DATA_PATH, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);

  // Build new entry lines
  const lines = changes.map((c) => {
    const rationale = c.rationale.replace(/'/g, "\\'");
    return `  { date: '${today}', layer: '${c.layer}', table: '${c.table}', field: '${c.field}', changeType: '${c.changeType}', rationale: '${rationale}' },`;
  });

  const block = `  // ── ${today}: Auto-detected changes ─────────────────────────\n${lines.join('\n')}`;

  // Insert after the opening of the array (after the first line containing `= [`)
  const insertMarker = 'export const RELEASE_ENTRIES: ReleaseEntry[] = [';
  const idx = src.indexOf(insertMarker);
  if (idx === -1) {
    console.error('Could not find RELEASE_ENTRIES array in', DATA_PATH);
    process.exit(1);
  }

  const insertPos = idx + insertMarker.length;
  const updated = src.slice(0, insertPos) + '\n' + block + '\n' + src.slice(insertPos);

  fs.writeFileSync(DATA_PATH, updated, 'utf-8');
}

// ---------------------------------------------------------------------------
// Snapshot I/O
// ---------------------------------------------------------------------------

function loadSnapshot(): Snapshot | null {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
}

function saveSnapshot(tables: TableInfo[]): void {
  const snap: Snapshot = {
    createdAt: new Date().toISOString(),
    tables,
  };
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const isInit = process.argv.includes('--init');
  const current = getCurrentState();

  if (isInit) {
    saveSnapshot(current);
    const tableCount = current.length;
    const fieldCount = current.reduce((n, t) => n + t.fields.length, 0);
    console.log(`Baseline snapshot saved: ${tableCount} tables, ${fieldCount} fields`);
    return;
  }

  const prev = loadSnapshot();
  if (!prev) {
    console.log('No snapshot found. Run with --init to create baseline.');
    console.log('  npx tsx scripts/release-tracker-sync.ts --init');
    process.exit(1);
  }

  const changes = diff(prev.tables, current);

  if (changes.length === 0) {
    console.log('No data model changes detected.');
    return;
  }

  console.log(`Detected ${changes.length} change(s):`);
  for (const c of changes) {
    const icon = c.changeType === 'Added' ? '+' : '-';
    console.log(`  ${icon} ${c.layer}.${c.table}.${c.field}`);
  }

  appendEntries(changes);
  saveSnapshot(current);

  console.log(`\nAppended ${changes.length} entries to lib/release-tracker-data.ts`);
  console.log('Snapshot updated.');
}

main();

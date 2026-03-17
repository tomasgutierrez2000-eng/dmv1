import { NextResponse } from 'next/server';
import { jsonError, normalizeCaughtError } from '@/lib/api-response';
import { readDataDictionary, type DataDictionary } from '@/lib/data-dictionary';
import { generateLayerDdl } from '@/lib/ddl-generator';
import { tableKeyToDbTable } from '@/lib/db-table-mapping';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';

const L1_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');
const L2_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l2/output/sample-data.json');

type SampleDataEntry = { columns: string[]; rows: unknown[][] };
type SampleDataFile = Record<string, SampleDataEntry>;

/** Escape a value for use in SQL INSERT VALUES. */
function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 10)}'`;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

/** Read and parse a sample data JSON file. Returns empty object if not found. */
function readSampleData(filePath: string): SampleDataFile {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SampleDataFile;
  } catch {
    return {};
  }
}

/**
 * Topological sort of table keys by FK dependencies (Kahn's algorithm).
 * Parents (referenced tables) come before children (referencing tables).
 *
 * Note: Sample data keys use the file's layer prefix (e.g. "L1.counterparty")
 * which may differ from the DD's canonical layer (e.g. counterparty is L2 in DD).
 * We match relationships by table name alone, checking all keys.
 */
function topoSortTableKeys(tableKeys: string[], dd: DataDictionary): string[] {
  // Map: bare table name → sample data key (e.g. "counterparty" → "L1.counterparty")
  const nameToKey = new Map<string, string>();
  for (const k of tableKeys) {
    const name = k.split('.').slice(1).join('.');
    nameToKey.set(name, k);
  }

  // Build adjacency: child key → Set<parent key>
  const deps = new Map<string, Set<string>>();
  for (const k of tableKeys) deps.set(k, new Set());

  for (const rel of dd.relationships) {
    const childKey = nameToKey.get(rel.from_table);
    const parentKey = nameToKey.get(rel.to_table);
    if (childKey && parentKey && childKey !== parentKey) {
      deps.get(childKey)!.add(parentKey);
    }
  }

  // Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const k of tableKeys) inDegree.set(k, deps.get(k)!.size);

  const reverseAdj = new Map<string, Set<string>>();
  for (const k of tableKeys) {
    for (const parent of deps.get(k)!) {
      if (!reverseAdj.has(parent)) reverseAdj.set(parent, new Set());
      reverseAdj.get(parent)!.add(k);
    }
  }

  // Start with tables that have no dependencies
  const queue: string[] = [];
  for (const [k, deg] of inDegree) {
    if (deg === 0) queue.push(k);
  }
  queue.sort(); // Alphabetical within same topo level for determinism

  const result: string[] = [];
  let head = 0;
  while (head < queue.length) {
    const k = queue[head++];
    result.push(k);
    for (const child of reverseAdj.get(k) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // Append any remaining tables (cycles — shouldn't happen but safety net)
  for (const k of tableKeys) {
    if (!result.includes(k)) result.push(k);
  }

  return result;
}

/** Generate INSERT statements for all tables in a sample data file for a given layer prefix. */
function generateDataSql(
  sampleData: SampleDataFile,
  layerPrefix: string,
  layerLabel: string,
  dd: DataDictionary,
): string {
  const lines: string[] = [
    `-- ${layerLabel} Sample Data`,
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ];

  const tableKeys = topoSortTableKeys(
    Object.keys(sampleData).filter((k) => k.startsWith(`${layerPrefix}.`)),
    dd,
  );

  if (tableKeys.length === 0) {
    lines.push(`-- No sample data available for ${layerLabel}`);
    return lines.join('\n');
  }

  let totalRows = 0;
  for (const tableKey of tableKeys) {
    const entry = sampleData[tableKey];
    if (!entry?.columns || !entry?.rows || entry.rows.length === 0) continue;

    const dbTable = tableKeyToDbTable(tableKey);
    if (!dbTable) continue;

    lines.push(`-- Table: ${dbTable} (${entry.rows.length} rows)`);
    for (const row of entry.rows) {
      const values = row.map((val) => escapeSql(val));
      lines.push(
        `INSERT INTO ${dbTable} (${entry.columns.join(', ')}) VALUES (${values.join(', ')});`,
      );
    }
    lines.push('');
    totalRows += entry.rows.length;
  }

  lines.push(`-- Total: ${tableKeys.length} tables, ${totalRows} rows`);
  return lines.join('\n');
}

/**
 * GET /api/sample-data/export-package
 *
 * Downloads a ZIP file containing DDL + sample data + README + load script,
 * ready to load into a fresh GCP Cloud SQL PostgreSQL instance.
 */
export async function GET() {
  try {
    // --- DDL from data dictionary ---
    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not found. Run npm run db:introspect first.', {
        status: 500,
      });
    }

    const l1Ddl = generateLayerDdl(dd, 'L1');
    const l2Ddl = generateLayerDdl(dd, 'L2');
    const l3Ddl = generateLayerDdl(dd, 'L3');

    const l1Count = dd.L1.filter((t) => t.fields.length > 0).length;
    const l2Count = dd.L2.filter((t) => t.fields.length > 0).length;
    const l3Count = dd.L3.filter((t) => t.fields.length > 0).length;

    // --- Sample data from JSON files (L1 + L2 only; L3 is derived/calculated) ---
    const l1SampleData = readSampleData(L1_SAMPLE_DATA_PATH);
    const l2SampleData = readSampleData(L2_SAMPLE_DATA_PATH);

    const l1DataSql = generateDataSql(l1SampleData, 'L1', 'L1 Reference Data', dd);
    const l2DataSql = generateDataSql(l2SampleData, 'L2', 'L2 Atomic Data', dd);

    const l1DataTables = Object.keys(l1SampleData).filter((k) => k.startsWith('L1.')).length;
    const l2DataTables = Object.keys(l2SampleData).filter((k) => k.startsWith('L2.')).length;

    // --- Load script ---
    const loadScript = [
      '#!/bin/bash',
      '# Load Credit Data Warehouse into GCP Cloud SQL PostgreSQL',
      '#',
      '# Usage:',
      '#   ./load-all.sh <database_name>',
      '#   ./load-all.sh postgres',
      '#   ./load-all.sh -h <host> -p <port> -U <user> <database_name>',
      '#',
      '# Or with Cloud SQL Proxy:',
      '#   ./load-all.sh -h 127.0.0.1 -p 5432 -U postgres postgres',
      '',
      'set -euo pipefail',
      '',
      'if [ $# -eq 0 ]; then',
      '  echo "Usage: ./load-all.sh [psql_options] <database_name>"',
      '  echo "Example: ./load-all.sh postgres"',
      '  echo "Example: ./load-all.sh -h 127.0.0.1 -p 5432 -U postgres postgres"',
      '  exit 1',
      'fi',
      '',
      'DIR="$(cd "$(dirname "$0")" && pwd)"',
      '',
      'echo "=== Loading Credit Data Warehouse ==="',
      'echo ""',
      '',
      'echo "[1/5] Creating L1 schema and tables..."',
      'psql "$@" -f "$DIR/01-l1-ddl.sql"',
      '',
      'echo "[2/5] Creating L2 schema and tables..."',
      'psql "$@" -f "$DIR/02-l2-ddl.sql"',
      '',
      'echo "[3/5] Creating L3 schema and tables..."',
      'psql "$@" -f "$DIR/03-l3-ddl.sql"',
      '',
      'echo "[4/5] Loading L1 reference data..."',
      'psql "$@" -f "$DIR/04-l1-data.sql"',
      '',
      'echo "[5/5] Loading L2 atomic data..."',
      'psql "$@" -f "$DIR/05-l2-data.sql"',
      '',
      'echo ""',
      'echo "=== Load complete ==="',
      'echo "Note: L3 tables are created empty — populate them by running your calculation engine."',
      '',
    ].join('\n');

    // --- README ---
    const timestamp = new Date().toISOString();
    const readme = [
      '# Credit Data Warehouse — Database Package',
      '',
      `Exported: ${timestamp}`,
      '',
      '## Contents',
      '',
      '| File | Description |',
      '|------|-------------|',
      `| 01-l1-ddl.sql | L1 Reference Data schema (${l1Count} tables) |`,
      `| 02-l2-ddl.sql | L2 Atomic Data schema (${l2Count} tables) |`,
      `| 03-l3-ddl.sql | L3 Derived Data schema (${l3Count} tables) — tables only, no data |`,
      `| 04-l1-data.sql | L1 sample data (${l1DataTables} tables) |`,
      `| 05-l2-data.sql | L2 sample data (${l2DataTables} tables) |`,
      '| load-all.sh | Shell script to load everything in order |',
      '',
      '## Quick Start',
      '',
      '### Option 1: Shell script (recommended)',
      '',
      '```bash',
      '# Make the script executable',
      'chmod +x load-all.sh',
      '',
      '# Load into a local PostgreSQL database',
      './load-all.sh postgres',
      '',
      '# Load with explicit connection parameters',
      './load-all.sh -h 127.0.0.1 -p 5432 -U postgres mydb',
      '',
      '# Load via Cloud SQL Proxy',
      './load-all.sh -h 127.0.0.1 -p 5432 -U postgres postgres',
      '```',
      '',
      '### Option 2: Manual loading',
      '',
      'Load files in numbered order using psql:',
      '',
      '```bash',
      'psql -d mydb -f 01-l1-ddl.sql',
      'psql -d mydb -f 02-l2-ddl.sql',
      'psql -d mydb -f 03-l3-ddl.sql',
      'psql -d mydb -f 04-l1-data.sql',
      'psql -d mydb -f 05-l2-data.sql',
      '```',
      '',
      '### Option 3: GCP Cloud SQL Studio',
      '',
      '1. Open Cloud SQL Studio in the GCP Console',
      '2. Connect to your PostgreSQL instance',
      '3. Run each file in numbered order (01 through 05)',
      '4. For large files, use the Cloud Shell with psql instead',
      '',
      '## Load Order (Important!)',
      '',
      'Files **must** be loaded in numbered order:',
      '',
      '1. **DDL first** (01-03): Creates schemas, tables, and foreign key constraints',
      '2. **Data second** (04-05): Inserts sample data respecting FK dependencies',
      '   - L1 (reference/dims) before L2 (snapshots/events)',
      '   - L3 tables are created empty — populate via the calculation engine',
      '',
      '## Architecture',
      '',
      '- **L1 — Reference Data**: Dimensions, master tables, lookups, hierarchies',
      '- **L2 — Atomic Data**: Raw source-system snapshots and events',
      '- **L3 — Derived Data**: Calculated metrics, aggregations, computed results',
      '',
      'Data flows: L1 -> L2 -> L3. Foreign keys enforce referential integrity.',
      '',
      '## Prerequisites',
      '',
      '- PostgreSQL 14+ (tested with GCP Cloud SQL PostgreSQL 14/15)',
      '- `psql` command-line client',
      '- Database must exist before loading (the scripts create schemas within it)',
      '',
      '## Troubleshooting',
      '',
      '- **"relation already exists"**: Tables use `CREATE TABLE IF NOT EXISTS` so re-running is safe',
      '- **FK constraint errors**: Ensure you load files in numbered order',
      '- **Permission errors**: Ensure your user has CREATE privileges on the target database',
      '',
    ].join('\n');

    // --- Build ZIP ---
    const zip = new JSZip();
    const folder = zip.folder('credit-data-warehouse')!;
    folder.file('README.md', readme);
    folder.file('01-l1-ddl.sql', l1Ddl);
    folder.file('02-l2-ddl.sql', l2Ddl);
    folder.file('03-l3-ddl.sql', l3Ddl);
    folder.file('04-l1-data.sql', l1DataSql);
    folder.file('05-l2-data.sql', l2DataSql);
    folder.file('load-all.sh', loadScript, {
      unixPermissions: '755',
    });

    const zipUint8 = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      platform: 'UNIX',
    });
    const zipBuffer = Buffer.from(zipUint8);

    const filename = `credit-data-warehouse-${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error('Export package error:', err);
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, {
      status: normalized.status,
      details: normalized.details,
      code: normalized.code,
    });
  }
}

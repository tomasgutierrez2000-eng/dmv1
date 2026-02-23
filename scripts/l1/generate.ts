/**
 * Generates PostgreSQL DDL and seed SQL for all L1 tables from definitions.
 *
 * Run:   npx tsx scripts/l1/generate.ts            (default 10 rows)
 *        npx tsx scripts/l1/generate.ts --rows=100  (scale to 100 rows)
 *        SEED_ROWS=50 npx tsx scripts/l1/generate.ts
 *
 * Outputs: scripts/l1/output/ddl.sql, seed.sql, sample-data.json,
 *          relationships.json, table-metadata.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { TableDef, SCDType, type ColumnDef } from './types';
import { L1_TABLES } from './l1-definitions';
import { getSeedValue, getTableRowCount } from './seed-data';

const OUT_DIR = path.join(__dirname, 'output');
const SEED_AS_OF_DATE = '2025-01-31';

/* ───────── CLI / env row-count configuration ───────── */

function parseRequestedRows(): number {
  // --rows=N  CLI argument
  const cliArg = process.argv.find(a => a.startsWith('--rows='));
  if (cliArg) {
    const n = parseInt(cliArg.split('=')[1], 10);
    if (n > 0) return n;
  }
  // SEED_ROWS env var
  const envVal = process.env.SEED_ROWS;
  if (envVal) {
    const n = parseInt(envVal, 10);
    if (n > 0) return n;
  }
  return 10; // default
}

const REQUESTED_ROWS = parseRequestedRows();

/** Determine how many rows to generate for a given table. */
function rowsForTable(t: TableDef): number {
  // If the table definition has an explicit maxRows cap, honour it
  if (t.maxRows !== undefined) return Math.min(REQUESTED_ROWS, t.maxRows);
  // Delegate to seed-data logic which knows table categories
  return getTableRowCount(t.tableName, REQUESTED_ROWS);
}

/* ───────── Deterministic PRNG (mulberry32) ───────── */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a seeded random float in [min, max) */
function seededRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Create a seeded random int in [min, max] */
function seededInt(rng: () => number, min: number, max: number): number {
  return Math.floor(seededRange(rng, min, max + 1));
}

/** Pick a random element from an array */
function seededPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ───────── DDL generation (unchanged) ───────── */

function scdColumns(scd: SCDType): string[] {
  switch (scd) {
    case 'SCD-0':
      return [];
    case 'SCD-1':
      return [
        'created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'updated_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      ];
    case 'SCD-2':
      return [
        'effective_start_date DATE NOT NULL',
        'effective_end_date DATE',
        'is_current_flag CHAR(1) DEFAULT \'Y\'',
        'created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      ];
    case 'Snapshot':
      return ['as_of_date DATE NOT NULL'];
    default:
      return [];
  }
}

function columnToDDL(col: { name: string; type: string; nullable?: boolean; default?: string; check?: string; pk?: boolean; fk?: string }): string {
  const parts: string[] = [];
  parts.push(col.name);
  parts.push(col.type);
  if (col.nullable === false) parts.push('NOT NULL');
  if (col.default) parts.push(`DEFAULT ${col.default}`);
  if (col.check) parts.push(`CHECK (${col.check})`);
  return parts.join(' ');
}

function buildCreateTable(t: TableDef): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE IF NOT EXISTS l1.${t.tableName} (`);
  const allCols = [...t.columns];
  const pkCols = allCols.filter(c => c.pk).map(c => c.name);
  const hasCompositePk = pkCols.length > 1;
  const scd = scdColumns(t.scd);

  const colLines = allCols.map(c => {
    let line = '  ' + columnToDDL(c);
    if (c.pk && !hasCompositePk) line += ' PRIMARY KEY';
    return line;
  });
  scd.forEach(s => colLines.push('  ' + s));

  if (hasCompositePk) {
    colLines.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
  }
  lines.push(colLines.join(',\n'));

  const fkRefs = t.columns.filter(c => c.fk).map(c => {
    const match = c.fk!.match(/l1\.(\w+)\((\w+)\)/);
    if (!match) return null;
    const [, refTable, refCol] = match;
    return `  CONSTRAINT fk_${t.tableName}_${c.name} FOREIGN KEY (${c.name}) REFERENCES l1.${refTable}(${refCol})`;
  }).filter(Boolean) as string[];
  if (fkRefs.length) {
    lines.push(',');
    lines.push(fkRefs.join(',\n'));
  }

  lines.push(');');
  return lines.join('\n');
}

/* ───────── Seed value generation ───────── */

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 10)}'`;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

/**
 * For rows 0-9, getSeedValue returns handcrafted GSIB-quality data.
 * For rows 10+, we generate synthetic variations using a seeded PRNG,
 * wrapping around the handcrafted values with deterministic variation.
 */
function seedValue(col: ColumnDef, rowIndex: number, tableName: string, tableRowCount: number): unknown {
  const i = rowIndex + 1; // 1-based

  // First, try the handcrafted seed data (works for any rowIndex via idx % N)
  const realistic = getSeedValue(tableName, col.name, rowIndex);
  if (realistic !== null) return realistic;

  // For rows beyond the handcrafted data, use seeded PRNG variation
  if (rowIndex >= 10) {
    const rng = mulberry32(hashStr(`${tableName}.${col.name}.${rowIndex}`));

    // PK columns — must be unique
    if (col.pk) {
      if (col.type.includes('INT') || col.type.includes('BIGINT') || col.type === 'SERIAL') return i;
      if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') return `${tableName}_${i}`;
    }

    // FK columns — must reference valid parent rows; parent tables have their own row counts
    if (col.fk) {
      const fkMatch = col.fk.match(/l1\.(\w+)\((\w+)\)/);
      if (fkMatch) {
        const [, refTable] = fkMatch;
        const refTableDef = L1_TABLES.find(t => t.tableName === refTable);
        const refRowCount = refTableDef ? rowsForTable(refTableDef) : 10;
        if (col.type.includes('INT') || col.type.includes('BIGINT') || col.type === 'SERIAL') {
          return seededInt(rng, 1, refRowCount);
        }
      }
      if (col.type.includes('INT') || col.type.includes('BIGINT') || col.type === 'SERIAL') return seededInt(rng, 1, 10);
    }

    // Type-based synthetic generation
    if (col.type.includes('CHAR(1)')) return rng() > 0.15 ? 'Y' : 'N'; // 85% active
    if (col.type === 'DATE' || col.type.includes('DATE')) {
      const baseDate = new Date('2024-01-01');
      baseDate.setDate(baseDate.getDate() + seededInt(rng, 0, 365));
      return baseDate.toISOString().slice(0, 10);
    }
    if (col.type === 'TIMESTAMP') {
      const baseDate = new Date('2024-01-01T08:00:00');
      baseDate.setMinutes(baseDate.getMinutes() + seededInt(rng, 0, 525600));
      return baseDate.toISOString().replace('T', ' ').slice(0, 19);
    }
    if (col.type.includes('DECIMAL') || col.type.includes('NUMERIC')) {
      return Math.round(seededRange(rng, 0.01, 999.99) * 100) / 100;
    }
    if (col.type === 'INTEGER' || col.type === 'BIGINT') return seededInt(rng, 1, 1000);
    if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') {
      return `${col.name}_${i}`;
    }
    return null;
  }

  // Default fallbacks for handcrafted rows (should rarely hit if seed-data.ts is complete)
  if (col.default && col.default.includes('CURRENT_TIMESTAMP')) return new Date('2024-06-15');
  if (col.name === 'as_of_date') return SEED_AS_OF_DATE;
  if (col.pk || col.fk) {
    if (col.type.includes('INT') || col.type.includes('BIGINT') || col.type === 'SERIAL') return i;
    if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') return `${tableName}_${i}`;
  }
  if (col.type.includes('CHAR(1)')) return ['Y', 'N'][rowIndex % 2];
  if (col.type === 'DATE' || col.type.includes('DATE')) return '2024-06-15';
  if (col.type === 'TIMESTAMP') return '2024-06-15 12:00:00';
  if (col.type.includes('DECIMAL') || col.type.includes('NUMERIC')) return 100.5;
  if (col.type === 'INTEGER' || col.type === 'BIGINT') return i;
  if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') return `${col.name}_${i}`;
  return null;
}

/** Simple string hash for deterministic PRNG seeding */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/* ───────── INSERT generation ───────── */

function buildInserts(t: TableDef): { sql: string; rows: Record<string, unknown>[]; columns: string[] } {
  const rows: Record<string, unknown>[] = [];
  const cols = t.columns.map(c => c.name);
  const existingCols = new Set(cols);
  const scd = t.scd;

  // SCD columns to append — only add if not already in the table definition
  const scd2Cols = ['effective_start_date', 'effective_end_date', 'is_current_flag', 'created_ts'];
  const scd1Cols = ['created_ts', 'updated_ts'];

  const scdColsToAdd: string[] = [];
  if (scd === 'SCD-2') {
    for (const c of scd2Cols) { if (!existingCols.has(c)) { cols.push(c); scdColsToAdd.push(c); } }
  }
  if (scd === 'SCD-1') {
    for (const c of scd1Cols) { if (!existingCols.has(c)) { cols.push(c); scdColsToAdd.push(c); } }
  }
  if (scd === 'Snapshot' && !existingCols.has('as_of_date')) { cols.push('as_of_date'); scdColsToAdd.push('as_of_date'); }

  const scd2Defaults: Record<string, unknown> = { effective_start_date: '2024-01-01', effective_end_date: null, is_current_flag: 'Y', created_ts: '2024-06-15 12:00:00' };
  const scd1Defaults: Record<string, unknown> = { created_ts: '2024-06-15 12:00:00', updated_ts: '2024-06-15 12:00:00' };

  const tableRowCount = rowsForTable(t);
  const lines: string[] = [];
  for (let r = 0; r < tableRowCount; r++) {
    const values: unknown[] = [];
    t.columns.forEach(c => values.push(seedValue(c, r, t.tableName, tableRowCount)));
    // Append only the SCD columns that were actually added (not already in table def)
    for (const c of scdColsToAdd) {
      if (scd === 'SCD-2') values.push(scd2Defaults[c]);
      else if (scd === 'SCD-1') values.push(scd1Defaults[c]);
      else if (c === 'as_of_date') values.push(SEED_AS_OF_DATE);
    }
    const rowObj: Record<string, unknown> = {};
    cols.forEach((name, idx) => { rowObj[name] = values[idx]; });
    rows.push(rowObj);
    lines.push(`INSERT INTO l1.${t.tableName} (${cols.join(', ')}) VALUES (${values.map(escapeSql).join(', ')});`);
  }
  return { sql: lines.join('\n'), rows, columns: cols };
}

/* ───────── Relationships & metadata (unchanged) ───────── */

/** Build relationships for visualizer from L1 table definitions (FK columns). */
function buildRelationships(): Array<{
  id: string;
  source: { layer: string; table: string; field: string; tableKey: string };
  target: { layer: string; table: string; field: string; tableKey: string };
  isCrossLayer: boolean;
  relationshipType: 'primary' | 'secondary';
}> {
  const relationships: Array<{
    id: string;
    source: { layer: string; table: string; field: string; tableKey: string };
    target: { layer: string; table: string; field: string; tableKey: string };
    isCrossLayer: boolean;
    relationshipType: 'primary' | 'secondary';
  }> = [];
  for (const t of L1_TABLES) {
    const sourceTableKey = `L1.${t.tableName}`;
    for (const col of t.columns) {
      if (!col.fk) continue;
      const match = col.fk.match(/l1\.(\w+)\((\w+)\)/);
      if (!match) continue;
      const [, refTable, refCol] = match;
      const targetTableKey = `L1.${refTable}`;
      const id = `L1.${t.tableName}.${col.name}->L1.${refTable}.${refCol}`;
      relationships.push({
        id,
        source: {
          layer: 'L1',
          table: t.tableName,
          field: col.name,
          tableKey: sourceTableKey,
        },
        target: {
          layer: 'L1',
          table: refTable,
          field: refCol,
          tableKey: targetTableKey,
        },
        isCrossLayer: false,
        relationshipType: 'primary',
      });
    }
  }
  return relationships;
}

/** Build per-table, per-column metadata (types, PKs, FKs) for the API to use. */
function buildTableMetadata(): Record<string, Record<string, { type: string; pk: boolean; fk: string | null; nullable: boolean }>> {
  const metadata: Record<string, Record<string, { type: string; pk: boolean; fk: string | null; nullable: boolean }>> = {};
  for (const t of L1_TABLES) {
    const tableKey = `L1.${t.tableName}`;
    const cols: Record<string, { type: string; pk: boolean; fk: string | null; nullable: boolean }> = {};
    for (const col of t.columns) {
      cols[col.name] = {
        type: col.type,
        pk: !!col.pk,
        fk: col.fk || null,
        nullable: col.nullable !== false,
      };
    }
    metadata[tableKey] = cols;
  }
  return metadata;
}

/* ───────── Main ───────── */

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const ddlParts: string[] = [
    '-- L1 Schema DDL (generated from scripts/l1/generate.ts)',
    '-- Run in dependency order. PostgreSQL 15+.',
    '',
    'CREATE SCHEMA IF NOT EXISTS l1;',
    '',
  ];
  const seedParts: string[] = [
    `-- L1 Seed Data (generated, requested=${REQUESTED_ROWS} rows)`,
    '-- Run after DDL. Referentially consistent.',
    '',
  ];
  const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = {};
  let totalRows = 0;

  for (const t of L1_TABLES) {
    ddlParts.push(buildCreateTable(t));
    ddlParts.push('');
    const { sql, rows, columns } = buildInserts(t);
    const tableRows = rowsForTable(t);
    totalRows += tableRows;
    seedParts.push(`-- ${t.tableName} (${tableRows} rows)`);
    seedParts.push(sql);
    seedParts.push('');
    const tableKey = `L1.${t.tableName}`;
    sampleData[tableKey] = {
      columns,
      rows: rows.map(r => columns.map(c => r[c])),
    };
  }

  const relationships = buildRelationships();
  const tableMetadata = buildTableMetadata();

  fs.writeFileSync(path.join(OUT_DIR, 'ddl.sql'), ddlParts.join('\n'), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'seed.sql'), seedParts.join('\n'), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'sample-data.json'), JSON.stringify(sampleData, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'relationships.json'), JSON.stringify(relationships, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'table-metadata.json'), JSON.stringify(tableMetadata, null, 2), 'utf-8');

  console.log(`Generated: ${OUT_DIR}/ddl.sql, seed.sql, sample-data.json, relationships.json, table-metadata.json`);
  console.log(`Tables: ${L1_TABLES.length}, Relationships: ${relationships.length}, Total rows: ${totalRows}`);
  console.log(`Requested: ${REQUESTED_ROWS} rows per scalable table (dimensions capped at natural size)`);
}

main();

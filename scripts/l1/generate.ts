/**
 * Generates PostgreSQL DDL and seed SQL for all L1 tables from definitions.
 * Run: npx tsx scripts/l1/generate.ts
 * Outputs: scripts/l1/output/ddl.sql, scripts/l1/output/seed.sql, scripts/l1/output/sample-data.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { TableDef, SCDType, type ColumnDef } from './types';
import { L1_TABLES } from './l1-definitions';
import { getSeedValue } from './seed-data';

const OUT_DIR = path.join(__dirname, 'output');
const ROWS_PER_TABLE = 10;
const SEED_AS_OF_DATE = '2025-01-31';

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

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 10)}'`;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function seedValue(col: ColumnDef, rowIndex: number, tableName: string): unknown {
  const i = rowIndex + 1; // 1-based
  const realistic = getSeedValue(tableName, col.name, rowIndex);
  if (realistic !== null) return realistic;

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

function buildInserts(t: TableDef): { sql: string; rows: Record<string, unknown>[]; columns: string[] } {
  const rows: Record<string, unknown>[] = [];
  const cols = t.columns.map(c => c.name);
  const scd = t.scd;
  if (scd === 'SCD-2') cols.push('effective_start_date', 'effective_end_date', 'is_current_flag', 'created_ts');
  if (scd === 'SCD-1') cols.push('created_ts', 'updated_ts');
  if (scd === 'Snapshot' && !cols.includes('as_of_date')) cols.push('as_of_date');

  const lines: string[] = [];
  for (let r = 0; r < ROWS_PER_TABLE; r++) {
    const values: unknown[] = [];
    t.columns.forEach(c => values.push(seedValue(c, r, t.tableName)));
    if (scd === 'SCD-2') {
      values.push('2024-01-01', null, 'Y', '2024-06-15 12:00:00');
    }
    if (scd === 'SCD-1') {
      values.push('2024-06-15 12:00:00', '2024-06-15 12:00:00');
    }
    if (scd === 'Snapshot' && !t.columns.some(c => c.name === 'as_of_date')) {
      values.push(SEED_AS_OF_DATE);
    }
    const rowObj: Record<string, unknown> = {};
    cols.forEach((name, idx) => { rowObj[name] = values[idx]; });
    rows.push(rowObj);
    lines.push(`INSERT INTO l1.${t.tableName} (${cols.join(', ')}) VALUES (${values.map(escapeSql).join(', ')});`);
  }
  return { sql: lines.join('\n'), rows, columns: cols };
}

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
    '-- L1 Seed Data: 10 rows per table (generated)',
    '-- Run after DDL. Referentially consistent.',
    '',
  ];
  const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = {};

  for (const t of L1_TABLES) {
    ddlParts.push(buildCreateTable(t));
    ddlParts.push('');
    const { sql, rows, columns } = buildInserts(t);
    seedParts.push(`-- ${t.tableName}`);
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
  console.log(`Tables: ${L1_TABLES.length}, Relationships: ${relationships.length}`);
}

main();

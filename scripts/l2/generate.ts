/**
 * Generates L2 sample-data.json and relationships.json for the demo model.
 * Run: npx tsx scripts/l2/generate.ts
 * Outputs: scripts/l2/output/sample-data.json, scripts/l2/output/relationships.json
 * L2 data aligns to L1 IDs (facility_id, counterparty_id, etc. 1..10).
 */
import * as fs from 'fs';
import * as path from 'path';
import type { L2TableDef, L2ColumnDef } from './types';
import { L2_TABLES } from './l2-definitions';
import { getL2SeedValue } from './seed-data';

const OUT_DIR = path.join(__dirname, 'output');
const ROWS_PER_TABLE = 12; // 10+ rows
const SEED_AS_OF_DATE = '2025-01-31';

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 10)}'`;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function seedValue(col: L2ColumnDef, rowIndex: number, tableName: string): unknown {
  const realistic = getL2SeedValue(tableName, col.name, rowIndex);
  if (realistic !== null) return realistic;

  const i = rowIndex + 1;
  if (col.pk) {
    if (col.type.includes('INT') || col.type.includes('BIGINT')) return i;
    if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') return `${tableName}_${i}`;
  }
  if (col.fk) {
    const match = col.fk.match(/l[12]\.\w+\((\w+)\)/);
    if (match) {
      const refCol = match[1];
      if (refCol === 'facility_id' || refCol === 'counterparty_id' || refCol === 'credit_agreement_id' || refCol === 'collateral_asset_id' || refCol === 'amendment_id' || refCol === 'limit_rule_id' || refCol === 'position_id' || refCol === 'credit_event_id' || refCol === 'scenario_id')
        return (rowIndex % 10) + 1;
      if (refCol === 'currency_code') return 'USD';
      if (refCol === 'country_code') return 'US';
      if (refCol === 'amendment_type_code') return 'INCREASE';
      if (refCol === 'amendment_status_code') return 'EFFECTIVE';
      return (rowIndex % 10) + 1;
    }
  }
  if (col.name === 'as_of_date') return SEED_AS_OF_DATE;
  if (col.type.includes('CHAR(1)')) return ['Y', 'N'][rowIndex % 2];
  if (col.type === 'DATE' || col.type.includes('DATE')) return SEED_AS_OF_DATE;
  if (col.type === 'TIMESTAMP') return '2025-01-15 12:00:00';
  if (col.type.includes('DECIMAL') || col.type.includes('NUMERIC')) return 100.5;
  if (col.type === 'INTEGER' || col.type === 'BIGINT') return i;
  if (col.type.startsWith('VARCHAR') || col.type === 'TEXT') return `${col.name}_${i}`;
  return null;
}

function parseFk(fk: string): { layer: string; table: string; field: string } | null {
  const m = fk.match(/l1\.(\w+)\((\w+)\)/);
  if (m) return { layer: 'L1', table: m[1], field: m[2] };
  const m2 = fk.match(/l2\.(\w+)\((\w+)\)/);
  if (m2) return { layer: 'L2', table: m2[1], field: m2[2] };
  return null;
}

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

  for (const t of L2_TABLES) {
    const sourceTableKey = `L2.${t.tableName}`;
    for (const col of t.columns) {
      if (!col.fk) continue;
      const target = parseFk(col.fk);
      if (!target) continue;
      const targetTableKey = `${target.layer}.${target.table}`;
      const id = `${sourceTableKey}.${col.name}->${targetTableKey}.${target.field}`;
      relationships.push({
        id,
        source: {
          layer: 'L2',
          table: t.tableName,
          field: col.name,
          tableKey: sourceTableKey,
        },
        target: {
          layer: target.layer,
          table: target.table,
          field: target.field,
          tableKey: targetTableKey,
        },
        isCrossLayer: target.layer !== 'L2',
        relationshipType: 'primary',
      });
    }
  }
  return relationships;
}

function buildTableData(t: L2TableDef): { columns: string[]; rows: unknown[][] } {
  const columns = t.columns.map(c => c.name);
  const rows: unknown[][] = [];

  for (let r = 0; r < ROWS_PER_TABLE; r++) {
    const row: unknown[] = [];
    for (const col of t.columns) {
      row.push(seedValue(col, r, t.tableName));
    }
    rows.push(row);
  }

  return { columns, rows };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const sampleData: Record<string, { columns: string[]; rows: unknown[][] }> = {};
  for (const t of L2_TABLES) {
    const tableKey = `L2.${t.tableName}`;
    sampleData[tableKey] = buildTableData(t);
  }

  const relationships = buildRelationships();

  fs.writeFileSync(path.join(OUT_DIR, 'sample-data.json'), JSON.stringify(sampleData, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'relationships.json'), JSON.stringify(relationships, null, 2), 'utf-8');

  console.log(`Generated: ${OUT_DIR}/sample-data.json, ${OUT_DIR}/relationships.json`);
  console.log(`L2 Tables: ${L2_TABLES.length}, Relationships: ${relationships.length}`);
}

main();

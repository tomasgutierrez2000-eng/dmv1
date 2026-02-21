/**
 * Generate PostgreSQL DDL from data dictionary (viz cache).
 * Used to keep sql/l3/ (and optionally l1/l2) in sync with the model.
 */

import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
} from './data-dictionary';
import { layerToSchema } from './data-dictionary';

/** Infer SQL type from field name and optional data_type. */
export function sqlTypeForField(field: DataDictionaryField): string {
  const name = field.name.toLowerCase();
  const explicit = field.data_type?.trim();
  if (explicit) {
    const upper = explicit.toUpperCase();
    if (
      upper.startsWith('VARCHAR') ||
      upper.startsWith('TEXT') ||
      upper.startsWith('NUMERIC') ||
      upper.startsWith('DECIMAL') ||
      upper === 'DATE' ||
      upper === 'TIMESTAMP' ||
      upper === 'BOOLEAN' ||
      upper === 'INTEGER' ||
      upper === 'BIGINT'
    ) {
      return explicit;
    }
    if (upper === 'STRING' || upper === 'TEXT') return 'TEXT';
    if (upper === 'NUMBER' || upper === 'NUMERIC') return 'NUMERIC(20,4)';
    if (upper === 'BOOL') return 'BOOLEAN';
    if (upper === 'INT') return 'INTEGER';
  }
  if (name.endsWith('_id')) return 'VARCHAR(64)';
  if (name.endsWith('_code')) return 'VARCHAR(30)';
  if (name.endsWith('_name') || name.endsWith('_desc') || name.endsWith('_text'))
    return 'VARCHAR(500)';
  if (name.endsWith('_amt')) return 'NUMERIC(20,4)';
  if (name.endsWith('_pct')) return 'NUMERIC(10,6)';
  if (name.endsWith('_value')) return 'NUMERIC(12,6)';
  if (name.endsWith('_count')) return 'INTEGER';
  if (name.endsWith('_flag')) return 'BOOLEAN';
  if (name.endsWith('_date')) return 'DATE';
  if (name.endsWith('_ts')) return 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
  if (name.endsWith('_bps')) return 'NUMERIC(10,4)';
  if (name.includes('_seq') || name.startsWith('rank_')) return 'INTEGER';
  return 'VARCHAR(64)';
}

/** Escape identifier for PostgreSQL. */
function quoteId(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Build CREATE TABLE statement for one table. */
export function buildCreateTable(
  table: DataDictionaryTable,
  schemaName: string
): string {
  if (!table.fields || table.fields.length === 0) {
    return `-- Table ${table.name} has no columns; add fields in the data model.`;
  }
  const tableId = quoteId(table.name);
  const schemaId = quoteId(schemaName);
  const lines: string[] = [];
  const pkFields: string[] = [];

  for (const f of table.fields) {
    const sqlType = sqlTypeForField(f);
    const nullable = f.pk_fk?.is_pk ? ' NOT NULL' : '';
    lines.push(`    ${quoteId(f.name)} ${sqlType}${nullable}`);
    if (f.pk_fk?.is_pk) pkFields.push(quoteId(f.name));
  }

  const columnList = lines.join(',\n');
  const pkClause =
    pkFields.length > 0
      ? `,\n    PRIMARY KEY (${pkFields.join(', ')})`
      : '';
  return `CREATE TABLE IF NOT EXISTS ${schemaId}.${tableId} (\n${columnList}${pkClause}\n);`;
}

/** Build DROP TABLE statement. */
export function buildDropTable(
  layer: 'L1' | 'L2' | 'L3',
  tableName: string
): string {
  const schema = layerToSchema(layer);
  return `DROP TABLE IF EXISTS ${quoteId(schema)}.${quoteId(tableName)};`;
}

/** Build ALTER TABLE ADD COLUMN. */
export function buildAddColumn(
  layer: 'L1' | 'L2' | 'L3',
  tableName: string,
  field: DataDictionaryField
): string {
  const schema = layerToSchema(layer);
  const sqlType = sqlTypeForField(field);
  return `ALTER TABLE ${quoteId(schema)}.${quoteId(tableName)} ADD COLUMN IF NOT EXISTS ${quoteId(field.name)} ${sqlType};`;
}

/** Build ALTER TABLE DROP COLUMN. */
export function buildDropColumn(
  layer: 'L1' | 'L2' | 'L3',
  tableName: string,
  fieldName: string
): string {
  const schema = layerToSchema(layer);
  return `ALTER TABLE ${quoteId(schema)}.${quoteId(tableName)} DROP COLUMN IF EXISTS ${quoteId(fieldName)};`;
}

/** Generate full DDL file content for a layer from data dictionary. */
export function generateLayerDdl(
  dd: DataDictionary,
  layer: 'L1' | 'L2' | 'L3'
): string {
  const schema = layerToSchema(layer);
  const tables = dd[layer].filter((t) => t.fields.length > 0);
  const header = `-- ${layer} Data Model DDL\n-- Generated from data dictionary (viz cache)\n-- Target: PostgreSQL\n\nCREATE SCHEMA IF NOT EXISTS ${schema};\n\n`;
  const body = tables
    .map((t) => `-- ${t.name} (${t.category})\n${buildCreateTable(t, schema)}\n`)
    .join('\n');
  return header + body;
}

/** Generate full L3 DDL (all L3 tables). */
export function generateL3Ddl(dd: DataDictionary): string {
  return generateLayerDdl(dd, 'L3');
}

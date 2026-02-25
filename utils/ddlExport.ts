/**
 * Client-side DDL generation from DataModel for GCP Cloud SQL Studio (PostgreSQL).
 * Generates CREATE TABLE statements matching the project's reference DDL format
 * (see sql/l3/01_DDL_all_tables.sql).
 *
 * Output is designed to be pasted directly into GCP Cloud SQL Studio's SQL editor.
 */

import type { DataModel, TableDef, Field } from '../types/model';

// PostgreSQL reserved words that must be quoted when used as identifiers
const PG_RESERVED = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric',
  'authorization', 'between', 'bigint', 'binary', 'bit', 'boolean', 'both', 'case',
  'cast', 'char', 'character', 'check', 'coalesce', 'collate', 'column', 'constraint',
  'create', 'cross', 'current_date', 'current_role', 'current_time', 'current_timestamp',
  'current_user', 'dec', 'decimal', 'default', 'deferrable', 'desc', 'distinct', 'do',
  'else', 'end', 'except', 'exists', 'extract', 'false', 'fetch', 'float', 'for',
  'foreign', 'freeze', 'from', 'full', 'grant', 'group', 'having', 'ilike', 'in',
  'initially', 'inner', 'inout', 'int', 'integer', 'intersect', 'interval', 'into',
  'is', 'isnull', 'join', 'leading', 'left', 'like', 'limit', 'localtime',
  'localtimestamp', 'natural', 'nchar', 'new', 'none', 'not', 'notnull', 'null',
  'nullif', 'numeric', 'off', 'offset', 'old', 'on', 'only', 'or', 'order', 'out',
  'outer', 'overlaps', 'overlay', 'placing', 'position', 'precision', 'primary',
  'real', 'references', 'returning', 'right', 'row', 'select', 'session_user',
  'setof', 'similar', 'smallint', 'some', 'substring', 'symmetric', 'table', 'then',
  'time', 'timestamp', 'to', 'trailing', 'treat', 'trim', 'true', 'union', 'unique',
  'user', 'using', 'values', 'varchar', 'variadic', 'verbose', 'when', 'where', 'with',
]);

/** Infer PostgreSQL type from field metadata. */
function sqlTypeForField(field: Field): string {
  const name = field.name.toLowerCase();
  const explicit = field.dataType?.trim();
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

/**
 * Quote an identifier only when necessary (reserved word or special chars).
 * Keeps output clean for Cloud SQL Studio — bare snake_case identifiers
 * are easier to read and match the project's reference DDL format.
 */
function safeId(name: string): string {
  if (PG_RESERVED.has(name.toLowerCase()) || !/^[a-z_][a-z0-9_]*$/i.test(name)) {
    return `"${name.replace(/"/g, '""')}"`;
  }
  return name;
}

/** Build a single CREATE TABLE statement from a TableDef. */
function buildCreateTable(table: TableDef, model: DataModel): string {
  const schema = table.layer.toLowerCase();
  if (!table.fields || table.fields.length === 0) {
    return `-- Table ${table.name} has no columns; add fields in the data model.`;
  }

  // Calculate padding for aligned columns (match reference DDL style)
  const maxNameLen = Math.max(...table.fields.map((f) => safeId(f.name).length));
  const pad = Math.max(maxNameLen + 4, 20); // minimum 20-char pad

  const lines: string[] = [];
  const pkFields: string[] = [];

  for (const f of table.fields) {
    const sqlType = sqlTypeForField(f);
    const nullable = f.isPK ? ' NOT NULL' : '';
    const colName = safeId(f.name);
    lines.push(`    ${colName.padEnd(pad)}${sqlType}${nullable}`);
    if (f.isPK) pkFields.push(safeId(f.name));
  }

  const columnList = lines.join(',\n');
  const pkClause =
    pkFields.length > 0
      ? `,\n    PRIMARY KEY (${pkFields.join(', ')})`
      : '';

  let stmt = `CREATE TABLE IF NOT EXISTS ${schema}.${safeId(table.name)} (\n${columnList}${pkClause}\n);`;

  // Add FK comments after the closing statement (matches reference DDL)
  const fkComments: string[] = [];
  for (const f of table.fields) {
    if (f.isFK && f.fkTarget) {
      fkComments.push(
        `    -- FK: ${f.name} → ${f.fkTarget.layer}.${f.fkTarget.table}.${f.fkTarget.field}`
      );
    }
  }
  if (fkComments.length > 0) {
    stmt += '\n' + fkComments.join('\n');
  }

  return stmt;
}

/** Generate PostgreSQL DDL for selected tables, grouped by layer. */
export function generateDdl(model: DataModel, tableKeys: string[]): string {
  const tables = tableKeys
    .map((key) => model.tables[key])
    .filter(Boolean);

  // Group by layer
  const byLayer: Record<string, TableDef[]> = {};
  for (const t of tables) {
    (byLayer[t.layer] ??= []).push(t);
  }

  const sections: string[] = [];

  sections.push(
    '-- ============================================================',
    '-- PostgreSQL DDL for GCP Cloud SQL Studio',
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    `-- Tables: ${tables.length}`,
    '-- Target: PostgreSQL (Cloud SQL)',
    '-- ============================================================',
    '',
  );

  // Emit schemas & tables in L1 → L2 → L3 order
  for (const layer of ['L1', 'L2', 'L3']) {
    const layerTables = byLayer[layer];
    if (!layerTables || layerTables.length === 0) continue;
    const schema = layer.toLowerCase();

    sections.push(
      `-- -------------------------------------------------------------`,
      `-- ${layer} Layer (${layerTables.length} table${layerTables.length > 1 ? 's' : ''})`,
      `-- -------------------------------------------------------------`,
      `CREATE SCHEMA IF NOT EXISTS ${schema};`,
      '',
    );

    for (const t of layerTables) {
      sections.push(`-- ${t.name} (${t.category})`);
      sections.push(buildCreateTable(t, model));
      sections.push('');
    }
  }

  return sections.join('\n');
}

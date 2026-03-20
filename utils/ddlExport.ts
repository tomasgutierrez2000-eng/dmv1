/**
 * Client-side DDL generation from DataModel for GCP Cloud SQL Studio (PostgreSQL).
 * Generates CREATE TABLE statements matching the project's reference DDL format
 * (see sql/l3/01_DDL_all_tables.sql).
 *
 * Output is designed to be pasted directly into GCP Cloud SQL Studio's SQL editor.
 */

import type { DataModel, TableDef, Field } from '../types/model';
import { PG_RESERVED_WORDS as PG_RESERVED } from '../lib/sql-value-formatter';

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
  if (name.endsWith('_id')) return 'BIGINT';
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

/** Build an FK constraint name that fits within PostgreSQL's 63-char NAMEDATALEN. */
function fkConstraintName(fromTable: string, fromField: string): string {
  const base = `fk_${fromTable}_${fromField}`;
  if (base.length <= 63) return base;
  // Abbreviate long table names
  const abbrevs: Record<string, string> = {
    credit_agreement: 'ca', counterparty: 'cp', facility: 'fac',
    collateral: 'coll', instrument: 'instr', observation: 'obs',
    snapshot: 'snap', participation: 'part', calculation: 'calc',
    consumption: 'cons', portfolio: 'port', segment: 'seg',
    exposure: 'exp', amendment: 'amend', relationship: 'rel',
  };
  let abbr = fromTable;
  for (const [full, short] of Object.entries(abbrevs)) {
    abbr = abbr.replace(new RegExp(full, 'g'), short);
  }
  const result = `fk_${abbr}_${fromField}`;
  return result.length <= 63 ? result : result.substring(0, 63);
}

/** Build an idempotent ALTER TABLE ADD CONSTRAINT FOREIGN KEY statement. */
function buildForeignKey(rel: {
  fromSchema: string; fromTable: string; fromField: string;
  toSchema: string; toTable: string; toField: string;
}): string {
  const constraintName = fkConstraintName(rel.fromTable, rel.fromField);
  return (
    `DO $$ BEGIN\n` +
    `  ALTER TABLE ${safeId(rel.fromSchema)}.${safeId(rel.fromTable)}\n` +
    `    ADD CONSTRAINT ${safeId(constraintName)}\n` +
    `    FOREIGN KEY (${safeId(rel.fromField)})\n` +
    `    REFERENCES ${safeId(rel.toSchema)}.${safeId(rel.toTable)} (${safeId(rel.toField)});\n` +
    `EXCEPTION WHEN OTHERS THEN NULL;\n` +
    `END $$;`
  );
}

/** Generate PostgreSQL DDL for selected tables, grouped by layer. */
export function generateDdl(model: DataModel, tableKeys: string[]): string {
  const selectedSet = new Set(tableKeys);
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
    );

    // Add search_path for cross-schema FK references
    if (layer === 'L2') {
      sections.push(`SET search_path TO l1, l2, public;`);
    } else if (layer === 'L3') {
      sections.push(`SET search_path TO l1, l2, l3, public;`);
    }
    sections.push('');

    for (const t of layerTables) {
      sections.push(`-- ${t.name} (${t.category})`);
      sections.push(buildCreateTable(t, model));
      sections.push('');
    }

    // Emit FK constraints for relationships originating from this layer
    const layerRels = model.relationships.filter(
      (r) =>
        r.source.layer.toUpperCase() === layer &&
        selectedSet.has(r.source.tableKey) &&
        selectedSet.has(r.target.tableKey)
    );
    if (layerRels.length > 0) {
      sections.push(`-- Foreign Key Constraints (${layer})`, '');
      for (const r of layerRels) {
        sections.push(buildForeignKey({
          fromSchema: r.source.layer.toLowerCase(),
          fromTable: r.source.table,
          fromField: r.source.field,
          toSchema: r.target.layer.toLowerCase(),
          toTable: r.target.table,
          toField: r.target.field,
        }));
        sections.push('');
      }
    }
  }

  return sections.join('\n');
}

/**
 * Export full PostgreSQL schema + data to Downloads folder.
 * GCP Cloud SQL compatible — includes PKs, FKs, sequences, correct load order.
 *
 * Usage: npx tsx scripts/export-db-to-downloads.ts
 * Requires: DATABASE_URL in .env
 *
 * Fixes for GCP PostgreSQL compatibility:
 * - DROP TABLE IF EXISTS ... CASCADE before CREATE (idempotent re-upload)
 * - Full PK + FK constraints on CREATE TABLE
 * - SERIAL/BIGSERIAL sequences restored via setval()
 * - FK-safe load order (L1 dims → L1 masters → L2 → L3)
 * - Batched multi-row INSERTs (1000 rows per statement)
 * - search_path set for cross-schema FK resolution
 * - No CREATE OR REPLACE TABLE (invalid PostgreSQL syntax)
 * - Reserved words double-quoted
 */
import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pg from 'pg';

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = process.env.EXPORT_OUTPUT_DIR ?? path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  `postgres_full_dump_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`,
);

const BATCH_SIZE = 1000;

/* ── Quoting helpers ──────────────────────────────────────────── */

function escapeIdent(id: string): string {
  return '"' + id.replace(/"/g, '""') + '"';
}

function escapeLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  if (val instanceof Date) {
    // Preserve full timestamp precision
    const iso = val.toISOString();
    return "'" + iso.replace('T', ' ').replace('Z', '') + "'";
  }
  if (Buffer.isBuffer(val)) {
    return "E'\\\\x" + val.toString('hex') + "'";
  }
  if (typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
  }
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

/* ── Array helper ─────────────────────────────────────────────── */

/** pg may return array_agg as string '{a,b}' or JS array — normalize */
function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    // PostgreSQL text-form array: {col1,col2}
    const inner = val.replace(/^\{|\}$/g, '');
    return inner ? inner.split(',').map(s => s.replace(/^"|"$/g, '')) : [];
  }
  return [];
}

/* ── Table metadata types ─────────────────────────────────────── */

interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  default_val: string | null;
  is_serial: boolean;
}

interface PKInfo {
  constraint_name: string;
  columns: string[];
}

interface FKInfo {
  constraint_name: string;
  columns: string[];
  ref_schema: string;
  ref_table: string;
  ref_columns: string[];
  on_delete: string;
  on_update: string;
}

interface TableMeta {
  schema: string;
  table: string;
  fullName: string;
  columns: ColumnInfo[];
  pk: PKInfo | null;
  fks: FKInfo[];
  rowCount: number;
}

/* ── FK-safe topological sort ─────────────────────────────────── */

function topoSort(tables: TableMeta[]): TableMeta[] {
  const key = (t: TableMeta) => `${t.schema}.${t.table}`;
  const byKey = new Map(tables.map(t => [key(t), t]));
  const visited = new Set<string>();
  const sorted: TableMeta[] = [];

  function visit(t: TableMeta) {
    const k = key(t);
    if (visited.has(k)) return;
    visited.add(k);
    // Visit FK dependencies first
    for (const fk of t.fks) {
      const depKey = `${fk.ref_schema}.${fk.ref_table}`;
      const dep = byKey.get(depKey);
      if (dep && depKey !== k) visit(dep);
    }
    sorted.push(t);
  }

  // Visit in schema priority order (l1 → l2 → l3 → public → rest)
  const schemaPriority: Record<string, number> = { l1: 0, l2: 1, l3: 2, public: 3 };
  const ordered = [...tables].sort((a, b) => {
    const pa = schemaPriority[a.schema] ?? 4;
    const pb = schemaPriority[b.schema] ?? 4;
    if (pa !== pb) return pa - pb;
    return a.table.localeCompare(b.table);
  });

  for (const t of ordered) visit(t);
  return sorted;
}

/* ── Main ─────────────────────────────────────────────────────── */

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: Set DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    const lines: string[] = [];
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('-- PostgreSQL Full Export — GCP Cloud SQL Compatible');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- Restore: psql -d <database> -f this_file.sql');
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('SET client_min_messages TO WARNING;');
    lines.push('SET client_encoding TO \'UTF8\';');
    lines.push('');

    // ── 1. Schemas ──────────────────────────────────────────────
    console.log('Reading schemas...');
    const schemasRes = await client.query(`
      SELECT DISTINCT n.nspname FROM pg_namespace n
      JOIN pg_class c ON c.relnamespace = n.oid
      WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname
    `);
    const schemas = schemasRes.rows.map(r => r.nspname as string);
    for (const s of schemas) {
      lines.push(`CREATE SCHEMA IF NOT EXISTS ${escapeIdent(s)};`);
    }
    lines.push('');
    // Set search_path for cross-schema FK resolution
    lines.push(`SET search_path TO ${schemas.map(escapeIdent).join(', ')}, public;`);
    lines.push('');

    // ── 2. Collect table metadata ───────────────────────────────
    console.log('Collecting table metadata...');
    const tablesRes = await client.query(`
      SELECT n.nspname AS schema, c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname
    `);

    const allTables: TableMeta[] = [];

    for (const row of tablesRes.rows) {
      const schema = row.schema as string;
      const tableName = row.table_name as string;
      const fullName = `${escapeIdent(schema)}.${escapeIdent(tableName)}`;

      // Columns (with defaults and serial detection)
      const colsRes = await client.query(
        `SELECT
           a.attname AS name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull AS notnull,
           pg_get_expr(d.adbin, d.adrelid) AS default_val,
           CASE WHEN pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%' THEN TRUE ELSE FALSE END AS is_serial
         FROM pg_attribute a
         JOIN pg_class t ON a.attrelid = t.oid
         JOIN pg_namespace n ON t.relnamespace = n.oid
         LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE n.nspname = $1 AND t.relname = $2
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY a.attnum`,
        [schema, tableName],
      );

      const columns: ColumnInfo[] = colsRes.rows.map(r => ({
        name: r.name as string,
        type: r.type as string,
        notnull: r.notnull as boolean,
        default_val: r.default_val as string | null,
        is_serial: r.is_serial as boolean,
      }));

      // Primary key
      const pkRes = await client.query(
        `SELECT con.conname AS constraint_name,
                array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS columns
         FROM pg_constraint con
         JOIN pg_class t ON t.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
         WHERE n.nspname = $1 AND t.relname = $2 AND con.contype = 'p'
         GROUP BY con.conname`,
        [schema, tableName],
      );
      const pk: PKInfo | null = pkRes.rows.length > 0
        ? { constraint_name: pkRes.rows[0].constraint_name as string, columns: ensureArray(pkRes.rows[0].columns) }
        : null;

      // Foreign keys
      const fkRes = await client.query(
        `SELECT
           con.conname AS constraint_name,
           array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS columns,
           rn.nspname AS ref_schema,
           rc.relname AS ref_table,
           array_agg(ra.attname ORDER BY array_position(con.confkey, ra.attnum)) AS ref_columns,
           CASE con.confdeltype
             WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
             WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
           END AS on_delete,
           CASE con.confupdtype
             WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
             WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
           END AS on_update
         FROM pg_constraint con
         JOIN pg_class t ON t.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
         JOIN pg_class rc ON rc.oid = con.confrelid
         JOIN pg_namespace rn ON rn.oid = rc.relnamespace
         JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = ANY(con.confkey)
         WHERE n.nspname = $1 AND t.relname = $2 AND con.contype = 'f'
         GROUP BY con.conname, rn.nspname, rc.relname, con.confdeltype, con.confupdtype`,
        [schema, tableName],
      );
      const fks: FKInfo[] = fkRes.rows.map(r => ({
        constraint_name: r.constraint_name as string,
        columns: ensureArray(r.columns),
        ref_schema: r.ref_schema as string,
        ref_table: r.ref_table as string,
        ref_columns: ensureArray(r.ref_columns),
        on_delete: r.on_delete as string,
        on_update: r.on_update as string,
      }));

      // Row count
      const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM ${fullName}`);
      const rowCount = parseInt(countRes.rows[0].cnt as string, 10);

      allTables.push({ schema, table: tableName, fullName, columns, pk, fks, rowCount });
    }

    // ── 3. Topological sort for FK-safe load order ──────────────
    console.log('Computing FK-safe load order...');
    const sorted = topoSort(allTables);

    // ── 4. DROP tables in reverse order ─────────────────────────
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('-- DROP existing tables (reverse dependency order)');
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('');
    for (const t of [...sorted].reverse()) {
      lines.push(`DROP TABLE IF EXISTS ${t.fullName} CASCADE;`);
    }
    lines.push('');

    // ── 5. CREATE tables with PKs ───────────────────────────────
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('-- CREATE tables (dependency order)');
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('');

    const serialColumns: Array<{ fullName: string; column: string; sequence: string }> = [];

    for (const t of sorted) {
      lines.push(`-- Table: ${t.fullName} (${t.rowCount} rows)`);
      lines.push(`CREATE TABLE ${t.fullName} (`);

      const colDefs: string[] = [];
      for (const col of t.columns) {
        let def = `  ${escapeIdent(col.name)} `;

        // Convert nextval sequences to BIGSERIAL/SERIAL for cleaner DDL
        if (col.is_serial) {
          const isInt = col.type === 'integer';
          def += isInt ? 'SERIAL' : 'BIGSERIAL';
          if (col.notnull) def += ' NOT NULL';
          // Track for setval() after data load
          if (col.default_val) {
            const seqMatch = col.default_val.match(/nextval\('([^']+)'::regclass\)/);
            if (seqMatch) {
              serialColumns.push({ fullName: t.fullName, column: col.name, sequence: seqMatch[1] });
            }
          }
        } else {
          def += col.type;
          if (col.notnull) def += ' NOT NULL';
          if (col.default_val && !col.default_val.startsWith('nextval')) {
            def += ` DEFAULT ${col.default_val}`;
          }
        }
        colDefs.push(def);
      }

      // Inline PK constraint
      if (t.pk) {
        colDefs.push(`  CONSTRAINT ${escapeIdent(t.pk.constraint_name)} PRIMARY KEY (${t.pk.columns.map(escapeIdent).join(', ')})`);
      }

      lines.push(colDefs.join(',\n'));
      lines.push(');');
      lines.push('');
    }

    // ── 6. INSERT data (batched multi-row) ──────────────────────
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('-- DATA (FK-safe load order, batched inserts)');
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push('');

    let totalRows = 0;
    for (const t of sorted) {
      if (t.rowCount === 0) continue;

      const colNames = t.columns.map(c => c.name);
      const colList = colNames.map(escapeIdent).join(', ');

      console.log(`  Exporting ${t.fullName} (${t.rowCount} rows)...`);
      lines.push(`-- ${t.fullName}: ${t.rowCount} rows`);

      // Stream rows in batches
      const dataRes = await client.query(`SELECT * FROM ${t.fullName}`);
      const rows = dataRes.rows;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        lines.push(`INSERT INTO ${t.fullName} (${colList}) VALUES`);

        const valueLines: string[] = [];
        for (const r of batch) {
          const vals = colNames.map(c => escapeLiteral(r[c]));
          valueLines.push(`  (${vals.join(', ')})`);
        }
        lines.push(valueLines.join(',\n') + ';');
      }

      totalRows += t.rowCount;
      lines.push('');
    }

    // ── 7. FK constraints (added AFTER data to avoid ordering issues) ──
    const allFks = sorted.flatMap(t =>
      t.fks.map(fk => ({ table: t, fk })),
    );

    if (allFks.length > 0) {
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('-- FOREIGN KEY constraints (added after data load)');
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('');

      for (const { table: t, fk } of allFks) {
        const refFull = `${escapeIdent(fk.ref_schema)}.${escapeIdent(fk.ref_table)}`;
        lines.push(`DO $$ BEGIN`);
        lines.push(`  ALTER TABLE ${t.fullName}`);
        lines.push(`    ADD CONSTRAINT ${escapeIdent(fk.constraint_name)}`);
        lines.push(`    FOREIGN KEY (${fk.columns.map(escapeIdent).join(', ')})`);
        lines.push(`    REFERENCES ${refFull} (${fk.ref_columns.map(escapeIdent).join(', ')})`);
        if (fk.on_delete !== 'NO ACTION') lines.push(`    ON DELETE ${fk.on_delete}`);
        if (fk.on_update !== 'NO ACTION') lines.push(`    ON UPDATE ${fk.on_update}`);
        lines.push(`  ;`);
        lines.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
        lines.push(`END $$;`);
        lines.push('');
      }
    }

    // ── 8. Reset sequences for SERIAL columns ───────────────────
    if (serialColumns.length > 0) {
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('-- SEQUENCE reset (ensure next INSERT gets correct ID)');
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('');

      for (const { fullName, column, sequence } of serialColumns) {
        lines.push(`SELECT setval('${sequence}', COALESCE((SELECT MAX(${escapeIdent(column)}) FROM ${fullName}), 1));`);
      }
      lines.push('');
    }

    // ── 9. Stored procedures (if any) ───────────────────────────
    console.log('Exporting stored procedures...');
    const procsRes = await client.query(`
      SELECT n.nspname AS schema, p.proname AS name,
             pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN (${schemas.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY n.nspname, p.proname
    `, schemas);

    if (procsRes.rows.length > 0) {
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('-- STORED PROCEDURES / FUNCTIONS');
      lines.push('-- ════════════════════════════════════════════════════════════');
      lines.push('');
      for (const r of procsRes.rows) {
        lines.push(`-- ${r.schema}.${r.name}`);
        lines.push(`${r.definition};`);
        lines.push('');
      }
    }

    // ── 10. Summary ─────────────────────────────────────────────
    lines.push('-- ════════════════════════════════════════════════════════════');
    lines.push(`-- Export complete: ${sorted.length} tables, ${totalRows} rows, ${allFks.length} FK constraints`);
    lines.push('-- ════════════════════════════════════════════════════════════');

    const sql = lines.join('\n');
    const filename = path.basename(OUTPUT_FILE);

    // Write to project sql/exports
    const projectExports = path.join(ROOT, 'sql', 'exports');
    fs.mkdirSync(projectExports, { recursive: true });
    const projectFile = path.join(projectExports, filename);
    fs.writeFileSync(projectFile, sql, 'utf8');

    // Copy to Downloads folder
    try {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.copyFileSync(projectFile, OUTPUT_FILE);
      console.log(`\nExport complete: ${OUTPUT_FILE}`);
    } catch {
      console.log(`\nExport complete (Downloads folder not writable): ${projectFile}`);
    }

    const sizeMB = (Buffer.byteLength(sql, 'utf8') / (1024 * 1024)).toFixed(1);
    console.log(`  ${sorted.length} tables, ${totalRows} rows, ${allFks.length} FK constraints`);
    console.log(`  ${sizeMB} MB`);
    console.log(`\nTo restore: psql -d <database> -f "${OUTPUT_FILE}"`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

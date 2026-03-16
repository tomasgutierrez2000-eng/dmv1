/**
 * Export full PostgreSQL schema + data to Downloads folder.
 * Uses pg package — no pg_dump required.
 *
 * Usage: npx tsx scripts/export-db-to-downloads.ts
 * Requires: DATABASE_URL in .env
 */
import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pg from 'pg';

const ROOT = path.resolve(__dirname, '..');
// Default: ~/Downloads (use os.homedir() for reliability); override with EXPORT_OUTPUT_DIR
const OUTPUT_DIR = process.env.EXPORT_OUTPUT_DIR ?? path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  `postgres_full_dump_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`,
);

function escapeIdent(id: string): string {
  return '"' + id.replace(/"/g, '""') + '"';
}

function escapeLiteral(val: unknown): string {
  if (val === null) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  if (val instanceof Date) return "'" + val.toISOString().replace('T', ' ').slice(0, 19) + "'";
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();

  try {
    const lines: string[] = [];
    lines.push('-- PostgreSQL full dump');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- Restore: psql -d mydb -f this_file.sql');
    lines.push('');
    lines.push('SET client_min_messages TO WARNING;');
    lines.push('');

    // Create schemas we'll need
    const schemasRes = await client.query(`
      SELECT DISTINCT n.nspname FROM pg_namespace n
      JOIN pg_class c ON c.relnamespace = n.oid
      WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    `);
    for (const r of schemasRes.rows) {
      lines.push(`CREATE SCHEMA IF NOT EXISTS ${escapeIdent(r.nspname as string)};`);
    }
    lines.push('');

    // Get all tables (schemas: public, l1, l2, l3 and any custom)
    const tablesRes = await client.query(`
      SELECT n.nspname AS schema, c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname
    `);

    for (const row of tablesRes.rows) {
      const schema = row.schema as string;
      const tableName = row.table_name as string;
      const fullName = `${escapeIdent(schema)}.${escapeIdent(tableName)}`;

      // Get columns
      const colsRes = await client.query(
        `SELECT a.attname AS name, pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
                a.attnotnull AS notnull
         FROM pg_attribute a
         JOIN pg_class t ON a.attrelid = t.oid
         JOIN pg_namespace n ON t.relnamespace = n.oid
         WHERE n.nspname = $1 AND t.relname = $2
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY a.attnum`,
        [schema, tableName],
      );

      const columns = colsRes.rows.map((r) => r.name as string);
      const colList = columns.map(escapeIdent).join(', ');

      // CREATE TABLE (simplified — no PKs/FKs, just columns)
      lines.push(`-- Table: ${fullName}`);
      lines.push(`CREATE TABLE IF NOT EXISTS ${fullName} (`);
      lines.push(
        colsRes.rows
          .map((r) => `  ${escapeIdent(r.name as string)} ${r.type}${(r.notnull as boolean) ? ' NOT NULL' : ''}`)
          .join(',\n'),
      );
      lines.push(');');
      lines.push('');

      // Data
      const dataRes = await client.query(`SELECT * FROM ${fullName}`);
      if (dataRes.rows.length > 0) {
        for (const r of dataRes.rows) {
          const vals = columns.map((c) => escapeLiteral(r[c]));
          lines.push(`INSERT INTO ${fullName} (${colList}) VALUES (${vals.join(', ')});`);
        }
        lines.push('');
      }
    }

    const sql = lines.join('\n');
    const filename = path.basename(OUTPUT_FILE);

    // Write to project sql/exports first (always works)
    const projectExports = path.join(ROOT, 'sql', 'exports');
    fs.mkdirSync(projectExports, { recursive: true });
    const projectFile = path.join(projectExports, filename);
    fs.writeFileSync(projectFile, sql, 'utf8');

    // Copy to Downloads folder
    try {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.copyFileSync(projectFile, OUTPUT_FILE);
      console.log('Export complete:', OUTPUT_FILE);
    } catch (err) {
      console.log('Export complete (Downloads folder not writable):', projectFile);
    }
    console.log('To restore: psql -d mydb -f "<path-to-file>"');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

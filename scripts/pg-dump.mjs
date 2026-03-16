#!/usr/bin/env node
/**
 * pg-dump.mjs — Pure Node.js PostgreSQL dump (schema + data)
 * Outputs a single .sql file that can be loaded with psql.
 * Usage: node scripts/pg-dump.mjs [output-path]
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^(\w+)=["']?(.+?)["']?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

// Fix SSL mode for newer pg versions
DATABASE_URL = DATABASE_URL.replace('sslmode=require', 'sslmode=verify-full');

const outFile = process.argv[2] || path.join(
  process.env.HOME, 'Downloads', `banking_model_dump_${new Date().toISOString().slice(0,10)}.sql`
);

const SCHEMAS = ['l1', 'l2', 'l3'];

// PostgreSQL reserved words that need quoting
const RESERVED = new Set([
  'all','and','array','as','between','case','check','column','constraint','create',
  'cross','default','distinct','do','else','end','except','false','fetch','for',
  'foreign','from','full','grant','group','having','in','inner','into','is','join',
  'leading','left','like','limit','not','null','offset','on','only','or','order',
  'outer','primary','references','right','select','table','then','to','true','union',
  'unique','user','using','value','when','where','window','with'
]);

function quoteIdent(name) {
  if (RESERVED.has(name.toLowerCase())) return `"${name}"`;
  return name;
}

function escapeLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected to database');

  const out = fs.createWriteStream(outFile);
  const w = (s) => out.write(s + '\n');

  w('-- Banking Data Model Dump');
  w(`-- Generated: ${new Date().toISOString()}`);
  w('-- Load with: psql -d target_db -f this_file.sql');
  w('');
  w('BEGIN;');
  w('');

  // Create schemas
  for (const schema of SCHEMAS) {
    w(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
  }
  w('');

  // For each schema: dump DDL then data
  for (const schema of SCHEMAS) {
    w(`-- ============================================================`);
    w(`-- Schema: ${schema}`);
    w(`-- ============================================================`);
    w(`SET search_path TO l1, l2, l3, public;`);
    w('');

    // Get tables in dependency order (tables with no FKs first)
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schema]);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Schema ${schema}: ${tables.length} tables`);

    // Build dependency graph for ordering
    const deps = new Map(); // table -> set of tables it depends on
    for (const t of tables) deps.set(t, new Set());

    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        ccu.table_schema AS ref_schema,
        ccu.table_name AS ref_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
    `, [schema]);

    for (const fk of fkRes.rows) {
      if (fk.ref_schema === schema && deps.has(fk.table_name)) {
        deps.get(fk.table_name).add(fk.ref_table);
      }
    }

    // Topological sort
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    function visit(t) {
      if (visited.has(t)) return;
      if (visiting.has(t)) { sorted.push(t); visited.add(t); return; } // cycle break
      visiting.add(t);
      for (const dep of (deps.get(t) || [])) visit(dep);
      visiting.delete(t);
      visited.add(t);
      sorted.push(t);
    }
    for (const t of tables) visit(t);

    // Dump each table
    for (const table of sorted) {
      w(`-- Table: ${schema}.${table}`);

      // Get column definitions
      const colsRes = await client.query(`
        SELECT column_name, data_type, character_maximum_length,
               numeric_precision, numeric_scale, column_default,
               is_nullable, udt_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table]);

      // Get primary key columns
      const pkRes = await client.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1 AND tc.table_name = $2
        ORDER BY kcu.ordinal_position
      `, [schema, table]);
      const pkCols = pkRes.rows.map(r => r.column_name);

      // Get foreign keys
      const fkDetailsRes = await client.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_schema AS ref_schema,
          ccu.table_name AS ref_table,
          ccu.column_name AS ref_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1 AND tc.table_name = $2
      `, [schema, table]);

      // Build CREATE TABLE
      w(`CREATE TABLE IF NOT EXISTS ${schema}.${table} (`);
      const colDefs = [];
      for (const col of colsRes.rows) {
        let typeName = col.udt_name.toUpperCase();
        // Map common UDT names
        if (typeName === 'INT8' || typeName === 'BIGSERIAL') typeName = 'BIGINT';
        else if (typeName === 'INT4') typeName = 'INTEGER';
        else if (typeName === 'INT2') typeName = 'SMALLINT';
        else if (typeName === 'FLOAT8') typeName = 'DOUBLE PRECISION';
        else if (typeName === 'FLOAT4') typeName = 'REAL';
        else if (typeName === 'BOOL') typeName = 'BOOLEAN';
        else if (typeName === 'VARCHAR') typeName = `VARCHAR(${col.character_maximum_length || 255})`;
        else if (typeName === 'NUMERIC') {
          if (col.numeric_precision && col.numeric_scale !== null) {
            typeName = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
          }
        }
        else if (typeName === 'TIMESTAMPTZ') typeName = 'TIMESTAMP WITH TIME ZONE';
        else if (typeName === 'TIMESTAMP') typeName = 'TIMESTAMP';
        else if (typeName === 'TEXT') typeName = 'TEXT';
        else if (typeName === 'DATE') typeName = 'DATE';
        else if (typeName === 'JSONB') typeName = 'JSONB';
        else if (typeName === 'JSON') typeName = 'JSON';

        let def = `  ${quoteIdent(col.column_name)} ${typeName}`;
        if (col.is_nullable === 'NO' && !pkCols.includes(col.column_name)) def += ' NOT NULL';
        // Include defaults (but skip sequence defaults for serial PKs)
        if (col.column_default && !col.column_default.includes('nextval(')) {
          def += ` DEFAULT ${col.column_default}`;
        }
        colDefs.push(def);
      }

      // Add PK constraint
      if (pkCols.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pkCols.map(quoteIdent).join(', ')})`);
      }

      w(colDefs.join(',\n'));
      w(');');
      w('');

      // Add FK constraints separately (so they don't block table creation)
      const fkGroups = new Map();
      for (const fk of fkDetailsRes.rows) {
        if (!fkGroups.has(fk.constraint_name)) fkGroups.set(fk.constraint_name, []);
        fkGroups.get(fk.constraint_name).push(fk);
      }
      for (const [cname, cols] of fkGroups) {
        const localCols = cols.map(c => quoteIdent(c.column_name)).join(', ');
        const refCols = cols.map(c => quoteIdent(c.ref_column)).join(', ');
        w(`ALTER TABLE ${schema}.${table} ADD CONSTRAINT ${cname}`);
        w(`  FOREIGN KEY (${localCols}) REFERENCES ${cols[0].ref_schema}.${cols[0].ref_table} (${refCols});`);
      }
      if (fkGroups.size > 0) w('');

      // Dump data (skip L3 — export empty tables only)
      if (schema === 'l3') {
        w(`-- L3 table: schema only (no data)`);
        w('');
        continue;
      }

      const countRes = await client.query(`SELECT count(*) as cnt FROM ${schema}.${quoteIdent(table)}`);
      const rowCount = parseInt(countRes.rows[0].cnt);

      if (rowCount > 0) {
        const colNames = colsRes.rows.map(c => c.column_name);
        const quotedCols = colNames.map(quoteIdent).join(', ');

        // Handle serial/sequence columns — reset sequence after insert
        const hasSerial = colsRes.rows.some(c => c.column_default?.includes('nextval('));

        // Fetch in batches for large tables
        const BATCH = 5000;
        let offset = 0;

        w(`-- Data: ${rowCount} rows`);

        while (offset < rowCount) {
          const dataRes = await client.query(
            `SELECT * FROM ${schema}.${quoteIdent(table)} ORDER BY ${pkCols.length > 0 ? pkCols.map(c => `${quoteIdent(c)}`).join(',') : '1'} LIMIT ${BATCH} OFFSET ${offset}`
          );

          for (const row of dataRes.rows) {
            const vals = colNames.map(c => escapeLiteral(row[c]));
            w(`INSERT INTO ${schema}.${table} (${quotedCols}) VALUES (${vals.join(', ')});`);
          }
          offset += BATCH;
        }

        // Reset sequences
        if (hasSerial && pkCols.length === 1) {
          w(`SELECT setval(pg_get_serial_sequence('${schema}.${table}', '${pkCols[0]}'), (SELECT COALESCE(MAX(${quoteIdent(pkCols[0])}), 0) + 1 FROM ${schema}.${table}), false);`);
        }
        w('');
      }
    }
  }

  // Get and dump indexes (non-PK, non-unique-constraint)
  w('-- ============================================================');
  w('-- Indexes');
  w('-- ============================================================');
  for (const schema of SCHEMAS) {
    const idxRes = await client.query(`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = $1
        AND indexname NOT IN (
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_schema = $1
        )
    `, [schema]);
    for (const idx of idxRes.rows) {
      w(`${idx.indexdef};`);
    }
  }

  w('');
  w('COMMIT;');
  w(`-- End of dump`);

  out.end();
  await new Promise(r => out.on('finish', r));

  await client.end();

  const stat = fs.statSync(outFile);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
  console.log(`\nDump complete: ${outFile}`);
  console.log(`Size: ${sizeMB} MB, ${rowCount} total rows`);
}

let rowCount = 0;
main().catch(e => { console.error(e); process.exit(1); });

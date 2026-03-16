#!/usr/bin/env node
/**
 * Generate a full PostgreSQL dump (DDL + data) for the MVP database.
 * Outputs a single .sql file that can be loaded into any PostgreSQL instance.
 *
 * Usage: node scripts/dump-database.js [output-path]
 */
const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const OUTPUT = process.argv[2] || 'sql/exports/mvp-dump.sql';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const lines = [];

  function w(line) { lines.push(line); }

  w('-- ============================================================');
  w('-- 120 Banking Data Model — MVP Database Dump');
  w('-- Generated: ' + new Date().toISOString());
  w('-- Schemas: l1 (reference), l2 (atomic), l3 (derived)');
  w('-- ============================================================');
  w('');
  w('BEGIN;');
  w('');
  w('CREATE SCHEMA IF NOT EXISTS l1;');
  w('CREATE SCHEMA IF NOT EXISTS l2;');
  w('CREATE SCHEMA IF NOT EXISTS l3;');
  w('SET search_path TO l1, l2, l3, public;');
  w('');

  // Get FK constraints for later
  const fkResult = await pool.query(`
    SELECT
      tc.table_schema || '.' || tc.table_name as child_table,
      kcu.column_name as child_column,
      ccu.table_schema || '.' || ccu.table_name as parent_table,
      ccu.column_name as parent_column,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema IN ('l1', 'l2', 'l3')
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
  `);

  // Group FKs by table
  const fksByTable = {};
  for (const fk of fkResult.rows) {
    const key = fk.child_table + '::' + fk.constraint_name;
    if (!fksByTable[key]) {
      fksByTable[key] = {
        child_table: fk.child_table,
        constraint_name: fk.constraint_name,
        child_columns: [],
        parent_table: fk.parent_table,
        parent_columns: []
      };
    }
    fksByTable[key].child_columns.push(fk.child_column);
    fksByTable[key].parent_columns.push(fk.parent_column);
  }

  // Get unique constraints
  const ucResult = await pool.query(`
    SELECT tc.table_schema || '.' || tc.table_name as tbl,
           tc.constraint_name,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema IN ('l1', 'l2', 'l3')
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
    ORDER BY tc.table_schema, tc.table_name
  `);

  // Get indexes
  const idxResult = await pool.query(`
    SELECT schemaname || '.' || tablename as tbl, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname IN ('l1', 'l2', 'l3')
    AND indexname NOT LIKE '%_pkey'
    AND indexdef NOT LIKE '%UNIQUE%'
    ORDER BY schemaname, tablename, indexname
  `);

  const RESERVED = new Set(['value', 'all', 'and', 'array', 'as', 'between', 'case', 'check',
    'column', 'constraint', 'create', 'cross', 'default', 'distinct', 'do', 'else', 'end',
    'except', 'false', 'fetch', 'for', 'foreign', 'from', 'full', 'grant', 'group', 'having',
    'in', 'inner', 'into', 'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
    'offset', 'on', 'only', 'or', 'order', 'outer', 'primary', 'references', 'right', 'select',
    'table', 'then', 'to', 'true', 'union', 'unique', 'user', 'using', 'when', 'where', 'window', 'with']);

  function quoteCol(name) {
    return RESERVED.has(name.toLowerCase()) ? '"' + name + '"' : name;
  }

  const schemas = ['l1', 'l2', 'l3'];

  for (const schema of schemas) {
    w('-- ==========================================================');
    w('-- SCHEMA: ' + schema.toUpperCase());
    w('-- ==========================================================');
    w('');

    const tables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
      [schema]
    );

    // Phase 1: DDL
    for (const t of tables.rows) {
      const tbl = schema + '.' + t.tablename;

      const cols = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale,
               column_default, is_nullable, udt_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, t.tablename]);

      const pk = await pool.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
      `, [schema, t.tablename]);

      w('DROP TABLE IF EXISTS ' + tbl + ' CASCADE;');
      w('CREATE TABLE ' + tbl + ' (');

      const colDefs = [];
      for (const c of cols.rows) {
        const cn = quoteCol(c.column_name);
        let td;

        if (c.column_default && c.column_default.includes('nextval')) {
          td = cn + ' BIGSERIAL';
        } else if (c.udt_name === 'int8' || c.data_type === 'bigint') {
          td = cn + ' BIGINT';
        } else if (c.udt_name === 'int4' || c.data_type === 'integer') {
          td = cn + ' INTEGER';
        } else if (c.udt_name === 'int2' || c.data_type === 'smallint') {
          td = cn + ' SMALLINT';
        } else if (c.data_type === 'numeric') {
          td = cn + ' NUMERIC(' + (c.numeric_precision || 20) + ',' + (c.numeric_scale || 4) + ')';
        } else if (c.data_type === 'double precision') {
          td = cn + ' DOUBLE PRECISION';
        } else if (c.data_type === 'real') {
          td = cn + ' REAL';
        } else if (c.data_type === 'character varying') {
          td = cn + ' VARCHAR(' + (c.character_maximum_length || 255) + ')';
        } else if (c.data_type === 'character') {
          td = cn + ' CHAR(' + (c.character_maximum_length || 1) + ')';
        } else if (c.data_type === 'text') {
          td = cn + ' TEXT';
        } else if (c.data_type === 'boolean') {
          td = cn + ' BOOLEAN';
        } else if (c.data_type === 'date') {
          td = cn + ' DATE';
        } else if (c.data_type === 'timestamp without time zone') {
          td = cn + ' TIMESTAMP';
        } else if (c.data_type === 'timestamp with time zone') {
          td = cn + ' TIMESTAMPTZ';
        } else if (c.data_type === 'jsonb') {
          td = cn + ' JSONB';
        } else if (c.data_type === 'json') {
          td = cn + ' JSON';
        } else if (c.data_type === 'uuid') {
          td = cn + ' UUID';
        } else {
          td = cn + ' ' + c.data_type.toUpperCase();
        }

        // Add defaults (skip nextval — handled by BIGSERIAL)
        if (c.column_default && !c.column_default.includes('nextval')) {
          td += ' DEFAULT ' + c.column_default;
        }

        if (c.is_nullable === 'NO' && !pk.rows.find(p => p.column_name === c.column_name)) {
          td += ' NOT NULL';
        }

        colDefs.push('  ' + td);
      }

      if (pk.rows.length > 0) {
        colDefs.push('  PRIMARY KEY (' + pk.rows.map(p => quoteCol(p.column_name)).join(', ') + ')');
      }

      w(colDefs.join(',\n'));
      w(');');
      w('');
    }

    // Phase 2: Data
    w('-- --- DATA for ' + schema.toUpperCase() + ' ---');
    w('');

    for (const t of tables.rows) {
      const tbl = schema + '.' + t.tablename;

      const cnt = await pool.query('SELECT COUNT(*) as c FROM ' + tbl);
      const rowCount = parseInt(cnt.rows[0].c);
      if (rowCount === 0) continue;

      console.log('  Dumping ' + tbl + ' (' + rowCount + ' rows)...');

      const cols = await pool.query(`
        SELECT column_name, data_type, udt_name, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, t.tablename]);

      // Skip auto-generated serial columns for INSERT
      const insertCols = cols.rows.filter(c => {
        return !(c.column_default && c.column_default.includes('nextval'));
      });

      const colNames = insertCols.map(c => quoteCol(c.column_name)).join(', ');
      const selectCols = insertCols.map(c => quoteCol(c.column_name)).join(', ');

      // Fetch data in batches
      const BATCH = 500;
      let offset = 0;

      while (offset < rowCount) {
        const data = await pool.query(
          'SELECT ' + selectCols + ' FROM ' + tbl + ' ORDER BY 1 LIMIT ' + BATCH + ' OFFSET ' + offset
        );

        for (const row of data.rows) {
          const vals = insertCols.map(c => {
            const v = row[c.column_name];
            if (v === null || v === undefined) return 'NULL';
            if (c.data_type === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (['bigint', 'integer', 'smallint', 'numeric', 'double precision', 'real'].includes(c.data_type)
                || c.udt_name === 'int8' || c.udt_name === 'int4' || c.udt_name === 'int2') {
              return String(v);
            }
            if (c.data_type === 'jsonb' || c.data_type === 'json') {
              return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
            }
            if (v instanceof Date) {
              return "'" + v.toISOString() + "'";
            }
            return "'" + String(v).replace(/'/g, "''") + "'";
          });
          w('INSERT INTO ' + tbl + ' (' + colNames + ') VALUES (' + vals.join(', ') + ');');
        }

        offset += BATCH;
      }
      w('');
    }
  }

  // Phase 3: FK constraints (added after all data)
  w('-- ==========================================================');
  w('-- FOREIGN KEY CONSTRAINTS');
  w('-- ==========================================================');
  w('');

  for (const key of Object.keys(fksByTable)) {
    const fk = fksByTable[key];
    const childCols = fk.child_columns.map(quoteCol).join(', ');
    const parentCols = fk.parent_columns.map(quoteCol).join(', ');
    w('ALTER TABLE ' + fk.child_table + ' ADD CONSTRAINT ' + fk.constraint_name
      + ' FOREIGN KEY (' + childCols + ') REFERENCES ' + fk.parent_table + ' (' + parentCols + ');');
  }
  w('');

  // Phase 4: Unique constraints
  w('-- ==========================================================');
  w('-- UNIQUE CONSTRAINTS');
  w('-- ==========================================================');
  w('');
  for (const uc of ucResult.rows) {
    w('ALTER TABLE ' + uc.tbl + ' ADD CONSTRAINT ' + uc.constraint_name + ' UNIQUE (' + uc.columns + ');');
  }
  w('');

  // Phase 5: Indexes
  w('-- ==========================================================');
  w('-- INDEXES');
  w('-- ==========================================================');
  w('');
  for (const idx of idxResult.rows) {
    w(idx.indexdef + ';');
  }
  w('');

  // Reset sequences
  w('-- ==========================================================');
  w('-- SEQUENCE RESETS');
  w('-- ==========================================================');
  w('');

  for (const schema of schemas) {
    const seqs = await pool.query(`
      SELECT s.relname as seq_name, n.nspname as seq_schema,
             t.relname as table_name, a.attname as column_name
      FROM pg_class s
      JOIN pg_namespace n ON s.relnamespace = n.oid
      JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
      JOIN pg_class t ON d.refobjid = t.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
      WHERE s.relkind = 'S' AND n.nspname = $1
    `, [schema]);

    for (const seq of seqs.rows) {
      const maxVal = await pool.query(
        'SELECT COALESCE(MAX(' + quoteCol(seq.column_name) + '), 0) + 1 as next_val FROM ' + schema + '.' + seq.table_name
      );
      w("SELECT setval('" + schema + '.' + seq.seq_name + "', " + maxVal.rows[0].next_val + ", false);");
    }
  }

  w('');
  w('COMMIT;');
  w('');
  w('-- End of dump');

  const content = lines.join('\n');
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, content);

  const sizeMB = (Buffer.byteLength(content) / 1024 / 1024).toFixed(2);
  console.log('\nDump complete: ' + OUTPUT + ' (' + sizeMB + ' MB)');
  console.log('Total lines: ' + lines.length);

  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

#!/usr/bin/env node
/**
 * Fix DDL audit issues across L1, L2, L3 DDL files.
 *
 * Changes:
 * - L1: _code PK columns BIGINT→VARCHAR(30), is_* VARCHAR→BOOLEAN with _flag suffix
 * - L2: _code FK columns BIGINT→VARCHAR(30), is_* VARCHAR→BOOLEAN with _flag suffix
 * - L3: Add BIGSERIAL PRIMARY KEY to tables without PKs, _id VARCHAR(64)→BIGINT
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── L1 DDL Fixes ───────────────────────────────────────────────────────────

function fixL1DDL() {
  const path = resolve(ROOT, 'sql/gsib-export/01-l1-ddl.sql');
  let sql = readFileSync(path, 'utf8');
  let changes = 0;

  // 1. Fix _code PKs: BIGINT → VARCHAR(30)
  const codePKFixes = [
    { col: 'fr2590_category_code', table: 'fr2590_category_dim' },
    { col: 'credit_event_type_code', table: 'credit_event_type_dim' },
    { col: 'credit_status_code', table: 'credit_status_dim' },
  ];

  for (const { col } of codePKFixes) {
    const re = new RegExp(`"${col}" BIGINT NOT NULL`, 'g');
    const newSql = sql.replace(re, `"${col}" VARCHAR(30) NOT NULL`);
    if (newSql !== sql) { changes++; sql = newSql; }
  }

  // Also fix rating_grade_code (not a PK, just a column)
  {
    const re = /    "rating_grade_code" BIGINT,/g;
    const newSql = sql.replace(re, '    "rating_grade_code" VARCHAR(30),');
    if (newSql !== sql) { changes++; sql = newSql; }
  }

  // 2. Fix is_* fields: VARCHAR → BOOLEAN + add _flag suffix
  // Pattern: "is_xxx" VARCHAR(NN) → "is_xxx_flag" BOOLEAN
  // But skip fields that already have _flag suffix
  const isFieldPattern = /    "(is_\w+)" (VARCHAR\(\d+\))(,?)/g;
  sql = sql.replace(isFieldPattern, (match, fieldName, _type, comma) => {
    if (fieldName.endsWith('_flag')) return match; // already correct
    changes++;
    return `    "${fieldName}_flag" BOOLEAN${comma}`;
  });

  writeFileSync(path, sql);
  console.log(`L1 DDL: ${changes} changes applied`);
}

// ─── L2 DDL Fixes ───────────────────────────────────────────────────────────

function fixL2DDL() {
  const path = resolve(ROOT, 'sql/gsib-export/02-l2-ddl.sql');
  let sql = readFileSync(path, 'utf8');
  let changes = 0;

  // 1. Fix _code FK columns: BIGINT → VARCHAR(30)
  // credit_status_code in facility_delinquency_snapshot
  {
    const old = '    "credit_status_code" BIGINT,';
    const replacement = '    "credit_status_code" VARCHAR(30),';
    if (sql.includes(old)) {
      sql = sql.replace(old, replacement);
      changes++;
    }
  }
  // credit_event_type_code in credit_event
  {
    const old = '    "credit_event_type_code" BIGINT,';
    const replacement = '    "credit_event_type_code" VARCHAR(30),';
    if (sql.includes(old)) {
      sql = sql.replace(old, replacement);
      changes++;
    }
  }

  // 2. Fix is_* fields: VARCHAR → BOOLEAN + add _flag suffix
  const isFieldPattern = /    "(is_\w+)" (VARCHAR\(\d+\))(,?)/g;
  sql = sql.replace(isFieldPattern, (match, fieldName, _type, comma) => {
    if (fieldName.endsWith('_flag')) return match;
    changes++;
    return `    "${fieldName}_flag" BOOLEAN${comma}`;
  });

  writeFileSync(path, sql);
  console.log(`L2 DDL: ${changes} changes applied`);
}

// ─── L3 DDL Fixes ───────────────────────────────────────────────────────────

function fixL3DDL() {
  const path = resolve(ROOT, 'sql/l3/01_DDL_all_tables.sql');
  let sql = readFileSync(path, 'utf8');
  let changes = 0;

  // Exception IDs that should stay VARCHAR
  const keepVarchar = new Set([
    'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
    'mapped_line_id', 'mapped_column_id',
    'run_id',  // string identifier in calc_run
  ]);

  // 1. Fix _id VARCHAR(64) → BIGINT (except exceptions)
  const idPattern = /    "(\w+_id)" VARCHAR\(64\)/g;
  sql = sql.replace(idPattern, (match, fieldName) => {
    if (keepVarchar.has(fieldName)) return match;
    changes++;
    return `    "${fieldName}" BIGINT`;
  });

  // 2. Add BIGSERIAL PRIMARY KEY to tables without one
  // Split into CREATE TABLE blocks and add PK where missing
  const tableBlocks = sql.split(/(?=-- \w)/);
  const result = [];

  for (const block of tableBlocks) {
    if (!block.includes('CREATE TABLE')) {
      result.push(block);
      continue;
    }

    if (block.includes('PRIMARY KEY')) {
      result.push(block);
      continue;
    }

    // Extract table name for the surrogate key name
    const tableMatch = block.match(/CREATE TABLE IF NOT EXISTS "l3"\."(\w+)"/);
    if (!tableMatch) {
      result.push(block);
      continue;
    }

    const tableName = tableMatch[1];

    // Add surrogate_id BIGSERIAL NOT NULL as first column and PK at end
    // Find the opening paren after CREATE TABLE line
    const modified = block.replace(
      /CREATE TABLE IF NOT EXISTS "l3"\."(\w+)" \(\n/,
      `CREATE TABLE IF NOT EXISTS "l3"."$1" (\n    "${tableName}_sk" BIGSERIAL NOT NULL,\n`
    );

    // Add PRIMARY KEY before closing );
    const withPK = modified.replace(
      /\n\);/,
      `,\n    PRIMARY KEY ("${tableName}_sk")\n);`
    );

    if (withPK !== block) changes++;
    result.push(withPK);
  }

  sql = result.join('');
  writeFileSync(path, sql);
  console.log(`L3 DDL: ${changes} changes applied`);
}

// ─── Run all fixes ──────────────────────────────────────────────────────────

console.log('Applying DDL audit fixes...\n');
fixL1DDL();
fixL2DDL();
fixL3DDL();
console.log('\nDone!');

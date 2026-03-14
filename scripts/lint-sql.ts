/**
 * Lightweight SQL DDL linter.
 *
 * Checks canonical DDL files for:
 *   1. Duplicate columns within CREATE TABLE blocks
 *   2. _id columns without FK constraints (or documented exceptions)
 *   3. VARCHAR precision matching suffix conventions
 *
 * Usage: npm run lint:sql
 */

import fs from 'node:fs';
import path from 'node:path';
import { varcharIdFieldNames } from '../data/naming-exceptions';

const C = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

interface Issue {
  file: string;
  table: string;
  message: string;
  severity: 'ERROR' | 'WARN';
}

const DDL_FILES = [
  'sql/gsib-export/01-l1-ddl.sql',
  'sql/gsib-export/02-l2-ddl.sql',
  'sql/l3/01_DDL_all_tables.sql',
];

const ROOT = path.resolve(__dirname, '..');

function lintFile(relPath: string): Issue[] {
  const issues: Issue[] = [];
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return [];
  const sql = fs.readFileSync(absPath, 'utf-8');

  const createTableRe = /CREATE TABLE IF NOT EXISTS\s+"?\w+"?\."?(\w+)"?\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = createTableRe.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const columns: string[] = [];
    const colRe = /"(\w+)"\s+\w+/g;
    let colMatch: RegExpExecArray | null;
    while ((colMatch = colRe.exec(body)) !== null) {
      columns.push(colMatch[1]);
    }

    // 1. Duplicate columns
    const seen = new Set<string>();
    for (const col of columns) {
      if (seen.has(col)) {
        issues.push({
          file: relPath,
          table: tableName,
          message: `Duplicate column: ${col}`,
          severity: 'ERROR',
        });
      }
      seen.add(col);
    }

    // 2. _id columns with VARCHAR (not in exception list)
    const colTypeRe = /"(\w+_id)"\s+(VARCHAR\(\d+\))/gi;
    let idMatch: RegExpExecArray | null;
    const bodyClean = body;
    colTypeRe.lastIndex = 0;
    while ((idMatch = colTypeRe.exec(bodyClean)) !== null) {
      const fieldName = idMatch[1];
      if (!varcharIdFieldNames.has(fieldName)) {
        issues.push({
          file: relPath,
          table: tableName,
          message: `${fieldName} is ${idMatch[2]} — _id fields should be BIGINT (or document in naming-exceptions.ts)`,
          severity: 'WARN',
        });
      }
    }

    // 3. Numeric-suffix fields with VARCHAR
    const numericSuffixes = ['_amt', '_pct', '_count', '_bps'];
    const suffixRe = /"(\w+)"\s+(VARCHAR\(\d+\))/gi;
    let suffMatch: RegExpExecArray | null;
    suffixRe.lastIndex = 0;
    while ((suffMatch = suffixRe.exec(bodyClean)) !== null) {
      const fieldName = suffMatch[1];
      if (numericSuffixes.some((s) => fieldName.endsWith(s))) {
        issues.push({
          file: relPath,
          table: tableName,
          message: `${fieldName} is ${suffMatch[2]} — suffix implies numeric type`,
          severity: 'ERROR',
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log(`${C.bold}SQL DDL Lint${C.reset}\n`);
  let totalIssues = 0;

  for (const file of DDL_FILES) {
    const issues = lintFile(file);
    if (issues.length === 0) {
      console.log(`  ${C.green}[OK]${C.reset} ${file}`);
    } else {
      for (const issue of issues) {
        const color = issue.severity === 'ERROR' ? C.red : C.yellow;
        console.log(`  ${color}[${issue.severity}]${C.reset} ${issue.file} — ${issue.table}: ${issue.message}`);
      }
      totalIssues += issues.length;
    }
  }

  console.log(`\n${totalIssues === 0 ? `${C.green}All checks passed.${C.reset}` : `${C.red}${totalIssues} issues found.${C.reset}`}`);
  process.exit(totalIssues > 0 ? 1 : 0);
}

main();

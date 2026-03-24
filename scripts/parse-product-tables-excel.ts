#!/usr/bin/env tsx
/**
 * Parse Product_tables.xlsx and generate PostgreSQL DDL migrations.
 *
 * Usage:
 *   npx tsx scripts/parse-product-tables-excel.ts --product loans --output sql/migrations/028-product-tables-loans.sql
 *   npx tsx scripts/parse-product-tables-excel.ts --all --output sql/migrations/
 *   npx tsx scripts/parse-product-tables-excel.ts --dry-run               # print summary, no files
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────────────────────────────────

const EXCEL_PATH = path.resolve(__dirname, '..', '..', 'Downloads', 'Product_tables.xlsx');

/** Map Excel "Product" values → snake_case table prefix */
const PRODUCT_MAP: Record<string, string> = {
  'Borrowings': 'borrowings',
  'Debt': 'debt',
  'Deposits': 'deposits',
  'Derivatives': 'derivatives',
  'Equities': 'equities',
  'Loans': 'loans',
  'Off-BS Commitments': 'offbs_commitments',
  'Secured Financing Transactions': 'sft',
  'Securities': 'securities',
  'Stock': 'stock',
};

/** Map Excel "Target Table" values → snake_case table suffix */
const CATEGORY_MAP: Record<string, string> = {
  'Accounting & Balances': 'accounting',
  'Classification & Relationships': 'classification',
  'Indicative Record': 'indicative',
  'Risk & Other': 'risk',
};

/** Map Excel "Target Table" → L2 metadata category */
const CATEGORY_TO_META: Record<string, string> = {
  'accounting': 'Financial Performance',
  'classification': 'Counterparty & Entity',
  'indicative': 'Exposure & Position',
  'risk': 'Credit Risk & Ratings',
};

/** Migration file number per product group */
const MIGRATION_NUMBERS: Record<string, string> = {
  'loans': '028',
  'derivatives': '029',
  'offbs_commitments': '029',
  'sft': '030',
  'securities': '030',
  'deposits': '031',
  'borrowings': '031',
  'debt': '031',
  'equities': '032',
  'stock': '032',
};

// ── Type inference (mirrors lib/ddl-generator.ts sqlTypeForField) ────────────

/** Monetary/amount keywords — if a column name contains these and Excel says INTEGER, override to NUMERIC */
const MONETARY_KEYWORDS = [
  'amount', 'balance', 'value', 'exposure', 'cost', 'price', 'loss',
  'recovery', 'charge_off', 'write_down', 'allowance', 'premium',
  'discount', 'income', 'expense', 'revenue', 'gain', 'fair_value',
  'market_value', 'book_value', 'carrying', 'funded', 'unfunded',
  'committed', 'uncommitted', 'utilized', 'collateral', 'lendable',
  'maturity_amount', 'settlement', 'notional', 'accrued', 'principal',
  'coupon', 'dividend', 'bs_amount', 'usd_equivalent', 'net_asset',
  'gross_asset', 'impairment', 'provision', 'reserve', 'write_off',
  'eligible_im', 'eligible_vm', 'ineligible_im', 'ineligible_vm',
  'original_loan_line_commitment', 'total_debt_at_time',
  'book_yield', 'trade_quantity', 'transaction_quantity',
];

/** Rate/ratio keywords — if Excel says INTEGER but name suggests a rate, override to NUMERIC(10,6) */
const RATE_KEYWORDS = [
  '_rate', '_ratio', '_yield', '_spread', '_margin', '_multiplier',
  'percent', 'dti_ratio', 'conversion_factor', 'net_gross_ratio',
  'ceiling_rate', 'floor_rate', 'current_rate',
];

function looksLikeMonetary(name: string): boolean {
  const lower = name.toLowerCase();
  return MONETARY_KEYWORDS.some(kw => lower.includes(kw));
}

function inferSqlType(columnName: string, excelDataType: string | undefined): string {
  const name = columnName.toLowerCase();

  // GSIB override: Excel marks many monetary fields as INTEGER — override to NUMERIC(20,4)
  // A GSIB cannot store accounting balances as integers (rounds to nearest dollar, breaks reconciliation)
  if (excelDataType?.trim().toUpperCase() === 'INTEGER') {
    if (looksLikeMonetary(name)) return 'NUMERIC(20,4)';
    if (RATE_KEYWORDS.some(kw => name.includes(kw))) return 'NUMERIC(10,6)';
  }

  // Use explicit type from Excel if it's a valid SQL type
  if (excelDataType) {
    const upper = excelDataType.trim().toUpperCase();
    if (upper.startsWith('DECIMAL') || upper.startsWith('NUMERIC')) {
      // Normalize DECIMAL → NUMERIC for PostgreSQL consistency
      return upper.replace('DECIMAL', 'NUMERIC');
    }
    if (upper.startsWith('VARCHAR') || upper === 'TEXT' || upper === 'DATE' ||
        upper === 'TIMESTAMP' || upper === 'BOOLEAN' || upper === 'INTEGER' ||
        upper === 'BIGINT' || upper.startsWith('NUMERIC')) {
      return upper;
    }
    // Map logical types from Excel
    if (upper === 'STRING' || upper === 'PICKLIST') return 'VARCHAR(100)';
    if (upper === 'CURRENCY') return 'NUMERIC(20,4)';
    if (upper === 'PERCENTAGE' || upper === 'PERCENT') return 'NUMERIC(10,6)';
    if (upper === 'NUMBER' || upper === 'INT') return 'NUMERIC(18,2)';
    if (upper === 'BOOLEAN' || upper === 'BOOL') return 'BOOLEAN';
    if (upper === 'DATE') return 'DATE';
  }

  // Fall back to naming convention contract
  if (name.endsWith('_id')) return 'BIGINT';
  if (name.endsWith('_code')) return 'VARCHAR(30)';
  if (name.endsWith('_name') || name.endsWith('_desc') || name.endsWith('_text')) return 'VARCHAR(500)';
  if (name.endsWith('_amt') || name.endsWith('_amount')) return 'NUMERIC(20,4)';
  if (name.endsWith('_pct') || name.endsWith('_percent') || name.endsWith('_rate')) return 'NUMERIC(10,6)';
  if (name.endsWith('_value')) return 'NUMERIC(12,6)';
  if (name.endsWith('_count') || name.endsWith('_number')) return 'INTEGER';
  if (name.endsWith('_flag')) return 'BOOLEAN';
  if (name.endsWith('_date')) return 'DATE';
  if (name.endsWith('_ts') || name.endsWith('_timestamp')) return 'TIMESTAMP';
  if (name.endsWith('_bps')) return 'NUMERIC(10,4)';
  return 'VARCHAR(255)';
}

/** PostgreSQL reserved words that need double-quoting */
const PG_RESERVED = new Set([
  'all', 'and', 'array', 'as', 'between', 'case', 'check', 'column', 'constraint',
  'create', 'cross', 'default', 'distinct', 'do', 'else', 'end', 'except', 'false',
  'fetch', 'for', 'foreign', 'from', 'full', 'grant', 'group', 'having', 'in',
  'inner', 'into', 'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
  'offset', 'on', 'only', 'or', 'order', 'outer', 'primary', 'references', 'right',
  'select', 'table', 'then', 'to', 'true', 'union', 'unique', 'user', 'using',
  'value', 'when', 'where', 'window', 'with',
]);

function quoteIfReserved(name: string): string {
  // Quote if reserved word OR starts with a digit (invalid unquoted identifier)
  if (PG_RESERVED.has(name.toLowerCase()) || /^[0-9]/.test(name)) {
    return `"${name}"`;
  }
  return name;
}

// ── Excel parsing ───────────────────────────────────────────────────────────

interface ExcelRow {
  Product: string;
  'Source Table': string;
  'Product-Specific Data Element': string;
  'Database Column Name': string;
  'Normalized Data Element': string;
  'Target Table': string;
  'Logical Data Type': string;
  'Database Data Type': string;
  Definition: string;
}

interface FieldDef {
  columnName: string;
  sqlType: string;
  description: string;
  logicalType: string;
  normalizedName: string;
}

interface TableDef {
  product: string;
  productPrefix: string;
  category: string;
  categoryPrefix: string;
  tableName: string;       // e.g., loans_indicative_snapshot
  fields: FieldDef[];
}

function parseExcel(excelPath: string): Map<string, TableDef> {
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(ws);

  // Group by (product, target_table)
  const grouped = new Map<string, { product: string; category: string; fields: ExcelRow[] }>();

  for (const row of rows) {
    const productPrefix = PRODUCT_MAP[row.Product];
    const categoryPrefix = CATEGORY_MAP[row['Target Table']];
    if (!productPrefix || !categoryPrefix) {
      console.warn(`  SKIP: unknown product="${row.Product}" or category="${row['Target Table']}"`);
      continue;
    }
    const key = `${productPrefix}__${categoryPrefix}`;
    if (!grouped.has(key)) {
      grouped.set(key, { product: row.Product, category: row['Target Table'], fields: [] });
    }
    grouped.get(key)!.fields.push(row);
  }

  // Convert to TableDef
  const tables = new Map<string, TableDef>();
  for (const [key, group] of grouped) {
    const [productPrefix, categoryPrefix] = key.split('__');
    const tableName = `${productPrefix}_${categoryPrefix}_snapshot`;

    // Deduplicate fields by column name (some appear multiple times in Excel)
    const seen = new Set<string>();
    const fields: FieldDef[] = [];

    // Always add PK fields first
    // (these come from position, not from Excel)

    for (const row of group.fields) {
      const colName = row['Database Column Name']?.trim().toLowerCase().replace(/\s+/g, '_');
      if (!colName || seen.has(colName)) continue;
      // Skip fields that are the PK (position_id, as_of_date) — we add those separately
      if (colName === 'position_id' || colName === 'as_of_date') continue;
      seen.add(colName);

      fields.push({
        columnName: colName,
        sqlType: inferSqlType(colName, row['Database Data Type']),
        description: row.Definition || '',
        logicalType: row['Logical Data Type'] || '',
        normalizedName: row['Normalized Data Element'] || '',
      });
    }

    tables.set(key, {
      product: group.product,
      productPrefix,
      category: group.category,
      categoryPrefix,
      tableName,
      fields,
    });
  }

  return tables;
}

// ── DDL Generation ──────────────────────────────────────────────────────────

function generateCreateTable(table: TableDef): string {
  const lines: string[] = [];
  lines.push(`-- ${table.product} / ${table.category}`);
  lines.push(`-- ${table.fields.length} product-specific fields + 2 PK fields`);
  lines.push(`CREATE TABLE IF NOT EXISTS l2.${table.tableName} (`);

  // PK fields
  lines.push(`    position_id          BIGINT       NOT NULL,`);
  lines.push(`    as_of_date           DATE         NOT NULL,`);

  // Product-specific fields
  for (let i = 0; i < table.fields.length; i++) {
    const f = table.fields[i];
    const colId = quoteIfReserved(f.columnName);
    const pad = ' '.repeat(Math.max(1, 24 - colId.length));
    const comma = i < table.fields.length - 1 ? ',' : ',';
    lines.push(`    ${colId}${pad}${f.sqlType}${comma}`);
  }

  // Audit fields
  lines.push(`    created_ts            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`);
  lines.push(`    updated_ts            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`);

  // PK + FK
  lines.push(`    PRIMARY KEY (position_id, as_of_date)`);
  lines.push(`);`);
  lines.push('');

  return lines.join('\n');
}

function generateFKConstraint(table: TableDef): string {
  // Abbreviate for 63-char constraint name limit
  const abbrev = table.tableName
    .replace('indicative', 'indic')
    .replace('accounting', 'acctg')
    .replace('classification', 'class')
    .replace('snapshot', 'snap')
    .replace('commitments', 'commit')
    .replace('borrowings', 'borr')
    .replace('derivatives', 'deriv')
    .replace('deposits', 'dep')
    .replace('equities', 'eq')
    .replace('securities', 'sec');

  const constraintName = `fk_${abbrev}_pos`.substring(0, 63);
  return `ALTER TABLE l2.${table.tableName}\n  ADD CONSTRAINT ${constraintName}\n  FOREIGN KEY (position_id) REFERENCES l2.position(position_id);\n`;
}

function generateMigrationFile(tables: TableDef[], migrationNumber: string, label: string): string {
  const lines: string[] = [];
  lines.push(`-- Migration ${migrationNumber}: Product tables — ${label}`);
  lines.push(`-- Generated by scripts/parse-product-tables-excel.ts`);
  lines.push(`-- Date: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('SET search_path TO l1, l2, l3, public;');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // CREATE TABLE statements
  for (const table of tables) {
    lines.push(generateCreateTable(table));
  }

  // FK constraints (after all tables created)
  lines.push('-- Foreign key constraints');
  for (const table of tables) {
    lines.push(generateFKConstraint(table));
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

// ── L2 metadata entries (for data/l2-table-meta.ts) ─────────────────────────

function generateMetaEntries(tables: TableDef[]): string {
  const entries: string[] = [];
  for (const t of tables) {
    const metaCat = CATEGORY_TO_META[t.categoryPrefix] || 'Exposure & Position';
    entries.push(`  { name: '${t.tableName}', scd: 'Snapshot' as const, category: '${metaCat}' },`);
  }
  return entries.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flagAll = args.includes('--all');
  const flagDryRun = args.includes('--dry-run');
  const productIdx = args.indexOf('--product');
  const outputIdx = args.indexOf('--output');
  const excelIdx = args.indexOf('--excel');

  const excelPath = excelIdx >= 0 ? args[excelIdx + 1] : EXCEL_PATH;
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : undefined;

  if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found: ${excelPath}`);
    process.exit(1);
  }

  console.log(`Parsing: ${excelPath}`);
  const allTables = parseExcel(excelPath);

  // Summary
  console.log(`\nFound ${allTables.size} product×category combinations:\n`);
  const byProduct = new Map<string, TableDef[]>();
  for (const [, table] of allTables) {
    const list = byProduct.get(table.productPrefix) || [];
    list.push(table);
    byProduct.set(table.productPrefix, list);
  }

  let totalFields = 0;
  for (const [prefix, tables] of byProduct) {
    const fieldCount = tables.reduce((sum, t) => sum + t.fields.length, 0);
    totalFields += fieldCount;
    console.log(`  ${prefix.padEnd(20)} ${tables.length} tables, ${fieldCount} fields`);
    for (const t of tables) {
      console.log(`    ${t.tableName.padEnd(45)} ${t.fields.length} fields`);
    }
  }
  console.log(`\n  TOTAL: ${allTables.size} tables, ${totalFields} fields`);

  if (flagDryRun) {
    console.log('\n--dry-run: no files written');

    // Print metadata entries
    console.log('\n=== L2 Metadata Entries (for data/l2-table-meta.ts) ===\n');
    for (const [, tables] of byProduct) {
      console.log(generateMetaEntries(tables));
    }
    return;
  }

  // Filter by product if specified
  let productsToGenerate: string[];
  if (flagAll) {
    productsToGenerate = [...byProduct.keys()];
  } else if (productIdx >= 0) {
    const product = args[productIdx + 1];
    if (!byProduct.has(product)) {
      console.error(`Unknown product: ${product}. Valid: ${[...byProduct.keys()].join(', ')}`);
      process.exit(1);
    }
    productsToGenerate = [product];
  } else {
    console.log('\nSpecify --product <name> or --all to generate DDL');
    process.exit(0);
  }

  // Group products by migration number for combined migration files
  const migrationGroups = new Map<string, { tables: TableDef[]; products: string[] }>();
  for (const product of productsToGenerate) {
    const tables = byProduct.get(product)!;
    const migNum = MIGRATION_NUMBERS[product] || '099';
    if (!migrationGroups.has(migNum)) {
      migrationGroups.set(migNum, { tables: [], products: [] });
    }
    migrationGroups.get(migNum)!.tables.push(...tables);
    migrationGroups.get(migNum)!.products.push(product);
  }

  // Generate migration files
  for (const [migNum, group] of migrationGroups) {
    const label = group.products.join(' + ');
    const sql = generateMigrationFile(group.tables, migNum, label);

    let filePath: string;
    if (outputPath) {
      if (outputPath.endsWith('/') || fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        // Output to directory — one file per migration number
        const fileName = `${migNum}-product-tables-${group.products.join('-')}.sql`;
        filePath = path.join(outputPath, fileName);
      } else {
        filePath = outputPath;
      }
    } else {
      filePath = path.resolve(__dirname, '..', 'sql', 'migrations', `${migNum}-product-tables-${group.products.join('-')}.sql`);
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, sql);
    console.log(`\nWrote: ${filePath} (${group.tables.length} tables, ${group.tables.reduce((s, t) => s + t.fields.length, 0)} fields)`);

    // Also print metadata entries
    console.log(`\n  L2 metadata entries for ${label}:`);
    console.log(generateMetaEntries(group.tables));
  }
}

main();

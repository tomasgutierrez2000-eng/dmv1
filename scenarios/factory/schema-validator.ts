/**
 * Schema Validator — validates factory-generated data against the data dictionary.
 *
 * This module reads the golden-source data dictionary and validates that:
 *   1. Every table referenced by the factory exists in the DD
 *   2. Every column in generated rows exists in that table's DD definition
 *   3. Column names haven't drifted from PG schema
 *
 * This is the SYSTEMIC fix for schema drift — runs automatically as part of
 * the factory pipeline, preventing any SQL emission with non-existent tables/columns.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

/* ────────────────── Types ────────────────── */

interface DDField {
  name: string;
  data_type?: string;
  pk_fk?: string;
  [key: string]: unknown;
}

interface DDTable {
  name: string;
  layer: string;  // L1, L2, L3
  fields: DDField[];
  [key: string]: unknown;
}

/**
 * The DD format uses layer keys (L1, L2, L3) as top-level, each containing arrays of tables.
 * Each table has `name` (not `table_name`) and `layer` (not `schema`).
 */
interface DataDictionary {
  L1?: DDTable[];
  L2?: DDTable[];
  L3?: DDTable[];
  [key: string]: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    tablesChecked: number;
    columnsChecked: number;
    tablesNotInDD: string[];
    columnsNotInDD: Array<{ table: string; column: string }>;
  };
}

/* ────────────────── Schema Registry ────────────────── */

/**
 * In-memory registry of valid table→column mappings from the data dictionary.
 * Built once at pipeline start, used for all scenario validation.
 */
export class SchemaRegistry {
  /** Map of "schema.table" → Set<column_name> */
  private tableColumns: Map<string, Set<string>> = new Map();
  private loadedFrom: string = '';

  /**
   * Load the schema registry from the data dictionary JSON file.
   * This is the golden source of truth for what exists in PostgreSQL.
   */
  static fromDataDictionary(ddPath?: string): SchemaRegistry {
    const registry = new SchemaRegistry();

    // Default path to data dictionary
    const resolvedPath = ddPath ?? path.join(
      __dirname, '..', '..', 'facility-summary-mvp', 'output',
      'data-dictionary', 'data-dictionary.json',
    );

    if (!existsSync(resolvedPath)) {
      throw new Error(
        `Data dictionary not found at ${resolvedPath}. ` +
        `Run 'npm run db:introspect' to generate it.`,
      );
    }

    const raw = readFileSync(resolvedPath, 'utf-8');
    const dd: DataDictionary = JSON.parse(raw);

    // DD format: top-level keys are L1, L2, L3, each containing table arrays
    const layers = ['L1', 'L2', 'L3'] as const;
    let tableCount = 0;

    for (const layer of layers) {
      const tables = dd[layer];
      if (!Array.isArray(tables)) continue;

      const schema = layer.toLowerCase(); // L1 → l1, L2 → l2, L3 → l3
      for (const table of tables) {
        const key = `${schema}.${table.name}`;
        const columns = new Set<string>();
        if (Array.isArray(table.fields)) {
          for (const field of table.fields) {
            columns.add(field.name);
          }
        }
        registry.tableColumns.set(key, columns);
        tableCount++;
      }
    }

    if (tableCount === 0) {
      throw new Error('Data dictionary contains no tables across L1/L2/L3');
    }

    registry.loadedFrom = resolvedPath;
    return registry;
  }

  /** Check if a table exists in the DD. */
  hasTable(qualifiedName: string): boolean {
    return this.tableColumns.has(qualifiedName);
  }

  /** Check if a column exists in a table. */
  hasColumn(qualifiedTable: string, column: string): boolean {
    const cols = this.tableColumns.get(qualifiedTable);
    return cols ? cols.has(column) : false;
  }

  /** Get all columns for a table. */
  getColumns(qualifiedTable: string): Set<string> | undefined {
    return this.tableColumns.get(qualifiedTable);
  }

  /** Get summary stats. */
  summary(): { tables: number; totalColumns: number; loadedFrom: string } {
    let totalColumns = 0;
    for (const cols of this.tableColumns.values()) {
      totalColumns += cols.size;
    }
    return {
      tables: this.tableColumns.size,
      totalColumns,
      loadedFrom: this.loadedFrom,
    };
  }

  /**
   * Suggest the closest matching column name (for helpful error messages).
   * Uses simple Levenshtein-like comparison.
   */
  suggestColumn(qualifiedTable: string, badColumn: string): string | null {
    const cols = this.tableColumns.get(qualifiedTable);
    if (!cols) return null;

    let best: string | null = null;
    let bestScore = Infinity;

    for (const col of cols) {
      const dist = editDistance(badColumn, col);
      if (dist < bestScore && dist <= 5) {
        bestScore = dist;
        best = col;
      }
    }

    return best;
  }
}

/* ────────────────── Validation ────────────────── */

interface TableData {
  schema: string;
  table: string;
  rows: Record<string, unknown>[];
}

/**
 * Validate generated table data against the schema registry.
 * Returns errors for non-existent tables/columns.
 *
 * This should be called BEFORE SQL emission to catch schema drift early.
 */
export function validateAgainstSchema(
  tables: TableData[],
  registry: SchemaRegistry,
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tablesNotInDD: string[] = [];
  const columnsNotInDD: Array<{ table: string; column: string }> = [];
  let tablesChecked = 0;
  let columnsChecked = 0;

  // Track which column errors we've already reported (avoid duplicates per table)
  const reportedColumnErrors = new Set<string>();

  for (const td of tables) {
    const qualifiedName = `${td.schema}.${td.table}`;

    // Check table exists
    if (!registry.hasTable(qualifiedName)) {
      tablesNotInDD.push(qualifiedName);
      errors.push(
        `SCHEMA_DRIFT: Table '${qualifiedName}' does not exist in the data dictionary. ` +
        `Either the table was removed from PostgreSQL or was never created. ` +
        `Disable this generator or create the table via DDL migration.`,
      );
      continue;
    }

    tablesChecked++;

    // Check every column in every row
    for (const row of td.rows) {
      for (const col of Object.keys(row)) {
        const errorKey = `${qualifiedName}.${col}`;
        if (reportedColumnErrors.has(errorKey)) continue;

        columnsChecked++;

        if (!registry.hasColumn(qualifiedName, col)) {
          reportedColumnErrors.add(errorKey);
          columnsNotInDD.push({ table: qualifiedName, column: col });

          const suggestion = registry.suggestColumn(qualifiedName, col);
          const hint = suggestion
            ? ` Did you mean '${suggestion}'?`
            : '';

          errors.push(
            `SCHEMA_DRIFT: Column '${col}' does not exist in table '${qualifiedName}'.${hint} ` +
            `Update the generator to use the correct column name.`,
          );
        }
      }

      // Only check first row per table for column names (all rows have same keys)
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tablesChecked,
      columnsChecked,
      tablesNotInDD,
      columnsNotInDD,
    },
  };
}

/**
 * Validate the LOAD_ORDER list against the schema registry.
 * Catches tables listed in LOAD_ORDER that don't exist in PG.
 */
export function validateLoadOrder(
  loadOrder: string[],
  registry: SchemaRegistry,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const tableName of loadOrder) {
    if (!registry.hasTable(tableName)) {
      errors.push(
        `LOAD_ORDER drift: '${tableName}' is listed in LOAD_ORDER but does not exist in the data dictionary. ` +
        `Remove it from LOAD_ORDER or create the table.`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/* ────────────────── Utility ────────────────── */

/** Simple edit distance for column name suggestions. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Shared SQL value formatting and PostgreSQL reserved word handling.
 *
 * Single source of truth for:
 *   - Column name → SQL value type inference (naming convention contract)
 *   - PostgreSQL reserved word quoting
 *   - Exception IDs that are VARCHAR despite _id suffix
 *
 * Used by:
 *   - scenarios/factory/sql-emitter.ts (factory SQL generation)
 *   - scenarios/factory/v2/db-writer.ts (direct PG writes)
 *   - utils/ddlExport.ts (DDL column quoting)
 */

/* ────────────────── Exception IDs ────────────────── */

/**
 * Column names that are VARCHAR despite ending in _id.
 * These store string identifiers (not numeric foreign keys).
 */
export const VARCHAR_EXCEPTION_IDS = new Set([
  'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
  'mapped_line_id', 'mapped_column_id',
]);

/* ────────────────── PostgreSQL Reserved Words ────────────────── */

/**
 * PostgreSQL reserved words that must be double-quoted when used as identifiers.
 * Comprehensive list covering SQL:2016 + PostgreSQL-specific reserved words.
 */
export const PG_RESERVED_WORDS = new Set([
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
  'user', 'using', 'value', 'values', 'varchar', 'variadic', 'verbose', 'when',
  'where', 'window', 'with',
]);

/**
 * Quote a column name if it's a PostgreSQL reserved word.
 */
export function quoteColumn(col: string): string {
  return PG_RESERVED_WORDS.has(col.toLowerCase()) ? `"${col}"` : col;
}

/* ────────────────── Value Formatting ────────────────── */

/**
 * Escape a string for SQL single-quote context.
 */
function escapeString(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Format a value for a SQL INSERT statement based on column name suffix.
 *
 * Follows the naming convention contract from CLAUDE.md:
 *   _id   → BIGINT (unquoted integer), except VARCHAR_EXCEPTION_IDS
 *   _code → VARCHAR (quoted string)
 *   _amt  → NUMERIC(20,4) (unquoted number, NaN→0)
 *   _pct  → NUMERIC(10,6) (unquoted number, NaN→0)
 *   _value→ NUMERIC(12,6) (unquoted number, NaN→0)
 *   _bps  → NUMERIC(10,4) (unquoted number, NaN→0)
 *   _count→ INTEGER (unquoted, rounded, NaN→0)
 *   _date → DATE (quoted 'YYYY-MM-DD')
 *   _ts   → TIMESTAMP (quoted, or DEFAULT for CURRENT_TIMESTAMP)
 *   _flag → BOOLEAN (unquoted TRUE/FALSE)
 *   other → VARCHAR (quoted string)
 */
export function formatSqlValue(columnName: string, value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  // Exception IDs: VARCHAR despite _id suffix
  if (VARCHAR_EXCEPTION_IDS.has(columnName)) {
    return `'${escapeString(String(value))}'`;
  }

  // BIGINT columns: _id suffix → unquoted integer
  if (columnName.endsWith('_id')) {
    const n = Number(value);
    if (isNaN(n)) return 'NULL';
    return String(n);
  }

  // NUMERIC columns: _amt, _pct, _value, _bps → unquoted number
  if (columnName.endsWith('_amt') || columnName.endsWith('_pct') ||
      columnName.endsWith('_value') || columnName.endsWith('_bps')) {
    const n = Number(value);
    if (isNaN(n)) return '0';
    return String(n);
  }

  // INTEGER columns: _count → unquoted integer (rounded)
  if (columnName.endsWith('_count')) {
    const n = Number(value);
    if (isNaN(n)) return '0';
    return String(Math.round(n));
  }

  // DATE columns: _date → quoted string
  if (columnName.endsWith('_date')) {
    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 10)}'`;
    }
    return `'${escapeString(String(value))}'`;
  }

  // TIMESTAMP columns: _ts → quoted or DEFAULT
  if (columnName.endsWith('_ts')) {
    if (value === 'DEFAULT' || value === 'CURRENT_TIMESTAMP') return 'DEFAULT';
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return value ? `'${escapeString(String(value))}'` : 'NULL';
  }

  // BOOLEAN columns: _flag → PostgreSQL boolean literal (unquoted TRUE/FALSE)
  if (columnName.endsWith('_flag')) {
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    const v = String(value).toUpperCase();
    if (v === 'TRUE' || v === 'Y' || v === '1') return 'TRUE';
    if (v === 'FALSE' || v === 'N' || v === '0') return 'FALSE';
    return 'NULL';
  }

  // Date objects for non-suffix columns
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 10)}'`;
  }

  // String columns: everything else → quoted string
  if (typeof value === 'string') {
    return `'${escapeString(value)}'`;
  }

  // Numbers that don't match a suffix → unquoted (guard NaN/Infinity)
  if (typeof value === 'number') {
    if (!isFinite(value)) return 'NULL';
    return String(value);
  }

  // Boolean → PostgreSQL boolean literal
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return `'${escapeString(String(value))}'`;
}

/**
 * SQL parsing utilities for extracting table, column, and join metadata
 * from formula_sql strings. Shared between ingredients API and input-data API.
 */

const ALLOWED_SCHEMAS = new Set(['l1', 'l2', 'l3']);
const TABLE_RE = /\b(l[123])\.([a-z_][a-z0-9_]*)\b/gi;

export interface SqlTableRef {
  schema: string; // 'l1' | 'l2' | 'l3'
  table: string;
}

export interface SqlJoinRef {
  join_type: 'FROM' | 'INNER' | 'LEFT' | 'RIGHT' | 'CROSS' | 'FULL';
  schema: string;
  table: string;
  alias?: string;
}

/** Extract all deduplicated schema.table references from SQL. */
export function extractTablesFromSql(sql: string): SqlTableRef[] {
  const seen = new Set<string>();
  const tables: SqlTableRef[] = [];
  let match;
  const re = new RegExp(TABLE_RE.source, TABLE_RE.flags);
  while ((match = re.exec(sql)) !== null) {
    const key = `${match[1].toLowerCase()}.${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      tables.push({ schema: match[1].toLowerCase(), table: match[2] });
    }
  }
  return tables;
}

/**
 * Map SQL aliases to actual table names.
 * Parses FROM/JOIN clauses for "schema.table_name alias" patterns.
 */
export function resolveAliasMap(sql: string): Map<string, string> {
  const aliasMap = new Map<string, string>();
  const re =
    /(?:FROM|JOIN)\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    const tableName = match[2];
    const alias = match[3];
    if (alias && !ALLOWED_SCHEMAS.has(alias)) {
      aliasMap.set(alias.toLowerCase(), tableName);
    }
  }
  return aliasMap;
}

/**
 * Extract alias.column references from formula SQL.
 * Returns a map: alias → Set<column_name>.
 * Skips schema prefixes (l1, l2, l3) which are table references, not aliases.
 */
export function extractColumnRefsFromSql(
  sql: string,
): Map<string, Set<string>> {
  const COL_RE = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi;
  const refs = new Map<string, Set<string>>();
  let match;
  while ((match = COL_RE.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2].toLowerCase();
    if (ALLOWED_SCHEMAS.has(alias)) continue;
    if (!refs.has(alias)) refs.set(alias, new Set());
    refs.get(alias)!.add(column);
  }
  return refs;
}

/**
 * Extract FROM and JOIN clauses with their join types from SQL.
 * Returns ordered, deduplicated list of table references.
 */
export function extractJoinRefs(sql: string): SqlJoinRef[] {
  const refs: SqlJoinRef[] = [];
  const seen = new Set<string>();

  // Combined pattern: optional join-type prefix, then FROM or JOIN keyword
  const re =
    /(?:(LEFT|RIGHT|INNER|CROSS|FULL)\s+)?(?:JOIN|FROM)\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const prefix = m[1]?.toUpperCase();
    const keyword = sql
      .slice(m.index, m.index + m[0].length)
      .match(/\b(FROM|JOIN)\b/i)?.[1]
      ?.toUpperCase();
    const schema = m[2].toLowerCase();
    const table = m[3];
    const alias = m[4] || undefined;
    const key = `${schema}.${table}`;

    if (seen.has(key)) continue;
    seen.add(key);

    let joinType: SqlJoinRef['join_type'];
    if (keyword === 'FROM') {
      joinType = 'FROM';
    } else if (prefix && prefix !== 'INNER') {
      joinType = prefix as SqlJoinRef['join_type'];
    } else {
      joinType = 'INNER';
    }

    refs.push({ join_type: joinType, schema, table, alias });
  }
  return refs;
}

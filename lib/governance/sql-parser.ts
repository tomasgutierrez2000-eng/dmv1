/**
 * Shared SQL parsing utilities for metric formula analysis.
 * Extracted from app/api/metrics/governance/input-data/route.ts for reuse.
 */

export const ALLOWED_SCHEMAS = new Set(['l1', 'l2', 'l3']);
export const TABLE_RE = /\b(l[123])\.([a-z_][a-z0-9_]*)\b/gi;

/** Extract all schema.table references from SQL. */
export function extractTablesFromSql(sql: string): Array<{ schema: string; table: string; alias?: string }> {
  const seen = new Set<string>();
  const tables: Array<{ schema: string; table: string; alias?: string }> = [];

  // Also grab aliases from FROM/JOIN for richer output
  const aliasMap = resolveAliasMap(sql);
  const reverseAlias = new Map<string, string>();
  for (const [alias, tableName] of aliasMap) {
    reverseAlias.set(tableName, alias);
  }

  let match;
  const re = new RegExp(TABLE_RE.source, TABLE_RE.flags);
  while ((match = re.exec(sql)) !== null) {
    const key = `${match[1].toLowerCase()}.${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      tables.push({
        schema: match[1].toLowerCase(),
        table: match[2],
        alias: reverseAlias.get(match[2]),
      });
    }
  }
  return tables;
}

/** Parse FROM/JOIN clauses to build alias → table_name mapping. */
export function resolveAliasMap(sql: string): Map<string, string> {
  const aliasMap = new Map<string, string>();
  const re = /(?:FROM|JOIN)\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/gi;
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

/** Extract alias.column references from SQL. */
export function extractColumnRefsFromSql(sql: string): Map<string, Set<string>> {
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

/** Parse formula SQL into ordered steps: FROM, JOINs, WHERE, GROUP BY, SELECT. */
export interface FormulaStep {
  order: number;
  type: 'source' | 'join' | 'filter' | 'group' | 'compute';
  tableName?: string;
  schema?: string;
  alias?: string;
  condition?: string;
  description: string;
  columnsReferenced: string[];
}

export function parseFormulaSteps(sql: string): FormulaStep[] {
  const steps: FormulaStep[] = [];
  let order = 0;

  // Normalize whitespace
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // Extract FROM table
  const fromMatch = normalized.match(/FROM\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/i);
  if (fromMatch) {
    const alias = fromMatch[3] && !ALLOWED_SCHEMAS.has(fromMatch[3]) ? fromMatch[3] : undefined;
    steps.push({
      order: order++,
      type: 'source',
      schema: fromMatch[1].toLowerCase(),
      tableName: fromMatch[2],
      alias,
      description: `Read from ${fromMatch[1].toLowerCase()}.${fromMatch[2]}`,
      columnsReferenced: getColumnsForAlias(sql, alias ?? fromMatch[2]),
    });
  }

  // Extract JOINs
  const joinRe = /((?:LEFT\s+|INNER\s+|RIGHT\s+|CROSS\s+)?JOIN)\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?\s+ON\s+([^)]*?)(?=(?:\s+(?:LEFT|INNER|RIGHT|CROSS|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT|$)))/gi;
  let joinMatch;
  while ((joinMatch = joinRe.exec(normalized)) !== null) {
    const joinType = joinMatch[1].trim().toUpperCase();
    const alias = joinMatch[4] && !ALLOWED_SCHEMAS.has(joinMatch[4]) ? joinMatch[4] : undefined;
    const isOptional = joinType.includes('LEFT');
    steps.push({
      order: order++,
      type: 'join',
      schema: joinMatch[2].toLowerCase(),
      tableName: joinMatch[3],
      alias,
      condition: joinMatch[5].trim(),
      description: isOptional
        ? `Look up ${joinMatch[2].toLowerCase()}.${joinMatch[3]} (if available)`
        : `Link to ${joinMatch[2].toLowerCase()}.${joinMatch[3]}`,
      columnsReferenced: getColumnsForAlias(sql, alias ?? joinMatch[3]),
    });
  }

  // Extract WHERE
  const whereMatch = normalized.match(/WHERE\s+(.*?)(?=\s+GROUP\s+BY|\s+ORDER\s+BY|\s+HAVING|\s+LIMIT|$)/i);
  if (whereMatch) {
    steps.push({
      order: order++,
      type: 'filter',
      condition: whereMatch[1].trim(),
      description: `Filter: ${whereMatch[1].trim().substring(0, 100)}`,
      columnsReferenced: [],
    });
  }

  // Extract GROUP BY
  const groupMatch = normalized.match(/GROUP\s+BY\s+(.*?)(?=\s+HAVING|\s+ORDER|\s+LIMIT|$)/i);
  if (groupMatch) {
    steps.push({
      order: order++,
      type: 'group',
      description: `Group by ${groupMatch[1].trim()}`,
      columnsReferenced: [],
    });
  }

  // Extract SELECT (compute step)
  const selectMatch = normalized.match(/SELECT\s+(.*?)\s+FROM/i);
  if (selectMatch) {
    steps.push({
      order: order++,
      type: 'compute',
      description: 'Calculate metric value',
      columnsReferenced: [],
    });
  }

  return steps;
}

/** Helper: get columns referenced by a specific alias in SQL. */
function getColumnsForAlias(sql: string, alias: string): string[] {
  const re = new RegExp(`\\b${escapeRegex(alias)}\\.([a-z_][a-z0-9_]*)\\b`, 'gi');
  const cols = new Set<string>();
  let match;
  while ((match = re.exec(sql)) !== null) {
    cols.add(match[1].toLowerCase());
  }
  return Array.from(cols);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Humanize a table name: snake_case → Title Case. */
export function humanizeTableName(name: string): string {
  return name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

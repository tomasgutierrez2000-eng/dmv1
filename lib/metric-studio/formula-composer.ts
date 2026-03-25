/**
 * Formula Composer — builds executable SQL from user-composed canvas fields.
 *
 * Takes an array of ComposedField (table + field + optional aggregation)
 * and produces:
 *   1. A valid SELECT query with auto-inferred JOINs from FK graph
 *   2. Progressive SQL steps for the step-through debugger
 *
 * Algorithm:
 *   1. Group fields by table
 *   2. Build FK graph from data dictionary relationships
 *   3. Find JOIN paths (BFS, respect user disambiguation choices)
 *   4. Generate FROM + JOINs + SELECT + GROUP BY
 *   5. Generate debug steps (progressive subqueries)
 *   6. Validate: SELECT-only, all tables exist
 *
 * Design decisions (from eng review):
 *   - dimension_key = first non-aggregated field; if all aggregated, use 'total'
 *   - Schema prefix added during SQL generation, not in FK graph
 *   - LIMIT 1000 appended for safety
 */

import type { ComposedField, ComposedFormula, SQLStep, FKEdge } from './types';
import { buildFKGraph, findShortestPath, abbreviateTable, type FKGraph } from './fk-graph';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

interface TableGroup {
  table: string;
  layer: string;
  fields: Array<{ field: string; aggregation: ComposedField['aggregation'] }>;
  alias: string;
}

/**
 * Compose SQL from an array of user-dragged fields.
 * Requires pre-built FK relationships (loaded server-side, passed via API).
 */
export function composeSQL(
  fields: ComposedField[],
  relationships: DataDictionaryRelationship[],
): ComposedFormula {
  // Handle empty input
  if (!fields || fields.length === 0) {
    return { sql: '', steps: [], valid: false, error: 'No fields selected', sourceTables: [] };
  }

  // 1. Group fields by table
  const tableMap = new Map<string, TableGroup>();
  for (const f of fields) {
    const key = `${f.layer}.${f.table}`;
    const existing = tableMap.get(key);
    if (existing) {
      existing.fields.push({ field: f.field, aggregation: f.aggregation });
    } else {
      tableMap.set(key, {
        table: f.table,
        layer: f.layer,
        fields: [{ field: f.field, aggregation: f.aggregation }],
        alias: abbreviateTable(f.table),
      });
    }
  }

  const tables = Array.from(tableMap.values());
  if (tables.length === 0) {
    return { sql: '', steps: [], valid: false, error: 'No tables resolved', sourceTables: [] };
  }

  // Ensure unique aliases
  const usedAliases = new Set<string>();
  for (const t of tables) {
    let alias = t.alias;
    let suffix = 2;
    while (usedAliases.has(alias)) {
      alias = `${t.alias}${suffix++}`;
    }
    t.alias = alias;
    usedAliases.add(alias);
  }

  // 2. Build FK graph
  const fkGraph = buildFKGraph(relationships);

  // 3. Find JOIN paths from first table to all others
  const primaryTable = tables[0];
  const joinClauses: string[] = [];
  const joinEdges: Array<{ table: TableGroup; path: FKEdge[] }> = [];
  const joinErrors: string[] = [];

  for (let i = 1; i < tables.length; i++) {
    const target = tables[i];

    // Check if user pre-selected a path
    const userField = fields.find(
      f => f.table === target.table && f.joinPath?.userSelected
    );

    let path: FKEdge[] | null = null;
    if (userField?.joinPath) {
      path = userField.joinPath.path;
    } else {
      path = findShortestPath(fkGraph, primaryTable.table, target.table);
    }

    if (!path) {
      joinErrors.push(`No FK path from ${primaryTable.table} to ${target.table}`);
      continue;
    }

    joinEdges.push({ table: target, path });

    // Generate JOIN SQL for each hop in the path
    for (const edge of path) {
      const fromAlias = tables.find(t => t.table === edge.fromTable)?.alias ?? abbreviateTable(edge.fromTable);
      const toAlias = tables.find(t => t.table === edge.toTable)?.alias ?? abbreviateTable(edge.toTable);
      const joinSql = `JOIN ${edge.toLayer}.${edge.toTable} ${toAlias} ON ${toAlias}.${edge.toColumn} = ${fromAlias}.${edge.fromColumn}`;
      // Avoid duplicate JOINs
      if (!joinClauses.includes(joinSql)) {
        joinClauses.push(joinSql);
      }
    }
  }

  if (joinErrors.length > 0) {
    return {
      sql: '',
      steps: [],
      valid: false,
      error: joinErrors.join('; '),
      sourceTables: tables.map(t => `${t.layer}.${t.table}`),
    };
  }

  // 4. Generate SELECT + GROUP BY
  const hasAggregation = fields.some(f => f.aggregation);
  const selectParts: string[] = [];
  const groupByParts: string[] = [];

  // Determine dimension_key: first non-aggregated field
  const nonAggFields = fields.filter(f => !f.aggregation);
  const aggFields = fields.filter(f => f.aggregation);

  if (nonAggFields.length > 0) {
    // First non-aggregated field becomes dimension_key
    const dimField = nonAggFields[0];
    const dimAlias = tables.find(t => t.table === dimField.table)?.alias ?? abbreviateTable(dimField.table);
    selectParts.push(`${dimAlias}.${dimField.field} AS dimension_key`);
    groupByParts.push(`${dimAlias}.${dimField.field}`);

    // Remaining non-aggregated fields
    for (let i = 1; i < nonAggFields.length; i++) {
      const f = nonAggFields[i];
      const alias = tables.find(t => t.table === f.table)?.alias ?? abbreviateTable(f.table);
      selectParts.push(`${alias}.${f.field}`);
      groupByParts.push(`${alias}.${f.field}`);
    }
  } else {
    // All fields aggregated — use 'total' as dimension_key
    selectParts.push(`'total' AS dimension_key`);
  }

  // Aggregated fields
  for (const f of aggFields) {
    const alias = tables.find(t => t.table === f.table)?.alias ?? abbreviateTable(f.table);
    const agg = f.aggregation!;
    if (agg === 'COUNT_DISTINCT') {
      selectParts.push(`COUNT(DISTINCT ${alias}.${f.field}) AS metric_value`);
    } else {
      selectParts.push(`${agg}(${alias}.${f.field}) AS metric_value`);
    }
  }

  // If no aggregation, just select all fields
  if (!hasAggregation) {
    // Replace with simple field list
    selectParts.length = 0;
    for (const f of fields) {
      const alias = tables.find(t => t.table === f.table)?.alias ?? abbreviateTable(f.table);
      selectParts.push(`${alias}.${f.field}`);
    }
  }

  // 5. Assemble SQL
  const fromClause = `FROM ${primaryTable.layer}.${primaryTable.table} ${primaryTable.alias}`;
  const joinClause = joinClauses.length > 0 ? joinClauses.join('\n  ') : '';
  const selectClause = `SELECT\n  ${selectParts.join(',\n  ')}`;
  const groupByClause = hasAggregation && groupByParts.length > 0
    ? `GROUP BY ${groupByParts.join(', ')}`
    : '';

  const sqlParts = [selectClause, fromClause];
  if (joinClause) sqlParts.push(`  ${joinClause}`);
  if (groupByClause) sqlParts.push(groupByClause);
  sqlParts.push('LIMIT 1000');

  const sql = sqlParts.join('\n');

  // 6. Generate debug steps
  const steps = generateDebugSteps(primaryTable, tables, joinClauses, selectParts, groupByParts, hasAggregation);

  const sourceTables = tables.map(t => `${t.layer}.${t.table}`);

  return { sql, steps, valid: true, sourceTables };
}

function generateDebugSteps(
  primaryTable: TableGroup,
  allTables: TableGroup[],
  joinClauses: string[],
  selectParts: string[],
  groupByParts: string[],
  hasAggregation: boolean,
): SQLStep[] {
  const steps: SQLStep[] = [];
  let order = 1;

  // Step 1: FROM
  steps.push({
    order: order++,
    type: 'from',
    sql: `SELECT * FROM ${primaryTable.layer}.${primaryTable.table} ${primaryTable.alias} LIMIT 50`,
    description: `Load ${primaryTable.table}`,
    tables: [`${primaryTable.layer}.${primaryTable.table}`],
  });

  // Step 2+: JOINs (one step per JOIN)
  let cumulativeFrom = `FROM ${primaryTable.layer}.${primaryTable.table} ${primaryTable.alias}`;
  const joinedTables = [`${primaryTable.layer}.${primaryTable.table}`];

  for (const joinSql of joinClauses) {
    cumulativeFrom += `\n  ${joinSql}`;
    // Extract table name from JOIN clause
    const tableMatch = joinSql.match(/JOIN\s+(\w+\.\w+)/i);
    if (tableMatch) joinedTables.push(tableMatch[1]);

    steps.push({
      order: order++,
      type: 'join',
      sql: `SELECT * ${cumulativeFrom} LIMIT 50`,
      description: `Join ${tableMatch?.[1] ?? 'table'}`,
      tables: [...joinedTables],
    });
  }

  // Step N-1: GROUP BY (if applicable)
  if (hasAggregation && groupByParts.length > 0) {
    steps.push({
      order: order++,
      type: 'group_by',
      sql: `SELECT ${groupByParts.join(', ')}, COUNT(*) AS group_count ${cumulativeFrom} GROUP BY ${groupByParts.join(', ')} LIMIT 50`,
      description: `Group by ${groupByParts[0]}`,
      tables: [...joinedTables],
    });
  }

  // Step N: Final SELECT
  steps.push({
    order: order++,
    type: 'select',
    sql: `SELECT\n  ${selectParts.join(',\n  ')}\n${cumulativeFrom}${hasAggregation && groupByParts.length > 0 ? `\nGROUP BY ${groupByParts.join(', ')}` : ''}\nLIMIT 1000`,
    description: 'Compute final result',
    tables: [...joinedTables],
  });

  return steps;
}

/**
 * Validate that SQL is safe for execution (SELECT-only).
 * Returns null if valid, or an error message.
 */
export function validateSQL(sql: string): string | null {
  const upper = sql.toUpperCase().trim();
  const dangerous = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const kw of dangerous) {
    // Check for keyword at word boundary (not inside a column name)
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(upper)) {
      return `SQL contains forbidden keyword: ${kw}`;
    }
  }
  if (!upper.startsWith('SELECT')) {
    return 'SQL must start with SELECT';
  }
  if (sql.includes(';')) {
    return 'SQL must not contain semicolons';
  }
  return null;
}

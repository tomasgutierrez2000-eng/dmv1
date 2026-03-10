/**
 * Database status helper: queries PostgreSQL for table existence and row counts,
 * then diffs against the data dictionary to classify each table's loading stage.
 */

import { readDataDictionary, type DataDictionary } from '@/lib/data-dictionary';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TableStatus = 'has_data' | 'empty' | 'not_in_db' | 'not_in_dd';

export type FieldDriftType = 'in_dd_not_in_db' | 'in_db_not_in_dd' | 'type_mismatch';

export interface FieldDrift {
  field: string;
  issue: FieldDriftType;
  ddType?: string;
  dbType?: string;
}

export interface TableDbStatus {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  schema: string;
  category: string;
  fieldCount: number;
  status: TableStatus;
  rowCount: number | null;
  estimatedRowCount: boolean;
  fieldDrift: FieldDrift[];
}

export interface DbStatusSummary {
  totalTablesInDd: number;
  totalTablesInDb: number;
  tablesWithData: number;
  tablesEmpty: number;
  tablesNotInDb: number;
  tablesNotInDd: number;
  tablesWithFieldDrift: number;
  totalFieldDrifts: number;
}

export interface DbStatusResult {
  connected: boolean;
  databaseUrl: boolean;
  databaseId?: string;
  databaseLabel?: string;
  timestamp: string;
  summary: DbStatusSummary;
  tables: TableDbStatus[];
}

// ─── SQL ─────────────────────────────────────────────────────────────────────

const TABLES_QUERY = `
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname IN ('l1', 'l2', 'l3')
  ORDER BY schemaname, tablename
`;

const ROW_COUNTS_QUERY = `
  SELECT schemaname, relname AS tablename, n_live_tup::bigint AS row_count
  FROM pg_stat_user_tables
  WHERE schemaname IN ('l1', 'l2', 'l3')
  ORDER BY schemaname, relname
`;

const COLUMNS_QUERY = `
  SELECT table_schema, table_name, column_name, data_type,
         character_maximum_length, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_schema IN ('l1', 'l2', 'l3')
  ORDER BY table_schema, table_name, ordinal_position
`;

/** Sanitize identifier: only allow alphanumeric and underscores (pg_tables values are safe, but be defensive). */
function safeIdent(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '');
}

function buildExactCountQuery(tables: { schema: string; name: string }[]): string {
  if (tables.length === 0) {
    return "SELECT NULL::text AS schema, NULL::text AS tablename, 0::bigint AS row_count WHERE false";
  }
  return tables
    .map((t) => {
      const schema = safeIdent(t.schema);
      const name = safeIdent(t.name);
      return `SELECT '${schema}'::text AS schema, '${name}'::text AS tablename, count(*)::bigint AS row_count FROM "${schema}"."${name}"`;
    })
    .join('\nUNION ALL\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function schemaToLayer(schema: string): 'L1' | 'L2' | 'L3' {
  if (schema === 'l1') return 'L1';
  if (schema === 'l2') return 'L2';
  return 'L3';
}

interface DdTableInfo {
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fieldCount: number;
  fields: Map<string, string>; // fieldName → data_type (or '' if unset)
}

function flattenDd(dd: DataDictionary) {
  const map = new Map<string, DdTableInfo>();
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    for (const table of dd[layer]) {
      const fields = new Map<string, string>();
      for (const f of table.fields) {
        fields.set(f.name, f.data_type ?? '');
      }
      map.set(`${layer}.${table.name}`, {
        layer,
        category: table.category,
        fieldCount: table.fields.length,
        fields,
      });
    }
  }
  return map;
}

/** Format a PostgreSQL information_schema type into a comparable display string. */
function formatPgColumnType(row: { data_type: string; character_maximum_length?: number | null; numeric_precision?: number | null; numeric_scale?: number | null }): string {
  const dt = row.data_type?.toUpperCase() ?? '';
  if (dt === 'CHARACTER VARYING' || dt === 'VARCHAR') {
    return row.character_maximum_length ? `VARCHAR(${row.character_maximum_length})` : 'VARCHAR';
  }
  if (dt === 'NUMERIC' || dt === 'DECIMAL') {
    if (row.numeric_precision != null && row.numeric_scale != null) {
      return `NUMERIC(${row.numeric_precision},${row.numeric_scale})`;
    }
    if (row.numeric_precision != null) return `NUMERIC(${row.numeric_precision})`;
    return 'NUMERIC';
  }
  if (dt === 'INTEGER') return 'INTEGER';
  if (dt === 'BIGINT') return 'BIGINT';
  if (dt === 'SMALLINT') return 'SMALLINT';
  if (dt === 'BOOLEAN') return 'BOOLEAN';
  if (dt === 'DATE') return 'DATE';
  if (dt === 'TEXT') return 'TEXT';
  if (dt.includes('TIMESTAMP')) return 'TIMESTAMP';
  return dt || 'UNKNOWN';
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function getDbStatus(options?: { exact?: boolean; databaseUrl?: string }): Promise<DbStatusResult> {
  const dd = readDataDictionary();
  const ddMap = dd ? flattenDd(dd) : new Map();
  const timestamp = new Date().toISOString();
  const connString = options?.databaseUrl ?? process.env.DATABASE_URL;

  // No connection string — return all DD tables as not_in_db
  if (!connString) {
    const tables: TableDbStatus[] = [];
    for (const [key, info] of ddMap) {
      const name = key.split('.').slice(1).join('.');
      tables.push({
        name,
        layer: info.layer,
        schema: info.layer.toLowerCase(),
        category: info.category,
        fieldCount: info.fieldCount,
        status: 'not_in_db',
        rowCount: null,
        estimatedRowCount: false,
        fieldDrift: [],
      });
    }
    return {
      connected: false,
      databaseUrl: false,
      timestamp,
      summary: {
        totalTablesInDd: ddMap.size,
        totalTablesInDb: 0,
        tablesWithData: 0,
        tablesEmpty: 0,
        tablesNotInDb: ddMap.size,
        tablesNotInDd: 0,
        tablesWithFieldDrift: 0,
        totalFieldDrifts: 0,
      },
      tables,
    };
  }

  // Try connecting
  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('pg module not installed');
  }

  const client = new pg.default.Client({
    connectionString: connString,
    connectionTimeoutMillis: 5000,
    ssl: connString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();

    // Query DB tables, row counts, and columns in parallel
    const [tablesResult, countsResult, columnsResult] = await Promise.all([
      client.query(TABLES_QUERY),
      options?.exact
        ? null // we'll do exact counts after we know what tables exist
        : client.query(ROW_COUNTS_QUERY),
      client.query(COLUMNS_QUERY),
    ]);

    // Build set of DB tables
    const dbTables = new Set<string>();
    const dbTableList: { schema: string; name: string }[] = [];
    for (const row of tablesResult.rows) {
      const key = `${schemaToLayer(row.schemaname)}.${row.tablename}`;
      dbTables.add(key);
      dbTableList.push({ schema: row.schemaname, name: row.tablename });
    }

    // Build row count map
    const rowCounts = new Map<string, number>();
    let estimated = true;

    if (options?.exact) {
      // Run exact counts
      estimated = false;
      const exactQuery = buildExactCountQuery(dbTableList);
      const exactResult = await client.query(exactQuery);
      for (const row of exactResult.rows) {
        if (row.schema && row.tablename) {
          const key = `${schemaToLayer(row.schema)}.${row.tablename}`;
          rowCounts.set(key, Number(row.row_count));
        }
      }
    } else if (countsResult) {
      for (const row of countsResult.rows) {
        const key = `${schemaToLayer(row.schemaname)}.${row.tablename}`;
        rowCounts.set(key, Number(row.row_count));
      }
    }

    // Build DB columns map: "L1.table_name" → Map<columnName, displayType>
    const dbColumns = new Map<string, Map<string, string>>();
    for (const row of columnsResult.rows) {
      const key = `${schemaToLayer(row.table_schema)}.${row.table_name}`;
      if (!dbColumns.has(key)) dbColumns.set(key, new Map());
      dbColumns.get(key)!.set(
        row.column_name,
        formatPgColumnType(row)
      );
    }

    // Build results: merge DD + DB
    const tables: TableDbStatus[] = [];
    const allKeys = new Set([...ddMap.keys(), ...dbTables]);

    for (const key of allKeys) {
      const inDd = ddMap.has(key);
      const inDb = dbTables.has(key);
      const [layer, ...nameParts] = key.split('.');
      const name = nameParts.join('.');
      const ddInfo = ddMap.get(key);
      const count = rowCounts.get(key) ?? null;

      let status: TableStatus;
      if (!inDb) {
        status = 'not_in_db';
      } else if (!inDd) {
        status = 'not_in_dd';
      } else if (count !== null && count > 0) {
        status = 'has_data';
      } else {
        status = 'empty';
      }

      // Compute field drift for tables that exist in both DD and DB
      const fieldDrift: FieldDrift[] = [];
      if (inDd && inDb && ddInfo) {
        const dbCols = dbColumns.get(key) ?? new Map<string, string>();
        // Fields in DD but not in DB
        for (const [fieldName, ddType] of ddInfo.fields) {
          if (!dbCols.has(fieldName)) {
            fieldDrift.push({ field: fieldName, issue: 'in_dd_not_in_db', ddType: ddType || undefined });
          } else {
            // Both exist — check type mismatch
            const dbType = dbCols.get(fieldName)!;
            if (ddType && dbType && ddType.toUpperCase() !== dbType.toUpperCase()) {
              fieldDrift.push({ field: fieldName, issue: 'type_mismatch', ddType, dbType });
            }
          }
        }
        // Fields in DB but not in DD
        for (const [colName, dbType] of dbCols) {
          if (!ddInfo.fields.has(colName)) {
            fieldDrift.push({ field: colName, issue: 'in_db_not_in_dd', dbType });
          }
        }
      }

      tables.push({
        name,
        layer: layer as 'L1' | 'L2' | 'L3',
        schema: layer.toLowerCase(),
        category: ddInfo?.category ?? '',
        fieldCount: ddInfo?.fieldCount ?? 0,
        status,
        rowCount: inDb ? (count ?? 0) : null,
        estimatedRowCount: inDb ? estimated : false,
        fieldDrift,
      });
    }

    // Sort: layer order (L1, L2, L3), then name
    const layerOrder = { L1: 0, L2: 1, L3: 2 };
    tables.sort((a, b) => (layerOrder[a.layer] - layerOrder[b.layer]) || a.name.localeCompare(b.name));

    // Summary
    const summary: DbStatusSummary = {
      totalTablesInDd: ddMap.size,
      totalTablesInDb: dbTables.size,
      tablesWithData: tables.filter((t) => t.status === 'has_data').length,
      tablesEmpty: tables.filter((t) => t.status === 'empty').length,
      tablesNotInDb: tables.filter((t) => t.status === 'not_in_db').length,
      tablesNotInDd: tables.filter((t) => t.status === 'not_in_dd').length,
      tablesWithFieldDrift: tables.filter((t) => t.fieldDrift.length > 0).length,
      totalFieldDrifts: tables.reduce((sum, t) => sum + t.fieldDrift.length, 0),
    };

    return { connected: true, databaseUrl: true, timestamp, summary, tables };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

/**
 * Reusable introspection library.
 * Connects to PostgreSQL, reads schema metadata, and merges into data dictionary.
 *
 * Extracted from scripts/introspect-db.ts so API routes and CLI scripts can
 * call introspection programmatically without shelling out.
 */

import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
  DataDictionaryRelationship,
} from './data-dictionary';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
  udt_name: string;
}

export interface PKRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
}

export interface FKRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
}

export interface IntrospectedData {
  tables: { table_schema: string; table_name: string }[];
  columns: ColumnRow[];
  pks: PKRow[];
  fks: FKRow[];
}

export interface IntrospectReport {
  tablesAdded: string[];
  tablesRemoved: string[];
  fieldsAdded: string[];
  fieldsRemoved: string[];
  typesChanged: string[];
  pkChanges: string[];
  fkChanges: string[];
  totalTables: { L1: number; L2: number; L3: number };
  totalFields: { L1: number; L2: number; L3: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// PostgreSQL type → display type mapping
// ═══════════════════════════════════════════════════════════════════════════

export function formatPgType(
  dataType: string,
  charMaxLen: number | null,
  numericPrecision: number | null,
  numericScale: number | null,
  udtName: string,
  columnDefault?: string | null,
): string {
  switch (dataType) {
    case 'character varying':
      return charMaxLen ? `VARCHAR(${charMaxLen})` : 'VARCHAR';
    case 'character':
      return charMaxLen ? `CHAR(${charMaxLen})` : 'CHAR';
    case 'numeric':
      if (numericPrecision != null && numericScale != null) {
        return `NUMERIC(${numericPrecision},${numericScale})`;
      }
      if (numericPrecision != null) return `NUMERIC(${numericPrecision})`;
      return 'NUMERIC';
    case 'integer':
      if (columnDefault && columnDefault.includes('nextval(')) return 'SERIAL';
      return 'INTEGER';
    case 'bigint':
      if (columnDefault && columnDefault.includes('nextval(')) return 'BIGSERIAL';
      return 'BIGINT';
    case 'smallint':
      return 'SMALLINT';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp without time zone':
      return 'TIMESTAMP';
    case 'timestamp with time zone':
      return 'TIMESTAMPTZ';
    case 'text':
      return 'TEXT';
    case 'double precision':
      return 'DOUBLE PRECISION';
    case 'real':
      return 'REAL';
    case 'json':
    case 'jsonb':
      return dataType.toUpperCase();
    case 'ARRAY':
      return `${udtName.replace(/^_/, '')}[]`;
    case 'USER-DEFINED':
      return udtName.toUpperCase();
    default:
      return dataType.toUpperCase();
  }
}

export function schemaToLayer(schema: string): 'L1' | 'L2' | 'L3' {
  switch (schema) {
    case 'l1': return 'L1';
    case 'l2': return 'L2';
    case 'l3': return 'L3';
    default: throw new Error(`Unknown schema: ${schema}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Introspection queries
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the 4 information_schema queries against PostgreSQL.
 * Accepts any client with a `.query()` method matching the pg.Client interface.
 */
export async function introspectDatabase(
  client: { query: <T>(sql: string) => Promise<{ rows: T[] }> },
): Promise<IntrospectedData> {
  const tablesResult = await client.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema IN ('l1','l2','l3') AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`
  );

  const columnsResult = await client.query<ColumnRow>(
    `SELECT table_schema, table_name, column_name, data_type,
            character_maximum_length, numeric_precision, numeric_scale,
            is_nullable, column_default, ordinal_position, udt_name
     FROM information_schema.columns
     WHERE table_schema IN ('l1','l2','l3')
     ORDER BY table_schema, table_name, ordinal_position`
  );

  const pkResult = await client.query<PKRow>(
    `SELECT tc.table_schema, tc.table_name, kcu.column_name, kcu.ordinal_position
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema IN ('l1','l2','l3')
     ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position`
  );

  const fkResult = await client.query<FKRow>(
    `SELECT tc.table_schema, tc.table_name, kcu.column_name,
            ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema IN ('l1','l2','l3')
     ORDER BY tc.table_schema, tc.table_name, kcu.column_name`
  );

  return {
    tables: tablesResult.rows,
    columns: columnsResult.rows,
    pks: pkResult.rows,
    fks: fkResult.rows,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Column → Field helper
// ═══════════════════════════════════════════════════════════════════════════

export function columnToField(
  col: ColumnRow,
  schema: string,
  tableName: string,
  pkColumns: Set<string>,
  isComposite: boolean,
  fkLookup: Map<string, { layer: string; table: string; field: string }>,
): DataDictionaryField {
  const displayType = formatPgType(
    col.data_type,
    col.character_maximum_length,
    col.numeric_precision,
    col.numeric_scale,
    col.udt_name,
    col.column_default,
  );
  const isPK = pkColumns.has(col.column_name);
  const fkKey = `${schema}.${tableName}.${col.column_name}`;
  const fkTarget = fkLookup.get(fkKey);

  return {
    name: col.column_name,
    description: '',
    data_type: displayType,
    ...(isPK || fkTarget
      ? {
          pk_fk: {
            is_pk: isPK,
            is_composite: isComposite && isPK,
            ...(fkTarget ? { fk_target: fkTarget } : {}),
          },
        }
      : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Merge introspected data into data dictionary
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge introspected PostgreSQL metadata into an existing data dictionary.
 * Mutates `dd` in-place and returns a report of changes.
 */
export function mergeIntoDataDictionary(
  dd: DataDictionary,
  introspected: IntrospectedData,
): IntrospectReport {
  const report: IntrospectReport = {
    tablesAdded: [],
    tablesRemoved: [],
    fieldsAdded: [],
    fieldsRemoved: [],
    typesChanged: [],
    pkChanges: [],
    fkChanges: [],
    totalTables: { L1: 0, L2: 0, L3: 0 },
    totalFields: { L1: 0, L2: 0, L3: 0 },
  };

  // Build PK lookup: schema.table -> Set<column>
  const pkLookup = new Map<string, Set<string>>();
  const pkCountLookup = new Map<string, number>();
  for (const pk of introspected.pks) {
    const key = `${pk.table_schema}.${pk.table_name}`;
    if (!pkLookup.has(key)) pkLookup.set(key, new Set());
    pkLookup.get(key)!.add(pk.column_name);
  }
  for (const [key, cols] of pkLookup) {
    pkCountLookup.set(key, cols.size);
  }

  // Build FK lookup: schema.table.column -> { layer, table, field }
  const fkLookup = new Map<string, { layer: string; table: string; field: string }>();
  for (const fk of introspected.fks) {
    const key = `${fk.table_schema}.${fk.table_name}.${fk.column_name}`;
    fkLookup.set(key, {
      layer: schemaToLayer(fk.ref_schema),
      table: fk.ref_table,
      field: fk.ref_column,
    });
  }

  // Group columns by schema.table
  const tableColumns = new Map<string, ColumnRow[]>();
  for (const col of introspected.columns) {
    const key = `${col.table_schema}.${col.table_name}`;
    if (!tableColumns.has(key)) tableColumns.set(key, []);
    tableColumns.get(key)!.push(col);
  }

  // Track which tables exist in the DB per layer
  const dbTablesByLayer: Record<string, Set<string>> = { L1: new Set(), L2: new Set(), L3: new Set() };
  for (const t of introspected.tables) {
    const layer = schemaToLayer(t.table_schema);
    dbTablesByLayer[layer].add(t.table_name);
  }

  // Process each layer
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    const schema = layer.toLowerCase();
    const ddTables = dd[layer];
    const dbNames = dbTablesByLayer[layer];
    const existingMap = new Map(ddTables.map(t => [t.name, t]));

    for (const tableName of dbNames) {
      const tableKey = `${schema}.${tableName}`;
      const columns = tableColumns.get(tableKey) ?? [];
      const pkColumns = pkLookup.get(tableKey) ?? new Set<string>();
      const isComposite = (pkCountLookup.get(tableKey) ?? 0) > 1;

      const existing = existingMap.get(tableName);
      if (!existing) {
        const newTable: DataDictionaryTable = {
          name: tableName,
          layer,
          category: 'Uncategorized',
          fields: columns.map(col => columnToField(col, schema, tableName, pkColumns, isComposite, fkLookup)),
        };
        ddTables.push(newTable);
        report.tablesAdded.push(`${layer}.${tableName}`);
      } else {
        const existingFieldMap = new Map(existing.fields.map(f => [f.name, f]));
        const dbFieldNames = new Set(columns.map(c => c.column_name));

        for (const col of columns) {
          const displayType = formatPgType(
            col.data_type,
            col.character_maximum_length,
            col.numeric_precision,
            col.numeric_scale,
            col.udt_name,
            col.column_default,
          );
          const isPK = pkColumns.has(col.column_name);
          const fkKey = `${schema}.${tableName}.${col.column_name}`;
          const fkTarget = fkLookup.get(fkKey);

          const existingField = existingFieldMap.get(col.column_name);
          if (!existingField) {
            existing.fields.push(
              columnToField(col, schema, tableName, pkColumns, isComposite, fkLookup),
            );
            report.fieldsAdded.push(`${layer}.${tableName}.${col.column_name}`);
          } else {
            if (existingField.data_type !== displayType) {
              report.typesChanged.push(
                `${layer}.${tableName}.${col.column_name}: ${existingField.data_type ?? '(none)'} → ${displayType}`,
              );
              existingField.data_type = displayType;
            }

            const oldIsPK = !!existingField.pk_fk?.is_pk;
            const oldFK = existingField.pk_fk?.fk_target;
            const fkChanged = fkTarget
              ? (!oldFK || oldFK.layer !== fkTarget.layer || oldFK.table !== fkTarget.table || oldFK.field !== fkTarget.field)
              : !!oldFK;

            if (oldIsPK !== isPK || fkChanged) {
              if (isPK || fkTarget) {
                existingField.pk_fk = {
                  is_pk: isPK,
                  is_composite: isComposite && isPK,
                  ...(fkTarget ? { fk_target: fkTarget } : {}),
                };
              } else {
                delete existingField.pk_fk;
              }
              if (oldIsPK !== isPK) {
                report.pkChanges.push(`${layer}.${tableName}.${col.column_name}: PK ${oldIsPK} → ${isPK}`);
              }
              if (fkChanged) {
                report.fkChanges.push(`${layer}.${tableName}.${col.column_name}: FK changed`);
              }
            }
          }
        }

        for (const [fieldName] of existingFieldMap) {
          if (!dbFieldNames.has(fieldName)) {
            report.fieldsRemoved.push(`${layer}.${tableName}.${fieldName}`);
          }
        }

        existing.fields = existing.fields.filter(f => dbFieldNames.has(f.name));

        const ordinalMap = new Map(columns.map(c => [c.column_name, c.ordinal_position]));
        existing.fields.sort((a, b) => (ordinalMap.get(a.name) ?? 999) - (ordinalMap.get(b.name) ?? 999));
      }
    }

    for (const [tableName] of existingMap) {
      if (!dbNames.has(tableName)) {
        report.tablesRemoved.push(`${layer}.${tableName}`);
      }
    }

    // Filter to DB-present tables and deduplicate by name
    const seen = new Set<string>();
    dd[layer] = ddTables.filter(t => {
      if (!dbNames.has(t.name) || seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });

    report.totalTables[layer] = dbNames.size;
    report.totalFields[layer] = [...dbNames].reduce(
      (sum, name) => sum + (tableColumns.get(`${schema}.${name}`)?.length ?? 0),
      0,
    );
  }

  // Rebuild relationships from DB FK data
  const newRelationships: DataDictionaryRelationship[] = [];
  const relSet = new Set<string>();
  for (const fk of introspected.fks) {
    const fromLayer = schemaToLayer(fk.table_schema);
    const toLayer = schemaToLayer(fk.ref_schema);
    const relKey = `${fromLayer}.${fk.table_name}.${fk.column_name}->${toLayer}.${fk.ref_table}.${fk.ref_column}`;
    if (!relSet.has(relKey)) {
      newRelationships.push({
        from_layer: fromLayer,
        from_table: fk.table_name,
        from_field: fk.column_name,
        to_layer: toLayer,
        to_table: fk.ref_table,
        to_field: fk.ref_column,
      });
      relSet.add(relKey);
    }
  }

  // Preserve logical relationships not enforced as FK constraints
  for (const r of dd.relationships) {
    const relKey = `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`;
    if (!relSet.has(relKey)) {
      const fromExists = dd[r.from_layer as 'L1' | 'L2' | 'L3']?.some(t => t.name === r.from_table);
      const toExists = dd[r.to_layer as 'L1' | 'L2' | 'L3']?.some(t => t.name === r.to_table);
      if (fromExists && toExists) {
        newRelationships.push(r);
        relSet.add(relKey);
      }
    }
  }

  dd.relationships = newRelationships;
  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience: full introspection pipeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Connect to PostgreSQL, introspect, merge into data dictionary, disconnect.
 * Mutates `dd` in-place and returns the report.
 */
export async function runIntrospection(
  dd: DataDictionary,
  databaseUrl: string,
): Promise<IntrospectReport> {
  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    throw new Error('pg module not installed — run: npm install pg');
  }

  const client = new pg.default.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    const introspected = await introspectDatabase(client);
    return mergeIntoDataDictionary(dd, introspected);
  } finally {
    await client.end();
  }
}

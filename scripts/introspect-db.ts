/**
 * Introspect PostgreSQL database to update the data dictionary.
 * The live database is the golden source of truth for tables, fields, and data types.
 *
 * Usage: npm run db:introspect
 * Requires: DATABASE_URL in .env (or parent .env), pg package
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

import type {
  DataDictionary,
  DataDictionaryTable,
  DataDictionaryField,
  DataDictionaryRelationship,
} from '../lib/data-dictionary';

// ═══════════════════════════════════════════════════════════════════════════
// PostgreSQL type → display type mapping
// ═══════════════════════════════════════════════════════════════════════════

function formatPgType(
  dataType: string,
  charMaxLen: number | null,
  numericPrecision: number | null,
  numericScale: number | null,
  udtName: string,
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
      return 'INTEGER';
    case 'bigint':
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

function schemaToLayer(schema: string): 'L1' | 'L2' | 'L3' {
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

interface ColumnRow {
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

interface PKRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
}

interface FKRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
}

async function introspectDatabase(client: pg.Client) {
  // All tables
  const tablesResult = await client.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema IN ('l1','l2','l3') AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`
  );

  // All columns with types
  const columnsResult = await client.query<ColumnRow>(
    `SELECT table_schema, table_name, column_name, data_type,
            character_maximum_length, numeric_precision, numeric_scale,
            is_nullable, column_default, ordinal_position, udt_name
     FROM information_schema.columns
     WHERE table_schema IN ('l1','l2','l3')
     ORDER BY table_schema, table_name, ordinal_position`
  );

  // Primary keys
  const pkResult = await client.query<PKRow>(
    `SELECT tc.table_schema, tc.table_name, kcu.column_name, kcu.ordinal_position
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema IN ('l1','l2','l3')
     ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position`
  );

  // Foreign keys
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
// Merge introspected data into data dictionary
// ═══════════════════════════════════════════════════════════════════════════

interface IntrospectReport {
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

function mergeIntoDataDictionary(
  dd: DataDictionary,
  introspected: Awaited<ReturnType<typeof introspectDatabase>>,
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
  const pkCountLookup = new Map<string, number>(); // how many PK columns
  for (const pk of introspected.pks) {
    const key = `${pk.table_schema}.${pk.table_name}`;
    if (!pkLookup.has(key)) pkLookup.set(key, new Set());
    pkLookup.get(key)!.add(pk.column_name);
  }
  for (const [key, cols] of pkLookup) {
    pkCountLookup.set(key, cols.size);
  }

  // Build FK lookup: schema.table.column -> { refSchema, refTable, refColumn }
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

    // Add/update tables that exist in DB
    for (const tableName of dbNames) {
      const tableKey = `${schema}.${tableName}`;
      const columns = tableColumns.get(tableKey) ?? [];
      const pkColumns = pkLookup.get(tableKey) ?? new Set<string>();
      const isComposite = (pkCountLookup.get(tableKey) ?? 0) > 1;

      const existing = existingMap.get(tableName);
      if (!existing) {
        // New table from DB
        const newTable: DataDictionaryTable = {
          name: tableName,
          layer,
          category: 'Uncategorized',
          fields: columns.map(col => columnToField(col, schema, tableName, pkColumns, isComposite, fkLookup)),
        };
        ddTables.push(newTable);
        report.tablesAdded.push(`${layer}.${tableName}`);
      } else {
        // Existing table — update fields from DB
        const existingFieldMap = new Map(existing.fields.map(f => [f.name, f]));
        const dbFieldNames = new Set(columns.map(c => c.column_name));

        // Add/update fields
        for (const col of columns) {
          const displayType = formatPgType(
            col.data_type,
            col.character_maximum_length,
            col.numeric_precision,
            col.numeric_scale,
            col.udt_name,
          );
          const isPK = pkColumns.has(col.column_name);
          const fkKey = `${schema}.${tableName}.${col.column_name}`;
          const fkTarget = fkLookup.get(fkKey);

          const existingField = existingFieldMap.get(col.column_name);
          if (!existingField) {
            // New field from DB
            existing.fields.push(
              columnToField(col, schema, tableName, pkColumns, isComposite, fkLookup),
            );
            report.fieldsAdded.push(`${layer}.${tableName}.${col.column_name}`);
          } else {
            // Update structural data, preserve enrichment
            if (existingField.data_type !== displayType) {
              report.typesChanged.push(
                `${layer}.${tableName}.${col.column_name}: ${existingField.data_type ?? '(none)'} → ${displayType}`,
              );
              existingField.data_type = displayType;
            }

            // Update PK/FK
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

        // Report fields in DD but not in DB
        for (const [fieldName] of existingFieldMap) {
          if (!dbFieldNames.has(fieldName)) {
            report.fieldsRemoved.push(`${layer}.${tableName}.${fieldName}`);
          }
        }

        // Remove fields not in DB (DB is golden)
        existing.fields = existing.fields.filter(f => dbFieldNames.has(f.name));

        // Reorder fields to match DB ordinal_position
        const ordinalMap = new Map(columns.map(c => [c.column_name, c.ordinal_position]));
        existing.fields.sort((a, b) => (ordinalMap.get(a.name) ?? 999) - (ordinalMap.get(b.name) ?? 999));
      }
    }

    // Report tables in DD but not in DB
    for (const [tableName] of existingMap) {
      if (!dbNames.has(tableName)) {
        report.tablesRemoved.push(`${layer}.${tableName}`);
      }
    }

    // Remove tables not in DB (DB is golden)
    dd[layer] = ddTables.filter(t => dbNames.has(t.name));

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

  // Preserve any relationships from existing DD that aren't in DB FK constraints
  // (e.g. L3 logical relationships that aren't enforced as FK constraints)
  for (const r of dd.relationships) {
    const relKey = `${r.from_layer}.${r.from_table}.${r.from_field}->${r.to_layer}.${r.to_table}.${r.to_field}`;
    if (!relSet.has(relKey)) {
      // Check if both tables still exist
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

function columnToField(
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
// CLI entry point
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('  DATABASE_URL not set. Add it to .env or set in environment.');
    process.exit(1);
  }

  console.log('\n  Introspecting PostgreSQL database...\n');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const introspected = await introspectDatabase(client);

    console.log(`  Found: ${introspected.tables.length} tables, ${introspected.columns.length} columns`);
    console.log(`  PKs: ${introspected.pks.length} columns, FKs: ${introspected.fks.length} constraints`);

    // Read existing data dictionary (preserve descriptions, categories, etc.)
    const DD_PATH = path.resolve(__dirname, '../facility-summary-mvp/output/data-dictionary/data-dictionary.json');
    let dd: DataDictionary;
    if (fs.existsSync(DD_PATH)) {
      dd = JSON.parse(fs.readFileSync(DD_PATH, 'utf-8'));
      console.log(`  Existing data dictionary: L1=${dd.L1.length} L2=${dd.L2.length} L3=${dd.L3.length} tables`);
    } else {
      dd = { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} };
      console.log('  No existing data dictionary — creating from scratch');
    }

    // Merge
    const report = mergeIntoDataDictionary(dd, introspected);

    // Write updated data dictionary
    const ddDir = path.dirname(DD_PATH);
    if (!fs.existsSync(ddDir)) fs.mkdirSync(ddDir, { recursive: true });
    fs.writeFileSync(DD_PATH, JSON.stringify(dd, null, 2), 'utf-8');

    // Print report
    console.log('\n  ═══ Introspection Report ═══\n');

    if (report.tablesAdded.length > 0) {
      console.log(`  Tables added (${report.tablesAdded.length}):`);
      for (const t of report.tablesAdded) console.log(`    + ${t}`);
    }
    if (report.tablesRemoved.length > 0) {
      console.log(`  Tables removed (${report.tablesRemoved.length}):`);
      for (const t of report.tablesRemoved) console.log(`    - ${t}`);
    }
    if (report.fieldsAdded.length > 0) {
      console.log(`  Fields added (${report.fieldsAdded.length}):`);
      for (const f of report.fieldsAdded.slice(0, 20)) console.log(`    + ${f}`);
      if (report.fieldsAdded.length > 20) console.log(`    ... and ${report.fieldsAdded.length - 20} more`);
    }
    if (report.fieldsRemoved.length > 0) {
      console.log(`  Fields removed (${report.fieldsRemoved.length}):`);
      for (const f of report.fieldsRemoved.slice(0, 20)) console.log(`    - ${f}`);
      if (report.fieldsRemoved.length > 20) console.log(`    ... and ${report.fieldsRemoved.length - 20} more`);
    }
    if (report.typesChanged.length > 0) {
      console.log(`  Types changed (${report.typesChanged.length}):`);
      for (const t of report.typesChanged.slice(0, 30)) console.log(`    ~ ${t}`);
      if (report.typesChanged.length > 30) console.log(`    ... and ${report.typesChanged.length - 30} more`);
    }
    if (report.pkChanges.length > 0) {
      console.log(`  PK changes (${report.pkChanges.length}):`);
      for (const p of report.pkChanges) console.log(`    ~ ${p}`);
    }
    if (report.fkChanges.length > 0) {
      console.log(`  FK changes (${report.fkChanges.length}):`);
      for (const f of report.fkChanges.slice(0, 20)) console.log(`    ~ ${f}`);
      if (report.fkChanges.length > 20) console.log(`    ... and ${report.fkChanges.length - 20} more`);
    }

    const noChanges =
      report.tablesAdded.length === 0 &&
      report.tablesRemoved.length === 0 &&
      report.fieldsAdded.length === 0 &&
      report.fieldsRemoved.length === 0 &&
      report.typesChanged.length === 0;

    if (noChanges) {
      console.log('  No structural changes — data dictionary already matches database.');
    }

    console.log(`\n  Data dictionary totals:`);
    console.log(`    L1: ${report.totalTables.L1} tables, ${report.totalFields.L1} fields`);
    console.log(`    L2: ${report.totalTables.L2} tables, ${report.totalFields.L2} fields`);
    console.log(`    L3: ${report.totalTables.L3} tables, ${report.totalFields.L3} fields`);
    const totalT = report.totalTables.L1 + report.totalTables.L2 + report.totalTables.L3;
    const totalF = report.totalFields.L1 + report.totalFields.L2 + report.totalFields.L3;
    console.log(`    Total: ${totalT} tables, ${totalF} fields`);
    console.log(`    Relationships: ${dd.relationships.length}`);
    console.log('');

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Introspection failed:', err);
  process.exit(1);
});

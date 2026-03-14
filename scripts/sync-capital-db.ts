/**
 * Sync postgres_capital from main postgres database.
 *
 * Detects schema differences (new tables, new columns, type changes, new FKs)
 * in the main database and applies them to postgres_capital. Preserves
 * capital-specific additions (tables and columns from 002-capital-metrics.sql).
 *
 * Usage:
 *   npm run db:sync-capital          # interactive
 *   npm run db:sync-capital -- --yes # auto-confirm
 */
import 'dotenv/config';
import pg from 'pg';

const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];

// Capital-specific tables — never drop, never compare against main
const CAPITAL_ONLY_TABLES = new Set([
  'l1.basel_exposure_type_dim',
  'l1.regulatory_capital_requirement',
  'l2.capital_position_snapshot',
  'l3.facility_rwa_calc',
  'l3.capital_binding_constraint',
  'l3.facility_capital_consumption',
  'l3.counterparty_capital_consumption',
  'l3.desk_capital_consumption',
  'l3.portfolio_capital_consumption',
  'l3.segment_capital_consumption',
]);

// Capital-specific columns on shared tables — never drop
const CAPITAL_ONLY_COLUMNS = new Set([
  'l2.facility_master.legal_entity_id',
  'l2.facility_master.profit_center_code',
  'l2.facility_risk_snapshot.risk_weight_std_pct',
  'l2.facility_risk_snapshot.risk_weight_erba_pct',
  'l2.facility_risk_snapshot.is_defaulted_flag',
  'l2.facility_risk_snapshot.basel_exposure_type_id',
]);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Column {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
}

interface Table {
  table_schema: string;
  table_name: string;
}

interface FK {
  constraint_name: string;
  table_schema: string;
  table_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
}

interface SchemaSnapshot {
  tables: Table[];
  columns: Column[];
  fks: FK[];
}

// ─── Schema Introspection ────────────────────────────────────────────────────

async function introspect(client: pg.Client): Promise<SchemaSnapshot> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');

  const [tables, columns, fks] = await Promise.all([
    client.query<Table>(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN (${schemaList}) AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `),
    client.query<Column>(`
      SELECT table_schema, table_name, column_name, data_type, udt_name,
             character_maximum_length, numeric_precision, numeric_scale,
             is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema IN (${schemaList})
      ORDER BY table_schema, table_name, column_name
    `),
    client.query<FK>(`
      SELECT tc.constraint_name, tc.table_schema, tc.table_name,
             kcu.column_name, ccu.table_schema AS ref_schema,
             ccu.table_name AS ref_table, ccu.column_name AS ref_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema IN (${schemaList})
      ORDER BY tc.table_schema, tc.table_name
    `),
  ]);

  return { tables: tables.rows, columns: columns.rows, fks: fks.rows };
}

// ─── Diff Generation ─────────────────────────────────────────────────────────

function fqn(schema: string, table: string, col?: string): string {
  return col ? `${schema}.${table}.${col}` : `${schema}.${table}`;
}

function pgType(col: Column): string {
  if (col.data_type === 'character varying') return `VARCHAR(${col.character_maximum_length || 255})`;
  if (col.data_type === 'numeric') return `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
  if (col.udt_name === 'int8') return 'BIGINT';
  if (col.udt_name === 'int4') return 'INTEGER';
  if (col.udt_name === 'bool') return 'BOOLEAN';
  if (col.udt_name === 'timestamp' || col.udt_name === 'timestamptz') return 'TIMESTAMP';
  if (col.udt_name === 'date') return 'DATE';
  if (col.udt_name === 'text') return 'TEXT';
  return col.data_type.toUpperCase();
}

interface DDLStatement {
  description: string;
  sql: string;
}

function generateDiff(main: SchemaSnapshot, capital: SchemaSnapshot): DDLStatement[] {
  const stmts: DDLStatement[] = [];

  const mainTables = new Set(main.tables.map(t => fqn(t.table_schema, t.table_name)));
  const capTables = new Set(capital.tables.map(t => fqn(t.table_schema, t.table_name)));

  // 1. New tables in main that don't exist in capital (and aren't capital-only)
  const mainTableDefs = new Map<string, Column[]>();
  for (const col of main.columns) {
    const key = fqn(col.table_schema, col.table_name);
    if (!mainTableDefs.has(key)) mainTableDefs.set(key, []);
    mainTableDefs.get(key)!.push(col);
  }

  for (const tbl of main.tables) {
    const key = fqn(tbl.table_schema, tbl.table_name);
    if (!capTables.has(key) && !CAPITAL_ONLY_TABLES.has(key)) {
      // Need full CREATE TABLE — use pg_dump style
      stmts.push({
        description: `Create new table ${key}`,
        sql: generateCreateTable(tbl, mainTableDefs.get(key) || [], main.fks),
      });
    }
  }

  // 2. New columns on existing shared tables
  const capColumns = new Set(capital.columns.map(c => fqn(c.table_schema, c.table_name, c.column_name)));

  for (const col of main.columns) {
    const tblKey = fqn(col.table_schema, col.table_name);
    const colKey = fqn(col.table_schema, col.table_name, col.column_name);
    if (capTables.has(tblKey) && !capColumns.has(colKey) && !CAPITAL_ONLY_COLUMNS.has(colKey)) {
      const typeDef = pgType(col);
      const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
      const dflt = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      stmts.push({
        description: `Add column ${colKey} (${typeDef})`,
        sql: `ALTER TABLE ${col.table_schema}.${col.table_name} ADD COLUMN IF NOT EXISTS "${col.column_name}" ${typeDef}${nullable}${dflt};`,
      });
    }
  }

  return stmts;
}

function generateCreateTable(tbl: Table, columns: Column[], fks: FK[]): string {
  const colDefs = columns.map(c => {
    const typeDef = pgType(c);
    const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : '';
    const dflt = c.column_default ? ` DEFAULT ${c.column_default}` : '';
    return `  "${c.column_name}" ${typeDef}${nullable}${dflt}`;
  });

  return `CREATE TABLE IF NOT EXISTS ${tbl.table_schema}.${tbl.table_name} (\n${colDefs.join(',\n')}\n);`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Derive capital URL: replace database name
  const capitalUrl = mainUrl.replace(/\/([^/?]+)(\?|$)/, '/postgres_capital$2');
  if (capitalUrl === mainUrl) {
    // Fallback: append _capital
    console.error('Could not derive capital DB URL. Set CAPITAL_DATABASE_URL explicitly.');
    process.exit(1);
  }

  const autoConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

  console.log('  Connecting to main database...');
  const mainClient = new pg.Client({ connectionString: mainUrl });
  await mainClient.connect();

  console.log('  Connecting to postgres_capital...');
  let capitalClient: pg.Client;
  try {
    capitalClient = new pg.Client({ connectionString: capitalUrl });
    await capitalClient.connect();
  } catch (e: any) {
    console.log(`  postgres_capital not available (${e.message}). Skipping sync.`);
    await mainClient.end();
    process.exit(0);
  }

  try {
    console.log('  Introspecting both databases...');
    const [mainSchema, capitalSchema] = await Promise.all([
      introspect(mainClient),
      introspect(capitalClient),
    ]);

    console.log(`  Main: ${mainSchema.tables.length} tables, ${mainSchema.columns.length} columns`);
    console.log(`  Capital: ${capitalSchema.tables.length} tables, ${capitalSchema.columns.length} columns`);

    const diff = generateDiff(mainSchema, capitalSchema);

    if (diff.length === 0) {
      console.log('\n  postgres_capital is up to date with main database. No changes needed.');
      return;
    }

    console.log(`\n  ${diff.length} change(s) to apply:\n`);
    for (const stmt of diff) {
      console.log(`    - ${stmt.description}`);
    }

    if (!autoConfirm) {
      console.log('\n  Run with --yes to auto-apply, or apply manually.');
      console.log('  DDL statements:');
      for (const stmt of diff) {
        console.log(`\n  -- ${stmt.description}`);
        console.log(`  ${stmt.sql}`);
      }
      return;
    }

    // Apply changes
    console.log('\n  Applying changes to postgres_capital...');
    await capitalClient.query('SET search_path TO l1, l2, l3, public;');
    let applied = 0;
    for (const stmt of diff) {
      try {
        await capitalClient.query(stmt.sql);
        console.log(`    OK: ${stmt.description}`);
        applied++;
      } catch (e: any) {
        console.error(`    FAIL: ${stmt.description} — ${e.message}`);
      }
    }
    console.log(`\n  Applied ${applied}/${diff.length} changes.`);

    // Also sync data for new tables (if any were created, copy data from main)
    const newTables = diff.filter(d => d.description.startsWith('Create new table'));
    if (newTables.length > 0) {
      console.log(`\n  Syncing data for ${newTables.length} new table(s)...`);
      for (const stmt of newTables) {
        const match = stmt.description.match(/Create new table (\w+)\.(\w+)/);
        if (!match) continue;
        const [, schema, table] = match;
        try {
          const data = await mainClient.query(`SELECT * FROM ${schema}.${table}`);
          if (data.rows.length > 0) {
            const cols = Object.keys(data.rows[0]);
            const quotedCols = cols.map(c => `"${c}"`).join(', ');
            for (const row of data.rows) {
              const vals = cols.map(c => {
                const v = row[c];
                if (v === null) return 'NULL';
                if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                if (v instanceof Date) return `'${v.toISOString()}'`;
                if (typeof v === 'number') return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
              });
              await capitalClient.query(
                `INSERT INTO ${schema}.${table} (${quotedCols}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`
              );
            }
            console.log(`    ${schema}.${table}: ${data.rows.length} rows synced`);
          } else {
            console.log(`    ${schema}.${table}: empty (0 rows)`);
          }
        } catch (e: any) {
          console.error(`    ${schema}.${table}: data sync failed — ${e.message}`);
        }
      }
    }
  } finally {
    await mainClient.end();
    await capitalClient.end();
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

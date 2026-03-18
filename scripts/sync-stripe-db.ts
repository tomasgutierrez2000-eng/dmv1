/**
 * Sync a stripe database from the main database.
 *
 * Detects schema differences (new tables, new columns) in the main database
 * and applies them to the stripe. Preserves stripe-specific additions
 * (tables and columns listed in stripe.config.json).
 *
 * Usage:
 *   npm run stripe:sync -- --name market          # dry-run (show changes)
 *   npm run stripe:sync -- --name market --yes    # auto-apply changes
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'stripe.config.json');

// ─── Types ───────────────────────────────────────────────────────────────────

interface StripeEntry {
  database_name: string;
  database_url: string;
  created_at: string;
  stripe_only_tables: string[];
  stripe_only_columns: string[];
  status: 'active' | 'archived';
}

interface StripeConfig {
  version: '1.0';
  stripes: Record<string, StripeEntry>;
}

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

interface PKInfo {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  ordinal_position: number;
}

interface SchemaSnapshot {
  tables: Table[];
  columns: Column[];
  fks: FK[];
  pks: PKInfo[];
}

interface DDLStatement {
  description: string;
  sql: string;
  category: 'create_table' | 'add_column' | 'add_fk' | 'sync_data';
}

// ─── Config ─────────────────────────────────────────────────────────────────

function loadConfig(): StripeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('stripe.config.json not found. Run stripe:create first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

// ─── Arg Parsing ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let name = '';
  let autoConfirm = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--yes' || args[i] === '-y') {
      autoConfirm = true;
    }
  }

  if (!name) {
    console.error('Usage: npm run stripe:sync -- --name <stripe_name> [--yes]');
    process.exit(1);
  }

  return { name, autoConfirm };
}

// ─── Schema Introspection ───────────────────────────────────────────────────

async function introspect(client: pg.Client): Promise<SchemaSnapshot> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const [tables, columns, fks, pks] = await Promise.all([
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
      SELECT con.conname AS constraint_name, n.nspname AS table_schema, c.relname AS table_name,
             a.attname AS column_name, rn.nspname AS ref_schema,
             rc.relname AS ref_table, ra.attname AS ref_column
      FROM pg_constraint con
      JOIN pg_class c ON con.conrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_class rc ON con.confrelid = rc.oid
      JOIN pg_namespace rn ON rc.relnamespace = rn.oid
      CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(col, refcol, ord)
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.col
      JOIN pg_attribute ra ON ra.attrelid = rc.oid AND ra.attnum = k.refcol
      WHERE con.contype = 'f' AND n.nspname IN (${schemaList})
      ORDER BY n.nspname, c.relname, con.conname, k.ord
    `),
    client.query<PKInfo>(`
      SELECT tc.table_schema, tc.table_name, tc.constraint_name,
             kcu.column_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema IN (${schemaList})
      ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
    `),
  ]);
  return { tables: tables.rows, columns: columns.rows, fks: fks.rows, pks: pks.rows };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function isReservedWord(name: string): boolean {
  const reserved = new Set([
    'all', 'and', 'array', 'as', 'between', 'case', 'check', 'column', 'constraint',
    'create', 'cross', 'default', 'distinct', 'do', 'else', 'end', 'except', 'false',
    'fetch', 'for', 'foreign', 'from', 'full', 'grant', 'group', 'having', 'in',
    'inner', 'into', 'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
    'offset', 'on', 'only', 'or', 'order', 'outer', 'primary', 'references', 'right',
    'select', 'table', 'then', 'to', 'true', 'union', 'unique', 'user', 'using',
    'when', 'where', 'window', 'with', 'value',
  ]);
  return reserved.has(name.toLowerCase());
}

function quoteIdent(name: string): string {
  return isReservedWord(name) ? `"${name}"` : name;
}

// ─── Diff Generation ────────────────────────────────────────────────────────

function generateDiff(
  main: SchemaSnapshot,
  stripe: SchemaSnapshot,
  stripeOnlyTables: Set<string>,
  stripeOnlyColumns: Set<string>,
): DDLStatement[] {
  const stmts: DDLStatement[] = [];

  const mainTables = new Set(main.tables.map(t => fqn(t.table_schema, t.table_name)));
  const stripeTables = new Set(stripe.tables.map(t => fqn(t.table_schema, t.table_name)));

  // Build column map for main tables
  const mainTableDefs = new Map<string, Column[]>();
  for (const col of main.columns) {
    const key = fqn(col.table_schema, col.table_name);
    if (!mainTableDefs.has(key)) mainTableDefs.set(key, []);
    mainTableDefs.get(key)!.push(col);
  }

  // Build PK map
  const mainPKs = new Map<string, string[]>();
  for (const pk of main.pks) {
    const key = fqn(pk.table_schema, pk.table_name);
    if (!mainPKs.has(key)) mainPKs.set(key, []);
    mainPKs.get(key)!.push(pk.column_name);
  }

  // 1. New tables in main not in stripe (skip stripe-only)
  for (const tbl of main.tables) {
    const key = fqn(tbl.table_schema, tbl.table_name);
    if (!stripeTables.has(key) && !stripeOnlyTables.has(key)) {
      const cols = mainTableDefs.get(key) || [];
      const pkCols = mainPKs.get(key) || [];
      const colDefs = cols.map(c => {
        const typeDef = pgType(c);
        const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : '';
        const dflt = c.column_default && !c.column_default.startsWith('nextval(')
          ? ` DEFAULT ${c.column_default}` : '';
        return `  ${quoteIdent(c.column_name)} ${typeDef}${nullable}${dflt}`;
      });
      if (pkCols.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pkCols.map(quoteIdent).join(', ')})`);
      }
      stmts.push({
        description: `Create new table ${key}`,
        sql: `CREATE TABLE IF NOT EXISTS ${tbl.table_schema}."${tbl.table_name}" (\n${colDefs.join(',\n')}\n);`,
        category: 'create_table',
      });
    }
  }

  // 2. New columns on existing shared tables
  const stripeColumns = new Set(
    stripe.columns.map(c => fqn(c.table_schema, c.table_name, c.column_name))
  );

  for (const col of main.columns) {
    const tblKey = fqn(col.table_schema, col.table_name);
    const colKey = fqn(col.table_schema, col.table_name, col.column_name);
    if (stripeTables.has(tblKey) && !stripeColumns.has(colKey) && !stripeOnlyColumns.has(colKey)) {
      const typeDef = pgType(col);
      const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
      const dflt = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      stmts.push({
        description: `Add column ${colKey} (${typeDef})`,
        sql: `ALTER TABLE ${col.table_schema}."${col.table_name}" ADD COLUMN IF NOT EXISTS ${quoteIdent(col.column_name)} ${typeDef}${nullable}${dflt};`,
        category: 'add_column',
      });
    }
  }

  // 3. New FKs
  const stripeFKNames = new Set(stripe.fks.map(f => `${f.table_schema}.${f.constraint_name}`));
  const seenFK = new Set<string>();
  for (const fk of main.fks) {
    const fkKey = `${fk.table_schema}.${fk.constraint_name}`;
    if (!stripeFKNames.has(fkKey) && !seenFK.has(fkKey)) {
      seenFK.add(fkKey);
      // Only add FK if both tables exist in stripe (or are being created)
      const fromTable = fqn(fk.table_schema, fk.table_name);
      const refTable = fqn(fk.ref_schema, fk.ref_table);
      const willExist = stripeTables.has(fromTable) || stmts.some(s => s.description.includes(fromTable));
      const refExists = stripeTables.has(refTable) || stmts.some(s => s.description.includes(refTable));
      if (willExist && refExists) {
        stmts.push({
          description: `Add FK ${fk.constraint_name} on ${fromTable}`,
          sql: `DO $$ BEGIN ALTER TABLE ${fk.table_schema}."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY (${quoteIdent(fk.column_name)}) REFERENCES ${fk.ref_schema}."${fk.ref_table}" (${quoteIdent(fk.ref_column)}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
          category: 'add_fk',
        });
      }
    }
  }

  return stmts;
}

// ─── Data Sync for New Tables ───────────────────────────────────────────────

async function syncTableData(
  mainClient: pg.Client,
  stripeClient: pg.Client,
  schema: string,
  table: string,
): Promise<number> {
  const data = await mainClient.query(`SELECT * FROM ${schema}."${table}"`);
  if (data.rows.length === 0) return 0;

  const cols = Object.keys(data.rows[0]);
  const quotedCols = cols.map(c => quoteIdent(c)).join(', ');
  let inserted = 0;

  for (const row of data.rows) {
    const vals = cols.map(c => {
      const v = row[c];
      if (v === null) return 'NULL';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (v instanceof Date) return `'${v.toISOString()}'`;
      if (typeof v === 'number') return String(v);
      if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    try {
      await stripeClient.query(
        `INSERT INTO ${schema}."${table}" (${quotedCols}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`
      );
      inserted++;
    } catch { /* skip FK violations */ }
  }
  return inserted;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { name, autoConfirm } = parseArgs();
  const config = loadConfig();

  if (!config.stripes[name]) {
    console.error(`Stripe "${name}" not found in stripe.config.json.`);
    console.error(`Available stripes: ${Object.keys(config.stripes).join(', ') || '(none)'}`);
    process.exit(1);
  }

  const stripe = config.stripes[name];
  if (stripe.status !== 'active') {
    console.error(`Stripe "${name}" is ${stripe.status}. Cannot sync.`);
    process.exit(1);
  }

  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const stripeOnlyTables = new Set(stripe.stripe_only_tables);
  const stripeOnlyColumns = new Set(stripe.stripe_only_columns);

  console.log(`\n  Syncing stripe "${name}" (${stripe.database_name}) from main...`);

  const mainClient = new pg.Client({ connectionString: mainUrl });
  await mainClient.connect();

  let stripeClient: pg.Client;
  try {
    stripeClient = new pg.Client({ connectionString: stripe.database_url });
    await stripeClient.connect();
  } catch (e: any) {
    console.error(`  Cannot connect to stripe DB: ${e.message}`);
    await mainClient.end();
    process.exit(1);
  }

  try {
    console.log('  Introspecting both databases...');
    const [mainSchema, stripeSchema] = await Promise.all([
      introspect(mainClient),
      introspect(stripeClient),
    ]);

    console.log(`  Main:   ${mainSchema.tables.length} tables, ${mainSchema.columns.length} columns`);
    console.log(`  Stripe: ${stripeSchema.tables.length} tables, ${stripeSchema.columns.length} columns`);
    if (stripeOnlyTables.size > 0) {
      console.log(`  Preserving: ${stripeOnlyTables.size} stripe-only tables, ${stripeOnlyColumns.size} stripe-only columns`);
    }

    const diff = generateDiff(mainSchema, stripeSchema, stripeOnlyTables, stripeOnlyColumns);

    if (diff.length === 0) {
      console.log('\n  Stripe is up to date with main database. No changes needed.');
      return;
    }

    // Group by category for display
    const byCategory = {
      create_table: diff.filter(d => d.category === 'create_table'),
      add_column: diff.filter(d => d.category === 'add_column'),
      add_fk: diff.filter(d => d.category === 'add_fk'),
    };

    console.log(`\n  ${diff.length} change(s) to apply:`);
    if (byCategory.create_table.length > 0)
      console.log(`    New tables:  ${byCategory.create_table.length}`);
    if (byCategory.add_column.length > 0)
      console.log(`    New columns: ${byCategory.add_column.length}`);
    if (byCategory.add_fk.length > 0)
      console.log(`    New FKs:     ${byCategory.add_fk.length}`);

    console.log();
    for (const stmt of diff) {
      console.log(`    - ${stmt.description}`);
    }

    if (!autoConfirm) {
      console.log('\n  Run with --yes to auto-apply. DDL preview:');
      for (const stmt of diff) {
        console.log(`\n  -- ${stmt.description}`);
        console.log(`  ${stmt.sql}`);
      }
      return;
    }

    // Apply changes
    console.log('\n  Applying changes...');
    await stripeClient.query(`SET search_path TO ${SCHEMAS.join(', ')}, public;`);
    let applied = 0;
    for (const stmt of diff) {
      try {
        await stripeClient.query(stmt.sql);
        console.log(`    OK: ${stmt.description}`);
        applied++;
      } catch (e: any) {
        console.error(`    FAIL: ${stmt.description} — ${e.message}`);
      }
    }
    console.log(`\n  Applied ${applied}/${diff.length} changes.`);

    // Sync data for new tables
    const newTables = byCategory.create_table;
    if (newTables.length > 0) {
      console.log(`\n  Syncing data for ${newTables.length} new table(s)...`);
      for (const stmt of newTables) {
        const match = stmt.description.match(/Create new table (\w+)\.(\w+)/);
        if (!match) continue;
        const [, schema, table] = match;
        const rows = await syncTableData(mainClient, stripeClient, schema, table);
        console.log(`    ${schema}.${table}: ${rows} rows`);
      }
    }

    console.log('\n  Sync complete.');

  } finally {
    await mainClient.end();
    await stripeClient.end();
  }
}

main().catch(e => {
  console.error(`\n  Fatal: ${e.message}`);
  process.exit(1);
});

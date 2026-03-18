/**
 * Generate migration SQL from a stripe database back to main.
 *
 * Compares the stripe against main and produces an idempotent migration file
 * containing only stripe-specific additions (new tables, new columns, new FKs).
 * Output: sql/migrations/stripe-{name}-{timestamp}.sql
 *
 * Usage:
 *   npm run stripe:diff -- --name market               # generate migration file
 *   npm run stripe:diff -- --name market --stdout       # print to stdout instead
 *   npm run stripe:diff -- --name market --include-data # include INSERT statements for L1 dims
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'stripe.config.json');
const MIGRATIONS_DIR = path.join(ROOT, 'sql', 'migrations');

// ─── Types ───────────────────────────────────────────────────────────────────

interface StripeConfig {
  version: '1.0';
  stripes: Record<string, {
    database_name: string;
    database_url: string;
    created_at: string;
    stripe_only_tables: string[];
    stripe_only_columns: string[];
    status: 'active' | 'archived';
  }>;
}

interface Column {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
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

// ─── Config / Args ──────────────────────────────────────────────────────────

function loadConfig(): StripeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('stripe.config.json not found. Run stripe:create first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function parseArgs() {
  const args = process.argv.slice(2);
  let name = '';
  let toStdout = false;
  let includeData = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--stdout') {
      toStdout = true;
    } else if (args[i] === '--include-data') {
      includeData = true;
    }
  }

  if (!name) {
    console.error('Usage: npm run stripe:diff -- --name <stripe_name> [--stdout] [--include-data]');
    process.exit(1);
  }

  return { name, toStdout, includeData };
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
      SELECT table_schema, table_name, column_name, ordinal_position,
             data_type, udt_name, character_maximum_length,
             numeric_precision, numeric_scale, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema IN (${schemaList})
      ORDER BY table_schema, table_name, ordinal_position
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

// ─── Migration Generator ───────────────────────────────────────────────────

function generateMigration(
  stripeName: string,
  main: SchemaSnapshot,
  stripe: SchemaSnapshot,
  stripeOnlyTables: Set<string>,
  stripeOnlyColumns: Set<string>,
): string {
  const lines: string[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  lines.push(`-- Migration: stripe "${stripeName}" additions → main database`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Review carefully before applying to main database.`);
  lines.push('');
  lines.push('SET search_path TO l1, l2, l3, public;');
  lines.push('');

  const mainTables = new Set(main.tables.map(t => fqn(t.table_schema, t.table_name)));
  const stripeTables = new Set(stripe.tables.map(t => fqn(t.table_schema, t.table_name)));
  const mainColumns = new Set(main.columns.map(c => fqn(c.table_schema, c.table_name, c.column_name)));
  const mainFKNames = new Set(main.fks.map(f => `${f.table_schema}.${f.constraint_name}`));

  // Build column map for stripe
  const stripeColMap = new Map<string, Column[]>();
  for (const col of stripe.columns) {
    const key = fqn(col.table_schema, col.table_name);
    if (!stripeColMap.has(key)) stripeColMap.set(key, []);
    stripeColMap.get(key)!.push(col);
  }

  // Build PK map for stripe
  const stripePKs = new Map<string, string[]>();
  for (const pk of stripe.pks) {
    const key = fqn(pk.table_schema, pk.table_name);
    if (!stripePKs.has(key)) stripePKs.set(key, []);
    stripePKs.get(key)!.push(pk.column_name);
  }

  // Section 1: New tables (exist in stripe, not in main, and are stripe-only)
  const newTables: string[] = [];
  for (const tbl of stripe.tables) {
    const key = fqn(tbl.table_schema, tbl.table_name);
    if (!mainTables.has(key) && stripeOnlyTables.has(key)) {
      newTables.push(key);
    }
  }

  if (newTables.length > 0) {
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('-- NEW TABLES');
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('');

    for (const tblKey of newTables) {
      const [schema, table] = tblKey.split('.');
      const cols = (stripeColMap.get(tblKey) || []).sort((a, b) => a.ordinal_position - b.ordinal_position);
      const pkCols = stripePKs.get(tblKey) || [];

      lines.push(`-- Table: ${tblKey}`);
      const colDefs = cols.map(c => {
        const typeDef = pgType(c);
        const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : '';
        let dflt = '';
        if (c.column_default && !c.column_default.startsWith('nextval(')) {
          dflt = ` DEFAULT ${c.column_default}`;
        }
        return `  ${quoteIdent(c.column_name)} ${typeDef}${nullable}${dflt}`;
      });
      if (pkCols.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pkCols.map(quoteIdent).join(', ')})`);
      }
      lines.push(`CREATE TABLE IF NOT EXISTS ${schema}."${table}" (`);
      lines.push(colDefs.join(',\n'));
      lines.push(');');
      lines.push('');
    }
  }

  // Section 2: New columns on existing shared tables
  const newColumns: { tblKey: string; col: Column }[] = [];
  for (const col of stripe.columns) {
    const tblKey = fqn(col.table_schema, col.table_name);
    const colKey = fqn(col.table_schema, col.table_name, col.column_name);
    if (mainTables.has(tblKey) && !mainColumns.has(colKey) && stripeOnlyColumns.has(colKey)) {
      newColumns.push({ tblKey, col });
    }
  }

  if (newColumns.length > 0) {
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('-- NEW COLUMNS ON EXISTING TABLES');
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('');

    for (const { col } of newColumns) {
      const typeDef = pgType(col);
      const dflt = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      lines.push(`DO $$`);
      lines.push(`BEGIN`);
      lines.push(`    IF NOT EXISTS (SELECT 1 FROM information_schema.columns`);
      lines.push(`        WHERE table_schema = '${col.table_schema}' AND table_name = '${col.table_name}'`);
      lines.push(`        AND column_name = '${col.column_name}') THEN`);
      lines.push(`        ALTER TABLE ${col.table_schema}."${col.table_name}" ADD COLUMN ${quoteIdent(col.column_name)} ${typeDef}${dflt};`);
      lines.push(`    END IF;`);
      lines.push(`END $$;`);
      lines.push('');
    }
  }

  // Section 3: New FKs
  const newFKs: FK[] = [];
  const seenFK = new Set<string>();
  for (const fk of stripe.fks) {
    const fkKey = `${fk.table_schema}.${fk.constraint_name}`;
    if (!mainFKNames.has(fkKey) && !seenFK.has(fkKey)) {
      seenFK.add(fkKey);
      newFKs.push(fk);
    }
  }

  if (newFKs.length > 0) {
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('-- NEW FOREIGN KEY CONSTRAINTS');
    lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
    lines.push('');

    for (const fk of newFKs) {
      lines.push(`DO $$`);
      lines.push(`BEGIN`);
      lines.push(`    ALTER TABLE ${fk.table_schema}."${fk.table_name}"`);
      lines.push(`        ADD CONSTRAINT "${fk.constraint_name}"`);
      lines.push(`        FOREIGN KEY (${quoteIdent(fk.column_name)})`);
      lines.push(`        REFERENCES ${fk.ref_schema}."${fk.ref_table}" (${quoteIdent(fk.ref_column)});`);
      lines.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
      lines.push(`END $$;`);
      lines.push('');
    }
  }

  if (newTables.length === 0 && newColumns.length === 0 && newFKs.length === 0) {
    lines.push('-- No stripe-specific additions found.');
    lines.push('-- Make sure stripe_only_tables and stripe_only_columns are populated in stripe.config.json.');
  }

  lines.push('');
  lines.push(`-- Summary: ${newTables.length} new tables, ${newColumns.length} new columns, ${newFKs.length} new FKs`);

  return lines.join('\n');
}

// ─── Data Export for L1 Dim Tables ──────────────────────────────────────────

async function generateDataInserts(
  stripeClient: pg.Client,
  newTables: string[],
): Promise<string> {
  const lines: string[] = [];
  // Only export data for L1 tables (reference/dim data needed by main)
  const l1Tables = newTables.filter(t => t.startsWith('l1.'));

  if (l1Tables.length === 0) return '';

  lines.push('');
  lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
  lines.push('-- SEED DATA FOR NEW L1 REFERENCE TABLES');
  lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
  lines.push('');

  for (const tblKey of l1Tables) {
    const [schema, table] = tblKey.split('.');
    try {
      const data = await stripeClient.query(`SELECT * FROM ${schema}."${table}" ORDER BY 1`);
      if (data.rows.length === 0) continue;

      const cols = Object.keys(data.rows[0]);
      const quotedCols = cols.map(c => quoteIdent(c)).join(', ');

      lines.push(`-- ${tblKey}: ${data.rows.length} rows`);
      for (const row of data.rows) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (v instanceof Date) return `'${v.toISOString().split('T')[0]}'`;
          if (typeof v === 'number') return String(v);
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        lines.push(
          `INSERT INTO ${schema}."${table}" (${quotedCols}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;`
        );
      }
      lines.push('');
    } catch (e: any) {
      lines.push(`-- Could not export ${tblKey}: ${e.message}`);
    }
  }

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { name, toStdout, includeData } = parseArgs();
  const config = loadConfig();

  if (!config.stripes[name]) {
    console.error(`Stripe "${name}" not found in stripe.config.json.`);
    process.exit(1);
  }

  const stripe = config.stripes[name];
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  if (!toStdout) {
    console.log(`\n  Generating migration for stripe "${name}"...`);
  }

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
    const [mainSchema, stripeSchema] = await Promise.all([
      introspect(mainClient),
      introspect(stripeClient),
    ]);

    const stripeOnlyTables = new Set(stripe.stripe_only_tables);
    const stripeOnlyColumns = new Set(stripe.stripe_only_columns);

    let migration = generateMigration(name, mainSchema, stripeSchema, stripeOnlyTables, stripeOnlyColumns);

    // Optionally add data inserts
    if (includeData) {
      const mainTableSet = new Set(mainSchema.tables.map(t => fqn(t.table_schema, t.table_name)));
      const newTables = stripe.stripe_only_tables.filter(t => !mainTableSet.has(t));
      const dataInserts = await generateDataInserts(stripeClient, newTables);
      if (dataInserts) {
        migration += '\n' + dataInserts;
      }
    }

    if (toStdout) {
      console.log(migration);
    } else {
      // Write to migrations directory
      if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `stripe-${name}-${timestamp}.sql`;
      const filepath = path.join(MIGRATIONS_DIR, filename);
      fs.writeFileSync(filepath, migration, 'utf-8');

      const mainTableSet = new Set(mainSchema.tables.map(t => fqn(t.table_schema, t.table_name)));
      const newTables = stripe.stripe_only_tables.filter(t => !mainTableSet.has(t));
      const newCols = stripe.stripe_only_columns.filter(c => {
        const mainCols = new Set(mainSchema.columns.map(mc => fqn(mc.table_schema, mc.table_name, mc.column_name)));
        return !mainCols.has(c);
      });

      console.log(`\n  Migration file: ${path.relative(ROOT, filepath)}`);
      console.log(`  New tables:  ${newTables.length}`);
      console.log(`  New columns: ${newCols.length}`);
      console.log(`\n  Review the file, then apply to main:`);
      console.log(`    source .env && psql "$DATABASE_URL" -f ${path.relative(ROOT, filepath)}`);
    }

  } finally {
    await mainClient.end();
    await stripeClient.end();
  }
}

main().catch(e => {
  console.error(`\n  Fatal: ${e.message}`);
  process.exit(1);
});

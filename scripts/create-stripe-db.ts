/**
 * Create an isolated PostgreSQL database for a new risk stripe.
 *
 * Clones the full schema (L1/L2/L3) and data from the main database into
 * a new `postgres_{stripe_name}` database on the same Cloud SQL instance.
 * Registers the stripe in `stripe.config.json` for sync/diff tracking.
 *
 * Usage:
 *   npm run stripe:create -- --name market
 *   npm run stripe:create -- --name liquidity --schema-only   # skip data copy
 *   npm run stripe:create -- --name oprisk --force             # recreate if exists
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

interface ColumnInfo {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  column_default: string | null;
  is_nullable: string;
}

interface PKInfo {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  ordinal_position: number;
}

interface FKInfo {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  ref_schema: string;
  ref_table: string;
  ref_column: string;
}

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface SeqInfo {
  sequence_schema: string;
  sequence_name: string;
  last_value: string;
}

interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  pkColumns: string[];
  pkConstraintName: string | null;
}

// ─── Config Management ──────────────────────────────────────────────────────

function loadConfig(): StripeConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  return { version: '1.0', stripes: {} };
}

function saveConfig(config: StripeConfig): void {
  const tmp = `${CONFIG_PATH}.${Date.now()}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

// ─── Arg Parsing ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let name = '';
  let schemaOnly = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--schema-only') {
      schemaOnly = true;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  if (!name) {
    console.error('Usage: npm run stripe:create -- --name <stripe_name> [--schema-only] [--force]');
    console.error('  --name         Stripe name (e.g., market, liquidity, oprisk)');
    console.error('  --schema-only  Copy schema without data');
    console.error('  --force        Drop and recreate if database already exists');
    process.exit(1);
  }

  // Validate name: lowercase alphanumeric + underscores only
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    console.error(`Invalid stripe name "${name}". Must be lowercase, start with a letter, use only a-z, 0-9, _.`);
    process.exit(1);
  }

  return { name, schemaOnly, force };
}

// ─── Schema Discovery ───────────────────────────────────────────────────────

async function discoverTables(client: pg.Client): Promise<string[][]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query<{ table_schema: string; table_name: string }>(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN (${schemaList}) AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);
  return res.rows.map(r => [r.table_schema, r.table_name]);
}

async function discoverColumns(client: pg.Client): Promise<ColumnInfo[]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query<ColumnInfo>(`
    SELECT table_schema, table_name, column_name, ordinal_position,
           data_type, udt_name, character_maximum_length,
           numeric_precision, numeric_scale, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema IN (${schemaList})
    ORDER BY table_schema, table_name, ordinal_position
  `);
  return res.rows;
}

async function discoverPKs(client: pg.Client): Promise<PKInfo[]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query<PKInfo>(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name,
           kcu.column_name, kcu.ordinal_position
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema IN (${schemaList})
    ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
  `);
  return res.rows;
}

async function discoverFKs(client: pg.Client): Promise<FKInfo[]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  // Use pg_constraint for reliable cross-schema FK discovery
  const res = await client.query<FKInfo>(`
    SELECT
      con.conname AS constraint_name,
      n.nspname AS table_schema,
      c.relname AS table_name,
      a.attname AS column_name,
      rn.nspname AS ref_schema,
      rc.relname AS ref_table,
      ra.attname AS ref_column
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
  `);
  return res.rows;
}

async function discoverIndexes(client: pg.Client): Promise<IndexInfo[]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query<IndexInfo>(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname IN (${schemaList})
      AND indexname NOT LIKE '%_pkey'
    ORDER BY schemaname, tablename, indexname
  `);
  return res.rows;
}

async function discoverSequences(client: pg.Client): Promise<SeqInfo[]> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query<{ sequence_schema: string; sequence_name: string }>(`
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema IN (${schemaList})
    ORDER BY sequence_schema, sequence_name
  `);
  const seqs: SeqInfo[] = [];
  for (const row of res.rows) {
    const valRes = await client.query(`SELECT last_value FROM ${row.sequence_schema}.${row.sequence_name}`);
    seqs.push({
      sequence_schema: row.sequence_schema,
      sequence_name: row.sequence_name,
      last_value: valRes.rows[0]?.last_value?.toString() || '1',
    });
  }
  return seqs;
}

// ─── SQL Generation Helpers ────────────────────────────────────────────────

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

function formatColumnType(col: ColumnInfo): string {
  const udt = col.udt_name;
  const dt = col.data_type;
  if (dt === 'ARRAY') return udt.replace(/^_/, '') + '[]';
  if (dt === 'USER-DEFINED') return udt;
  switch (udt) {
    case 'int2': return 'SMALLINT';
    case 'int4': return 'INTEGER';
    case 'int8': return 'BIGINT';
    case 'float4': return 'REAL';
    case 'float8': return 'DOUBLE PRECISION';
    case 'bool': return 'BOOLEAN';
    case 'varchar':
      return col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
    case 'bpchar':
      return col.character_maximum_length ? `CHAR(${col.character_maximum_length})` : 'CHAR';
    case 'numeric':
      if (col.numeric_precision && col.numeric_scale !== null)
        return `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
      if (col.numeric_precision) return `NUMERIC(${col.numeric_precision})`;
      return 'NUMERIC';
    case 'text': return 'TEXT';
    case 'json': return 'JSON';
    case 'jsonb': return 'JSONB';
    case 'uuid': return 'UUID';
    case 'date': return 'DATE';
    case 'time': return 'TIME';
    case 'timestamp': return 'TIMESTAMP';
    case 'timestamptz': return 'TIMESTAMPTZ';
    case 'bytea': return 'BYTEA';
    default: return dt.toUpperCase();
  }
}

// ─── Topological Sort (Kahn's Algorithm) ────────────────────────────────────

function topoSort(tables: string[][], fks: FKInfo[]): string[][] {
  const key = (s: string, t: string) => `${s}.${t}`;
  const tableSet = new Set(tables.map(([s, t]) => key(s, t)));
  const inDegree = new Map<string, number>();
  const edges = new Map<string, Set<string>>();

  for (const [s, t] of tables) {
    const k = key(s, t);
    inDegree.set(k, 0);
    edges.set(k, new Set());
  }

  const seen = new Set<string>();
  for (const fk of fks) {
    const fromKey = key(fk.table_schema, fk.table_name);
    const toKey = key(fk.ref_schema, fk.ref_table);
    const ck = `${fk.table_schema}.${fk.constraint_name}`;
    if (!tableSet.has(fromKey) || !tableSet.has(toKey)) continue;
    if (fromKey === toKey) continue;
    if (seen.has(ck)) continue;
    seen.add(ck);
    const depSet = edges.get(toKey)!;
    if (!depSet.has(fromKey)) {
      depSet.add(fromKey);
      inDegree.set(fromKey, (inDegree.get(fromKey) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [k, deg] of inDegree) {
    if (deg === 0) queue.push(k);
  }

  const sorted: string[][] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const parts = node.split('.');
    sorted.push([parts[0], parts.slice(1).join('.')]);
    for (const dependent of edges.get(node) || []) {
      const newDeg = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  // Add any remaining tables (circular deps — shouldn't happen but safety net)
  const sortedSet = new Set(sorted.map(([s, t]) => key(s, t)));
  for (const [s, t] of tables) {
    if (!sortedSet.has(key(s, t))) sorted.push([s, t]);
  }

  return sorted;
}

// ─── DDL Builders ───────────────────────────────────────────────────────────

function buildTableInfo(
  schema: string,
  table: string,
  allColumns: ColumnInfo[],
  allPKs: PKInfo[],
): TableInfo {
  const columns = allColumns
    .filter(c => c.table_schema === schema && c.table_name === table)
    .sort((a, b) => a.ordinal_position - b.ordinal_position);
  const pks = allPKs
    .filter(p => p.table_schema === schema && p.table_name === table)
    .sort((a, b) => a.ordinal_position - b.ordinal_position);
  return {
    schema,
    name: table,
    columns,
    pkColumns: pks.map(p => p.column_name),
    pkConstraintName: pks[0]?.constraint_name || null,
  };
}

function generateCreateTable(info: TableInfo): string {
  const lines: string[] = [];
  for (const col of info.columns) {
    const typeSql = formatColumnType(col);
    const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
    let defaultSql = '';
    if (col.column_default && !col.column_default.startsWith('nextval(')) {
      defaultSql = ` DEFAULT ${col.column_default}`;
    }
    lines.push(`  ${quoteIdent(col.column_name)} ${typeSql}${nullable}${defaultSql}`);
  }
  if (info.pkColumns.length > 0) {
    const pkCols = info.pkColumns.map(quoteIdent).join(', ');
    const pkName = info.pkConstraintName || `${info.name}_pkey`;
    lines.push(`  CONSTRAINT ${quoteIdent(pkName)} PRIMARY KEY (${pkCols})`);
  }
  return `CREATE TABLE IF NOT EXISTS ${info.schema}."${info.name}" (\n${lines.join(',\n')}\n);`;
}

interface GroupedFK {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  columns: string[];
  ref_schema: string;
  ref_table: string;
  ref_columns: string[];
}

function groupFKs(fks: FKInfo[]): GroupedFK[] {
  const map = new Map<string, GroupedFK>();
  for (const fk of fks) {
    const key = `${fk.table_schema}.${fk.constraint_name}`;
    if (!map.has(key)) {
      map.set(key, {
        table_schema: fk.table_schema,
        table_name: fk.table_name,
        constraint_name: fk.constraint_name,
        columns: [],
        ref_schema: fk.ref_schema,
        ref_table: fk.ref_table,
        ref_columns: [],
      });
    }
    const g = map.get(key)!;
    g.columns.push(fk.column_name);
    g.ref_columns.push(fk.ref_column);
  }
  return Array.from(map.values());
}

function generateFK(fk: GroupedFK): string {
  const constraintName = fk.constraint_name.length > 63
    ? fk.constraint_name.substring(0, 63)
    : fk.constraint_name;
  const cols = fk.columns.map(quoteIdent).join(', ');
  const refCols = fk.ref_columns.map(quoteIdent).join(', ');
  return `ALTER TABLE ${fk.table_schema}."${fk.table_name}" ADD CONSTRAINT "${constraintName}" ` +
    `FOREIGN KEY (${cols}) REFERENCES ${fk.ref_schema}."${fk.ref_table}" ` +
    `(${refCols}) ON DELETE NO ACTION ON UPDATE NO ACTION;`;
}

// ─── Data Copy ──────────────────────────────────────────────────────────────

function serializeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const BATCH_SIZE = 200;

async function copyTableData(
  sourceClient: pg.Client,
  targetClient: pg.Client,
  schema: string,
  table: string,
  columns: ColumnInfo[],
): Promise<number> {
  // Count rows first
  const countRes = await sourceClient.query(`SELECT COUNT(*) AS cnt FROM ${schema}."${table}"`);
  const rowCount = parseInt(countRes.rows[0].cnt, 10);
  if (rowCount === 0) return 0;

  // Build column list with proper quoting
  const sortedCols = columns
    .sort((a, b) => a.ordinal_position - b.ordinal_position);
  const colList = sortedCols.map(c => quoteIdent(c.column_name)).join(', ');
  const colNames = sortedCols.map(c => c.column_name);

  // Fetch all data
  const data = await sourceClient.query(`SELECT * FROM ${schema}."${table}" ORDER BY 1`);

  // Batch insert for performance
  let inserted = 0;
  for (let i = 0; i < data.rows.length; i += BATCH_SIZE) {
    const batch = data.rows.slice(i, i + BATCH_SIZE);
    const valueRows = batch.map(row =>
      `(${colNames.map(col => serializeValue(row[col])).join(', ')})`
    );
    try {
      await targetClient.query(
        `INSERT INTO ${schema}."${table}" (${colList}) VALUES ${valueRows.join(',\n')} ON CONFLICT DO NOTHING`
      );
      inserted += batch.length;
    } catch (e: any) {
      // Fall back to single-row insert on batch failure
      for (const row of batch) {
        const vals = colNames.map(col => serializeValue(row[col]));
        try {
          await targetClient.query(
            `INSERT INTO ${schema}."${table}" (${colList}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`
          );
          inserted++;
        } catch { /* skip individual row failures */ }
      }
    }
  }
  return inserted;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { name, schemaOnly, force } = parseArgs();
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    console.error('DATABASE_URL not set. Cannot create stripe database.');
    process.exit(1);
  }

  const stripeName = `postgres_${name}`;
  const stripeUrl = mainUrl.replace(/\/([^/?]+)(\?|$)/, `/${stripeName}$2`);

  if (stripeUrl === mainUrl) {
    console.error('Could not derive stripe DB URL from DATABASE_URL.');
    process.exit(1);
  }

  console.log(`\n  Creating stripe database: ${stripeName}`);
  console.log(`  Source: main database (DATABASE_URL)`);
  console.log(`  Mode: ${schemaOnly ? 'schema only' : 'schema + data'}`);
  console.log();

  // Check config for existing stripe
  const config = loadConfig();
  if (config.stripes[name] && !force) {
    console.error(`  Stripe "${name}" already exists in stripe.config.json.`);
    console.error(`  Use --force to drop and recreate, or use stripe:sync to update.`);
    process.exit(1);
  }

  // Connect to main DB (also used to create the new database)
  const mainClient = new pg.Client({ connectionString: mainUrl });
  await mainClient.connect();

  try {
    // Step 1: Create the database (if it doesn't exist)
    console.log('  Step 1/6: Creating database...');
    if (force) {
      // Terminate existing connections before dropping
      try {
        await mainClient.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${stripeName}' AND pid <> pg_backend_pid()
        `);
      } catch { /* ignore if no connections */ }
      try {
        await mainClient.query(`DROP DATABASE IF EXISTS "${stripeName}"`);
        console.log(`    Dropped existing database ${stripeName}`);
      } catch (e: any) {
        console.error(`    Warning: Could not drop ${stripeName}: ${e.message}`);
      }
    }

    try {
      await mainClient.query(`CREATE DATABASE "${stripeName}"`);
      console.log(`    Created database ${stripeName}`);
    } catch (e: any) {
      if (e.code === '42P04') {
        console.log(`    Database ${stripeName} already exists`);
      } else {
        throw e;
      }
    }

    // Step 2: Connect to stripe DB and create schemas
    console.log('  Step 2/6: Creating schemas...');
    const stripeClient = new pg.Client({ connectionString: stripeUrl });
    await stripeClient.connect();

    try {
      for (const schema of SCHEMAS) {
        await stripeClient.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      }
      await stripeClient.query(`SET search_path TO ${SCHEMAS.join(', ')}, public;`);
      console.log(`    Created schemas: ${SCHEMAS.join(', ')}`);

      // Step 3: Discover main DB structure
      console.log('  Step 3/6: Discovering main DB schema...');
      const [tables, columns, pks, fks, indexes, sequences] = await Promise.all([
        discoverTables(mainClient),
        discoverColumns(mainClient),
        discoverPKs(mainClient),
        discoverFKs(mainClient),
        discoverIndexes(mainClient),
        discoverSequences(mainClient),
      ]);
      console.log(`    Found ${tables.length} tables, ${columns.length} columns, ${fks.length} FKs`);

      // Step 4: Create tables in topological order
      console.log('  Step 4/6: Creating tables (topologically sorted)...');
      const sorted = topoSort(tables, fks);
      let created = 0;
      for (const [schema, table] of sorted) {
        const info = buildTableInfo(schema, table, columns, pks);
        const ddl = generateCreateTable(info);
        try {
          await stripeClient.query(ddl);
          created++;
        } catch (e: any) {
          if (!e.message.includes('already exists')) {
            console.error(`    FAIL: ${schema}.${table}: ${e.message}`);
          }
        }
      }
      console.log(`    Created ${created}/${tables.length} tables`);

      // Step 5: Copy data (unless schema-only)
      if (!schemaOnly) {
        console.log('  Step 5/6: Copying data...');
        let totalRows = 0;
        for (const [schema, table] of sorted) {
          const tableCols = columns.filter(
            c => c.table_schema === schema && c.table_name === table
          );
          const rows = await copyTableData(mainClient, stripeClient, schema, table, tableCols);
          if (rows > 0) {
            console.log(`    ${schema}.${table}: ${rows} rows`);
            totalRows += rows;
          }
        }
        console.log(`    Total: ${totalRows} rows copied`);
      } else {
        console.log('  Step 5/6: Skipped (--schema-only)');
      }

      // Step 5b: Add FKs after all data is loaded (avoids FK violations during copy)
      console.log('  Step 5b: Adding foreign key constraints...');
      const grouped = groupFKs(fks);
      let fkAdded = 0;
      let fkFailed = 0;
      for (const gfk of grouped) {
        try {
          const sql = generateFK(gfk);
          await stripeClient.query(sql);
          fkAdded++;
        } catch (e: any) {
          if (!e.message.includes('already exists')) {
            fkFailed++;
            if (fkFailed <= 5) {
              console.error(`    WARN FK: ${gfk.table_schema}.${gfk.table_name}.${gfk.constraint_name}: ${e.message}`);
            }
          } else {
            fkAdded++; // already exists counts as success
          }
        }
      }
      if (fkFailed > 5) console.error(`    ... and ${fkFailed - 5} more FK warnings`);
      console.log(`    Added ${fkAdded}/${grouped.length} foreign keys`);

      // Step 5c: Create indexes
      for (const idx of indexes) {
        try {
          // Rewrite indexdef to use IF NOT EXISTS
          const idxSql = idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')
            .replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS');
          await stripeClient.query(idxSql);
        } catch { /* ignore duplicates */ }
      }

      // Step 5d: Reset sequences
      for (const seq of sequences) {
        try {
          await stripeClient.query(
            `SELECT setval('${seq.sequence_schema}.${seq.sequence_name}', ${seq.last_value}, true)`
          );
        } catch { /* ignore */ }
      }

      // Step 6: Update config
      console.log('  Step 6/6: Updating stripe.config.json...');
      config.stripes[name] = {
        database_name: stripeName,
        database_url: stripeUrl,
        created_at: new Date().toISOString(),
        stripe_only_tables: [],
        stripe_only_columns: [],
        status: 'active',
      };
      saveConfig(config);

      // Generate .env hint
      console.log(`\n  Done! Stripe database "${stripeName}" is ready.`);
      console.log(`\n  To use this stripe database, set:`);
      console.log(`    STRIPE_DATABASE_URL="${stripeUrl}"`);
      console.log(`\n  Sync from main:  npm run stripe:sync -- --name ${name}`);
      console.log(`  Generate diff:   npm run stripe:diff -- --name ${name}`);

    } finally {
      await stripeClient.end();
    }
  } finally {
    await mainClient.end();
  }
}

main().catch(e => {
  console.error(`\n  Fatal: ${e.message}`);
  process.exit(1);
});

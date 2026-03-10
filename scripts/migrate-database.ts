/**
 * Migrate PostgreSQL database between instances (any PG → PG).
 * Pure Node.js — no pg_dump/pg_restore required.
 *
 * Usage:
 *   # Dump source to SQL file
 *   SOURCE_DATABASE_URL="postgresql://..." npm run db:migrate -- --dump
 *
 *   # Restore SQL file to target
 *   TARGET_DATABASE_URL="postgresql://..." npm run db:migrate -- --restore
 *
 *   # Direct transfer (dump + restore in one shot)
 *   SOURCE_DATABASE_URL="postgresql://..." TARGET_DATABASE_URL="postgresql://..." npm run db:migrate
 *
 *   # Dump defaults to DATABASE_URL if SOURCE_DATABASE_URL not set
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { from as copyFrom, to as copyTo } from 'pg-copy-streams';
import { pipeline } from 'stream/promises';
import { Writable, Readable } from 'stream';

const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
const ROOT = path.resolve(__dirname, '..');
const DUMP_DIR = path.join(ROOT, 'output');
const DUMP_FILE = path.join(DUMP_DIR, 'db-dump.sql');

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  pkColumns: string[];
  pkConstraintName: string | null;
}

// ─── Schema Discovery ────────────────────────────────────────────────────────

async function discoverTables(client: pg.Client): Promise<string[][]> {
  const { rows } = await client.query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`,
    [SCHEMAS]
  );
  return rows.map((r: { table_schema: string; table_name: string }) => [r.table_schema, r.table_name]);
}

async function discoverColumns(client: pg.Client): Promise<ColumnInfo[]> {
  const { rows } = await client.query(
    `SELECT table_schema, table_name, column_name, ordinal_position,
            data_type, udt_name, character_maximum_length,
            numeric_precision, numeric_scale, column_default, is_nullable
     FROM information_schema.columns
     WHERE table_schema = ANY($1)
     ORDER BY table_schema, table_name, ordinal_position`,
    [SCHEMAS]
  );
  return rows;
}

async function discoverPKs(client: pg.Client): Promise<PKInfo[]> {
  const { rows } = await client.query(
    `SELECT tc.table_schema, tc.table_name, tc.constraint_name,
            kcu.column_name, kcu.ordinal_position::int
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = ANY($1) AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position`,
    [SCHEMAS]
  );
  return rows;
}

async function discoverFKs(client: pg.Client): Promise<FKInfo[]> {
  const { rows } = await client.query(
    `SELECT
       tc.table_schema, tc.table_name, tc.constraint_name,
       kcu.column_name,
       ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
     WHERE tc.table_schema = ANY($1) AND tc.constraint_type = 'FOREIGN KEY'
     ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position`,
    [SCHEMAS]
  );
  return rows;
}

async function discoverIndexes(client: pg.Client): Promise<IndexInfo[]> {
  const { rows } = await client.query(
    `SELECT schemaname, tablename, indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = ANY($1)
     ORDER BY schemaname, tablename, indexname`,
    [SCHEMAS]
  );
  return rows;
}

async function getRowCount(client: pg.Client, schema: string, table: string): Promise<number> {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${schema}."${table}"`);
  return rows[0].n;
}

// ─── DDL Generation ──────────────────────────────────────────────────────────

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
      return col.character_maximum_length
        ? `VARCHAR(${col.character_maximum_length})`
        : 'VARCHAR';
    case 'bpchar':
      return col.character_maximum_length
        ? `CHAR(${col.character_maximum_length})`
        : 'CHAR';
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
    case 'serial': return 'SERIAL';
    case 'bigserial': return 'BIGSERIAL';
    default: return dt.toUpperCase();
  }
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

function generateCreateTable(table: TableInfo): string {
  const lines: string[] = [];
  for (const col of table.columns) {
    const typeSql = formatColumnType(col);
    const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
    // Skip sequence defaults for SERIAL/BIGSERIAL (they get auto-created)
    let defaultSql = '';
    if (col.column_default && !col.column_default.startsWith('nextval(')) {
      defaultSql = ` DEFAULT ${col.column_default}`;
    }
    lines.push(`  ${quoteIdent(col.column_name)} ${typeSql}${nullable}${defaultSql}`);
  }
  if (table.pkColumns.length > 0) {
    const pkCols = table.pkColumns.map(quoteIdent).join(', ');
    const pkName = table.pkConstraintName || `${table.name}_pkey`;
    lines.push(`  CONSTRAINT ${quoteIdent(pkName)} PRIMARY KEY (${pkCols})`);
  }
  return `CREATE TABLE IF NOT EXISTS ${table.schema}."${table.name}" (\n${lines.join(',\n')}\n);`;
}

// ─── Topological Sort ────────────────────────────────────────────────────────

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

  // Build dependency graph: if table A has FK → table B, then B must come before A
  const fkByConstraint = new Map<string, { from: string; to: string }>();
  for (const fk of fks) {
    const fromKey = key(fk.table_schema, fk.table_name);
    const toKey = key(fk.ref_schema, fk.ref_table);
    const ck = `${fk.table_schema}.${fk.constraint_name}`;

    if (!tableSet.has(fromKey) || !tableSet.has(toKey)) continue;
    if (fromKey === toKey) continue; // self-ref

    if (!fkByConstraint.has(ck)) {
      fkByConstraint.set(ck, { from: fromKey, to: toKey });
      const depSet = edges.get(toKey)!;
      if (!depSet.has(fromKey)) {
        depSet.add(fromKey);
        inDegree.set(fromKey, (inDegree.get(fromKey) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [k, deg] of inDegree) {
    if (deg === 0) queue.push(k);
  }

  const sorted: string[][] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const [s, t] = node.split('.');
    sorted.push([s, t]);
    for (const dependent of edges.get(node) || []) {
      const newDeg = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  // Append any remaining (circular deps — rare but handle gracefully)
  for (const [s, t] of tables) {
    if (!sorted.some(([ss, tt]) => ss === s && tt === t)) {
      sorted.push([s, t]);
    }
  }

  return sorted;
}

// ─── Sequences ───────────────────────────────────────────────────────────────

async function discoverSequences(client: pg.Client): Promise<{ schema: string; name: string; lastValue: number }[]> {
  const { rows } = await client.query(
    `SELECT schemaname AS schema, sequencename AS name
     FROM pg_sequences
     WHERE schemaname = ANY($1)
     ORDER BY schemaname, sequencename`,
    [SCHEMAS]
  );
  const result: { schema: string; name: string; lastValue: number }[] = [];
  for (const row of rows) {
    const { rows: seqRows } = await client.query(`SELECT last_value FROM ${row.schema}."${row.name}"`);
    result.push({ schema: row.schema, name: row.name, lastValue: Number(seqRows[0].last_value) });
  }
  return result;
}

// ─── DUMP ────────────────────────────────────────────────────────────────────

async function dump(databaseUrl: string, outputPath: string) {
  console.log('Connecting to source database...');
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  console.log('Connected.');

  try {
    // Discover everything
    console.log('Discovering schema...');
    const tables = await discoverTables(client);
    const allColumns = await discoverColumns(client);
    const allPKs = await discoverPKs(client);
    const allFKs = await discoverFKs(client);
    const allIndexes = await discoverIndexes(client);
    const sequences = await discoverSequences(client);

    console.log(`Found: ${tables.length} tables, ${allFKs.length} FK constraints, ${allIndexes.length} indexes, ${sequences.length} sequences`);

    // Build table info map
    const columnsByTable = new Map<string, ColumnInfo[]>();
    for (const col of allColumns) {
      const k = `${col.table_schema}.${col.table_name}`;
      if (!columnsByTable.has(k)) columnsByTable.set(k, []);
      columnsByTable.get(k)!.push(col);
    }

    const pksByTable = new Map<string, { columns: string[]; constraintName: string }>();
    for (const pk of allPKs) {
      const k = `${pk.table_schema}.${pk.table_name}`;
      if (!pksByTable.has(k)) pksByTable.set(k, { columns: [], constraintName: pk.constraint_name });
      pksByTable.get(k)!.columns.push(pk.column_name);
    }

    // Group FKs by constraint name for multi-column FKs
    const fksByConstraint = new Map<string, { schema: string; table: string; columns: string[]; refSchema: string; refTable: string; refColumns: string[]; constraintName: string }>();
    for (const fk of allFKs) {
      const ck = `${fk.table_schema}.${fk.constraint_name}`;
      if (!fksByConstraint.has(ck)) {
        fksByConstraint.set(ck, {
          schema: fk.table_schema,
          table: fk.table_name,
          columns: [],
          refSchema: fk.ref_schema,
          refTable: fk.ref_table,
          refColumns: [],
          constraintName: fk.constraint_name,
        });
      }
      const entry = fksByConstraint.get(ck)!;
      entry.columns.push(fk.column_name);
      entry.refColumns.push(fk.ref_column);
    }

    // Topo sort
    const sortedTables = topoSort(tables, allFKs);
    console.log(`Topological order: ${sortedTables.length} tables`);

    // Build table info objects
    const tableInfos: TableInfo[] = sortedTables.map(([schema, name]) => {
      const k = `${schema}.${name}`;
      const pkInfo = pksByTable.get(k);
      return {
        schema,
        name,
        columns: columnsByTable.get(k) || [],
        pkColumns: pkInfo?.columns || [],
        pkConstraintName: pkInfo?.constraintName || null,
      };
    });

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const out = fs.createWriteStream(outputPath);
    const write = (s: string) => out.write(s + '\n');

    write('-- ══════════════════════════════════════════════════════════════');
    write('-- Database dump generated by migrate-database.ts');
    write(`-- Source: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
    write(`-- Date: ${new Date().toISOString()}`);
    write('-- ══════════════════════════════════════════════════════════════');
    write('');

    // Phase 1: Create schemas
    write('-- ── Phase 1: Schemas ──────────────────────────────────────────');
    for (const schema of SCHEMAS) {
      write(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    }
    write('');

    // Phase 2: Create tables (without FKs)
    write('-- ── Phase 2: Tables (no FKs) ─────────────────────────────────');
    for (const table of tableInfos) {
      if (table.columns.length === 0) continue;
      write(generateCreateTable(table));
      write('');
    }

    // Phase 3: Data via COPY
    write('-- ── Phase 3: Data ────────────────────────────────────────────');
    let totalRows = 0;
    for (const table of tableInfos) {
      if (table.columns.length === 0) continue;

      const rowCount = await getRowCount(client, table.schema, table.name);
      if (rowCount === 0) {
        write(`-- ${table.schema}.${table.name}: 0 rows (skipped)`);
        write('');
        continue;
      }

      totalRows += rowCount;
      console.log(`  Dumping ${table.schema}.${table.name} (${rowCount.toLocaleString()} rows)...`);

      const colList = table.columns.map(c => quoteIdent(c.column_name)).join(', ');
      write(`-- ${table.schema}.${table.name}: ${rowCount.toLocaleString()} rows`);
      write(`COPY ${table.schema}."${table.name}" (${colList}) FROM stdin WITH (FORMAT csv, NULL '\\N', QUOTE '"', ESCAPE '"');`);

      // Stream COPY TO from source and write to file
      const copyQuery = `COPY ${table.schema}."${table.name}" (${colList}) TO STDOUT WITH (FORMAT csv, NULL '\\N', QUOTE '"', ESCAPE '"')`;
      const stream = client.query(copyTo(copyQuery));

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          out.write(chunk);
        });
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });

      write('\\.');
      write('');
    }

    // Phase 4: Foreign keys
    write('-- ── Phase 4: Foreign Keys ────────────────────────────────────');
    for (const [, fk] of fksByConstraint) {
      const cols = fk.columns.map(quoteIdent).join(', ');
      const refCols = fk.refColumns.map(quoteIdent).join(', ');
      write(`ALTER TABLE ${fk.schema}."${fk.table}" ADD CONSTRAINT ${quoteIdent(fk.constraintName)} FOREIGN KEY (${cols}) REFERENCES ${fk.refSchema}."${fk.refTable}" (${refCols});`);
    }
    write('');

    // Phase 5: Indexes (non-PK, non-unique-constraint)
    write('-- ── Phase 5: Indexes ─────────────────────────────────────────');
    const pkIndexNames = new Set(allPKs.map(pk => pk.constraint_name));
    const fkConstraintNames = new Set([...fksByConstraint.keys()].map(k => k.split('.').slice(1).join('.')));
    for (const idx of allIndexes) {
      if (pkIndexNames.has(idx.indexname)) continue; // Skip PK indexes (created with table)
      if (fkConstraintNames.has(idx.indexname)) continue;
      // Skip unique constraint indexes that were created with the table
      if (idx.indexdef.includes('UNIQUE')) {
        write(`${idx.indexdef};`);
      } else {
        write(`${idx.indexdef};`);
      }
    }
    write('');

    // Phase 6: Sequence values
    if (sequences.length > 0) {
      write('-- ── Phase 6: Sequences ───────────────────────────────────────');
      for (const seq of sequences) {
        write(`SELECT setval('${seq.schema}."${seq.name}"', ${seq.lastValue}, true);`);
      }
      write('');
    }

    write('-- ══════════════════════════════════════════════════════════════');
    write(`-- Dump complete: ${tableInfos.length} tables, ${totalRows.toLocaleString()} total rows`);
    write('-- ══════════════════════════════════════════════════════════════');

    out.end();
    await new Promise<void>((resolve) => out.on('finish', resolve));

    const fileSize = fs.statSync(outputPath).size;
    console.log(`\nDump complete:`);
    console.log(`  Tables: ${tableInfos.length}`);
    console.log(`  Rows: ${totalRows.toLocaleString()}`);
    console.log(`  FK constraints: ${fksByConstraint.size}`);
    console.log(`  Indexes: ${allIndexes.length - pkIndexNames.size}`);
    console.log(`  Sequences: ${sequences.length}`);
    console.log(`  File: ${outputPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
  } finally {
    await client.end();
  }
}

// ─── RESTORE ─────────────────────────────────────────────────────────────────

async function restore(databaseUrl: string, inputPath: string) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Dump file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log('Connecting to target database...');
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  console.log('Connected.');

  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');

  let currentStatement = '';
  let inCopy = false;
  let copyBuffer = '';
  let copyTable = '';
  let copyColumns = '';
  let copyOptions = '';
  let statementCount = 0;
  let copyCount = 0;

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments and empty lines (outside COPY blocks)
      if (!inCopy) {
        if (line.startsWith('--') || line.trim() === '') {
          // Flush any pending statement
          if (currentStatement.trim()) {
            await executeStatement(client, currentStatement.trim());
            statementCount++;
            currentStatement = '';
          }
          continue;
        }
      }

      // Detect start of COPY ... FROM stdin
      if (!inCopy && line.startsWith('COPY ') && line.includes('FROM stdin')) {
        // Flush pending
        if (currentStatement.trim()) {
          await executeStatement(client, currentStatement.trim());
          statementCount++;
          currentStatement = '';
        }

        // Parse COPY statement
        const match = line.match(/^COPY\s+(\S+)\s+\(([^)]+)\)\s+FROM stdin\s+WITH\s+\((.+)\);$/);
        if (match) {
          copyTable = match[1];
          copyColumns = match[2];
          copyOptions = match[3];
          inCopy = true;
          copyBuffer = '';
          copyCount++;
          const displayNum = `[${copyCount}]`;
          process.stdout.write(`  ${displayNum} Loading ${copyTable}...`);
        } else {
          console.warn(`  Warning: Could not parse COPY line: ${line.slice(0, 100)}`);
        }
        continue;
      }

      // Inside COPY block
      if (inCopy) {
        if (line === '\\.') {
          // End of COPY data — stream it in
          const copySql = `COPY ${copyTable} (${copyColumns}) FROM STDIN WITH (${copyOptions})`;
          const stream = client.query(copyFrom(copySql));

          const bufferStream = new Readable({
            read() {
              this.push(copyBuffer);
              this.push(null);
            }
          });

          try {
            await pipeline(bufferStream, stream);
            const rowCount = (stream as unknown as { rowCount: number }).rowCount || 0;
            console.log(` ${rowCount.toLocaleString()} rows`);
          } catch (copyErr: unknown) {
            const copyCode = copyErr && typeof copyErr === 'object' && 'code' in copyErr ? (copyErr as { code: string }).code : '';
            if (copyCode === '23505') {
              // Duplicate key — table already has data from a previous run
              console.log(` skipped (data already loaded)`);
            } else {
              throw copyErr;
            }
          }

          inCopy = false;
          copyBuffer = '';
          continue;
        }
        copyBuffer += line + '\n';
        continue;
      }

      // Regular SQL statement accumulation
      currentStatement += line + '\n';
      if (line.trimEnd().endsWith(';')) {
        await executeStatement(client, currentStatement.trim());
        statementCount++;
        if (statementCount % 50 === 0) {
          process.stdout.write(`  ${statementCount} statements executed\r`);
        }
        currentStatement = '';
      }
    }

    // Flush any remaining statement
    if (currentStatement.trim()) {
      await executeStatement(client, currentStatement.trim());
      statementCount++;
    }

    console.log(`\nRestore complete:`);
    console.log(`  Statements: ${statementCount}`);
    console.log(`  COPY loads: ${copyCount}`);
  } finally {
    await client.end();
  }
}

async function executeStatement(client: pg.Client, sql: string): Promise<void> {
  try {
    await client.query(sql);
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    const msg = err instanceof Error ? err.message : String(err);

    // Skip "already exists" errors (idempotent restore)
    if (code === '42P06') return; // schema already exists
    if (code === '42P07') return; // table already exists
    if (code === '42710') return; // constraint already exists
    if (msg.includes('already exists')) return;

    // Skip missing sequences (empty tables with BIGSERIAL don't create sequences on target)
    if (code === '42P01' && sql.includes('setval(')) return;

    console.error(`\n  Error executing SQL:`);
    console.error(`  ${sql.slice(0, 200)}${sql.length > 200 ? '...' : ''}`);
    console.error(`  PG error: [${code}] ${msg}`);
    throw err;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dumpOnly = args.includes('--dump');
  const restoreOnly = args.includes('--restore');
  const dumpPath = args.find(a => a.startsWith('--file='))?.split('=')[1] || DUMP_FILE;

  const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (dumpOnly) {
    if (!sourceUrl) {
      console.error('Set SOURCE_DATABASE_URL (or DATABASE_URL) for dump.');
      process.exit(1);
    }
    await dump(sourceUrl, dumpPath);
    console.log(`\nNext: Set TARGET_DATABASE_URL and run: npm run db:migrate -- --restore`);
    return;
  }

  if (restoreOnly) {
    if (!targetUrl) {
      console.error('Set TARGET_DATABASE_URL for restore.');
      process.exit(1);
    }
    await restore(targetUrl, dumpPath);
    console.log(`\nNext: Update DATABASE_URL in .env to target, then run: npm run db:introspect`);
    return;
  }

  // Direct transfer: dump then restore
  if (!sourceUrl) {
    console.error('Set SOURCE_DATABASE_URL (or DATABASE_URL) for source.');
    process.exit(1);
  }
  if (!targetUrl) {
    console.error('Set TARGET_DATABASE_URL for target.');
    process.exit(1);
  }

  console.log('═══ Phase 1: Dump from source ═══\n');
  await dump(sourceUrl, dumpPath);
  console.log('\n═══ Phase 2: Restore to target ═══\n');
  await restore(targetUrl, dumpPath);
  console.log('\n═══ Migration complete ═══');
  console.log(`Update DATABASE_URL in .env to target, then run: npm run db:introspect`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

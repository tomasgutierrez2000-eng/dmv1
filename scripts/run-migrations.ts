/**
 * Migration runner with schema_migrations version tracking.
 *
 * Creates a `public.schema_migrations` table to track which migrations
 * have been applied. Migrations are run in filename-sorted order.
 * Already-applied migrations are skipped.
 *
 * Usage:
 *   npm run db:run-migrations              # Apply pending migrations
 *   npm run db:run-migrations -- --status  # Show migration status
 *   npm run db:run-migrations -- --dry-run # Show what would run
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = (pg as any).default ?? pg;

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'sql', 'migrations');
const DATABASE_URL = process.env.DATABASE_URL;

interface MigrationRecord {
  version: string;
  applied_at: string;
}

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      checksum VARCHAR(64)
    );
  `);
}

async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<MigrationRecord>(
    'SELECT version FROM public.schema_migrations ORDER BY version'
  );
  return new Set(result.rows.map(r => r.version));
}

function discoverMigrations(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function hashContent(content: string): string {
  // Simple hash for checksum — no crypto dependency needed
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function runMigration(client: pg.Client, filename: string): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  const checksum = hashContent(sql);

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)',
      [filename, checksum]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const statusOnly = args.includes('--status');
  const dryRun = args.includes('--dry-run');

  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const allMigrations = discoverMigrations();
    const pending = allMigrations.filter(m => !applied.has(m));

    if (statusOnly) {
      console.log(`\nMigration Status (${allMigrations.length} total, ${applied.size} applied, ${pending.length} pending)\n`);
      for (const m of allMigrations) {
        const status = applied.has(m) ? '\x1b[32m✓ applied\x1b[0m' : '\x1b[33m○ pending\x1b[0m';
        console.log(`  ${status}  ${m}`);
      }
      console.log('');
      return;
    }

    if (pending.length === 0) {
      console.log('All migrations already applied.');
      return;
    }

    console.log(`\n${pending.length} pending migration(s):\n`);
    for (const m of pending) {
      console.log(`  ○ ${m}`);
    }

    if (dryRun) {
      console.log('\n(dry run — no changes applied)\n');
      return;
    }

    console.log('');
    for (const m of pending) {
      const start = Date.now();
      process.stdout.write(`  Applying ${m}...`);
      try {
        await runMigration(client, m);
        console.log(` ✓ (${Date.now() - start}ms)`);
      } catch (err) {
        console.log(` ✗ FAILED`);
        console.error(`\nMigration ${m} failed:`, err instanceof Error ? err.message : err);
        process.exit(1);
      }
    }

    console.log(`\nDone. ${pending.length} migration(s) applied.\n`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});

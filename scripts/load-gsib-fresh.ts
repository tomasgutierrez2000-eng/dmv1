/**
 * Create a fresh database and load GSIB export into it.
 *
 * Usage: npm run db:load-gsib-fresh
 *
 * Reads DATABASE_URL from .env. Creates a new database (credit_dw_fresh by default),
 * loads all 5 GSIB SQL files, then prints the new connection URL.
 *
 * Set FRESH_DB_NAME to override the new database name.
 * Set KEEP_EXISTING=true to skip drop (only create if not exists).
 * Set USE_EXISTING_DB=true to skip create/drop and load into DATABASE_URL directly
 *   (use when Cloud SQL or managed Postgres restricts CREATE DATABASE).
 * Set MANUAL=1 to print psql commands instead of running (for ECONNRESET workaround).
 */
import 'dotenv/config';
import pg from 'pg';
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FRESH_DB_NAME = process.env.FRESH_DB_NAME ?? 'credit_dw_fresh';
const KEEP_EXISTING = process.env.KEEP_EXISTING === 'true';
const USE_EXISTING_DB = process.env.USE_EXISTING_DB === 'true';
const CONNECT_RETRIES = parseInt(process.env.CONNECT_RETRIES ?? '5', 10);

function pgClientConfig(url: string) {
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  let connectionString = url;
  // Cloud SQL proxy on localhost: ensure sslmode=disable (proxy handles encryption)
  if (isLocalhost && !url.includes('sslmode=')) {
    connectionString = url.includes('?') ? `${url}&sslmode=disable` : `${url}?sslmode=disable`;
  }
  return {
    connectionString,
    connectionTimeoutMillis: 60000,
    keepAlive: true,
    // PGSSL=1 forces SSL with rejectUnauthorized: false (try if ECONNRESET persists)
    ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false }
      : isLocalhost ? false
      : (url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined),
  };
}

async function connectWithRetry<T>(fn: (client: pg.Client) => Promise<T>, url: string): Promise<T> {
  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
    const client = new pg.Client(pgClientConfig(url));
    try {
      await client.connect();
      const result = await fn(client);
      await client.end();
      return result;
    } catch (err: unknown) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      const isRetryable = code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || String(err).includes('timeout');
      if (isRetryable && attempt < CONNECT_RETRIES) {
        console.warn(`  Connection failed (${code || err}), retrying in ${attempt * 2}s (${attempt}/${CONNECT_RETRIES})...`);
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Connection failed after retries');
}

function parseDbUrl(url: string): { base: string; adminUrl: string } {
  try {
    const u = new URL(url);
    u.pathname = '/postgres';
    const adminUrl = u.toString();
    u.pathname = `/${FRESH_DB_NAME}`;
    const base = u.toString();
    return { base, adminUrl };
  } catch {
    throw new Error('Invalid DATABASE_URL');
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }

  if (process.env.MANUAL === '1') {
    const sqlDir = path.join(ROOT, 'sql/gsib-export');
    console.log('# Run these commands when DB is reachable (workaround for ECONNRESET):\n');
    console.log(`export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"`);
    console.log(`psql "${databaseUrl}" -c "DROP SCHEMA IF EXISTS l3 CASCADE; DROP SCHEMA IF EXISTS l2 CASCADE; DROP SCHEMA IF EXISTS l1 CASCADE;"`);
    for (const f of ['01-l1-ddl.sql', '02-l2-ddl.sql', '03-l1-seed.sql', '04-l2-seed.sql', '05-scenario-seed.sql', '06-factory-scenarios.sql']) {
      console.log(`psql "${databaseUrl}" -f "${sqlDir}/${f}" -v ON_ERROR_STOP=1`);
    }
    console.log('\n# Or use the load script:');
    console.log(`bash scripts/load-gsib-export.sh "${databaseUrl}"`);
    return;
  }

  let freshUrl: string;

  if (USE_EXISTING_DB) {
    console.log('USE_EXISTING_DB=true — dropping schemas and loading into existing database');
    freshUrl = databaseUrl;
    await connectWithRetry(async (client) => {
      await client.query('DROP SCHEMA IF EXISTS l3 CASCADE');
      await client.query('DROP SCHEMA IF EXISTS l2 CASCADE');
      await client.query('DROP SCHEMA IF EXISTS l1 CASCADE');
      console.log('Dropped l1, l2, l3 schemas');
    }, databaseUrl);
  } else {
    const { base, adminUrl } = parseDbUrl(databaseUrl);
    freshUrl = base;

    await connectWithRetry(async (adminClient) => {
      const res = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [FRESH_DB_NAME]
      );
      const exists = res.rowCount && res.rowCount > 0;

      if (exists && !KEEP_EXISTING) {
        console.log(`Dropping existing database ${FRESH_DB_NAME}...`);
        await adminClient.query(`DROP DATABASE IF EXISTS "${FRESH_DB_NAME}"`);
      }

      if (!exists || !KEEP_EXISTING) {
        console.log(`Creating database ${FRESH_DB_NAME}...`);
        await adminClient.query(`CREATE DATABASE "${FRESH_DB_NAME}"`);
      } else {
        console.log(`Database ${FRESH_DB_NAME} already exists (KEEP_EXISTING=true)`);
      }
    }, adminUrl);
  }

  const dbLabel = USE_EXISTING_DB ? 'existing DB' : FRESH_DB_NAME;
  console.log(`\nLoading GSIB export into ${dbLabel}...`);
  const loadScript = path.join(ROOT, 'scripts/load-gsib-export.sh');
  execSync(`bash "${loadScript}" "${freshUrl}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `/opt/homebrew/opt/postgresql@18/bin:/opt/homebrew/opt/postgresql/bin:${process.env.PATH || ''}`,
    },
  });

  console.log('\n=== Done ===');
  if (!USE_EXISTING_DB) {
    console.log(`\nFresh database ready. To use it, set in .env:`);
    console.log(`  DATABASE_URL=${freshUrl}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

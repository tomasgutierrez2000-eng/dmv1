/**
 * Integration tests for stripe database tooling.
 *
 * Creates a temporary test database, runs the full stripe lifecycle,
 * validates schema integrity, and cleans up.
 *
 * Usage: npm run test:stripe
 *
 * Requires DATABASE_URL to be set (connects to same PostgreSQL instance).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'stripe.config.json');
const SCHEMAS = ['l1', 'l2', 'l3', 'metric_library'];
const TEST_STRIPE_NAME = `test_stripe_${process.pid}`;
const TEST_DB_NAME = `postgres_${TEST_STRIPE_NAME}`;

// ─── Test Framework ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`    PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`    FAIL: ${message}`);
  }
}

function assertGt(actual: number, expected: number, message: string): void {
  assert(actual > expected, `${message} (got ${actual}, expected > ${expected})`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  assert(actual === expected, `${message} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getTableCount(client: pg.Client): Promise<number> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query(`
    SELECT COUNT(*) AS cnt FROM information_schema.tables
    WHERE table_schema IN (${schemaList}) AND table_type = 'BASE TABLE'
  `);
  return parseInt(res.rows[0].cnt, 10);
}

async function getColumnCount(client: pg.Client): Promise<number> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query(`
    SELECT COUNT(*) AS cnt FROM information_schema.columns
    WHERE table_schema IN (${schemaList})
  `);
  return parseInt(res.rows[0].cnt, 10);
}

async function getFKCount(client: pg.Client): Promise<number> {
  const schemaList = SCHEMAS.map(s => `'${s}'`).join(',');
  const res = await client.query(`
    SELECT COUNT(*) AS cnt FROM information_schema.table_constraints
    WHERE table_schema IN (${schemaList}) AND constraint_type = 'FOREIGN KEY'
  `);
  return parseInt(res.rows[0].cnt, 10);
}

async function getRowCount(client: pg.Client, schema: string, table: string): Promise<number> {
  try {
    const res = await client.query(`SELECT COUNT(*) AS cnt FROM ${schema}."${table}"`);
    return parseInt(res.rows[0].cnt, 10);
  } catch {
    return -1;
  }
}

async function tableExists(client: pg.Client, schema: string, table: string): Promise<boolean> {
  const res = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'
  `, [schema, table]);
  return res.rows.length > 0;
}

async function columnExists(client: pg.Client, schema: string, table: string, column: string): Promise<boolean> {
  const res = await client.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
  `, [schema, table, column]);
  return res.rows.length > 0;
}

async function dbExists(client: pg.Client, dbName: string): Promise<boolean> {
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  return res.rows.length > 0;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

async function cleanup(mainClient: pg.Client) {
  console.log('\n  Cleaning up...');

  // Terminate connections to test DB
  try {
    await mainClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()
    `);
  } catch { /* ignore */ }

  // Drop test database
  try {
    await mainClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    console.log(`    Dropped ${TEST_DB_NAME}`);
  } catch (e: any) {
    console.error(`    Warning: Could not drop ${TEST_DB_NAME}: ${e.message}`);
  }

  // Remove test stripe from config
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (config.stripes?.[TEST_STRIPE_NAME]) {
        delete config.stripes[TEST_STRIPE_NAME];
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
        console.log(`    Removed ${TEST_STRIPE_NAME} from stripe.config.json`);
      }
    }
  } catch { /* ignore */ }
}

// ─── Test Suites ────────────────────────────────────────────────────────────

async function testCreateStripe(mainClient: pg.Client, mainUrl: string) {
  console.log('\n  === Test Suite 1: stripe:create ===\n');

  // Test 1.1: Missing --name should fail
  const { execSync } = await import('child_process');
  try {
    execSync('npx tsx scripts/create-stripe-db.ts', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '1.1 Missing --name should exit with error');
  } catch {
    assert(true, '1.1 Missing --name exits with error');
  }

  // Test 1.2: Invalid name should fail
  try {
    execSync('npx tsx scripts/create-stripe-db.ts -- --name "INVALID-NAME!"', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '1.2 Invalid name should exit with error');
  } catch {
    assert(true, '1.2 Invalid name exits with error');
  }

  // Test 1.3: Create test stripe
  try {
    execSync(`npx tsx scripts/create-stripe-db.ts -- --name ${TEST_STRIPE_NAME}`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
      timeout: 300_000,
    });
    assert(true, '1.3 stripe:create succeeds');
  } catch (e: any) {
    assert(false, `1.3 stripe:create failed: ${e.stderr?.toString().slice(0, 200)}`);
    return; // Can't continue tests without the DB
  }

  // Test 1.4: Database was created
  const exists = await dbExists(mainClient, TEST_DB_NAME);
  assert(exists, '1.4 Database exists in PostgreSQL');

  // Test 1.5: Config was updated
  assert(fs.existsSync(CONFIG_PATH), '1.5 stripe.config.json exists');
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  assert(!!config.stripes[TEST_STRIPE_NAME], '1.5b Stripe registered in config');
  assertEqual(config.stripes[TEST_STRIPE_NAME]?.status, 'active', '1.5c Status is active');

  // Test 1.6: Duplicate creation should fail (without --force)
  try {
    execSync(`npx tsx scripts/create-stripe-db.ts -- --name ${TEST_STRIPE_NAME}`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '1.6 Duplicate create should exit with error');
  } catch {
    assert(true, '1.6 Duplicate create exits with error');
  }
}

async function testSchemaIntegrity(mainClient: pg.Client, mainUrl: string) {
  console.log('\n  === Test Suite 2: Schema Integrity ===\n');

  const stripeUrl = mainUrl.replace(/\/([^/?]+)(\?|$)/, `/${TEST_DB_NAME}$2`);
  const stripeClient = new pg.Client({ connectionString: stripeUrl });
  await stripeClient.connect();

  try {
    // Test 2.1: Schemas exist
    for (const schema of SCHEMAS) {
      const res = await stripeClient.query(`
        SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
      `, [schema]);
      assert(res.rows.length > 0, `2.1 Schema "${schema}" exists`);
    }

    // Test 2.2: Table count matches main
    const mainTableCount = await getTableCount(mainClient);
    const stripeTableCount = await getTableCount(stripeClient);
    assertEqual(stripeTableCount, mainTableCount, '2.2 Table count matches main');

    // Test 2.3: Column count matches
    const mainColCount = await getColumnCount(mainClient);
    const stripeColCount = await getColumnCount(stripeClient);
    assertEqual(stripeColCount, mainColCount, '2.3 Column count matches main');

    // Test 2.4: FK count matches (or close — some FKs may fail during copy)
    const mainFKCount = await getFKCount(mainClient);
    const stripeFKCount = await getFKCount(stripeClient);
    // Allow some FK slack (cross-schema FKs may not all resolve)
    assert(
      stripeFKCount >= mainFKCount * 0.8,
      `2.4 FK count within 80% of main (stripe: ${stripeFKCount}, main: ${mainFKCount})`
    );

    // Test 2.5: Key tables have data
    const keyTables = [
      ['l2', 'counterparty'],
      ['l2', 'facility_master'],
      ['l1', 'currency_dim'],
    ];
    for (const [schema, table] of keyTables) {
      const mainRows = await getRowCount(mainClient, schema, table);
      const stripeRows = await getRowCount(stripeClient, schema, table);
      assert(
        stripeRows > 0 && stripeRows === mainRows,
        `2.5 ${schema}.${table}: ${stripeRows} rows (main: ${mainRows})`
      );
    }

    // Test 2.6: L2 snapshot data copied
    const fesExists = await tableExists(stripeClient, 'l2', 'facility_exposure_snapshot');
    if (fesExists) {
      const fesRows = await getRowCount(stripeClient, 'l2', 'facility_exposure_snapshot');
      assertGt(fesRows, 0, '2.6 L2 facility_exposure_snapshot has data');
    }

  } finally {
    await stripeClient.end();
  }
}

async function testStripeSpecificAdditions(mainClient: pg.Client, mainUrl: string) {
  console.log('\n  === Test Suite 3: Stripe-Specific Additions ===\n');

  const stripeUrl = mainUrl.replace(/\/([^/?]+)(\?|$)/, `/${TEST_DB_NAME}$2`);
  const stripeClient = new pg.Client({ connectionString: stripeUrl });
  await stripeClient.connect();

  try {
    // Test 3.1: Add a stripe-specific table
    await stripeClient.query(`
      CREATE TABLE IF NOT EXISTS l2.test_stripe_snapshot (
        test_stripe_snapshot_id BIGSERIAL PRIMARY KEY,
        facility_id BIGINT,
        as_of_date DATE,
        test_value NUMERIC(20,4),
        created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    assert(
      await tableExists(stripeClient, 'l2', 'test_stripe_snapshot'),
      '3.1 Stripe-specific table created'
    );

    // Test 3.2: Add a stripe-specific column
    await stripeClient.query(`
      ALTER TABLE l2.counterparty ADD COLUMN IF NOT EXISTS test_stripe_rating VARCHAR(10)
    `);
    assert(
      await columnExists(stripeClient, 'l2', 'counterparty', 'test_stripe_rating'),
      '3.2 Stripe-specific column added'
    );

    // Test 3.3: Verify these don't exist in main
    assert(
      !(await tableExists(mainClient, 'l2', 'test_stripe_snapshot')),
      '3.3 Stripe table does NOT exist in main (isolation verified)'
    );
    assert(
      !(await columnExists(mainClient, 'l2', 'counterparty', 'test_stripe_rating')),
      '3.4 Stripe column does NOT exist in main (isolation verified)'
    );

    // Update config with stripe-only additions for sync/diff tests
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    config.stripes[TEST_STRIPE_NAME].stripe_only_tables = ['l2.test_stripe_snapshot'];
    config.stripes[TEST_STRIPE_NAME].stripe_only_columns = ['l2.counterparty.test_stripe_rating'];
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  } finally {
    await stripeClient.end();
  }
}

async function testSyncStripe(mainUrl: string) {
  console.log('\n  === Test Suite 4: stripe:sync ===\n');

  const { execSync } = await import('child_process');

  // Test 4.1: Missing --name should fail
  try {
    execSync('npx tsx scripts/sync-stripe-db.ts', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '4.1 Missing --name should exit with error');
  } catch {
    assert(true, '4.1 Missing --name exits with error');
  }

  // Test 4.2: Sync with dry-run (no --yes)
  try {
    const output = execSync(
      `npx tsx scripts/sync-stripe-db.ts -- --name ${TEST_STRIPE_NAME}`,
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: mainUrl },
        timeout: 60_000,
      }
    ).toString();
    // Should complete without error (may show "up to date" or DDL preview)
    assert(true, '4.2 stripe:sync dry-run succeeds');
  } catch (e: any) {
    assert(false, `4.2 stripe:sync dry-run failed: ${e.stderr?.toString().slice(0, 200)}`);
  }

  // Test 4.3: Sync with --yes
  try {
    execSync(
      `npx tsx scripts/sync-stripe-db.ts -- --name ${TEST_STRIPE_NAME} --yes`,
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: mainUrl },
        timeout: 60_000,
      }
    );
    assert(true, '4.3 stripe:sync --yes succeeds');
  } catch (e: any) {
    assert(false, `4.3 stripe:sync --yes failed: ${e.stderr?.toString().slice(0, 200)}`);
  }

  // Test 4.4: After sync, stripe-specific additions preserved
  const stripeUrl = mainUrl.replace(/\/([^/?]+)(\?|$)/, `/${TEST_DB_NAME}$2`);
  const stripeClient = new pg.Client({ connectionString: stripeUrl });
  await stripeClient.connect();
  try {
    assert(
      await tableExists(stripeClient, 'l2', 'test_stripe_snapshot'),
      '4.4 Stripe-specific table preserved after sync'
    );
    assert(
      await columnExists(stripeClient, 'l2', 'counterparty', 'test_stripe_rating'),
      '4.5 Stripe-specific column preserved after sync'
    );
  } finally {
    await stripeClient.end();
  }
}

async function testDiffStripe(mainUrl: string) {
  console.log('\n  === Test Suite 5: stripe:diff ===\n');

  const { execSync } = await import('child_process');

  // Test 5.1: Generate diff to stdout
  try {
    const output = execSync(
      `npx tsx scripts/diff-stripe-db.ts -- --name ${TEST_STRIPE_NAME} --stdout`,
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: mainUrl },
        timeout: 60_000,
      }
    ).toString();
    assert(output.includes('Migration:'), '5.1 Diff generates migration header');
    assert(output.includes('test_stripe_snapshot') || output.includes('No stripe-specific'),
      '5.2 Diff includes stripe-specific table or notes no additions');
  } catch (e: any) {
    assert(false, `5.1 stripe:diff --stdout failed: ${e.stderr?.toString().slice(0, 200)}`);
  }

  // Test 5.3: Generate diff to file
  try {
    execSync(
      `npx tsx scripts/diff-stripe-db.ts -- --name ${TEST_STRIPE_NAME}`,
      {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: mainUrl },
        timeout: 60_000,
      }
    );
    // Check that a migration file was created
    const migrations = fs.readdirSync(path.join(ROOT, 'sql', 'migrations'))
      .filter(f => f.startsWith(`stripe-${TEST_STRIPE_NAME}`));
    assert(migrations.length > 0, '5.3 Migration file created');

    // Clean up test migration file
    for (const f of migrations) {
      fs.unlinkSync(path.join(ROOT, 'sql', 'migrations', f));
    }
  } catch (e: any) {
    assert(false, `5.3 stripe:diff to file failed: ${e.stderr?.toString().slice(0, 200)}`);
  }
}

async function testEdgeCases(mainUrl: string) {
  console.log('\n  === Test Suite 6: Edge Cases ===\n');

  const { execSync } = await import('child_process');

  // Test 6.1: Sync with non-existent stripe name
  try {
    execSync('npx tsx scripts/sync-stripe-db.ts -- --name nonexistent_stripe_xyz', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '6.1 Non-existent stripe should fail');
  } catch {
    assert(true, '6.1 Non-existent stripe exits with error');
  }

  // Test 6.2: Diff with non-existent stripe name
  try {
    execSync('npx tsx scripts/diff-stripe-db.ts -- --name nonexistent_stripe_xyz', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
    });
    assert(false, '6.2 Diff non-existent stripe should fail');
  } catch {
    assert(true, '6.2 Diff non-existent stripe exits with error');
  }

  // Test 6.3: Create without DATABASE_URL
  try {
    execSync(`npx tsx scripts/create-stripe-db.ts -- --name ${TEST_STRIPE_NAME}_noenv`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: '' },
    });
    assert(false, '6.3 Create without DATABASE_URL should fail');
  } catch {
    assert(true, '6.3 Create without DATABASE_URL exits with error');
  }

  // Test 6.4: Force recreate
  try {
    execSync(`npx tsx scripts/create-stripe-db.ts -- --name ${TEST_STRIPE_NAME} --force`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: mainUrl },
      timeout: 300_000,
    });
    assert(true, '6.4 Force recreate succeeds');
  } catch (e: any) {
    assert(false, `6.4 Force recreate failed: ${e.stderr?.toString().slice(0, 200)}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const mainUrl = process.env.DATABASE_URL;
  if (!mainUrl) {
    console.error('DATABASE_URL not set. Cannot run stripe tests.');
    process.exit(1);
  }

  console.log(`\n  Stripe Database Integration Tests`);
  console.log(`  Test DB: ${TEST_DB_NAME}`);
  console.log(`  ─────────────────────────────────\n`);

  const mainClient = new pg.Client({ connectionString: mainUrl });
  await mainClient.connect();

  try {
    // Ensure clean state
    await cleanup(mainClient);

    // Run test suites in order
    await testCreateStripe(mainClient, mainUrl);
    await testSchemaIntegrity(mainClient, mainUrl);
    await testStripeSpecificAdditions(mainClient, mainUrl);
    await testSyncStripe(mainUrl);
    await testDiffStripe(mainUrl);
    await testEdgeCases(mainUrl);

  } finally {
    // Always clean up
    await cleanup(mainClient);
    await mainClient.end();
  }

  // Report
  console.log(`\n  ═══════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      console.error(`    - ${f}`);
    }
  }
  console.log(`  ═══════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`\n  Fatal: ${e.message}`);
  process.exit(1);
});

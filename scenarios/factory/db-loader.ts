/**
 * Database loader — loads factory-generated SQL into PostgreSQL.
 *
 * Usage:
 *   npx tsx scenarios/factory/db-loader.ts --check     # Check current state
 *   npx tsx scenarios/factory/db-loader.ts --load       # Load factory SQL
 *   npx tsx scenarios/factory/db-loader.ts --verify     # Verify FK chains
 *   npx tsx scenarios/factory/db-loader.ts --all        # Check + Load + Verify
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { loadEnvOrDie } from './load-env';

const DATABASE_URL = loadEnvOrDie();

const args = process.argv.slice(2);
const doCheck = args.includes('--check') || args.includes('--all');
const doLoad = args.includes('--load') || args.includes('--all');
const doVerify = args.includes('--verify') || args.includes('--all');

if (!doCheck && !doLoad && !doVerify) {
  console.log('Usage: npx tsx scenarios/factory/db-loader.ts [--check] [--load] [--verify] [--all]');
  process.exit(0);
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to PostgreSQL\n');

  try {
    if (doCheck) {
      await checkCurrentState(client);
    }
    if (doLoad) {
      await loadFactorySQL(client);
    }
    if (doVerify) {
      await verifyData(client);
    }
  } finally {
    await client.end();
  }
}

async function checkCurrentState(client: pg.Client) {
  console.log('═══ Current Database State ═══\n');

  // Count rows in key tables
  const tables = [
    { schema: 'l2', table: 'counterparty' },
    { schema: 'l2', table: 'credit_agreement_master' },
    { schema: 'l2', table: 'facility_master' },
    { schema: 'l2', table: 'facility_lender_allocation' },
    { schema: 'l1', table: 'metric_threshold' },
    { schema: 'l2', table: 'facility_exposure_snapshot' },
    { schema: 'l2', table: 'facility_pricing_snapshot' },
    { schema: 'l2', table: 'facility_risk_snapshot' },
    { schema: 'l2', table: 'facility_financial_snapshot' },
    { schema: 'l2', table: 'facility_profitability_snapshot' },
    { schema: 'l2', table: 'facility_lob_attribution' },
    { schema: 'l2', table: 'position' },
    { schema: 'l2', table: 'position_detail' },
    { schema: 'l2', table: 'cash_flow' },
    { schema: 'l2', table: 'counterparty_financial_snapshot' },
    { schema: 'l2', table: 'counterparty_rating_observation' },
    { schema: 'l2', table: 'collateral_snapshot' },
    { schema: 'l2', table: 'credit_event' },
    { schema: 'l2', table: 'risk_flag' },
    { schema: 'l2', table: 'amendment_event' },
    { schema: 'l2', table: 'amendment_change_detail' },
    { schema: 'l2', table: 'exception_event' },
    { schema: 'l2', table: 'facility_credit_approval' },
    { schema: 'l2', table: 'financial_metric_observation' },
    { schema: 'l2', table: 'netting_set_exposure_snapshot' },
    { schema: 'l2', table: 'stress_test_result' },
    { schema: 'l2', table: 'facility_delinquency_snapshot' },
    { schema: 'l2', table: 'deal_pipeline_fact' },
  ];

  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) as cnt FROM ${t.schema}.${t.table}`);
      console.log(`  ${t.schema}.${t.table}: ${res.rows[0].cnt} rows`);
    } catch (e: any) {
      console.log(`  ${t.schema}.${t.table}: ERROR - ${e.message.split('\n')[0]}`);
    }
  }

  // Check max IDs to see what's already loaded
  console.log('\n── Max IDs (detect factory data) ──');
  try {
    const cpMax = await client.query('SELECT MAX(counterparty_id) as max_id FROM l2.counterparty');
    console.log(`  counterparty max_id: ${cpMax.rows[0].max_id}`);
    const facMax = await client.query('SELECT MAX(facility_id) as max_id FROM l2.facility_master');
    console.log(`  facility max_id: ${facMax.rows[0].max_id}`);
    const agrMax = await client.query('SELECT MAX(credit_agreement_id) as max_id FROM l2.credit_agreement_master');
    console.log(`  credit_agreement max_id: ${agrMax.rows[0].max_id}`);
  } catch (e: any) {
    console.log(`  Error checking max IDs: ${e.message.split('\n')[0]}`);
  }

  // Check if factory data already exists (counterparty_id > 1729 = factory range)
  try {
    const factoryCount = await client.query('SELECT COUNT(*) as cnt FROM l2.counterparty WHERE counterparty_id >= 1730');
    console.log(`\n  Factory counterparties (id >= 1730): ${factoryCount.rows[0].cnt}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message.split('\n')[0]}`);
  }

  console.log('');
}

async function loadFactorySQL(client: pg.Client) {
  console.log('═══ Loading Factory SQL ═══\n');

  const sqlPath = path.resolve(process.cwd(), 'sql/gsib-export/06-factory-scenarios.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`ERROR: ${sqlPath} not found. Run 'npm run factory:generate' first.`);
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const statements = sql
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });

  // Count INSERTs by table
  const insertCounts = new Map<string, number>();
  for (const stmt of statements) {
    if (stmt.startsWith('INSERT INTO ')) {
      const table = stmt.match(/INSERT INTO (\S+)/)?.[1] ?? 'unknown';
      insertCounts.set(table, (insertCounts.get(table) ?? 0) + 1);
    }
  }

  console.log('  Statements to execute:');
  for (const [table, count] of insertCounts) {
    console.log(`    ${table}: ${count} INSERTs`);
  }
  const totalInserts = Array.from(insertCounts.values()).reduce((a, b) => a + b, 0);
  console.log(`    TOTAL: ${totalInserts} INSERTs\n`);

  // First, delete any existing factory data to avoid PK conflicts
  console.log('  Cleaning existing factory data (id >= 1730)...');
  try {
    // Delete in reverse FK order (children first)
    const cleanupQueries = [
      // L2 position tables (position_detail before position)
      "DELETE FROM l2.position_detail WHERE position_id IN (SELECT position_id FROM l2.position WHERE facility_id >= 5744)",
      "DELETE FROM l2.position WHERE facility_id >= 5744",
      // L2 new snapshot tables
      "DELETE FROM l2.cash_flow WHERE facility_id >= 5744",
      "DELETE FROM l2.facility_lob_attribution WHERE facility_id >= 5744",
      "DELETE FROM l2.facility_pricing_snapshot WHERE facility_id >= 5744",
      "DELETE FROM l2.facility_risk_snapshot WHERE facility_id >= 5744",
      "DELETE FROM l2.facility_financial_snapshot WHERE facility_id >= 5744",
      "DELETE FROM l2.facility_profitability_snapshot WHERE facility_id >= 5744",
      "DELETE FROM l2.counterparty_financial_snapshot WHERE counterparty_id >= 1730",
      "DELETE FROM l2.facility_credit_approval WHERE facility_id >= 5744",
      "DELETE FROM l2.exception_event WHERE counterparty_id >= 1730",
      "DELETE FROM l2.financial_metric_observation WHERE counterparty_id >= 1730",
      "DELETE FROM l2.netting_set_exposure_snapshot WHERE netting_set_exposure_id >= 500000",
      "DELETE FROM l1.metric_threshold WHERE threshold_id >= 1500000",
      // L2 event tables (children of L1) — original
      "DELETE FROM l2.stress_test_breach WHERE stress_test_result_id IN (SELECT result_id FROM l2.stress_test_result WHERE result_id >= 5001)",
      "DELETE FROM l2.stress_test_result WHERE result_id >= 5001",
      "DELETE FROM l2.deal_pipeline_fact WHERE counterparty_id >= 1730",
      "DELETE FROM l2.amendment_change_detail WHERE amendment_id IN (SELECT amendment_id FROM l2.amendment_event WHERE counterparty_id >= 1730)",
      "DELETE FROM l2.amendment_event WHERE counterparty_id >= 1730",
      "DELETE FROM l2.risk_flag WHERE risk_flag_id >= 5218",
      "DELETE FROM l2.credit_event_facility_link WHERE credit_event_id IN (SELECT credit_event_id FROM l2.credit_event WHERE counterparty_id >= 1730)",
      "DELETE FROM l2.credit_event WHERE counterparty_id >= 1730",
      "DELETE FROM l2.counterparty_rating_observation WHERE counterparty_id >= 1730",
      "DELETE FROM l2.collateral_snapshot WHERE counterparty_id >= 1730",
      "DELETE FROM l2.facility_delinquency_snapshot WHERE facility_id >= 5744",
      "DELETE FROM l2.limit_contribution_snapshot WHERE facility_id >= 5744 OR counterparty_id >= 1730 OR limit_rule_id >= 5100",
      "DELETE FROM l2.limit_utilization_event WHERE limit_rule_id >= 5100",
      "DELETE FROM l2.exposure_counterparty_attribution WHERE facility_id >= 5744",
      "DELETE FROM l2.data_quality_score_snapshot WHERE counterparty_id >= 1730",
      "DELETE FROM l2.facility_exposure_snapshot WHERE facility_id >= 5744",
      // L2 children / L1 limits
      "DELETE FROM l2.facility_lender_allocation WHERE facility_id >= 5744",
      "DELETE FROM l2.collateral_link WHERE facility_id >= 5744",
      "DELETE FROM l2.collateral_asset_master WHERE collateral_asset_id >= 50201",
      "DELETE FROM l1.limit_threshold WHERE limit_rule_id >= 5100",
      "DELETE FROM l1.limit_rule WHERE limit_rule_id >= 5100",
      "DELETE FROM l2.counterparty_hierarchy WHERE counterparty_id >= 1730",
      // L2 parents (last)
      "DELETE FROM l2.facility_master WHERE facility_id >= 5744",
      "DELETE FROM l2.credit_agreement_master WHERE credit_agreement_id >= 1190",
      "DELETE FROM l2.counterparty WHERE counterparty_id >= 1730",
    ];

    for (const q of cleanupQueries) {
      try {
        const res = await client.query(q);
        if (res.rowCount && res.rowCount > 0) {
          const table = q.match(/FROM (\S+)/)?.[1] ?? 'unknown';
          console.log(`    Deleted ${res.rowCount} rows from ${table}`);
        }
      } catch (e: any) {
        // Table might not exist or no rows to delete — OK
        const msg = e.message.split('\n')[0];
        if (!msg.includes('does not exist')) {
          console.log(`    Warning: ${msg}`);
        }
      }
    }
  } catch (e: any) {
    console.log(`  Warning during cleanup: ${e.message.split('\n')[0]}`);
  }

  // Execute all statements
  console.log('\n  Loading factory data...');
  let executed = 0;
  let errors = 0;
  let lastTable = '';

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    try {
      await client.query(trimmed);
      executed++;

      // Progress tracking
      if (trimmed.startsWith('INSERT INTO ')) {
        const table = trimmed.match(/INSERT INTO (\S+)/)?.[1] ?? '';
        if (table !== lastTable) {
          if (lastTable) process.stdout.write('\n');
          process.stdout.write(`    Loading ${table}...`);
          lastTable = table;
        }
      }
    } catch (e: any) {
      errors++;
      const msg = e.message.split('\n')[0];
      if (errors <= 10) {
        console.error(`\n    ERROR on statement ${executed + 1}: ${msg}`);
        console.error(`    Statement: ${trimmed.substring(0, 120)}...`);
      }
      if (errors === 11) {
        console.error(`    ... (suppressing further errors)`);
      }
    }
  }
  process.stdout.write('\n');

  console.log(`\n  Done: ${executed} statements executed, ${errors} errors\n`);

  if (errors > 0) {
    console.log('  WARNING: Some statements failed. Run --verify to check data integrity.');
  }
}

async function verifyData(client: pg.Client) {
  console.log('═══ Verifying Factory Data ═══\n');

  // 1. Count factory rows
  console.log('── Row Counts ──');
  const counts = [
    { label: 'Factory counterparties', query: 'SELECT COUNT(*) as cnt FROM l2.counterparty WHERE counterparty_id >= 1730' },
    { label: 'Factory agreements', query: 'SELECT COUNT(*) as cnt FROM l2.credit_agreement_master WHERE credit_agreement_id >= 1190' },
    { label: 'Factory facilities', query: 'SELECT COUNT(*) as cnt FROM l2.facility_master WHERE facility_id >= 5744' },
    { label: 'Factory exposures', query: 'SELECT COUNT(*) as cnt FROM l2.facility_exposure_snapshot WHERE facility_id >= 5744' },
    { label: 'Factory risk flags', query: 'SELECT COUNT(*) as cnt FROM l2.risk_flag WHERE risk_flag_id >= 5218' },
    { label: 'Factory credit events', query: 'SELECT COUNT(*) as cnt FROM l2.credit_event WHERE counterparty_id >= 1730' },
    { label: 'Factory pricing snapshots', query: 'SELECT COUNT(*) as cnt FROM l2.facility_pricing_snapshot WHERE facility_id >= 5744' },
    { label: 'Factory risk snapshots', query: 'SELECT COUNT(*) as cnt FROM l2.facility_risk_snapshot WHERE facility_id >= 5744' },
    { label: 'Factory financial snapshots', query: 'SELECT COUNT(*) as cnt FROM l2.facility_financial_snapshot WHERE facility_id >= 5744' },
    { label: 'Factory positions', query: 'SELECT COUNT(*) as cnt FROM l2.position WHERE facility_id >= 5744' },
    { label: 'Factory position details', query: 'SELECT COUNT(*) as cnt FROM l2.position_detail WHERE position_id >= 600000' },
    { label: 'Factory cash flows', query: 'SELECT COUNT(*) as cnt FROM l2.cash_flow WHERE facility_id >= 5744' },
    { label: 'Factory LOB attributions', query: 'SELECT COUNT(*) as cnt FROM l2.facility_lob_attribution WHERE facility_id >= 5744' },
  ];

  for (const c of counts) {
    try {
      const res = await client.query(c.query);
      console.log(`  ${c.label}: ${res.rows[0].cnt}`);
    } catch (e: any) {
      console.log(`  ${c.label}: ERROR - ${e.message.split('\n')[0]}`);
    }
  }

  // 2. FK Chain Verification — every factory facility has agreement + counterparty
  console.log('\n── FK Chain Integrity ──');
  try {
    const chainCheck = await client.query(`
      SELECT
        fm.facility_id,
        fm.counterparty_id,
        fm.credit_agreement_id,
        ca.credit_agreement_id AS agr_exists,
        c.counterparty_id AS cp_exists
      FROM l2.facility_master fm
      LEFT JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
      LEFT JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
      WHERE fm.facility_id >= 5744
        AND (ca.credit_agreement_id IS NULL OR c.counterparty_id IS NULL)
    `);

    if (chainCheck.rows.length === 0) {
      console.log('  ✓ All factory facilities have valid agreement + counterparty references');
    } else {
      console.log(`  ✗ ${chainCheck.rows.length} facilities with broken FK chains:`);
      for (const row of chainCheck.rows.slice(0, 5)) {
        console.log(`    Facility ${row.facility_id}: agr=${row.agr_exists ?? 'MISSING'}, cp=${row.cp_exists ?? 'MISSING'}`);
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message.split('\n')[0]}`);
  }

  // 3. Exposure FK check — every exposure references existing facility
  try {
    const expCheck = await client.query(`
      SELECT COUNT(*) as cnt
      FROM l2.facility_exposure_snapshot fes
      LEFT JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
      WHERE fes.facility_id >= 5744 AND fm.facility_id IS NULL
    `);
    const orphans = parseInt(expCheck.rows[0].cnt);
    if (orphans === 0) {
      console.log('  ✓ All factory exposures reference valid facilities');
    } else {
      console.log(`  ✗ ${orphans} exposure snapshots reference non-existent facilities`);
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message.split('\n')[0]}`);
  }

  // 4. Financial consistency
  try {
    const finCheck = await client.query(`
      SELECT COUNT(*) as cnt
      FROM l2.facility_exposure_snapshot
      WHERE facility_id >= 5744 AND drawn_amount > committed_amount
    `);
    const violations = parseInt(finCheck.rows[0].cnt);
    if (violations === 0) {
      console.log('  ✓ All factory exposures have drawn <= committed');
    } else {
      console.log(`  ✗ ${violations} exposures have drawn > committed`);
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message.split('\n')[0]}`);
  }

  // 5. Total portfolio summary
  console.log('\n── Full Portfolio Summary ──');
  try {
    const total = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM l2.counterparty) as total_cp,
        (SELECT COUNT(*) FROM l2.credit_agreement_master) as total_agr,
        (SELECT COUNT(*) FROM l2.facility_master) as total_fac,
        (SELECT COUNT(*) FROM l2.facility_exposure_snapshot) as total_exp
    `);
    const r = total.rows[0];
    console.log(`  Counterparties: ${r.total_cp}`);
    console.log(`  Agreements: ${r.total_agr}`);
    console.log(`  Facilities: ${r.total_fac}`);
    console.log(`  Exposure snapshots: ${r.total_exp}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message.split('\n')[0]}`);
  }

  console.log('');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});

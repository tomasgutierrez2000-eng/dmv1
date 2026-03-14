/**
 * Load GSIB SQL export into PostgreSQL (correct order).
 * Uses pg package — no psql required.
 *
 * Usage: npm run db:load-gsib
 * Requires: DATABASE_URL in .env, 5 SQL files in sql/gsib-export/
 *
 * Pre-flight: runs structural integrity validation (Group 1 + 9)
 * before loading to prevent deploying invalid schemas.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { runValidation } from './validate-data-model';

const ROOT = path.resolve(__dirname, '..');
const SQL_DIR = process.env.SQL_DIR ?? path.join(ROOT, 'sql/gsib-export');

const FILES = [
  '01-l1-ddl.sql',
  '02-l2-ddl.sql',
  '03-l1-seed.sql',
  '04-l2-seed.sql',
  '05-scenario-seed.sql',
];

const MIGRATION_DIR = path.join(ROOT, 'sql/migrations');

const POST_SEED_MIGRATIONS = [
  '008a-fk-constraints-l1.sql',
  '008b-fk-constraints-l2.sql',
  '008c-fk-constraints-l3.sql',
  '019a-cash-flow-ddl.sql',
  '019c-rename-collisions.sql',
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env or pass connection string.');
    process.exit(1);
  }

  if (!process.env.SKIP_VALIDATION) {
    console.log('=== Pre-flight validation (Group 1 + 9) ===');
    const report = await runValidation({ fix: false, group: 1 });
    const report9 = await runValidation({ fix: false, group: 9 });
    const totalFailures = report.failures + report9.failures;
    if (totalFailures > 0) {
      console.error(`Pre-flight validation FAILED with ${totalFailures} errors.`);
      console.error('Fix the issues above or set SKIP_VALIDATION=1 to bypass.');
      process.exit(1);
    }
    console.log('Pre-flight validation passed.\n');
  }

  for (const f of FILES) {
    const filePath = path.join(SQL_DIR, f);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing: ${filePath} (copy GSIB export files into sql/gsib-export/)`);
      process.exit(1);
    }
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 60000,
  });
  pool.on('error', () => {});

  async function queryWithRetry(sql: string, maxRetries = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = await pool.connect();
      try {
        await client.query(sql);
        return;
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        const isConnError =
          code === 'ECONNRESET' || code === '57P01' || code === 'ECONNREFUSED' || String(err).includes('timeout');
        if (isConnError && attempt < maxRetries) {
          console.warn(`  Connection lost, retrying (${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        throw err;
      } finally {
        client.release();
      }
    }
  }

  const loadFrom = process.env.LOAD_FROM;
  const skipFirst = process.env.LOAD_SKIP_FIRST ? parseInt(process.env.LOAD_SKIP_FIRST, 10) : 0;
  const startIdx = loadFrom ? FILES.findIndex((x) => x === loadFrom) : 0;
  if (loadFrom && startIdx < 0) {
    console.error('LOAD_FROM not found:', loadFrom);
    process.exit(1);
  }
  if (loadFrom) console.log('Resuming from', loadFrom);
  if (skipFirst) console.log('Skipping first', skipFirst, 'statements in seed file');

  try {
    console.log('=== Loading GSIB export from', SQL_DIR, '===');
    for (let i = startIdx; i < FILES.length; i++) {
      const f = FILES[i];
      const filePath = path.join(SQL_DIR, f);
      let sql = fs.readFileSync(filePath, 'utf-8');
      console.log('  →', f);
      const isSeed = f.includes('seed');
      if (isSeed) {
        const statements = sql
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.includes(') VALUES (') && s.endsWith(')'));
        const startJ = i === startIdx ? skipFirst : 0;
        for (let j = startJ; j < statements.length; j++) {
          let st = statements[j] + (statements[j].endsWith(';') ? '' : ';');
          // Cap L2 FKs to L1 dimension sizes so we don't need 2000+ L1 rows per dimension
          if (f === '04-l2-seed.sql') {
            if (st.includes('INSERT INTO l2.exposure_counterparty_attribution')) {
              const m = st.match(/VALUES \((\d+), '[^']+', (\d+),/);
              if (m) {
                const exposureTypeId = parseInt(m[2], 10);
                const cap = ((exposureTypeId - 1) % 20) + 1;
                st = st.replace(
                  /(VALUES \(\d+, '[^']+', )\d+(, \d+,)/,
                  `$1${cap}$2`
                );
              }
            }
            if (st.includes('INSERT INTO l2.facility_exposure_snapshot')) {
              const m = st.match(/VALUES \((\d+), '[^']+', (\d+),/);
              if (m) {
                const facilityId = parseInt(m[1], 10);
                const exposureTypeId = parseInt(m[2], 10);
                const cap20 = ((exposureTypeId - 1) % 20) + 1;
                const cap100 = ((facilityId - 1) % 100) + 1;
                st = st.replace(
                  /(VALUES \(\d+, '[^']+', )\d+(, \d+,)/,
                  `$1${cap20}$2`
                );
                // 6th value after date = source_system_id (exposure_type, drawn, committed, undrawn, then source_system_id)
                st = st.replace(
                  /(VALUES \(\d+, '[^']+', \d+, \d+, \d+, \d+, )\d+(, \d+,)/,
                  `$1${cap100}$2`
                );
              }
            }
            if (st.includes('INSERT INTO l2.collateral_snapshot')) {
              const m = st.match(/VALUES \((\d+), '[^']+', [\d.]+, [\d.]+, [\d.]+, (\d+),/);
              if (m) {
                const collateralAssetId = parseInt(m[1], 10);
                const sourceSystemId = parseInt(m[2], 10);
                const cap150 = ((collateralAssetId - 1) % 150) + 1;
                const cap100 = ((sourceSystemId - 1) % 100) + 1;
                st = st.replace(/^(INSERT INTO l2\.collateral_snapshot \([^)]+\) VALUES \()\d+(, '[^']+',)/, `$1${cap150}$2`);
                st = st.replace(/(VALUES \(\d+, '[^']+', [\d.]+, [\d.]+, [\d.]+, )\d+(,)/, `$1${cap100}$2`);
                st = st.replace(/;\s*$/, ' ON CONFLICT (collateral_asset_id, as_of_date) DO NOTHING;');
              }
            }
            if (st.includes('INSERT INTO l2.facility_lob_attribution')) {
              const m = st.match(/VALUES \((\d+), (\d+), '[^']+', (\d+),/);
              if (m) {
                const lobSegmentId = parseInt(m[3], 10);
                const cap = ((lobSegmentId - 1) % 249) + 1;
                st = st.replace(/(VALUES \(\d+, \d+, '[^']+', )\d+(,)/, `$1${cap}$2`);
              }
            }
            if (st.includes('INSERT INTO l2.netting_set_exposure_snapshot')) {
              const m = st.match(/VALUES \((\d+),/);
              if (m) {
                const nettingSetId = parseInt(m[1], 10);
                const cap = ((nettingSetId - 1) % 40) + 1;
                st = st.replace(/^(INSERT INTO l2\.netting_set_exposure_snapshot \([^)]+\) VALUES \()\d+(,)/, `$1${cap}$2`);
                st = st.replace(/;\s*$/, ' ON CONFLICT (netting_set_id, as_of_date) DO NOTHING;');
              }
            }
            if (st.includes('INSERT INTO l2.facility_pricing_snapshot')) {
              const m = st.match(/VALUES \((\d+), '[^']+', \d+, (\d+),/);
              if (m) {
                const facilityId = parseInt(m[1], 10);
                const rateIndexId = parseInt(m[2], 10);
                const capFac = ((facilityId - 1) % 405) + 1;
                const capRate = ((rateIndexId - 1) % 10) + 1;
                st = st.replace(/^(INSERT INTO l2\.facility_pricing_snapshot \([^)]+\) VALUES \()\d+(, '[^']+', \d+,)/, `$1${capFac}$2`);
                st = st.replace(/(VALUES \(\d+, '[^']+', \d+, )\d+(, \d+\.?\d*,)/, `$1${capRate}$2`);
              }
              st = st.replace(/, '(\d+)', '([YN])',/, (_, tier, flag) => {
                const cap = ((parseInt(tier, 10) - 1) % 10) + 1;
                return `, 'pricing_tier_dim_${cap}', '${flag}',`;
              });
            }
            if (st.includes('INSERT INTO l2.limit_utilization_event')) {
              const m = st.match(/VALUES \((\d+), '[^']+', (\d+),/);
              if (m) {
                const limitRuleId = parseInt(m[1], 10);
                const counterpartyId = parseInt(m[2], 10);
                const cap50 = ((limitRuleId - 1) % 50) + 1;
                const cap100 = ((counterpartyId - 1) % 100) + 1;
                st = st.replace(/^(INSERT INTO l2\.limit_utilization_event \([^)]+\) VALUES \()\d+(, '[^']+', \d+,)/, `$1${cap50}$2`);
                st = st.replace(/(VALUES \(\d+, '[^']+', )\d+(, \d+,)/, `$1${cap100}$2`);
                st = st.replace(/;\s*$/, ' ON CONFLICT (limit_rule_id, as_of_date) DO NOTHING;');
              }
            }
            if (st.includes('INSERT INTO l2.limit_contribution_snapshot')) {
              const m = st.match(/VALUES \((\d+), (\d+), '[^']+',/);
              if (m) {
                const limitRuleId = parseInt(m[1], 10);
                const counterpartyId = parseInt(m[2], 10);
                const cap50 = ((limitRuleId - 1) % 50) + 1;
                const cap100 = ((counterpartyId - 1) % 100) + 1;
                st = st.replace(/^(INSERT INTO l2\.limit_contribution_snapshot \([^)]+\) VALUES \()\d+(, \d+,)/, `$1${cap50}$2`);
                st = st.replace(/(VALUES \(\d+, )\d+(, '[^']+',)/, `$1${cap100}$2`);
                st = st.replace(/;\s*$/, ' ON CONFLICT (limit_rule_id, counterparty_id, as_of_date) DO NOTHING;');
              }
            }
            if (st.includes('INSERT INTO l2.facility_profitability_snapshot')) {
              const m = st.match(/VALUES \(\d+, '[^']+', [\d.]+, [\d.]+, (\d+),/);
              if (m) {
                const ledgerAccountId = parseInt(m[1], 10);
                const cap = ((ledgerAccountId - 1) % 10) + 1;
                st = st.replace(/(VALUES \(\d+, '[^']+', [\d.]+, [\d.]+, )\d+(,)/, `$1${cap}$2`);
              }
            }
            const facilityDateConflictTables = [
              'facility_financial_snapshot',
              'facility_delinquency_snapshot',
              'facility_pricing_snapshot',
              'facility_profitability_snapshot',
              'facility_risk_snapshot',
            ];
            for (const tbl of facilityDateConflictTables) {
              if (st.includes(`INSERT INTO l2.${tbl}`)) {
                st = st.replace(/;\s*$/, ' ON CONFLICT (facility_id, as_of_date) DO NOTHING;');
                break;
              }
            }
          }
          if (f === '04-l2-seed.sql' && st.includes('INSERT INTO l2.position')) {
            const m = st.match(/VALUES\s*\((\d+),/);
            if (m) {
              const positionId = parseInt(m[1], 10);
              const cap = ((positionId - 1) % 100) + 1;
              // 4th value = instrument_id, 8th = source_system_id, last = product_node_id
              st = st.replace(
                /^(INSERT INTO l2\.position \([^)]+\) VALUES \(\d+, '[^']+', \d+, )\d+(,)/,
                `$1${cap}$2`
              );
              st = st.replace(/, (\d+)\);\s*$/, `, ${cap});`);
              // source_system_id is the first number after currency_code (first ", 'CCC', N, N,")
              st = st.replace(
                /, '([A-Z]{3})', (\d+), (\d+),/,
                (_, cur, _sys, next) => `, '${cur}', ${cap}, ${next},`
              );
            }
          }
          try {
            await queryWithRetry(st);
            if ((j + 1) % 500 === 0) console.log(`    ${j + 1}/${statements.length}`);
          } catch (err: unknown) {
            const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
            // Skip INSERTs into tables that don't exist (schema mismatch with scenario seed)
            if (code === '42P01' && f === '05-scenario-seed.sql') {
              if ((j + 1) % 100 === 0) console.log(`    ${j + 1}/${statements.length} (skipped missing table)`);
              continue;
            }
            // Skip duplicate key (scenario already partially loaded)
            if (code === '23505' && f === '05-scenario-seed.sql') {
              if ((j + 1) % 100 === 0) console.log(`    ${j + 1}/${statements.length} (skipped duplicate)`);
              continue;
            }
            console.error(`  Failed at statement ${j + 1}/${statements.length}:`);
            console.error(st.slice(0, 300) + (st.length > 300 ? '...' : ''));
            throw err;
          }
        }
      } else {
        await pool.query(sql);
      }
    }
    // Apply FK constraints and post-seed migrations
    console.log('=== Applying FK constraints & post-seed migrations ===');
    for (const mig of POST_SEED_MIGRATIONS) {
      const migPath = path.join(MIGRATION_DIR, mig);
      if (fs.existsSync(migPath)) {
        console.log('  →', mig);
        const migSql = fs.readFileSync(migPath, 'utf-8');
        await queryWithRetry(migSql);
      } else {
        console.warn('  ⚠ Migration not found, skipping:', mig);
      }
    }
    console.log('=== Done ===');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

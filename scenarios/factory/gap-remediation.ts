/**
 * Gap Remediation — fills missing L2 data so all 5 GSIB metrics
 * produce non-empty results across all 5 rollup dimensions.
 *
 * Usage:
 *   npx tsx scenarios/factory/gap-remediation.ts              # Generate SQL only
 *   npx tsx scenarios/factory/gap-remediation.ts --load       # Generate + load into DB
 *   npx tsx scenarios/factory/gap-remediation.ts --dry-run    # Show gap counts only
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { formatSqlValue } from './sql-emitter';

// ── Env setup ────────────────────────────────────────────────
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../../.env.local'),
  '/Users/tomas/120/.env.local',
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const AS_OF_DATE = '2025-01-31';
const BASE_RATE = 0.0530;
const COST_OF_FUNDS = 0.0480;
const DEFAULT_SPREAD_BPS = 150;
const UTIL_RATE = 0.65; // STABLE arc utilization
const FEE_RATE = 0.0025; // 25bps commitment fee

const args = process.argv.slice(2);
const doLoad = args.includes('--load');
const dryRun = args.includes('--dry-run');

// ── Types ────────────────────────────────────────────────────
interface SqlRow { [col: string]: unknown }

// ── Helpers ──────────────────────────────────────────────────
function buildInsert(table: string, row: SqlRow): string {
  const cols = Object.keys(row);
  const vals = cols.map(c => formatSqlValue(c, row[c]));
  return `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to PostgreSQL');
  console.log(`As-of date: ${AS_OF_DATE}\n`);

  const sqlLines: string[] = [
    '-- ═══════════════════════════════════════════════════════════',
    '-- Gap Remediation — Fill missing L2 data for GSIB metrics',
    `-- Generated: ${new Date().toISOString()}`,
    '-- ═══════════════════════════════════════════════════════════',
    '',
    'SET search_path TO l1, l2, public;',
    '',
  ];

  try {
    // ── Gap 1: Taxonomy Orphans ──────────────────────────────
    console.log('── Gap 1: Taxonomy Orphan Fix ──');
    const orphans = await client.query(`
      SELECT fm.facility_id, fm.lob_segment_id,
             COALESCE(ebt.tree_level::text, 'MISSING') as tree_level
      FROM l2.facility_master fm
      LEFT JOIN l1.enterprise_business_taxonomy ebt
        ON fm.lob_segment_id = ebt.managed_segment_id
      WHERE ebt.tree_level IS NULL
         OR (ebt.tree_level::text NOT IN ('3', 'L3'))
    `);
    console.log(`  Found ${orphans.rows.length} orphan facilities`);

    if (!dryRun && orphans.rows.length > 0) {
      // Build L3 lookup: parent_id → first L3 child
      const l3Children = await client.query(`
        SELECT parent_segment_id, MIN(managed_segment_id) as l3_child_id
        FROM l1.enterprise_business_taxonomy
        WHERE tree_level::text IN ('3', 'L3')
        GROUP BY parent_segment_id
      `);
      const l3ChildMap = new Map<number, number>();
      for (const r of l3Children.rows) {
        l3ChildMap.set(Number(r.parent_segment_id), Number(r.l3_child_id));
      }

      // Build L2→L3 lookup for L1 nodes (L1 → first L2 child → first L3 child)
      const l2Children = await client.query(`
        SELECT parent_segment_id, MIN(managed_segment_id) as l2_child_id
        FROM l1.enterprise_business_taxonomy
        WHERE tree_level::text IN ('2', 'L2')
        GROUP BY parent_segment_id
      `);
      const l2ChildMap = new Map<number, number>();
      for (const r of l2Children.rows) {
        l2ChildMap.set(Number(r.parent_segment_id), Number(r.l2_child_id));
      }

      // Default L3 fallback (first L3 node)
      const defaultL3 = await client.query(`
        SELECT MIN(managed_segment_id) as id
        FROM l1.enterprise_business_taxonomy
        WHERE tree_level::text IN ('3', 'L3')
      `);
      const fallbackL3 = Number(defaultL3.rows[0]?.id ?? 1);

      sqlLines.push('-- ── Gap 1: Taxonomy Orphan Fixes ──');
      let fixedCount = 0;
      for (const row of orphans.rows) {
        const lobId = Number(row.lob_segment_id);
        const treeLevel = String(row.tree_level);

        let targetL3: number | undefined;

        if (treeLevel === '2' || treeLevel === 'L2') {
          // L2 node → find its first L3 child
          targetL3 = l3ChildMap.get(lobId);
        } else if (treeLevel === '1' || treeLevel === 'L1') {
          // L1 node → first L2 child → first L3 child
          const l2Child = l2ChildMap.get(lobId);
          if (l2Child) targetL3 = l3ChildMap.get(l2Child);
        } else if (treeLevel === '0' || treeLevel === 'L0') {
          // Root node → walk down
          const l1Child = l2ChildMap.get(lobId); // reuse — it's actually parent→child
          if (l1Child) {
            const l2Child = l2ChildMap.get(l1Child);
            if (l2Child) targetL3 = l3ChildMap.get(l2Child);
          }
        }

        if (!targetL3) targetL3 = fallbackL3;

        sqlLines.push(`UPDATE l2.facility_master SET lob_segment_id = ${targetL3} WHERE facility_id = ${row.facility_id};`);
        fixedCount++;
      }
      sqlLines.push('');
      console.log(`  Generated ${fixedCount} UPDATE statements`);
    }

    // ── Gap 2: Missing facility_lender_allocation ────────────
    console.log('\n── Gap 2: Missing facility_lender_allocation ──');
    const missingFla = await client.query(`
      SELECT fm.facility_id, fm.origination_date
      FROM l2.facility_master fm
      LEFT JOIN l2.facility_lender_allocation fla ON fm.facility_id = fla.facility_id
      WHERE fla.facility_id IS NULL AND fm.is_active_flag::text IN ('true', 'Y', '1')
    `);
    console.log(`  Found ${missingFla.rows.length} facilities without lender allocation`);

    if (!dryRun && missingFla.rows.length > 0) {
      const maxIdRes = await client.query('SELECT COALESCE(MAX(lender_allocation_id), 0) as max_id FROM l2.facility_lender_allocation');
      let nextAllocId = Number(maxIdRes.rows[0].max_id) + 1;

      sqlLines.push('-- ── Gap 2: Missing facility_lender_allocation ──');
      for (const row of missingFla.rows) {
        sqlLines.push(buildInsert('l2.facility_lender_allocation', {
          lender_allocation_id: nextAllocId++,
          facility_id: Number(row.facility_id),
          legal_entity_id: 1,
          bank_share_pct: 1.0,
          allocation_role: 'LEAD_ARRANGER',
          is_lead_flag: 'Y',
          is_current_flag: 'Y',
          effective_start_date: AS_OF_DATE,
        }));
      }
      sqlLines.push('');
      console.log(`  Generated ${missingFla.rows.length} INSERT statements (IDs from ${nextAllocId - missingFla.rows.length})`);
    }

    // ── Gap 3: Missing facility_counterparty_participation ───
    console.log('\n── Gap 3: Missing facility_counterparty_participation ──');
    const missingFcp = await client.query(`
      SELECT fm.facility_id, fm.counterparty_id
      FROM l2.facility_master fm
      LEFT JOIN l2.facility_counterparty_participation fcp ON fm.facility_id = fcp.facility_id
      WHERE fcp.facility_id IS NULL AND fm.is_active_flag::text IN ('true', 'Y', '1')
    `);
    console.log(`  Found ${missingFcp.rows.length} facilities without participation`);

    if (!dryRun && missingFcp.rows.length > 0) {
      const maxPartIdRes = await client.query('SELECT COALESCE(MAX(facility_participation_id), 0) as max_id FROM l2.facility_counterparty_participation');
      let nextPartId = Number(maxPartIdRes.rows[0].max_id) + 1;

      // Load all counterparty IDs for syndicated secondary participants
      const cpListRes = await client.query(`
        SELECT counterparty_id FROM l2.counterparty WHERE counterparty_id IS NOT NULL
      `);
      const allCpIds = cpListRes.rows.map(r => Number(r.counterparty_id));

      sqlLines.push('-- ── Gap 3: Missing facility_counterparty_participation ──');
      let singleCount = 0;
      let syndicatedCount = 0;

      for (let i = 0; i < missingFcp.rows.length; i++) {
        const row = missingFcp.rows[i];
        const facId = Number(row.facility_id);
        const cpId = Number(row.counterparty_id);

        // 80% single borrower, 20% syndicated (deterministic by index)
        const isSyndicated = (i % 5 === 4); // every 5th facility

        if (isSyndicated && allCpIds.length > 3) {
          // Syndicated: 2-3 participants
          const numParticipants = (i % 2 === 0) ? 2 : 3;
          const primaryPct = numParticipants === 2 ? 60.0 : 50.0;
          const secondaryPct = numParticipants === 2 ? 40.0 : 25.0;

          // Primary borrower
          sqlLines.push(buildInsert('l2.facility_counterparty_participation', {
            facility_participation_id: nextPartId++,
            facility_id: facId,
            counterparty_id: cpId,
            counterparty_role_code: 'BORROWER',
            is_primary_flag: 'Y',
            participation_pct: primaryPct,
            effective_start_date: AS_OF_DATE,
            is_current_flag: 'Y',
          }));

          // Secondary participants — pick different counterparties
          for (let p = 0; p < numParticipants - 1; p++) {
            // Deterministic pick: use facility_id to select
            const secCpId = allCpIds[((facId + p + 1) * 7) % allCpIds.length];
            if (secCpId === cpId) continue; // skip if same as primary
            sqlLines.push(buildInsert('l2.facility_counterparty_participation', {
              facility_participation_id: nextPartId++,
              facility_id: facId,
              counterparty_id: secCpId,
              counterparty_role_code: 'PARTICIPANT',
              is_primary_flag: 'N',
              participation_pct: secondaryPct,
              effective_start_date: AS_OF_DATE,
              is_current_flag: 'Y',
            }));
          }
          syndicatedCount++;
        } else {
          // Single borrower: 100%
          sqlLines.push(buildInsert('l2.facility_counterparty_participation', {
            facility_participation_id: nextPartId++,
            facility_id: facId,
            counterparty_id: cpId,
            counterparty_role_code: 'BORROWER',
            is_primary_flag: 'Y',
            participation_pct: 100.0,
            effective_start_date: AS_OF_DATE,
            is_current_flag: 'Y',
          }));
          singleCount++;
        }
      }
      sqlLines.push('');
      console.log(`  Generated: ${singleCount} single-borrower, ${syndicatedCount} syndicated`);
    }

    // ── Gap 4: Missing position + position_detail ────────────
    console.log('\n── Gap 4: Missing position + position_detail ──');
    const missingPos = await client.query(`
      SELECT fm.facility_id, fm.counterparty_id, fm.committed_facility_amt,
             fm.credit_agreement_id, fm.currency_code
      FROM l2.facility_master fm
      LEFT JOIN l2.position p ON fm.facility_id = p.facility_id AND p.as_of_date = '${AS_OF_DATE}'
      WHERE p.facility_id IS NULL AND fm.is_active_flag::text IN ('true', 'Y', '1')
    `);
    console.log(`  Found ${missingPos.rows.length} facilities without positions`);

    if (!dryRun && missingPos.rows.length > 0) {
      const maxPosRes = await client.query('SELECT COALESCE(MAX(position_id), 0) as max_id FROM l2.position');
      let nextPosId = Number(maxPosRes.rows[0].max_id) + 1;
      const maxDetRes = await client.query('SELECT COALESCE(MAX(position_detail_id), 0) as max_id FROM l2.position_detail');
      let nextDetId = Number(maxDetRes.rows[0].max_id) + 1;

      sqlLines.push('-- ── Gap 4: Missing position ──');
      const posIdMap: Map<number, number> = new Map(); // facility_id → position_id

      for (const row of missingPos.rows) {
        const facId = Number(row.facility_id);
        const committed = Number(row.committed_facility_amt ?? 0);
        const drawn = Math.round(committed * UTIL_RATE);
        const posId = nextPosId++;
        posIdMap.set(facId, posId);

        sqlLines.push(buildInsert('l2.position', {
          position_id: posId,
          as_of_date: AS_OF_DATE,
          facility_id: facId,
          instrument_id: ((facId - 1) % 100) + 1,
          balance_amount: drawn,
          currency_code: row.currency_code ?? 'USD',
          source_system_id: ((facId - 1) % 10) + 1,
          counterparty_id: Number(row.counterparty_id),
          credit_agreement_id: Number(row.credit_agreement_id),
          credit_status_code: 'CURRENT',
          exposure_type_code: 'FUNDED',
          notional_amount: committed,
          trading_banking_book_flag: 'N',
          product_node_id: ((facId - 1) % 100) + 1,
        }));
      }

      sqlLines.push('');
      sqlLines.push('-- ── Gap 4: Missing position_detail ──');

      for (const row of missingPos.rows) {
        const facId = Number(row.facility_id);
        const committed = Number(row.committed_facility_amt ?? 0);
        const drawn = Math.round(committed * UTIL_RATE);
        const unfunded = committed - drawn;
        const allInRate = BASE_RATE + DEFAULT_SPREAD_BPS / 10000;
        const posId = posIdMap.get(facId)!;

        sqlLines.push(buildInsert('l2.position_detail', {
          position_detail_id: nextDetId++,
          position_id: posId,
          as_of_date: AS_OF_DATE,
          detail_type: 'PRINCIPAL',
          amount: drawn,
          current_balance: drawn,
          funded_amount: drawn,
          unfunded_amount: unfunded,
          total_commitment: committed,
          interest_rate: Math.round(allInRate * 1000000) / 1000000,
          days_past_due: 0,
          delinquency_status: 'PERFORMING',
          spread_bps: DEFAULT_SPREAD_BPS,
          product_node_id: ((facId - 1) % 100) + 1,
        }));
      }
      sqlLines.push('');
      console.log(`  Generated ${missingPos.rows.length} position + ${missingPos.rows.length} position_detail rows`);
    }

    // ── Gap 5: Missing facility_pricing_snapshot ─────────────
    console.log('\n── Gap 5: Missing facility_pricing_snapshot ──');
    const missingPricing = await client.query(`
      SELECT fm.facility_id, fm.currency_code
      FROM l2.facility_master fm
      LEFT JOIN l2.facility_pricing_snapshot fps
        ON fm.facility_id = fps.facility_id AND fps.as_of_date = '${AS_OF_DATE}'
      WHERE fps.facility_id IS NULL AND fm.is_active_flag::text IN ('true', 'Y', '1')
    `);
    console.log(`  Found ${missingPricing.rows.length} facilities without pricing`);

    if (!dryRun && missingPricing.rows.length > 0) {
      const maxPricingRes = await client.query('SELECT COALESCE(MAX(facility_pricing_id), 0) as max_id FROM l2.facility_pricing_snapshot');
      let nextPricingId = Number(maxPricingRes.rows[0].max_id) + 1;

      const allInRate = Math.round((BASE_RATE + DEFAULT_SPREAD_BPS / 10000) * 10000) / 10000;

      sqlLines.push('-- ── Gap 5: Missing facility_pricing_snapshot ──');
      for (const row of missingPricing.rows) {
        sqlLines.push(buildInsert('l2.facility_pricing_snapshot', {
          facility_id: Number(row.facility_id),
          as_of_date: AS_OF_DATE,
          spread_bps: DEFAULT_SPREAD_BPS,
          rate_index_id: ((Number(row.facility_id) - 1) % 10) + 1,
          all_in_rate_pct: allInRate,
          base_rate_pct: BASE_RATE,
          currency_code: row.currency_code ?? 'USD',
          facility_pricing_id: nextPricingId++,
          fee_rate_pct: FEE_RATE,
          cost_of_funds_pct: COST_OF_FUNDS,
          payment_frequency: 'QUARTERLY',
          prepayment_penalty_flag: 'N',
        }));
      }
      sqlLines.push('');
      console.log(`  Generated ${missingPricing.rows.length} pricing rows`);
    }

    // ── Gap 6: Missing facility_profitability_snapshot ────────
    console.log('\n── Gap 6: Missing facility_profitability_snapshot ──');
    const missingProfit = await client.query(`
      SELECT fm.facility_id, fm.committed_facility_amt, fm.currency_code
      FROM l2.facility_master fm
      LEFT JOIN l2.facility_profitability_snapshot fps
        ON fm.facility_id = fps.facility_id AND fps.as_of_date = '${AS_OF_DATE}'
      WHERE fps.facility_id IS NULL AND fm.is_active_flag::text IN ('true', 'Y', '1')
    `);
    console.log(`  Found ${missingProfit.rows.length} facilities without profitability`);

    if (!dryRun && missingProfit.rows.length > 0) {
      // Try to get actual drawn amounts from position table
      const drawnAmounts = await client.query(`
        SELECT facility_id, balance_amount
        FROM l2.position
        WHERE as_of_date = '${AS_OF_DATE}'
      `);
      const drawnMap = new Map<number, number>();
      for (const r of drawnAmounts.rows) {
        drawnMap.set(Number(r.facility_id), Number(r.balance_amount));
      }

      // Get actual pricing for all_in_rate
      const pricingRates = await client.query(`
        SELECT facility_id, all_in_rate_pct, cost_of_funds_pct
        FROM l2.facility_pricing_snapshot
        WHERE as_of_date = '${AS_OF_DATE}'
      `);
      const rateMap = new Map<number, { allIn: number; cof: number }>();
      for (const r of pricingRates.rows) {
        rateMap.set(Number(r.facility_id), {
          allIn: Number(r.all_in_rate_pct),
          cof: Number(r.cost_of_funds_pct),
        });
      }

      let nextProfitId: number;
      const maxProfRes = await client.query(`
        SELECT COALESCE(MAX(profitability_snapshot_id), 0) as max_id
        FROM l2.facility_profitability_snapshot
      `);
      nextProfitId = Number(maxProfRes.rows[0].max_id) + 1;

      sqlLines.push('-- ── Gap 6: Missing facility_profitability_snapshot ──');
      for (const row of missingProfit.rows) {
        const facId = Number(row.facility_id);
        const committed = Number(row.committed_facility_amt ?? 0);
        const drawn = drawnMap.get(facId) ?? Math.round(committed * UTIL_RATE);
        const rates = rateMap.get(facId) ?? { allIn: BASE_RATE + DEFAULT_SPREAD_BPS / 10000, cof: COST_OF_FUNDS };

        const interestIncome = Math.round(drawn * rates.allIn);
        const interestExpense = Math.round(drawn * rates.cof);
        const nii = interestIncome - interestExpense;
        const feeIncome = Math.round(committed * FEE_RATE);

        sqlLines.push(buildInsert('l2.facility_profitability_snapshot', {
          facility_id: facId,
          as_of_date: AS_OF_DATE,
          interest_income_amt: interestIncome,
          interest_expense_amt: interestExpense,
          fee_income_amt: feeIncome,
          nii_ytd: nii,
          fee_income_ytd: feeIncome,
          ledger_account_id: ((facId - 1) % 10) + 1,
          base_currency_code: row.currency_code ?? 'USD',
          profitability_snapshot_id: nextProfitId++,
        }));
      }
      sqlLines.push('');
      console.log(`  Generated ${missingProfit.rows.length} profitability rows`);
    }

    // ── Write SQL file ──────────────────────────────────────
    if (!dryRun) {
      const outPath = path.resolve(__dirname, '..', '..', 'sql', 'gsib-export', '07-gap-remediation.sql');
      fs.writeFileSync(outPath, sqlLines.join('\n'));
      console.log(`\nSQL written to: ${outPath}`);
      console.log(`  Total lines: ${sqlLines.length}`);

      // ── Optionally load into DB ───────────────────────────
      if (doLoad) {
        console.log('\nLoading SQL into PostgreSQL...');
        const sql = sqlLines.join('\n');
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

        let executed = 0;
        let errors = 0;
        for (const stmt of statements) {
          const trimmed = stmt.trim();
          if (!trimmed || trimmed.startsWith('--')) continue;
          try {
            await client.query(trimmed);
            executed++;
          } catch (e: any) {
            errors++;
            if (errors <= 10) {
              console.error(`  ERROR: ${e.message.split('\n')[0]}`);
              console.error(`  Statement: ${trimmed.substring(0, 120)}...`);
            }
          }
        }
        console.log(`\nLoaded: ${executed} statements, ${errors} errors`);
      }
    }

    // ── Summary ─────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('Gap Remediation Summary');
    console.log('═══════════════════════════════════════════');
    console.log(`  Taxonomy orphans:      ${orphans.rows.length}`);
    console.log(`  Lender allocation:     ${missingFla.rows.length}`);
    console.log(`  Participation:         ${missingFcp.rows.length}`);
    console.log(`  Position/detail:       ${missingPos.rows.length}`);
    console.log(`  Pricing:               ${missingPricing.rows.length}`);
    console.log(`  Profitability:         ${missingProfit.rows.length}`);

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

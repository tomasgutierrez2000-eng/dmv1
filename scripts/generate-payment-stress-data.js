#!/usr/bin/env node
/**
 * Data Generation Factory: payment_ledger + stress_test_breach
 *
 * Generates GSIB-quality sample data aligned with existing reference data.
 * Queries live DB for parent IDs, then generates deterministic, narrative-coherent rows.
 *
 * Usage:
 *   node scripts/generate-payment-stress-data.js           # Output SQL to stdout
 *   node scripts/generate-payment-stress-data.js --load     # Load directly into DB
 *   node scripts/generate-payment-stress-data.js --file     # Write to sql/gsib-export/08-payment-stress-seed.sql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// --- Deterministic PRNG (mulberry32) ---
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20250131); // Seed date for reproducibility

function pick(arr, idx) { return arr[idx % arr.length]; }
function randBetween(min, max) { return min + rng() * (max - min); }
function randInt(min, max) { return Math.floor(randBetween(min, max + 1)); }
function roundTo(n, decimals = 2) { const f = Math.pow(10, decimals); return Math.round(n * f) / f; }

// --- SQL escaping ---
function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// --- Payment status distribution for GSIB ---
const PAYMENT_STATUSES = ['PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID',
  'PARTIAL', 'PENDING', 'DELINQUENT', 'REVERSED'];

// --- Breach severity + control pairings ---
const CONTROLS = [
  { rule_name: 'Single Name Limit', owner: 'Credit Risk', desc: 'Single obligor exposure exceeds board-approved threshold' },
  { rule_name: 'Sector Concentration', owner: 'Portfolio Risk', desc: 'Industry sector aggregate exceeds concentration policy limit' },
  { rule_name: 'Country Limit', owner: 'Country Risk', desc: 'Sovereign/transfer risk exposure breaches approved country ceiling' },
  { rule_name: 'Product Limit', owner: 'Product Control', desc: 'Product-level notional exceeds risk appetite statement limit' },
  { rule_name: 'Maturity Limit', owner: 'ALM', desc: 'Maturity bucket concentration exceeds liquidity risk tolerance' },
  { rule_name: 'FX Exposure Limit', owner: 'Market Risk', desc: 'Open FX position breaches treasury-approved hedging corridor' },
  { rule_name: 'Leveraged Lending', owner: 'Leveraged Finance', desc: 'Leveraged loan book exceeds OCC/Fed interagency guidance threshold' },
  { rule_name: 'CRE Concentration', owner: 'CRE Risk', desc: 'Commercial real estate portfolio exceeds 300% of total capital threshold' },
  { rule_name: 'FIG Limit', owner: 'FIG Risk', desc: 'Financial institutions group exposure exceeds interconnectedness limit' },
  { rule_name: 'Unsecured Limit', owner: 'Credit Risk', desc: 'Unsecured exposure to counterparty exceeds credit committee threshold' },
];

const FAILURE_TEMPLATES = [
  'Stressed {scenario} pushes exposure {pct}% above approved limit; remediation timeline {days} days',
  'Under {scenario}, aggregate position breaches limit by ${amt}M; escalated to {owner}',
  'Forward-looking PD migration under {scenario} causes limit utilization to reach {util}%',
  '{scenario} stress scenario reveals {pct}% gap between current exposure and limit ceiling',
  'Simultaneous drawdown assumption under {scenario} drives breach of ${amt}M',
];

const SCENARIO_NAMES = [
  'CCAR Baseline', 'CCAR Adverse', 'CCAR Severely Adverse', 'Custom Management',
  'GFC Replay', 'COVID Replay', 'Rate +300bp', 'Rate -200bp',
  'CRE Downturn', 'Idiosyncratic Single-Name'
];

async function main() {
  const loadMode = process.argv.includes('--load');
  const fileMode = process.argv.includes('--file');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // ========== LOAD REFERENCE DATA ==========
    console.error('Loading reference data...');

    // Facilities with exposure data (Jan 2025)
    const { rows: facilities } = await client.query(`
      SELECT DISTINCT ON (f.facility_id)
        f.facility_id, f.counterparty_id, f.facility_type,
        c.legal_name, c.external_rating_sp,
        fes.committed_amount, fes.drawn_amount, fes.currency_code
      FROM l2.facility_master f
      JOIN l2.counterparty c ON f.counterparty_id = c.counterparty_id
      JOIN l2.facility_exposure_snapshot fes ON f.facility_id = fes.facility_id
        AND fes.as_of_date = '2025-01-31'
      ORDER BY f.facility_id, fes.committed_amount DESC
    `);
    console.error(`  Loaded ${facilities.length} facilities with Jan exposure`);

    // Positions (for payment_ledger.position_id)
    const { rows: positions } = await client.query(`
      SELECT position_id, facility_id, counterparty_id FROM l2.position ORDER BY position_id
    `);
    console.error(`  Loaded ${positions.length} positions`);

    // Build facility→position map
    const facilityPositions = {};
    for (const p of positions) {
      const fid = Number(p.facility_id);
      if (!facilityPositions[fid]) facilityPositions[fid] = [];
      facilityPositions[fid].push(Number(p.position_id));
    }

    // Scenarios
    const { rows: scenarios } = await client.query(
      'SELECT scenario_id, scenario_name, scenario_type FROM l1.scenario_dim ORDER BY scenario_id'
    );
    console.error(`  Loaded ${scenarios.length} scenarios`);

    // Limit rules
    const { rows: limitRules } = await client.query(
      'SELECT limit_rule_id, rule_name, limit_type FROM l1.limit_rule ORDER BY limit_rule_id'
    );
    console.error(`  Loaded ${limitRules.length} limit rules`);

    // Counterparties (for breach assignment)
    const { rows: counterparties } = await client.query(`
      SELECT counterparty_id, legal_name, external_rating_sp, pd_annual
      FROM l2.counterparty ORDER BY counterparty_id
    `);
    console.error(`  Loaded ${counterparties.length} counterparties`);

    // EBT segments (for lob_segment_id)
    const { rows: segments } = await client.query(`
      SELECT managed_segment_id FROM l1.enterprise_business_taxonomy
      WHERE tree_level = 1 ORDER BY managed_segment_id
    `);
    const lobIds = segments.map(s => Number(s.managed_segment_id));
    console.error(`  Loaded ${lobIds.length} LOB segments`);

    // ========== GENERATE PAYMENT_LEDGER ==========
    console.error('\nGenerating payment_ledger data...');

    const paymentRows = [];
    let paymentId = 1;

    // 3-month payment schedule: Nov 2024, Dec 2024, Jan 2025
    const paymentDates = [
      { due: '2024-11-30', period: 'Nov-2024' },
      { due: '2024-12-31', period: 'Dec-2024' },
      { due: '2025-01-31', period: 'Jan-2025' },
    ];

    // Select facilities for payment generation — all facilities with drawn > 0
    const payableFacilities = facilities.filter(f => Number(f.drawn_amount) > 0);
    console.error(`  ${payableFacilities.length} facilities with outstanding draws`);

    for (const fac of payableFacilities) {
      const facId = Number(fac.facility_id);
      const cpId = Number(fac.counterparty_id);
      const committed = Number(fac.committed_amount);
      const drawn = Number(fac.drawn_amount);
      const currency = fac.currency_code;
      const facType = fac.facility_type;
      const rating = fac.external_rating_sp || 'BBB';
      const posIds = facilityPositions[facId] || [null];

      // Determine rate based on rating tier
      const ratingSpread = rating.startsWith('A') ? 150 :
        rating.startsWith('BBB') ? 275 :
          rating.startsWith('BB') ? 425 : 575;
      const baseRate = currency === 'USD' ? 475 : currency === 'EUR' ? 350 :
        currency === 'GBP' ? 425 : currency === 'JPY' ? 50 : 400;
      const allInRate = (baseRate + ratingSpread) / 10000; // annual decimal

      // Quarterly interest payment on drawn amount
      const interestPayment = roundTo(drawn * allInRate / 4);

      // Principal amortization for term loans (1-2% per quarter)
      const isPrincipalAmort = facType === 'TERM_LOAN' || facType === 'TERM_LOAN_B';
      const principalPayment = isPrincipalAmort ? roundTo(committed * (0.01 + rng() * 0.01)) : 0;

      // Fee on undrawn for revolving (25-50 bps annual, quarterly)
      const isRevolving = facType === 'REVOLVING_CREDIT';
      const undrawnAmt = committed - drawn;
      const feePayment = isRevolving && undrawnAmt > 0 ?
        roundTo(undrawnAmt * (0.0025 + rng() * 0.0025) / 4) : 0;

      for (const pd of paymentDates) {
        const totalDue = roundTo(interestPayment + principalPayment);
        const posId = pick(posIds, paymentId);

        // Determine payment outcome based on rating quality + randomness
        const isInvestmentGrade = rating.startsWith('A') || rating.startsWith('BBB');
        const delinquencyChance = isInvestmentGrade ? 0.02 : 0.08;
        const partialChance = isInvestmentGrade ? 0.03 : 0.06;
        const pendingChance = pd.due === '2025-01-31' ? 0.05 : 0.01; // Jan payments still pending
        const reversalChance = 0.005;

        const roll = rng();
        let status, amountMade, payDate, appliedAmt, appliedDate;

        if (roll < reversalChance) {
          status = 'REVERSED';
          amountMade = totalDue;
          payDate = pd.due;
          appliedAmt = 0;
          appliedDate = null;
        } else if (roll < reversalChance + pendingChance) {
          status = 'PENDING';
          amountMade = null;
          payDate = null;
          appliedAmt = null;
          appliedDate = null;
        } else if (roll < reversalChance + pendingChance + delinquencyChance) {
          status = 'DELINQUENT';
          amountMade = 0;
          payDate = null;
          appliedAmt = 0;
          appliedDate = null;
        } else if (roll < reversalChance + pendingChance + delinquencyChance + partialChance) {
          status = 'PARTIAL';
          const partialPct = 0.3 + rng() * 0.5; // 30-80% paid
          amountMade = roundTo(totalDue * partialPct);
          const daysLate = randInt(1, 15);
          const dueDate = new Date(pd.due);
          dueDate.setDate(dueDate.getDate() + daysLate);
          payDate = dueDate.toISOString().slice(0, 10);
          appliedAmt = amountMade;
          appliedDate = payDate;
        } else {
          status = 'PAID';
          amountMade = totalDue;
          const daysEarlyLate = randInt(-3, 5); // -3 early to +5 late
          const dueDate = new Date(pd.due);
          dueDate.setDate(dueDate.getDate() + daysEarlyLate);
          payDate = dueDate.toISOString().slice(0, 10);
          appliedAmt = totalDue;
          appliedDate = payDate;
        }

        paymentRows.push({
          payment_id: paymentId++,
          counterparty_id: cpId,
          facility_id: facId,
          contract_id: null,
          position_id: posId,
          payment_amount_due: totalDue,
          payment_due_date: pd.due,
          payment_amount_made: amountMade,
          payment_date: payDate,
          fee_due_amt: feePayment > 0 ? feePayment : null,
          payment_applied_amt: appliedAmt,
          applied_date: appliedDate,
          payment_status: status,
          currency_code: currency,
        });
      }
    }

    console.error(`  Generated ${paymentRows.length} payment_ledger rows`);

    // ========== GENERATE STRESS_TEST_BREACH ==========
    console.error('\nGenerating stress_test_breach data...');

    const breachRows = [];
    let breachId = 1;

    // For each scenario, generate breaches against top counterparties
    // More severe scenarios get more breaches
    const scenarioBreachCounts = {
      1: 8,   // CCAR Baseline — few breaches
      2: 15,  // CCAR Adverse — moderate
      3: 25,  // CCAR Severely Adverse — most breaches
      4: 10,  // Custom Management
      5: 20,  // GFC Replay — severe
      6: 18,  // COVID Replay — many
      7: 12,  // Rate +300bp
      8: 8,   // Rate -200bp
      9: 14,  // CRE Downturn
      10: 6,  // Idiosyncratic
    };

    // Build counterparty exposure map (total drawn) for realistic breach sizing
    const cpExposure = {};
    for (const f of facilities) {
      const cpId = Number(f.counterparty_id);
      const drawn = Number(f.drawn_amount);
      if (!cpExposure[cpId]) cpExposure[cpId] = { total: 0, name: f.legal_name, rating: f.external_rating_sp };
      cpExposure[cpId].total += drawn;
    }

    // Sort counterparties by total exposure (largest first — more likely to breach)
    const cpByExposure = Object.entries(cpExposure)
      .map(([id, d]) => ({ id: Number(id), ...d }))
      .sort((a, b) => b.total - a.total);

    const as_of_dates = ['2024-11-30', '2024-12-31', '2025-01-31'];

    for (const scenario of scenarios) {
      const scenId = Number(scenario.scenario_id);
      const scenName = SCENARIO_NAMES[scenId - 1] || scenario.scenario_name;
      const numBreaches = scenarioBreachCounts[scenId] || 10;

      // Severity multiplier by scenario type
      const severityMult = scenario.scenario_type === 'REGULATORY' ? 1.5 :
        scenario.scenario_type === 'HISTORICAL' ? 1.3 :
          scenario.scenario_type === 'SENSITIVITY' ? 0.8 : 1.0;

      for (let i = 0; i < numBreaches; i++) {
        // Pick a counterparty — weighted toward largest exposures
        const cpIdx = Math.min(Math.floor(rng() * rng() * cpByExposure.length), cpByExposure.length - 1);
        const cp = cpByExposure[cpIdx];

        // Pick a limit rule
        const ruleIdx = randInt(0, limitRules.length - 1);
        const rule = limitRules[ruleIdx];
        const controlInfo = CONTROLS.find(c => c.rule_name === rule.rule_name) || pick(CONTROLS, i);

        // Breach amount: 5-30% of counterparty total exposure under stress
        const stressPct = (0.05 + rng() * 0.25) * severityMult;
        const breachAmt = roundTo(cp.total * stressPct);
        const breachAmtUsd = roundTo(breachAmt * (0.95 + rng() * 0.1)); // ~FX adjustment

        // Severity based on breach size relative to exposure
        const breachRatio = breachAmt / (cp.total || 1);
        const severity = breachRatio > 0.25 ? 'CRITICAL' :
          breachRatio > 0.15 ? 'HIGH' :
            breachRatio > 0.08 ? 'MODERATE' : 'LOW';

        // Pick as_of_date (Jan most common)
        const dateIdx = rng() < 0.6 ? 2 : rng() < 0.5 ? 1 : 0;
        const asOf = as_of_dates[dateIdx];

        // Failure description from template
        const tmpl = pick(FAILURE_TEMPLATES, breachId);
        const failDesc = tmpl
          .replace('{scenario}', scenName)
          .replace('{pct}', String(roundTo(breachRatio * 100, 1)))
          .replace('{amt}', String(roundTo(breachAmt / 1e6, 0)))
          .replace('{owner}', controlInfo.owner)
          .replace('{days}', String(randInt(30, 180)))
          .replace('{util}', String(roundTo(100 + breachRatio * 100, 1)));

        breachRows.push({
          breach_id: breachId++,
          scenario_id: scenId,
          as_of_date: asOf,
          limit_rule_id: Number(rule.limit_rule_id),
          counterparty_id: cp.id,
          breach_amount: breachAmt,
          breach_amount_usd: breachAmtUsd,
          breach_severity: severity,
          control_description: controlInfo.desc,
          control_owner: controlInfo.owner,
          failure_description: failDesc,
          lob_segment_id: pick(lobIds, cp.id),
          stress_test_result_id: null, // No parent table exists yet
        });
      }
    }

    console.error(`  Generated ${breachRows.length} stress_test_breach rows`);

    // ========== FORMAT SQL ==========
    const lines = [];
    lines.push('-- ============================================================');
    lines.push('-- Payment Ledger + Stress Test Breach Seed Data');
    lines.push('-- Generated by scripts/generate-payment-stress-data.js');
    lines.push(`-- Date: ${new Date().toISOString().slice(0, 10)}`);
    lines.push(`-- Payment rows: ${paymentRows.length}`);
    lines.push(`-- Breach rows: ${breachRows.length}`);
    lines.push('-- ============================================================');
    lines.push('');
    lines.push('SET search_path TO l1, l2, l3, public;');
    lines.push('');

    // Payment Ledger
    lines.push('-- ==================== PAYMENT LEDGER ====================');
    lines.push('');

    // Batch inserts for performance (100 rows per INSERT)
    const PL_COLS = ['payment_id', 'counterparty_id', 'facility_id', 'contract_id', 'position_id',
      'payment_amount_due', 'payment_due_date', 'payment_amount_made', 'payment_date',
      'fee_due_amt', 'payment_applied_amt', 'applied_date', 'payment_status', 'currency_code',
      'created_ts', 'updated_ts'];

    for (let batch = 0; batch < paymentRows.length; batch += 100) {
      const chunk = paymentRows.slice(batch, batch + 100);
      lines.push(`INSERT INTO l2.payment_ledger (${PL_COLS.join(', ')}) VALUES`);

      for (let i = 0; i < chunk.length; i++) {
        const r = chunk[i];
        const vals = [
          r.payment_id, r.counterparty_id, r.facility_id, sqlVal(r.contract_id),
          r.position_id || 'NULL',
          r.payment_amount_due, sqlVal(r.payment_due_date),
          r.payment_amount_made !== null && r.payment_amount_made !== undefined ? r.payment_amount_made : 'NULL',
          sqlVal(r.payment_date),
          r.fee_due_amt !== null && r.fee_due_amt !== undefined ? r.fee_due_amt : 'NULL',
          r.payment_applied_amt !== null && r.payment_applied_amt !== undefined ? r.payment_applied_amt : 'NULL',
          sqlVal(r.applied_date),
          sqlVal(r.payment_status), sqlVal(r.currency_code),
          'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'
        ];
        const sep = i < chunk.length - 1 ? ',' : ';';
        lines.push(`  (${vals.join(', ')})${sep}`);
      }
      lines.push('');
    }

    // Stress Test Breach
    lines.push('-- ==================== STRESS TEST BREACH ====================');
    lines.push('');

    const STB_COLS = ['breach_id', 'scenario_id', 'as_of_date', 'limit_rule_id', 'counterparty_id',
      'breach_amount', 'breach_amount_usd', 'breach_severity', 'control_description',
      'control_owner', 'failure_description', 'lob_segment_id', 'stress_test_result_id'];

    for (let batch = 0; batch < breachRows.length; batch += 50) {
      const chunk = breachRows.slice(batch, batch + 50);
      lines.push(`INSERT INTO l2.stress_test_breach (${STB_COLS.join(', ')}) VALUES`);

      for (let i = 0; i < chunk.length; i++) {
        const r = chunk[i];
        const vals = [
          r.breach_id, r.scenario_id, sqlVal(r.as_of_date), r.limit_rule_id, r.counterparty_id,
          r.breach_amount, r.breach_amount_usd, sqlVal(r.breach_severity),
          sqlVal(r.control_description), sqlVal(r.control_owner),
          sqlVal(r.failure_description),
          r.lob_segment_id, 'NULL'
        ];
        const sep = i < chunk.length - 1 ? ',' : ';';
        lines.push(`  (${vals.join(', ')})${sep}`);
      }
      lines.push('');
    }

    const sql = lines.join('\n');

    // ========== OUTPUT ==========
    if (fileMode) {
      const outPath = path.join(__dirname, '..', 'sql', 'gsib-export', '08-payment-stress-seed.sql');
      fs.writeFileSync(outPath, sql);
      console.error(`\nWrote ${outPath} (${lines.length} lines)`);
    }

    if (loadMode) {
      console.error('\nLoading data into database...');
      await client.query(sql);
      console.error('Done! Data loaded successfully.');

      // Verify counts
      const plCount = await client.query('SELECT count(*)::int as cnt FROM l2.payment_ledger');
      const stbCount = await client.query('SELECT count(*)::int as cnt FROM l2.stress_test_breach');
      console.error(`  payment_ledger: ${plCount.rows[0].cnt} rows`);
      console.error(`  stress_test_breach: ${stbCount.rows[0].cnt} rows`);
    }

    if (!loadMode && !fileMode) {
      process.stdout.write(sql);
    }

    // ========== SUMMARY STATS ==========
    console.error('\n=== PAYMENT LEDGER SUMMARY ===');
    const statusCounts = {};
    for (const r of paymentRows) {
      statusCounts[r.payment_status] = (statusCounts[r.payment_status] || 0) + 1;
    }
    for (const [k, v] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
      console.error(`  ${k}: ${v} (${roundTo(v / paymentRows.length * 100, 1)}%)`);
    }
    const currCounts = {};
    for (const r of paymentRows) {
      currCounts[r.currency_code] = (currCounts[r.currency_code] || 0) + 1;
    }
    console.error('  Currencies:', Object.entries(currCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));

    console.error('\n=== STRESS TEST BREACH SUMMARY ===');
    const sevCounts = {};
    for (const r of breachRows) {
      sevCounts[r.breach_severity] = (sevCounts[r.breach_severity] || 0) + 1;
    }
    for (const [k, v] of Object.entries(sevCounts).sort((a, b) => b[1] - a[1])) {
      console.error(`  ${k}: ${v} (${roundTo(v / breachRows.length * 100, 1)}%)`);
    }
    const scenCounts = {};
    for (const r of breachRows) {
      scenCounts[r.scenario_id] = (scenCounts[r.scenario_id] || 0) + 1;
    }
    console.error('  By scenario:', Object.entries(scenCounts).map(([k, v]) => `S${k}:${v}`).join(', '));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });

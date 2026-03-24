/**
 * Verify CRO Dashboard Scenarios — End-to-End Data Confirmation
 *
 * Runs the reference queries from cro_scenarios_data_reference.md against
 * the loaded GSIB data (PostgreSQL). Confirms each of the 18 scenarios has
 * the data needed to tell its story on a dashboard.
 *
 * Usage: npm run db:verify-scenarios  (requires DATABASE_URL)
 * Or: npx tsx scripts/verify-cro-scenarios.ts
 */
import 'dotenv/config';
import pg from 'pg';

interface ScenarioCheck {
  id: string;
  name: string;
  narrative: string;
  query: string;
  minRows?: number;
  validate?: (rows: Record<string, unknown>[]) => boolean;
}

const SCENARIOS: ScenarioCheck[] = [
  {
    id: 'S1',
    name: 'Large Exposure Breach',
    narrative: 'Single-name concentration exceeding limit — $2.5B drawn vs $2B limit (125%)',
    query: `SELECT c.legal_name, f.facility_name, fes.outstanding_balance_amt, fes.committed_amount,
       fes.limit_status_code, lu.utilized_amount, lu.available_amount
FROM l2.counterparty c
JOIN l2.facility_master f ON f.counterparty_id = c.counterparty_id
JOIN l2.facility_exposure_snapshot fes ON fes.facility_id = f.facility_id
LEFT JOIN l2.limit_utilization_event lu ON lu.counterparty_id = c.counterparty_id
WHERE c.counterparty_id = 1001 AND fes.as_of_date = '2025-01-31'`,
    minRows: 3,
    validate: (r) => {
      const total = r.reduce((s, x) => s + Number(x.drawn_amount || 0), 0);
      return total >= 2_400_000_000 && r.some((x) => x.limit_status_code === 'BREACHED');
    },
  },
  {
    id: 'S2',
    name: 'Gradual Deterioration',
    narrative: '3-month utilization trend 82%→88%→93% with rating downgrade A→A-',
    query: `SELECT fes.as_of_date, f.facility_name, fes.outstanding_balance_amt, fes.committed_amount,
       ROUND(fes.outstanding_balance_amt::numeric / NULLIF(fes.committed_amount,0) * 100, 1) AS util_pct
FROM l2.facility_exposure_snapshot fes
JOIN l2.facility_master f ON f.facility_id = fes.facility_id
WHERE fes.counterparty_id = 1051
ORDER BY fes.as_of_date, f.facility_id`,
    minRows: 6,
    validate: (r) => {
      const dates = [...new Set(r.map((x) => x.as_of_date))];
      return dates.length >= 3 && r.some((x) => Number(x.util_pct) >= 90);
    },
  },
  {
    id: 'S3',
    name: 'Rating Divergence',
    narrative: 'External BBB vs internal BB+ — 2-notch divergence',
    query: `SELECT c.legal_name, cro.rating_type, cro.rating_value, cro.rating_grade_id,
       cro.is_internal_flag, cro.pd_implied
FROM l2.counterparty_rating_observation cro
JOIN l2.counterparty c ON c.counterparty_id = cro.counterparty_id
WHERE cro.counterparty_id = 1101 AND cro.as_of_date = '2025-01-31'`,
    minRows: 2,
    validate: (r) => {
      const ext = r.find((x) => String(x.is_internal_flag) === 'N');
      const int = r.find((x) => String(x.is_internal_flag) === 'Y');
      return ext && int && ext.rating_value !== int.rating_value;
    },
  },
  {
    id: 'S4',
    name: 'Cross-Entity Exposure',
    narrative: 'SCCL group aggregate $3.4B exceeds $3B limit across 5 entities',
    query: `SELECT c.legal_name, lcs.contribution_amount_usd, lcs.contribution_pct
FROM l2.limit_contribution_snapshot lcs
JOIN l2.counterparty c ON c.counterparty_id = lcs.counterparty_id
WHERE lcs.limit_rule_id = 5021 AND lcs.as_of_date = '2025-01-31'
ORDER BY lcs.contribution_amount_usd DESC`,
    minRows: 5,
    validate: (r) => {
      const total = r.reduce((s, x) => s + Number(x.contribution_amount_usd || 0), 0);
      return total >= 3_000_000_000;
    },
  },
  {
    id: 'S5',
    name: 'Stress Test Failure',
    narrative: 'CRE stress test $850M loss, 3 counterparties breach',
    query: `SELECT str.result_description, str.loss_amount, str.result_status,
       stb.breach_severity, c.legal_name, stb.breach_amount_usd
FROM l2.stress_test_result str
JOIN l2.stress_test_breach stb ON stb.stress_test_result_id = str.result_id
JOIN l2.counterparty c ON c.counterparty_id = stb.counterparty_id
WHERE str.result_id = 5001`,
    minRows: 3,
    validate: (r) =>
      r.length >= 3 &&
      r.some((x) => x.result_status === 'FAILED') &&
      r.some((x) => Number(x.loss_amount) >= 800_000_000),
  },
  {
    id: 'S6',
    name: 'Collateral Value Decline',
    narrative: '8 CRE properties declined 15%, triggering credit event',
    query: `SELECT cam.description AS asset_description, cs.original_valuation_usd, cs.current_valuation_usd,
       ROUND((1 - cs.current_valuation_usd::numeric / NULLIF(cs.original_valuation_usd,0)) * 100, 1) AS decline_pct
FROM l2.collateral_snapshot cs
JOIN l2.collateral_asset_master cam ON cam.collateral_asset_id = cs.collateral_asset_id
WHERE cs.counterparty_id = 1251 AND cs.as_of_date = '2025-01-31'`,
    minRows: 8,
    validate: (r) => r.every((x) => Number(x.decline_pct) >= 14 && Number(x.decline_pct) <= 16),
  },
  {
    id: 'S7',
    name: 'Syndicated Facility',
    narrative: '$2.1B syndicated facility with borrower + 3 participants/guarantors',
    query: `SELECT c.legal_name, eca.counterparty_role_code, eca.attributed_exposure_usd, eca.attribution_pct
FROM l2.exposure_counterparty_attribution eca
JOIN l2.counterparty c ON c.counterparty_id = eca.counterparty_id
WHERE eca.facility_id = 5301 AND eca.as_of_date = '2025-01-31'
ORDER BY eca.attribution_pct DESC`,
    minRows: 4,
    validate: (r) => {
      const total = r.reduce((s, x) => s + Number(x.attributed_exposure_usd || 0), 0);
      return total >= 2_000_000_000 && r.some((x) => x.counterparty_role_code === 'BORROWER');
    },
  },
  {
    id: 'S8',
    name: 'Breach Resolution',
    narrative: 'Limit breach Dec→Jan resolved (105%→88%), exception closed',
    query: `SELECT lu.as_of_date, lu.utilized_amount, lu.available_amount,
       CASE WHEN lu.available_amount < 0 THEN 'BREACH' ELSE 'WITHIN_LIMIT' END AS status
FROM l2.limit_utilization_event lu
WHERE lu.limit_rule_id = 5031
ORDER BY lu.as_of_date`,
    minRows: 2,
    validate: (r) => {
      const byDate = r.sort((a, b) => String(a.as_of_date).localeCompare(String(b.as_of_date)));
      const breach = byDate.find((x) => Number(x.available_amount) < 0);
      const resolved = byDate.find((x) => Number(x.available_amount) > 0);
      return breach && resolved;
    },
  },
  {
    id: 'S9',
    name: 'New Facility Onboarding Spike',
    narrative: '12 new facilities ($3.4B) onboarded Jan 2025',
    query: `SELECT c.legal_name, f.facility_name, dpf.proposed_amount, dpf.pipeline_stage,
       dpf.expected_close_date
FROM l2.deal_pipeline_fact dpf
JOIN l2.counterparty c ON c.counterparty_id = dpf.counterparty_id
JOIN l2.facility_master f ON f.facility_id = dpf.facility_id
WHERE dpf.pipeline_id BETWEEN 5001 AND 5012
ORDER BY dpf.proposed_amount DESC`,
    minRows: 12,
    validate: (r) => {
      const total = r.reduce((s, x) => s + Number(x.proposed_amount || 0), 0);
      return total >= 3_000_000_000 && r.every((x) => x.pipeline_stage === 'CLOSED');
    },
  },
  {
    id: 'S10',
    name: 'Maturity Wall',
    narrative: '15 facilities ($4.8B) maturing Feb–Apr 2025, 1–90 days',
    query: `SELECT f.facility_name, c.legal_name, fes.outstanding_balance_amt, fes.days_until_maturity,
       f.maturity_date, rf.flag_severity
FROM l2.facility_exposure_snapshot fes
JOIN l2.facility_master f ON f.facility_id = fes.facility_id
JOIN l2.counterparty c ON c.counterparty_id = fes.counterparty_id
LEFT JOIN l2.risk_flag rf ON rf.facility_id = fes.facility_id AND rf.flag_code = 'MATURITY_CONCENTRATION'
WHERE fes.facility_id BETWEEN 5461 AND 5475 AND fes.as_of_date = '2025-01-31'
ORDER BY fes.days_until_maturity`,
    minRows: 15,
    validate: (r) => {
      const total = r.reduce((s, x) => s + Number(x.drawn_amount || 0), 0);
      const days = r.map((x) => Number(x.days_until_maturity ?? 999)).filter((d) => d <= 90);
      return total >= 4_000_000_000 && days.length >= 10;
    },
  },
  {
    id: 'S11',
    name: 'Data Quality Crisis',
    narrative: 'Low DQ scores: PD 78%, LGD 72%, Collateral 65%',
    query: `SELECT dqs.dimension_name, dqs.completeness_pct, dqs.validity_pct, dqs.overall_score,
       dqs.target_table, dqs.issue_count
FROM l2.data_quality_score_snapshot dqs
WHERE dqs.score_id BETWEEN 5001 AND 5006 AND dqs.as_of_date = '2025-01-31'
ORDER BY dqs.overall_score`,
    minRows: 6,
    validate: (r) =>
      r.some((x) => Number(x.completeness_pct) <= 80) && r.some((x) => Number(x.overall_score) <= 70),
  },
  {
    id: 'S12',
    name: 'Product Mix Shift',
    narrative: '3-month FR 2590 G-1/G-4 trend — G-4 growing 12% MoM',
    query: `SELECT fes.as_of_date, fes.fr2590_category_code,
       SUM(fes.outstanding_balance_amt) AS total_drawn,
       COUNT(*) AS facility_count
FROM l2.facility_exposure_snapshot fes
WHERE fes.as_of_date IN ('2024-11-30','2024-12-31','2025-01-31')
  AND fes.fr2590_category_code IS NOT NULL
GROUP BY fes.as_of_date, fes.fr2590_category_code
ORDER BY fes.as_of_date, fes.fr2590_category_code`,
    minRows: 3,
    validate: (r) => {
      const dates = [...new Set(r.map((x) => x.as_of_date))];
      return dates.length >= 2;
    },
  },
  {
    id: 'S13',
    name: 'Leveraged Finance',
    narrative: 'High NII yield (4.5%) but B-rated — risk-return tradeoff',
    query: `SELECT f.facility_name, fes.outstanding_balance_amt, fps.nii_ytd,
       ROUND(fps.nii_ytd::numeric / NULLIF(fes.outstanding_balance_amt,0) * 100, 2) AS nii_yield_pct,
       cro.rating_value, cro.rating_grade_id
FROM l2.facility_exposure_snapshot fes
JOIN l2.facility_master f ON f.facility_id = fes.facility_id
JOIN l2.facility_profitability_snapshot fps ON fps.facility_id = fes.facility_id AND fps.as_of_date = fes.as_of_date
JOIN l2.counterparty_rating_observation cro ON cro.counterparty_id = fes.counterparty_id AND cro.as_of_date = fes.as_of_date
WHERE fes.facility_id BETWEEN 5551 AND 5554 AND fes.as_of_date = '2025-01-31'`,
    minRows: 4,
    validate: (r) =>
      r.some((x) => Number(x.nii_yield_pct) >= 4) && r.some((x) => Number(x.rating_grade_id) >= 7),
  },
  {
    id: 'S14',
    name: 'Regulatory Compliance Near-Miss',
    narrative: 'Tier 1 10.8% (min 10.5%), Leverage 3.1% (min 3.0%)',
    query: `SELECT fmo.metric_name, fmo.metric_value AS actual,
       mt.threshold_value AS minimum,
       fmo.metric_value - mt.threshold_value AS buffer
FROM l2.financial_metric_observation fmo
JOIN l1.metric_threshold mt ON mt.metric_definition_id = fmo.metric_definition_id
WHERE fmo.observation_id BETWEEN 5001 AND 5004 AND fmo.as_of_date = '2025-01-31'`,
    minRows: 4,
    validate: (r) =>
      r.some((x) => x.metric_name?.toString().includes('Tier 1') && Number(x.buffer) < 1) &&
      r.some((x) => x.metric_name?.toString().includes('Leverage') && Number(x.buffer) < 0.2),
  },
  {
    id: 'S15',
    name: 'Credit Event Cascade',
    narrative: 'BBB→BB downgrade → credit event → waiver → exception across 5 facilities',
    query: `SELECT 'Rating' AS event_type, cro.as_of_date::text AS dt, cro.rating_value AS detail
FROM l2.counterparty_rating_observation cro WHERE cro.counterparty_id = 1601
UNION ALL
SELECT 'Credit Event', ce.event_date::text, ce.event_summary
FROM l2.credit_event ce WHERE ce.counterparty_id = 1601
UNION ALL
SELECT 'Amendment', ae.effective_date::text, ae.amendment_description
FROM l2.amendment_event ae WHERE ae.counterparty_id = 1601 AND ae.amendment_id >= 5001
UNION ALL
SELECT 'Exception', ee.identified_date::text, ee.exception_description
FROM l2.exception_event ee WHERE ee.counterparty_id = 1601 AND ee.exception_id >= 5001
ORDER BY 2`,
    minRows: 4,
    validate: (r) =>
      r.some((x) => x.event_type === 'Credit Event') &&
      r.some((x) => x.event_type === 'Amendment') &&
      r.some((x) => x.event_type === 'Exception'),
  },
  {
    id: 'S16',
    name: 'Benchmark Transition',
    narrative: '8 facilities LIBOR→SOFR: 4 effective, 2 approved, 2 pending',
    query: `SELECT ae.facility_id, ae.amendment_status_code, ae.effective_date,
       acd.old_value AS old_benchmark, acd.new_value AS new_benchmark,
       fps.rate_index_code AS current_index
FROM l2.amendment_event ae
JOIN l2.amendment_change_detail acd ON acd.amendment_id = ae.amendment_id
LEFT JOIN l2.facility_pricing_snapshot fps ON fps.facility_id = ae.facility_id
WHERE ae.amendment_id BETWEEN 5004 AND 5011
ORDER BY ae.amendment_status_code, ae.facility_id`,
    minRows: 8,
    validate: (r) => {
      const effective = r.filter((x) => x.amendment_status_code === 'EFFECTIVE').length;
      const approved = r.filter((x) => x.amendment_status_code === 'APPROVED').length;
      const pending = r.filter((x) => x.amendment_status_code === 'PENDING').length;
      return effective >= 4 && (approved >= 2 || pending >= 2);
    },
  },
  {
    id: 'S17',
    name: 'Region Concentration',
    narrative: '5 APAC counterparties, 31% exposure growth over 3 months',
    query: `SELECT fes.as_of_date, c.country_code,
       SUM(fes.outstanding_balance_amt) AS total_drawn,
       COUNT(*) AS facility_count
FROM l2.facility_exposure_snapshot fes
JOIN l2.counterparty c ON c.counterparty_id = fes.counterparty_id
WHERE fes.counterparty_id BETWEEN 1651 AND 1655
GROUP BY fes.as_of_date, c.country_code
ORDER BY fes.as_of_date`,
    minRows: 3,
    validate: (r) => {
      const dates = [...new Set(r.map((x) => x.as_of_date))];
      return dates.length >= 2 && r.some((x) => ['JP', 'SG'].includes(String(x.country_code)));
    },
  },
  {
    id: 'S18',
    name: 'Delinquency Spike',
    narrative: '20 retail borrowers, delinquency rate 2.1%→4.7% over 2 months',
    query: `SELECT fds.as_of_date,
       COUNT(*) AS total_facilities,
       SUM(CASE WHEN fds.days_past_due > 0 THEN 1 ELSE 0 END) AS delinquent_count,
       ROUND(AVG(fds.days_past_due), 0) AS avg_dpd,
       SUM(COALESCE(fds.overdue_principal_amt,0) + COALESCE(fds.overdue_interest_amt,0)) AS total_overdue
FROM l2.facility_delinquency_snapshot fds
WHERE fds.facility_id BETWEEN 5701 AND 5720
GROUP BY fds.as_of_date
ORDER BY fds.as_of_date`,
    minRows: 2,
    validate: (r) => {
      const dates = [...new Set(r.map((x) => String(x.as_of_date).slice(0, 7)))];
      return dates.length >= 2 && r.some((x) => Number(x.delinquent_count ?? 0) > 0);
    },
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env to run scenario verification.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const results: { id: string; name: string; ok: boolean; rows: number; error?: string }[] = [];

  try {
    console.log('=== CRO Dashboard Scenarios — End-to-End Verification ===\n');

    for (const s of SCENARIOS) {
      try {
        const q = await client.query(s.query);
        const rows = q.rows as Record<string, unknown>[];

        const minOk = s.minRows == null || rows.length >= s.minRows;
        const validateOk = s.validate == null || s.validate(rows);
        const ok = minOk && validateOk;

        results.push({
          id: s.id,
          name: s.name,
          ok,
          rows: rows.length,
          error: ok ? undefined : !minOk ? `Expected ≥${s.minRows} rows, got ${rows.length}` : 'Validation failed',
        });

        const icon = ok ? '✓' : '✗';
        const msg = ok ? `${rows.length} rows` : (results[results.length - 1].error ?? 'failed');
        console.log(`${icon} ${s.id}: ${s.name} — ${msg}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: s.id, name: s.name, ok: false, rows: 0, error: msg });
        console.log(`✗ ${s.id}: ${s.name} — ERROR: ${msg}`);
      }
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    console.log(`\n--- Summary ---`);
    console.log(`Passed: ${passed}/${SCENARIOS.length}`);
    if (failed.length > 0) {
      console.log(`Failed: ${failed.map((f) => f.id).join(', ')}`);
      failed.forEach((f) => console.log(`  ${f.id}: ${f.error}`));
    }
    console.log('\nData can support dashboard stories when:');
    console.log('1. GSIB export is loaded: npm run db:load-gsib');
    console.log('2. Dashboard queries PostgreSQL (DATABASE_URL) for scenario views');
    process.exit(failed.length > 0 ? 1 : 0);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

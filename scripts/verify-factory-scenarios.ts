/**
 * Verify Factory Scenarios (S19–S50) — Post-Load Data Validation
 *
 * Runs generic checks against loaded GSIB data (PostgreSQL):
 *   - FK chain: counterparty → agreement → facility → exposure
 *   - Financial: drawn ≤ committed
 *   - Exposure row counts per scenario
 *
 * Uses id-registry.json for scenario ID ranges.
 *
 * Usage: npm run db:verify-factory  (requires DATABASE_URL)
 * Or: npx tsx scripts/verify-factory-scenarios.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const REGISTRY_PATH = path.resolve(__dirname, '..', 'scenarios', 'config', 'id-registry.json');

interface Allocation {
  table: string;
  scenarioId: string;
  startId: number;
  endId: number;
  count: number;
}

interface RegistryState {
  version: number;
  allocations: Allocation[];
}

function loadRegistry(): RegistryState {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`id-registry.json not found at ${REGISTRY_PATH}`);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function getScenarioRanges(registry: RegistryState): Map<string, { cpStart: number; cpEnd: number; facStart: number; facEnd: number }> {
  const map = new Map<string, { cpStart: number; cpEnd: number; facStart: number; facEnd: number }>();
  const factoryScenarios = new Set(
    registry.allocations
      .filter((a) => a.scenarioId.startsWith('S') && a.scenarioId !== 'SEED' && a.scenarioId !== 'S1-S18')
      .map((a) => a.scenarioId)
  );

  for (const sid of factoryScenarios) {
    const cpAlloc = registry.allocations.find((a) => a.table === 'counterparty' && a.scenarioId === sid);
    const facAlloc = registry.allocations.find((a) => a.table === 'facility_master' && a.scenarioId === sid);
    if (cpAlloc && facAlloc) {
      map.set(sid, {
        cpStart: cpAlloc.startId,
        cpEnd: cpAlloc.endId,
        facStart: facAlloc.startId,
        facEnd: facAlloc.endId,
      });
    }
  }
  return map;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in .env to run factory scenario verification.');
    process.exit(1);
  }

  const registry = loadRegistry();
  const ranges = getScenarioRanges(registry);
  const scenarioIds = [...ranges.keys()].sort();

  if (scenarioIds.length === 0) {
    console.log('No factory scenarios (S19+) found in id-registry.json');
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const results: { id: string; ok: boolean; checks: string[]; error?: string }[] = [];

  try {
    console.log('=== Factory Scenarios (S19–S50) — Post-Load Verification ===\n');

    for (const sid of scenarioIds) {
      const r = ranges.get(sid)!;
      const checks: string[] = [];
      let ok = true;

      try {
        // Check 1: FK chain — facility → agreement → counterparty
        const fkRes = await client.query(
          `SELECT COUNT(*) AS cnt FROM l2.facility_master fm
           JOIN l2.credit_agreement_master cam ON fm.credit_agreement_id = cam.credit_agreement_id
           JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
           WHERE fm.facility_id BETWEEN $1 AND $2`,
          [r.facStart, r.facEnd]
        );
        const fkCnt = Number(fkRes.rows[0]?.cnt ?? 0);
        const expectedFacs = r.facEnd - r.facStart + 1;
        if (fkCnt < expectedFacs) {
          ok = false;
          checks.push(`FK chain: ${fkCnt}/${expectedFacs} facilities have valid agreement+counterparty`);
        } else {
          checks.push(`FK chain: ${fkCnt} facilities OK`);
        }

        // Check 2: drawn ≤ committed
        const drawnRes = await client.query(
          `SELECT COUNT(*) AS cnt FROM l2.facility_exposure_snapshot fes
           WHERE fes.facility_id BETWEEN $1 AND $2 AND fes.drawn_amount > fes.committed_amount`,
          [r.facStart, r.facEnd]
        );
        const violations = Number(drawnRes.rows[0]?.cnt ?? 0);
        if (violations > 0) {
          ok = false;
          checks.push(`drawn ≤ committed: ${violations} violations`);
        } else {
          checks.push(`drawn ≤ committed: OK`);
        }

        // Check 3: exposure row count
        const expRes = await client.query(
          `SELECT COUNT(*) AS cnt FROM l2.facility_exposure_snapshot fes
           WHERE fes.facility_id BETWEEN $1 AND $2`,
          [r.facStart, r.facEnd]
        );
        const expCnt = Number(expRes.rows[0]?.cnt ?? 0);
        if (expCnt === 0) {
          ok = false;
          checks.push(`exposure rows: 0 (expected > 0)`);
        } else {
          checks.push(`exposure rows: ${expCnt}`);
        }

        results.push({ id: sid, ok, checks });
        const icon = ok ? '✓' : '✗';
        console.log(`${icon} ${sid}: ${checks.join(' | ')}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: sid, ok: false, checks: [], error: msg });
        console.log(`✗ ${sid}: ERROR ${msg}`);
      }
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    console.log(`\n--- Summary ---`);
    console.log(`Passed: ${passed}/${scenarioIds.length}`);
    if (failed.length > 0) {
      console.log(`Failed: ${failed.map((f) => f.id).join(', ')}`);
    }
    console.log('\nRun after: npm run db:load-gsib (includes 06-factory-scenarios.sql)');
    process.exit(failed.length > 0 ? 1 : 0);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

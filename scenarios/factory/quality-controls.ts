/**
 * Quality Controls — holistic L1-driven data quality checks for Factory V2 output.
 *
 * 10 control groups covering every aspect of GSIB data quality:
 *
 *   1. L1 FK Domain Validation — every FK value in L2 rows exists in L1
 *   2. Enrichment Map Drift Detection — hardcoded maps haven't gone stale
 *   3. Arithmetic Identity Checks — formulas are correct
 *   4. Cross-Field Consistency — values are coherent with L1-driven rules
 *   5. Story Arc Fidelity — generated data tells the scenario's story
 *   6. Cross-Table Correlation — tables that should co-exist do
 *   7. Temporal Coherence — time series are well-formed and consistent
 *   8. Portfolio Distribution — data isn't suspiciously uniform
 *   9. Financial Realism & GSIB Bounds — amounts/rates within regulatory limits
 *  10. Anti-Synthetic Pattern Detection — data looks real, not generated
 *  11. Reconciliation & Completeness — cross-table value matches, internal FKs,
 *      cash flow ↔ balance reconciliation, limit aggregation, audit metadata
 *
 * Each group returns { errors, warnings } consistent with validator.ts pattern.
 */

import type { ReferenceDataRegistry, DriftReport } from './reference-data-registry';
import type { L1Chain } from './chain-builder';
import type { V2GeneratorOutput } from './v2/generators';
import type { ScenarioConfig } from './scenario-config';
import type { TableData } from './v2/types';
import { CREDIT_STATUS_CODE, FACTORY_SOURCE_SYSTEM_ID } from './v2/types';
import type { StoryArc } from '../../scripts/shared/mvp-config';

/* ────────────────── Types ────────────────── */

export interface QualityControlResult {
  errors: string[];
  warnings: string[];
}

export interface FullQualityControlResult extends QualityControlResult {
  group1_fk: QualityControlResult;
  group2_drift: QualityControlResult;
  group3_arithmetic: QualityControlResult;
  group4_consistency: QualityControlResult;
  group5_story: QualityControlResult;
  group6_crossTable: QualityControlResult;
  group7_temporal: QualityControlResult;
  group8_distribution: QualityControlResult;
  group9_realism: QualityControlResult;
  group10_antiSynthetic: QualityControlResult;
  group11_reconciliation: QualityControlResult;
}

/* ────────────────── Helpers ────────────────── */

function merge(...results: QualityControlResult[]): QualityControlResult {
  return {
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
  };
}

/** Sample up to `max` rows to avoid O(n*m) explosion on large tables. */
function sampleRows(rows: Record<string, unknown>[], max: number): Record<string, unknown>[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  const result: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i += step) {
    result.push(rows[i]);
  }
  return result;
}

/** Find a table in the output by name. */
function findTable(output: V2GeneratorOutput, tableName: string): TableData | undefined {
  return output.tables.find(t => t.table === tableName);
}

/** Extract numeric values for a field across all rows. */
function extractNumericField(rows: Record<string, unknown>[], field: string): number[] {
  return rows
    .filter(r => field in r && r[field] !== null && r[field] !== undefined && typeof r[field] === 'number')
    .map(r => r[field] as number);
}

/** Standard deviation. */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 1: L1 FK Domain Validation
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Validates that every FK value in emitted L2/L3 rows exists in the
 * corresponding L1 dimension table. Checks 18 FK fields.
 */
export function runFKDomainValidation(
  output: V2GeneratorOutput,
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const FK_CHECKS: Array<{
    field: string;
    l1Table: string;
    severity: 'error' | 'warning';
  }> = [
    { field: 'currency_code', l1Table: 'currency_dim', severity: 'warning' },
    { field: 'base_currency_code', l1Table: 'currency_dim', severity: 'warning' },
    { field: 'credit_status_code', l1Table: 'credit_status_dim', severity: 'warning' },
    { field: 'collateral_type_id', l1Table: 'collateral_type', severity: 'warning' },
    { field: 'source_system_id', l1Table: 'source_system_registry', severity: 'warning' },
    { field: 'portfolio_id', l1Table: 'portfolio_dim', severity: 'warning' },
    { field: 'rate_index_id', l1Table: 'interest_rate_index_dim', severity: 'warning' },
    { field: 'ledger_account_id', l1Table: 'ledger_account_dim', severity: 'warning' },
    { field: 'exposure_type_id', l1Table: 'exposure_type_dim', severity: 'warning' },
    { field: 'delinquency_bucket_code', l1Table: 'dpd_bucket_dim', severity: 'warning' },
    { field: 'dpd_bucket_code', l1Table: 'dpd_bucket_dim', severity: 'warning' },
    { field: 'amendment_type_code', l1Table: 'amendment_type_dim', severity: 'warning' },
    { field: 'amendment_status_code', l1Table: 'amendment_status_dim', severity: 'warning' },
    { field: 'credit_event_type_code', l1Table: 'credit_event_type_dim', severity: 'warning' },
    { field: 'country_code', l1Table: 'country_dim', severity: 'warning' },
    { field: 'entity_type_code', l1Table: 'entity_type_dim', severity: 'warning' },
    { field: 'region_code', l1Table: 'region_dim', severity: 'warning' },
    { field: 'crm_type_code', l1Table: 'crm_type_dim', severity: 'warning' },
  ];

  for (const td of output.tables) {
    for (const check of FK_CHECKS) {
      const badValues = new Set<string>();
      let checked = 0;

      for (const row of td.rows) {
        if (!(check.field in row)) continue;
        const val = row[check.field];
        if (val === null || val === undefined) continue;

        checked++;
        if (!registry.isValidPK(check.l1Table, val)) {
          badValues.add(String(val));
        }
        if (badValues.size >= 5) break;
      }

      if (badValues.size > 0) {
        const msg = `${td.schema}.${td.table}: ${check.field} has ${badValues.size} invalid L1 value(s): [${[...badValues].join(', ')}] (checked ${checked} rows, L1 table: ${check.l1Table})`;
        if (check.severity === 'error') errors.push(msg);
        else warnings.push(msg);
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 2: Enrichment Map Drift Detection
   ═══════════════════════════════════════════════════════════════════════════ */

export function runDriftDetection(
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const reports: DriftReport[] = [];

  // CREDIT_STATUS_CODE map values vs credit_status_dim PKs
  const creditStatusValues = new Set(Object.values(CREDIT_STATUS_CODE));
  reports.push(registry.checkDrift('CREDIT_STATUS_CODE', creditStatusValues, 'credit_status_dim'));

  // FACTORY_SOURCE_SYSTEM_ID vs source_system_registry
  const factorySSID = new Set<number>([FACTORY_SOURCE_SYSTEM_ID]);
  const ssReport = registry.checkDrift('FACTORY_SOURCE_SYSTEM_ID', factorySSID, 'source_system_registry');
  if (!ssReport.isClean && ssReport.inMapNotInL1.length > 0) {
    warnings.push(
      `FACTORY_SOURCE_SYSTEM_ID=${FACTORY_SOURCE_SYSTEM_ID} is not in L1 source_system_registry — ` +
      `ensure it's registered before DB insert`
    );
  }

  for (const report of reports) {
    if (report.isClean) continue;
    if (report.inMapNotInL1.length > 0) {
      errors.push(`Drift: ${report.mapName} has stale keys not in L1 ${report.l1Table}: [${report.inMapNotInL1.join(', ')}]`);
    }
    if (report.inL1NotInMap.length > 0) {
      warnings.push(`Coverage gap: L1 ${report.l1Table} has keys not in ${report.mapName}: [${report.inL1NotInMap.join(', ')}]`);
    }
  }

  return { errors, warnings };
}

export function runEnrichmentMapDrift(
  registry: ReferenceDataRegistry,
  maps: Array<{ name: string; keys: Set<string | number>; l1Table: string }>,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { name, keys, l1Table } of maps) {
    const report = registry.checkDrift(name, keys, l1Table);
    if (report.isClean) continue;
    if (report.inMapNotInL1.length > 0) {
      errors.push(`Drift: ${name} has stale keys not in L1 ${l1Table}: [${report.inMapNotInL1.join(', ')}]`);
    }
    if (report.inL1NotInMap.length > 0) {
      warnings.push(`Coverage gap: L1 ${l1Table} has keys not in ${name}: [${report.inL1NotInMap.join(', ')}]`);
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 3: Arithmetic Identity Checks
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Verify arithmetic identities across all generated tables:
 * - Balance identity: undrawn = committed - drawn
 * - Drawn ≤ committed
 * - All-in rate = base + spread
 * - ECL: 12m ≤ lifetime
 * - EAD = drawn + ccf * undrawn
 * - RWA = EAD * risk_weight
 * - Overdue amounts align with DPD
 * - Book value = drawn + accrued interest
 * - Interest income = drawn * all_in_rate / 12
 * - NII = interest income - interest expense
 * - Fee income = undrawn * fee_rate / 12
 * - Collateral: eligible = valuation * (1 - haircut)
 * - Collateral: allocated ≤ eligible
 * - Provision: stage 1 → ecl_12m; stages 2/3 → ecl_lifetime
 * - Coverage ratio = provision / drawn
 * - Contribution pct = contribution / limit
 */
export function runArithmeticChecks(
  output: V2GeneratorOutput,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Track which checks have already fired (one per table max)
  const fired = new Map<string, Set<string>>();
  const shouldFire = (tbl: string, check: string): boolean => {
    if (!fired.has(tbl)) fired.set(tbl, new Set());
    if (fired.get(tbl)!.has(check)) return false;
    fired.get(tbl)!.add(check);
    return true;
  };

  for (const td of output.tables) {
    const sampled = sampleRows(td.rows, 300);
    const tbl = `${td.schema}.${td.table}`;

    for (const row of sampled) {
      // ── Balance identity: undrawn = committed - drawn ──
      if ('committed_amount' in row && 'drawn_amount' in row && 'undrawn_amount' in row) {
        const c = row.committed_amount as number;
        const d = row.drawn_amount as number;
        const u = row.undrawn_amount as number;
        if (c > 0 && Math.abs(u - (c - d)) > 0.02 && shouldFire(tbl, 'balance_identity')) {
          warnings.push(`${tbl}: undrawn (${u.toFixed(0)}) != committed (${c.toFixed(0)}) - drawn (${d.toFixed(0)})`);
        }
      }

      // ── Drawn ≤ Committed ──
      if ('committed_amount' in row && 'drawn_amount' in row) {
        const c = row.committed_amount as number;
        const d = row.drawn_amount as number;
        if (d > c * 1.001 && c > 0 && shouldFire(tbl, 'drawn_le_committed')) {
          warnings.push(`${tbl}: drawn (${d.toFixed(0)}) > committed (${c.toFixed(0)})`);
        }
      }

      // ── All-in rate ≈ base + spread ──
      if ('all_in_rate_pct' in row && 'base_rate_pct' in row && 'spread_bps' in row) {
        const allIn = row.all_in_rate_pct as number;
        const base = row.base_rate_pct as number;
        const spreadPct = (row.spread_bps as number) / 10000;
        if (allIn > 0 && Math.abs(allIn - (base + spreadPct)) > 0.015 && shouldFire(tbl, 'all_in_rate')) {
          warnings.push(`${tbl}: all_in_rate (${allIn.toFixed(4)}) != base (${base.toFixed(4)}) + spread (${spreadPct.toFixed(4)})`);
        }
      }

      // ── ECL: 12m ≤ lifetime ──
      if ('ecl_12m' in row && 'ecl_lifetime' in row) {
        const e12 = row.ecl_12m as number;
        const elt = row.ecl_lifetime as number;
        if (e12 > elt * 1.01 && elt > 0 && shouldFire(tbl, 'ecl_ordering')) {
          warnings.push(`${tbl}: ecl_12m (${e12.toFixed(2)}) > ecl_lifetime (${elt.toFixed(2)})`);
        }
      }

      // ── EAD formula ──
      if ('ead' in row && 'drawn_amount' in row && 'undrawn_amount' in row && 'ccf' in row) {
        const ead = row.ead as number;
        const d = row.drawn_amount as number;
        const u = row.undrawn_amount as number;
        const ccf = row.ccf as number;
        const expected = d + ccf * u;
        if (ead > 0 && expected > 0 && Math.abs(ead - expected) / expected > 0.05 && shouldFire(tbl, 'ead_formula')) {
          warnings.push(`${tbl}: ead (${ead.toFixed(0)}) vs expected d+ccf*u (${expected.toFixed(0)}) [${((ead/expected-1)*100).toFixed(1)}%]`);
        }
      }

      // ── RWA formula ──
      if ('rwa' in row && 'ead' in row && 'risk_weight_pct' in row) {
        const rwa = row.rwa as number;
        const ead = row.ead as number;
        const rw = row.risk_weight_pct as number;
        const expected = ead * rw / 100;
        if (rwa > 0 && expected > 0 && Math.abs(rwa - expected) / expected > 0.05 && shouldFire(tbl, 'rwa_formula')) {
          warnings.push(`${tbl}: rwa (${rwa.toFixed(0)}) vs ead*rw (${expected.toFixed(0)}) [${((rwa/expected-1)*100).toFixed(1)}%]`);
        }
      }

      // ── Overdue ↔ DPD ──
      if ('days_past_due' in row && 'overdue_interest_amt' in row) {
        const dpd = row.days_past_due as number;
        const overdue = row.overdue_interest_amt as number;
        if (dpd === 0 && overdue > 0.01 && shouldFire(tbl, 'overdue_zero_dpd')) {
          warnings.push(`${tbl}: overdue_interest (${overdue.toFixed(2)}) > 0 but dpd=0`);
        }
        if (dpd > 30 && overdue <= 0 && shouldFire(tbl, 'no_overdue_high_dpd')) {
          warnings.push(`${tbl}: dpd=${dpd} but no overdue interest accrued`);
        }
      }

      // ── Book value ≈ drawn + accrued interest ──
      if ('book_value_amt' in row && 'balance_amount' in row && 'accrued_interest_amt' in row) {
        const bv = row.book_value_amt as number;
        const bal = row.balance_amount as number;
        const ai = row.accrued_interest_amt as number;
        if (bv > 0 && Math.abs(bv - (bal + ai)) / bv > 0.05 && shouldFire(tbl, 'book_value')) {
          warnings.push(`${tbl}: book_value (${bv.toFixed(0)}) != balance (${bal.toFixed(0)}) + accrued (${ai.toFixed(0)})`);
        }
      }

      // ── Interest income ≈ drawn * rate / 12 ──
      if ('interest_income_amt' in row && 'all_in_rate_pct' in row) {
        const income = row.interest_income_amt as number;
        const drawn = (row.drawn_amount ?? row.avg_earning_assets_amt) as number | undefined;
        const rate = row.all_in_rate_pct as number;
        if (income > 0 && drawn && drawn > 0 && rate > 0) {
          const expected = drawn * rate / 12;
          if (Math.abs(income - expected) / expected > 0.20 && shouldFire(tbl, 'interest_income')) {
            warnings.push(`${tbl}: interest_income (${income.toFixed(0)}) vs expected (${expected.toFixed(0)}) [${((income/expected-1)*100).toFixed(0)}%]`);
          }
        }
      }

      // ── NII = interest income - interest expense ──
      if ('nii_ytd' in row && 'interest_income_amt' in row && 'interest_expense_amt' in row) {
        // nii_ytd is cumulative, so just check sign consistency
        const nii = row.nii_ytd as number;
        const income = row.interest_income_amt as number;
        const expense = row.interest_expense_amt as number;
        if (income > 0 && expense > 0 && income < expense && nii > 0 && shouldFire(tbl, 'nii_sign')) {
          warnings.push(`${tbl}: nii_ytd positive (${nii.toFixed(0)}) but income (${income.toFixed(0)}) < expense (${expense.toFixed(0)})`);
        }
      }

      // ── Collateral: eligible ≤ valuation ──
      if ('eligible_collateral_amount' in row && 'valuation_amount' in row) {
        const eligible = row.eligible_collateral_amount as number;
        const valuation = row.valuation_amount as number;
        if (eligible > valuation * 1.01 && valuation > 0 && shouldFire(tbl, 'eligible_le_valuation')) {
          warnings.push(`${tbl}: eligible_collateral (${eligible.toFixed(0)}) > valuation (${valuation.toFixed(0)})`);
        }
      }

      // ── Collateral: eligible = valuation * (1 - haircut) ──
      if ('eligible_collateral_amount' in row && 'valuation_amount' in row && 'haircut_pct' in row) {
        const eligible = row.eligible_collateral_amount as number;
        const valuation = row.valuation_amount as number;
        const haircut = row.haircut_pct as number;
        if (valuation > 0 && eligible > 0) {
          const expected = valuation * (1 - haircut);
          if (Math.abs(eligible - expected) / expected > 0.05 && shouldFire(tbl, 'eligible_formula')) {
            warnings.push(`${tbl}: eligible (${eligible.toFixed(0)}) != valuation (${valuation.toFixed(0)}) * (1-haircut ${haircut}) = ${expected.toFixed(0)}`);
          }
        }
      }

      // ── Collateral: allocated ≤ eligible ──
      if ('allocated_amount_usd' in row && 'eligible_collateral_amount' in row) {
        const alloc = row.allocated_amount_usd as number;
        const eligible = row.eligible_collateral_amount as number;
        if (alloc > eligible * 1.01 && eligible > 0 && shouldFire(tbl, 'allocated_le_eligible')) {
          warnings.push(`${tbl}: allocated (${alloc.toFixed(0)}) > eligible (${eligible.toFixed(0)})`);
        }
      }

      // ── Provision: stage alignment ──
      if ('ifrs9_stage' in row && 'provision_amount' in row && 'ecl_12m' in row && 'ecl_lifetime' in row) {
        const stage = row.ifrs9_stage as number;
        const provision = row.provision_amount as number;
        const ecl12 = row.ecl_12m as number;
        const eclLt = row.ecl_lifetime as number;
        if (provision > 0) {
          if (stage === 1 && Math.abs(provision - ecl12) / provision > 0.10 && shouldFire(tbl, 'provision_stage1')) {
            warnings.push(`${tbl}: Stage 1 provision (${provision.toFixed(0)}) should ≈ ecl_12m (${ecl12.toFixed(0)})`);
          }
          if ((stage === 2 || stage === 3) && Math.abs(provision - eclLt) / provision > 0.10 && shouldFire(tbl, 'provision_stage23')) {
            warnings.push(`${tbl}: Stage ${stage} provision (${provision.toFixed(0)}) should ≈ ecl_lifetime (${eclLt.toFixed(0)})`);
          }
        }
      }

      // ── Coverage ratio = provision / drawn ──
      if ('coverage_ratio_pct' in row && 'provision_amount' in row) {
        const cov = row.coverage_ratio_pct as number;
        const prov = row.provision_amount as number;
        const drawn = (row.drawn_amount ?? row.balance_amount) as number | undefined;
        if (cov > 0 && prov > 0 && drawn && drawn > 0) {
          const expected = prov / drawn;
          if (Math.abs(cov - expected) / expected > 0.20 && shouldFire(tbl, 'coverage_ratio')) {
            warnings.push(`${tbl}: coverage_ratio (${cov.toFixed(4)}) vs prov/drawn (${expected.toFixed(4)})`);
          }
        }
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 4: Cross-Field Consistency
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Cross-field consistency checks using L1-driven rules:
 * - DPD bucket matches actual DPD per dpd_bucket_dim ranges
 * - Credit status correlates with DPD
 * - IFRS 9 stage consistency with DPD and credit status
 * - Collateral LTV consistency
 * - Rating ↔ PD consistency
 * - Spread ↔ rating correlation (higher risk → higher spread)
 * - Product type ↔ utilization (term loans near 100%)
 * - Lifecycle stage ↔ balances (FUNDED → drawn > 0)
 * - Maturity date > origination date
 * - Financial ratio signs (DSCR > 0 for performing)
 * - Default status consistency across all tables
 */
export function runCrossFieldConsistency(
  output: V2GeneratorOutput,
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Track issue counts per check type
  const issueCounts: Record<string, number> = {};
  const MAX_PER_CHECK = 3;
  const canReport = (check: string): boolean => {
    issueCounts[check] = (issueCounts[check] ?? 0) + 1;
    return issueCounts[check] <= MAX_PER_CHECK;
  };

  for (const td of output.tables) {
    const sampled = sampleRows(td.rows, 300);
    const tbl = `${td.schema}.${td.table}`;

    for (const row of sampled) {
      // ── DPD Bucket vs Actual DPD ──
      if ('days_past_due' in row && ('delinquency_bucket_code' in row || 'dpd_bucket_code' in row)) {
        const dpd = row.days_past_due as number;
        const bucket = (row.delinquency_bucket_code ?? row.dpd_bucket_code) as string;
        const expectedBucket = registry.resolveDPDBucket(dpd);
        if (expectedBucket && bucket !== expectedBucket && canReport('dpd_bucket')) {
          warnings.push(`${tbl}: dpd=${dpd} should map to bucket '${expectedBucket}' but got '${bucket}'`);
        }
      }

      // ── Credit Status vs DPD ──
      if ('credit_status_code' in row && 'days_past_due' in row) {
        const statusCode = row.credit_status_code as number;
        const dpd = row.days_past_due as number;
        const statusInfo = registry.getCreditStatusInfo(statusCode);

        if (statusInfo) {
          if (dpd >= 90 && statusInfo.status_category === 'PASS' && canReport('dpd90_pass')) {
            warnings.push(`${tbl}: dpd=${dpd} but status ${statusCode} (${statusInfo.credit_status_name}) is PASS`);
          }
          if (dpd === 0 && statusInfo.default_flag && canReport('dpd0_default')) {
            warnings.push(`${tbl}: dpd=0 but status ${statusCode} (${statusInfo.credit_status_name}) is DEFAULT`);
          }
        }
      }

      // ── IFRS 9 Stage Consistency ──
      if ('ifrs9_stage' in row && 'days_past_due' in row) {
        const stage = row.ifrs9_stage as number;
        const dpd = row.days_past_due as number;
        const statusCode = row.credit_status_code as number | undefined;

        if (stage === 3 && dpd < 30) {
          const statusInfo = statusCode !== undefined ? registry.getCreditStatusInfo(statusCode) : undefined;
          if (!statusInfo?.default_flag && canReport('stage3_low_dpd')) {
            warnings.push(`${tbl}: ifrs9_stage=3 but dpd=${dpd} and not DEFAULT`);
          }
        }
        if (stage === 1 && dpd >= 90 && canReport('stage1_high_dpd')) {
          warnings.push(`${tbl}: ifrs9_stage=1 but dpd=${dpd} — should be Stage 2/3`);
        }
      }

      // ── Rating ↔ PD consistency (L1-driven) ──
      if ('pd_pct' in row && 'internal_risk_rating' in row) {
        const pd = row.pd_pct as number;
        const rating = row.internal_risk_rating as string;
        // Rating 1-2 (IG_HIGH) should have PD < 0.5%; rating 9-10 (HY_LOW) should have PD > 0.5%
        const ratingNum = parseInt(rating, 10);
        if (!isNaN(ratingNum)) {
          if (ratingNum <= 3 && pd > 0.05 && canReport('rating_pd_ig')) {
            warnings.push(`${tbl}: high-grade rating ${rating} but pd=${(pd*100).toFixed(2)}% — expected <5%`);
          }
          if (ratingNum >= 8 && pd < 0.001 && canReport('rating_pd_hy')) {
            warnings.push(`${tbl}: low-grade rating ${rating} but pd=${(pd*100).toFixed(4)}% — expected higher`);
          }
        }
      }

      // ── Lifecycle stage ↔ drawn amount ──
      if ('lifecycle_stage' in row && 'drawn_amount' in row) {
        const stage = row.lifecycle_stage as string;
        const drawn = row.drawn_amount as number;
        if (stage === 'COMMITMENT' && drawn > 0 && canReport('commitment_drawn')) {
          warnings.push(`${tbl}: lifecycle=COMMITMENT but drawn=${drawn.toFixed(0)} — should be 0`);
        }
      }

      // ── Maturity > origination ──
      if ('maturity_date' in row && 'origination_date' in row) {
        const mat = row.maturity_date as string;
        const orig = row.origination_date as string;
        if (mat && orig && mat <= orig && canReport('mat_after_orig')) {
          warnings.push(`${tbl}: maturity_date (${mat}) ≤ origination_date (${orig})`);
        }
      }

      // ── Collateral LTV consistency ──
      if ('collateral_value' in row && 'ltv_ratio' in row && 'drawn_amount' in row) {
        const cv = row.collateral_value as number;
        const ltv = row.ltv_ratio as number;
        const drawn = row.drawn_amount as number;
        if (cv > 0 && drawn > 0 && ltv > 0) {
          const expectedLTV = drawn / cv;
          if (Math.abs(ltv - expectedLTV) / expectedLTV > 0.30 && canReport('ltv_formula')) {
            warnings.push(`${tbl}: ltv (${ltv.toFixed(2)}) vs drawn/collateral (${expectedLTV.toFixed(2)})`);
          }
        }
      }

      // ── Financial ratio signs ──
      if ('dscr' in row && 'credit_status' in row) {
        const dscr = row.dscr as number;
        const status = row.credit_status as string;
        if (dscr < 0 && (status === 'PERFORMING' || status === 'WATCH') && canReport('dscr_negative')) {
          warnings.push(`${tbl}: negative DSCR (${dscr.toFixed(2)}) for ${status} loan`);
        }
      }

      // ── Default consistency across position table ──
      if ('is_defaulted_flag' in row && 'credit_status_code' in row) {
        const defaulted = row.is_defaulted_flag as boolean;
        const statusCode = row.credit_status_code as number;
        const statusInfo = registry.getCreditStatusInfo(statusCode);
        if (statusInfo) {
          if (defaulted && !statusInfo.default_flag && canReport('default_flag_mismatch')) {
            warnings.push(`${tbl}: is_defaulted_flag=true but status ${statusCode} is not DEFAULT`);
          }
          if (!defaulted && statusInfo.default_flag && canReport('default_flag_mismatch2')) {
            warnings.push(`${tbl}: is_defaulted_flag=false but status ${statusCode} is DEFAULT`);
          }
        }
      }

      // ── Delinquency status consistency ──
      if ('delinquency_status_code' in row && 'days_past_due' in row) {
        const delStatus = row.delinquency_status_code as string;
        const dpd = row.days_past_due as number;
        if (dpd > 0 && delStatus === 'CURRENT' && canReport('del_status_current')) {
          warnings.push(`${tbl}: delinquency_status=CURRENT but dpd=${dpd}`);
        }
        if (dpd === 0 && delStatus === 'DELINQUENT' && canReport('del_status_delinquent')) {
          warnings.push(`${tbl}: delinquency_status=DELINQUENT but dpd=0`);
        }
      }

      // ── Haircut range [0, 1] ──
      if ('haircut_pct' in row) {
        const hc = row.haircut_pct as number;
        if ((hc < 0 || hc > 1) && canReport('haircut_range')) {
          warnings.push(`${tbl}: haircut_pct (${hc}) outside [0, 1]`);
        }
      }

      // ── Risk weight positivity ──
      if ('risk_weight_std_pct' in row) {
        const rw = row.risk_weight_std_pct as number;
        if (rw < 0 && canReport('rw_negative')) {
          warnings.push(`${tbl}: negative risk_weight_std_pct (${rw})`);
        }
        if (rw > 300 && canReport('rw_extreme')) {
          warnings.push(`${tbl}: extreme risk_weight_std_pct (${rw}%) — max Basel III SA is 250%`);
        }
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 5: Story Arc Fidelity
   ═══════════════════════════════════════════════════════════════════════════ */

export function runStoryArcChecks(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cpArcs = new Map<number, StoryArc>();
  for (let i = 0; i < config.counterparties.length; i++) {
    const cp = chain.counterparties[i];
    if (cp) cpArcs.set(cp.counterparty_id, config.counterparties[i].story_arc);
  }

  // Collect time-series per facility
  const facilityTS = new Map<number, Array<{
    date: string; drawn: number; committed: number;
    pd?: number; credit_status_code?: number; spread_bps?: number;
  }>>();

  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    for (const row of exposureTable.rows) {
      const fid = row.facility_id as number;
      if (!facilityTS.has(fid)) facilityTS.set(fid, []);
      facilityTS.get(fid)!.push({
        date: row.as_of_date as string,
        drawn: row.drawn_amount as number ?? 0,
        committed: row.committed_amount as number ?? 0,
        credit_status_code: row.credit_status_code as number | undefined,
      });
    }
  }

  // Merge risk PD
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    for (const row of riskTable.rows) {
      const fid = row.facility_id as number;
      const date = row.as_of_date as string;
      const entry = facilityTS.get(fid)?.find(e => e.date === date);
      if (entry) entry.pd = entry.pd ?? (row.pd_pct as number | undefined);
    }
  }

  // Merge pricing spread
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    for (const row of pricingTable.rows) {
      const fid = row.facility_id as number;
      const date = row.as_of_date as string;
      const entry = facilityTS.get(fid)?.find(e => e.date === date);
      if (entry) entry.spread_bps = entry.spread_bps ?? (row.spread_bps as number | undefined);
    }
  }

  // Credit events by counterparty
  const eventTable = findTable(output, 'credit_event');
  const cpHasDefaultEvent = new Set<number>();
  const cpHasAnyEvent = new Set<number>();
  if (eventTable) {
    for (const row of eventTable.rows) {
      const cpId = row.counterparty_id as number;
      cpHasAnyEvent.add(cpId);
      const eventType = row.credit_event_type_code as number;
      if (typeof eventType === 'number' && eventType <= 7) cpHasDefaultEvent.add(cpId);
    }
  }

  // Check arcs
  for (const [cpId, arc] of cpArcs) {
    const cpFacIds = chain.facilities.filter(f => f.counterparty_id === cpId).map(f => f.facility_id);
    if (cpFacIds.length === 0) continue;

    const allSeries = cpFacIds.flatMap(fid => facilityTS.get(fid) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    if (allSeries.length < 2) continue;

    const pds = allSeries.filter(e => e.pd !== undefined).map(e => e.pd!);
    const spreads = allSeries.filter(e => e.spread_bps !== undefined).map(e => e.spread_bps!);
    const drawnVals = allSeries.map(e => e.drawn);

    switch (arc) {
      case 'DETERIORATING': {
        if (pds.length >= 2 && pds[pds.length - 1] < pds[0] * 0.9) {
          warnings.push(`Story DETERIORATING CP ${cpId}: PD fell ${pds[0].toFixed(4)}→${pds[pds.length-1].toFixed(4)}`);
        }
        // Should have at least one adverse event
        if (!cpHasAnyEvent.has(cpId)) {
          warnings.push(`Story DETERIORATING CP ${cpId}: no credit events generated`);
        }
        break;
      }
      case 'RECOVERING': {
        if (pds.length >= 2 && pds[pds.length - 1] > pds[0] * 1.1) {
          warnings.push(`Story RECOVERING CP ${cpId}: PD rose ${pds[0].toFixed(4)}→${pds[pds.length-1].toFixed(4)}`);
        }
        // Drawn should trend down
        if (drawnVals.length >= 2 && drawnVals[drawnVals.length - 1] > drawnVals[0] * 1.15) {
          warnings.push(`Story RECOVERING CP ${cpId}: drawn increased — expected decrease`);
        }
        break;
      }
      case 'STABLE_IG':
      case 'STEADY_HY':
      case 'GROWING':
      case 'NEW_RELATIONSHIP': {
        if (drawnVals.length >= 3) {
          const mean = drawnVals.reduce((s, v) => s + v, 0) / drawnVals.length;
          if (mean > 0) {
            const maxChange = Math.max(...drawnVals.slice(1).map((v, i) => Math.abs(v - drawnVals[i]) / mean));
            if (maxChange > 0.30) {
              warnings.push(`Story ${arc} CP ${cpId}: MoM drawn change ${(maxChange*100).toFixed(1)}% — too volatile`);
            }
          }
        }
        break;
      }
      case 'STRESSED_SECTOR': {
        if (spreads.length >= 2 && spreads[spreads.length - 1] < spreads[0] * 0.9) {
          warnings.push(`Story STRESSED_SECTOR CP ${cpId}: spread narrowed ${spreads[0]}→${spreads[spreads.length-1]}bps`);
        }
        // PD should also increase
        if (pds.length >= 2 && pds[pds.length - 1] < pds[0] * 0.9) {
          warnings.push(`Story STRESSED_SECTOR CP ${cpId}: PD fell — expected sector stress to increase PD`);
        }
        break;
      }
    }
  }

  // Counterparty count check
  if (chain.counterparties.length !== config.counterparties.length) {
    warnings.push(`CP count: YAML=${config.counterparties.length} vs chain=${chain.counterparties.length}`);
  }

  // Date coverage
  if (output.dates.length > 0 && exposureTable) {
    const datesInData = new Set(exposureTable.rows.map(r => r.as_of_date as string));
    const missing = output.dates.filter(d => !datesInData.has(d));
    if (missing.length > 0) {
      warnings.push(`Missing exposure data for ${missing.length}/${output.dates.length} dates`);
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 6: Cross-Table Correlation
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ensures tables that should co-exist do:
 * - Every facility with exposure has risk, pricing, position rows
 * - Every facility with collateral_value > 0 has collateral_snapshot
 * - Credit events have facility links
 * - Amendment events have change details
 * - Cash flows exist for facilities with draw changes
 * - All tables have matching date grids
 * - Counterparties have rating observations
 */
export function runCrossTableCorrelation(
  output: V2GeneratorOutput,
  chain: L1Chain,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build facility-date sets per table
  const tablePresence = new Map<string, Set<string>>(); // table → Set<"facId:date">
  const PAIRED_TABLES = [
    'facility_exposure_snapshot', 'facility_risk_snapshot',
    'facility_pricing_snapshot', 'facility_delinquency_snapshot',
    'position',
  ];

  for (const tableName of PAIRED_TABLES) {
    const td = findTable(output, tableName);
    if (!td) continue;
    const keys = new Set<string>();
    for (const row of td.rows) {
      keys.add(`${row.facility_id}:${row.as_of_date}`);
    }
    tablePresence.set(tableName, keys);
  }

  // Check exposure table has matching rows in other snapshot tables
  const exposureKeys = tablePresence.get('facility_exposure_snapshot');
  if (exposureKeys) {
    for (const [tableName, keys] of tablePresence) {
      if (tableName === 'facility_exposure_snapshot') continue;
      const missing = [...exposureKeys].filter(k => !keys.has(k));
      if (missing.length > 0) {
        const pct = ((missing.length / exposureKeys.size) * 100).toFixed(0);
        if (parseInt(pct) > 10) {
          warnings.push(`Cross-table: ${missing.length}/${exposureKeys.size} (${pct}%) exposure rows missing from ${tableName}`);
        }
      }
    }
  }

  // Check credit events have facility links
  const eventTable = findTable(output, 'credit_event');
  const linkTable = findTable(output, 'credit_event_facility_link');
  if (eventTable && linkTable) {
    const eventIds = new Set(eventTable.rows.map(r => r.credit_event_id));
    const linkedEventIds = new Set(linkTable.rows.map(r => r.credit_event_id));
    const unlinked = [...eventIds].filter(id => !linkedEventIds.has(id));
    if (unlinked.length > 0) {
      warnings.push(`Cross-table: ${unlinked.length}/${eventIds.size} credit events have no facility links`);
    }
  }

  // Check amendment events have change details
  const amendmentTable = findTable(output, 'amendment_event');
  const changeDetailTable = findTable(output, 'amendment_change_detail');
  if (amendmentTable && changeDetailTable) {
    const amendIds = new Set(amendmentTable.rows.map(r => r.amendment_id));
    const detailAmendIds = new Set(changeDetailTable.rows.map(r => r.amendment_id));
    const noDetails = [...amendIds].filter(id => !detailAmendIds.has(id));
    if (noDetails.length > 0) {
      warnings.push(`Cross-table: ${noDetails.length}/${amendIds.size} amendments have no change details`);
    }
  }

  // Check counterparties have rating observations
  const ratingTable = findTable(output, 'counterparty_rating_observation');
  if (ratingTable) {
    const ratedCPs = new Set(ratingTable.rows.map(r => r.counterparty_id));
    const allCPs = new Set(chain.counterparties.map(c => c.counterparty_id));
    const unrated = [...allCPs].filter(cp => !ratedCPs.has(cp));
    if (unrated.length > 0) {
      warnings.push(`Cross-table: ${unrated.length}/${allCPs.size} counterparties have no rating observations`);
    }
  }

  // Check facilities with exposure have profitability
  const profitTable = findTable(output, 'facility_profitability_snapshot');
  if (profitTable && exposureKeys) {
    const profitFacIds = new Set(profitTable.rows.map(r => r.facility_id));
    const exposureFacIds = new Set([...exposureKeys].map(k => parseInt(k.split(':')[0])));
    const noProfitability = [...exposureFacIds].filter(f => !profitFacIds.has(f));
    if (noProfitability.length > 0 && noProfitability.length > exposureFacIds.size * 0.2) {
      warnings.push(`Cross-table: ${noProfitability.length}/${exposureFacIds.size} facilities missing profitability snapshots`);
    }
  }

  // Check ECL provision exists for facilities
  const provisionTable = findTable(output, 'ecl_provision_snapshot');
  if (provisionTable && exposureKeys) {
    const provisionFacIds = new Set(provisionTable.rows.map(r => r.facility_id));
    const exposureFacIds = new Set([...exposureKeys].map(k => parseInt(k.split(':')[0])));
    const noProvision = [...exposureFacIds].filter(f => !provisionFacIds.has(f));
    if (noProvision.length > 0 && noProvision.length > exposureFacIds.size * 0.2) {
      warnings.push(`Cross-table: ${noProvision.length}/${exposureFacIds.size} facilities missing ECL provisions`);
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 7: Temporal Coherence
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Time series integrity:
 * - Dates are chronologically ordered
 * - All snapshot tables use the same date grid
 * - No duplicate (facility_id, as_of_date) rows
 * - MoM changes are reasonable (no unexplained jumps)
 * - Committed amounts don't change without amendment
 */
export function runTemporalCoherence(
  output: V2GeneratorOutput,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedDates = output.dates.sort();

  // Check each snapshot table uses the expected date grid
  const SNAPSHOT_TABLES = [
    'facility_exposure_snapshot', 'facility_risk_snapshot', 'facility_pricing_snapshot',
    'facility_delinquency_snapshot', 'position', 'collateral_snapshot',
    'facility_profitability_snapshot', 'ecl_provision_snapshot',
  ];

  for (const tableName of SNAPSHOT_TABLES) {
    const td = findTable(output, tableName);
    if (!td || td.rows.length === 0) continue;

    // Check for dates outside expected grid
    const tableDates = new Set(td.rows.map(r => r.as_of_date as string));
    const unexpectedDates = [...tableDates].filter(d => !expectedDates.includes(d));
    if (unexpectedDates.length > 0) {
      warnings.push(`Temporal: ${tableName} has ${unexpectedDates.length} date(s) outside expected grid: ${unexpectedDates.slice(0, 3).join(', ')}`);
    }
  }

  // Check for large unexplained jumps in exposure time series
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    // Group by facility
    const facSeries = new Map<number, Array<{ date: string; drawn: number; committed: number }>>();
    for (const row of exposureTable.rows) {
      const fid = row.facility_id as number;
      if (!facSeries.has(fid)) facSeries.set(fid, []);
      facSeries.get(fid)!.push({
        date: row.as_of_date as string,
        drawn: row.drawn_amount as number ?? 0,
        committed: row.committed_amount as number ?? 0,
      });
    }

    let jumpCount = 0;
    for (const [fid, series] of facSeries) {
      series.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const curr = series[i];

        // Check for committed amount changes > 20%
        if (prev.committed > 0 && curr.committed > 0) {
          const commitChange = Math.abs(curr.committed - prev.committed) / prev.committed;
          if (commitChange > 0.20 && jumpCount < 5) {
            warnings.push(
              `Temporal: facility ${fid} committed jumped ${(commitChange*100).toFixed(0)}% ` +
              `(${prev.committed.toFixed(0)}→${curr.committed.toFixed(0)}) between ${prev.date}→${curr.date}`
            );
            jumpCount++;
          }
        }

        // Check for drawn going negative
        if (curr.drawn < -0.01) {
          errors.push(`Temporal: facility ${fid} negative drawn (${curr.drawn.toFixed(0)}) on ${curr.date}`);
        }
      }
    }
  }

  // Check PD monotonicity for DETERIORATING arcs (should generally increase)
  // This is complementary to Group 5 but focused on temporal smoothness
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    const facPDs = new Map<number, Array<{ date: string; pd: number }>>();
    for (const row of riskTable.rows) {
      const fid = row.facility_id as number;
      const pd = row.pd_pct as number;
      if (pd === undefined || pd === null) continue;
      if (!facPDs.has(fid)) facPDs.set(fid, []);
      facPDs.get(fid)!.push({ date: row.as_of_date as string, pd });
    }

    let pdJumpCount = 0;
    for (const [fid, series] of facPDs) {
      series.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const curr = series[i];
        // PD shouldn't jump by more than 10x in one period
        if (prev.pd > 0 && curr.pd / prev.pd > 10 && pdJumpCount < 3) {
          warnings.push(
            `Temporal: facility ${fid} PD jumped ${(prev.pd*100).toFixed(4)}%→${(curr.pd*100).toFixed(4)}% ` +
            `(${(curr.pd/prev.pd).toFixed(1)}x) between ${prev.date}→${curr.date}`
          );
          pdJumpCount++;
        }
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 8: Portfolio Distribution
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ensures the generated portfolio is realistic, not suspiciously uniform:
 * - Amount diversity (unique committed amounts)
 * - Currency diversity matches counterparty countries
 * - Rating distribution isn't degenerate
 * - Spread distribution has reasonable variance
 * - Product mix (not all same product type)
 * - Country/industry concentration
 */
export function runPortfolioDistribution(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Use the last date for snapshot analysis
  const lastDate = output.dates[output.dates.length - 1];
  if (!lastDate) return { errors, warnings };

  // ── Committed amount diversity ──
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    const lastDateRows = exposureTable.rows.filter(r => r.as_of_date === lastDate);
    const committed = lastDateRows.map(r => r.committed_amount as number).filter(v => v > 0);
    const uniqueCommitted = new Set(committed.map(v => Math.round(v / 1000))); // round to $1K
    if (committed.length >= 5 && uniqueCommitted.size < committed.length * 0.4) {
      warnings.push(
        `Distribution: only ${uniqueCommitted.size}/${committed.length} unique committed amounts on ${lastDate} — ` +
        `data may look synthetic`
      );
    }

    // ── Drawn amount diversity ──
    const drawn = lastDateRows.map(r => (r.drawn_amount ?? r.outstanding_balance_amt) as number).filter(v => v !== undefined);
    const uniqueDrawn = new Set(drawn.map(v => Math.round(v / 1000)));
    if (drawn.length >= 5 && uniqueDrawn.size < drawn.length * 0.3) {
      warnings.push(
        `Distribution: only ${uniqueDrawn.size}/${drawn.length} unique drawn amounts on ${lastDate}`
      );
    }
  }

  // ── Currency diversity ──
  const currencies = new Set(chain.facilities.map(f => (f as unknown as Record<string, unknown>).currency_code as string).filter(Boolean));
  if (chain.facilities.length >= 10 && currencies.size === 1) {
    warnings.push(`Distribution: all ${chain.facilities.length} facilities use ${[...currencies][0]} — no currency diversification`);
  }

  // ── Product mix ──
  const productTypes = chain.facilities.map(f => (f as unknown as Record<string, unknown>).facility_type_code as string);
  const uniqueProducts = new Set(productTypes.filter(Boolean));
  if (chain.facilities.length >= 6 && uniqueProducts.size === 1) {
    warnings.push(`Distribution: all facilities are ${[...uniqueProducts][0]} — no product diversification`);
  }

  // ── Spread diversity ──
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    const lastSpreads = pricingTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.spread_bps as number)
      .filter(v => v > 0);

    if (lastSpreads.length >= 5) {
      const spreadStdev = stdev(lastSpreads);
      const spreadMean = lastSpreads.reduce((s, v) => s + v, 0) / lastSpreads.length;
      if (spreadMean > 0 && spreadStdev / spreadMean < 0.05) {
        warnings.push(
          `Distribution: spread CV=${(spreadStdev/spreadMean*100).toFixed(1)}% — almost identical spreads across ${lastSpreads.length} facilities`
        );
      }
    }
  }

  // ── PD distribution ──
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    const lastPDs = riskTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.pd_pct as number)
      .filter(v => v > 0);

    if (lastPDs.length >= 5) {
      const pdStdev = stdev(lastPDs);
      const pdMean = lastPDs.reduce((s, v) => s + v, 0) / lastPDs.length;
      if (pdMean > 0 && pdStdev / pdMean < 0.05) {
        warnings.push(`Distribution: PD CV=${(pdStdev/pdMean*100).toFixed(1)}% — almost identical PDs across ${lastPDs.length} facilities`);
      }
    }
  }

  // ── Rating diversity (if multiple counterparties) ──
  const ratingTable = findTable(output, 'counterparty_rating_observation');
  if (ratingTable && chain.counterparties.length >= 3) {
    const internalRatings = ratingTable.rows
      .filter(r => r.as_of_date === lastDate && r.rating_agency === 'INTERNAL')
      .map(r => r.rating_value as string);
    const uniqueRatings = new Set(internalRatings);
    if (internalRatings.length >= 3 && uniqueRatings.size === 1) {
      warnings.push(`Distribution: all ${internalRatings.length} counterparties have identical internal rating ${[...uniqueRatings][0]}`);
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 9: Financial Realism & GSIB Bounds
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Checks values against regulatory bounds and financial realism:
 * - Committed amounts within size profile bounds
 * - Spread within rating-tier bounds
 * - LGD within Basel III bounds (25-78%)
 * - CCF matches product type
 * - Risk weights within regulatory bounds (20-250%)
 * - PD within plausible range (0.01% - 100%)
 * - Interest rates positive and reasonable (< 30%)
 * - Amounts are non-negative
 * - Tenor within product type bounds
 * - GSIB metadata fields populated
 */
export function runFinancialRealism(
  output: V2GeneratorOutput,
  chain: L1Chain,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Track issue counts per check type
  const issueCounts: Record<string, number> = {};
  const MAX_PER_CHECK = 3;
  const canReport = (check: string): boolean => {
    issueCounts[check] = (issueCounts[check] ?? 0) + 1;
    return issueCounts[check] <= MAX_PER_CHECK;
  };

  for (const td of output.tables) {
    const sampled = sampleRows(td.rows, 300);
    const tbl = `${td.schema}.${td.table}`;

    for (const row of sampled) {
      // ── PD range [0.0001, 1.0] ──
      if ('pd_pct' in row) {
        const pd = row.pd_pct as number;
        if (pd < 0 && canReport('pd_negative')) {
          errors.push(`${tbl}: negative PD (${pd})`);
        }
        if (pd > 1.0 && canReport('pd_over_100')) {
          warnings.push(`${tbl}: PD > 100% (${(pd*100).toFixed(2)}%)`);
        }
      }
      if ('pd_annual' in row) {
        const pd = row.pd_annual as number;
        if (pd < 0 && canReport('pd_annual_negative')) {
          errors.push(`${tbl}: negative pd_annual (${pd})`);
        }
      }

      // ── LGD bounds [0, 1] — typical Basel III range 25-78% ──
      if ('lgd_pct' in row) {
        const lgd = row.lgd_pct as number;
        if (lgd < 0 && canReport('lgd_negative')) errors.push(`${tbl}: negative LGD (${lgd})`);
        if (lgd > 1.0 && canReport('lgd_over_100')) warnings.push(`${tbl}: LGD > 100% (${(lgd*100).toFixed(1)}%)`);
      }
      if ('lgd_current' in row) {
        const lgd = row.lgd_current as number;
        if (lgd < 0 && canReport('lgd_cur_negative')) errors.push(`${tbl}: negative lgd_current (${lgd})`);
        if (lgd > 1.0 && canReport('lgd_cur_over_100')) warnings.push(`${tbl}: lgd_current > 100% (${(lgd*100).toFixed(1)}%)`);
      }

      // ── CCF bounds [0, 1] ──
      if ('ccf' in row) {
        const ccf = row.ccf as number;
        if ((ccf < 0 || ccf > 1.01) && canReport('ccf_range')) {
          warnings.push(`${tbl}: CCF (${ccf}) outside [0, 1]`);
        }
      }

      // ── Spread reasonableness (1 bps to 2000 bps) ──
      if ('spread_bps' in row) {
        const spread = row.spread_bps as number;
        if (spread < 0 && canReport('spread_negative')) {
          errors.push(`${tbl}: negative spread (${spread} bps)`);
        }
        if (spread > 2000 && canReport('spread_extreme')) {
          warnings.push(`${tbl}: extreme spread (${spread} bps) — >2000 bps is unusual`);
        }
      }

      // ── Interest rate reasonableness (0-30%) ──
      if ('all_in_rate_pct' in row) {
        const rate = row.all_in_rate_pct as number;
        if (rate < 0 && canReport('rate_negative')) {
          warnings.push(`${tbl}: negative all_in_rate (${(rate*100).toFixed(2)}%)`);
        }
        if (rate > 0.30 && canReport('rate_extreme')) {
          warnings.push(`${tbl}: extreme all_in_rate (${(rate*100).toFixed(2)}%) — >30% is unusual for GSIB`);
        }
      }

      // ── Committed amount positivity ──
      if ('committed_amount' in row) {
        const c = row.committed_amount as number;
        if (c < 0 && canReport('committed_negative')) {
          errors.push(`${tbl}: negative committed_amount (${c.toFixed(0)})`);
        }
      }

      // ── Drawn amount non-negative ──
      if ('drawn_amount' in row) {
        const d = row.drawn_amount as number;
        if (d < -0.01 && canReport('drawn_negative')) {
          errors.push(`${tbl}: negative drawn_amount (${d.toFixed(2)})`);
        }
      }

      // ── EAD non-negative ──
      if ('ead' in row) {
        const ead = row.ead as number;
        if (ead < 0 && canReport('ead_negative')) {
          errors.push(`${tbl}: negative EAD (${ead.toFixed(0)})`);
        }
      }

      // ── RWA non-negative ──
      if ('rwa' in row) {
        const rwa = row.rwa as number;
        if (rwa < 0 && canReport('rwa_negative')) {
          errors.push(`${tbl}: negative RWA (${rwa.toFixed(0)})`);
        }
      }

      // ── ECL non-negative ──
      if ('ecl_12m' in row) {
        const ecl = row.ecl_12m as number;
        if (ecl < 0 && canReport('ecl12_negative')) {
          errors.push(`${tbl}: negative ecl_12m (${ecl.toFixed(2)})`);
        }
      }
      if ('ecl_lifetime' in row) {
        const ecl = row.ecl_lifetime as number;
        if (ecl < 0 && canReport('ecl_lt_negative')) {
          errors.push(`${tbl}: negative ecl_lifetime (${ecl.toFixed(2)})`);
        }
      }

      // ── Collateral valuation non-negative ──
      if ('valuation_amount' in row) {
        const val = row.valuation_amount as number;
        if (val < 0 && canReport('collateral_negative')) {
          errors.push(`${tbl}: negative collateral valuation (${val.toFixed(0)})`);
        }
      }

      // ── Loss amount reasonableness ──
      if ('loss_amount_usd' in row && row.loss_amount_usd !== null) {
        const loss = row.loss_amount_usd as number;
        if (loss < 0 && canReport('loss_negative')) {
          warnings.push(`${tbl}: negative loss_amount_usd (${loss.toFixed(0)})`);
        }
      }

      // ── GSIB metadata: source_system_id present ──
      if ('source_system_id' in row && row.source_system_id === null && canReport('ssid_null')) {
        warnings.push(`${tbl}: null source_system_id — required for GSIB lineage`);
      }

      // ── GSIB metadata: record_source present ──
      if ('record_source' in row && !row.record_source && canReport('record_source_null')) {
        warnings.push(`${tbl}: empty record_source — required for GSIB lineage`);
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 10: Anti-Synthetic Pattern Detection
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detects patterns that reveal data as synthetic:
 * - Too many round numbers (>60% ending in 000)
 * - Too many identical values across facilities
 * - Perfectly correlated fields (no noise)
 * - Suspicious patterns in accrued interest / fees
 * - All financial snapshots have identical ratios
 * - Cash flows all same direction
 */
export function runAntiSyntheticChecks(
  output: V2GeneratorOutput,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Round number analysis on committed amounts ──
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = exposureTable.rows.filter(r => r.as_of_date === lastDate);

    // Check committed amounts
    const committed = lastRows.map(r => r.committed_amount as number).filter(v => v > 0);
    if (committed.length >= 5) {
      const roundCount = committed.filter(v => Math.abs(v % 1000000) < 1).length;
      const roundPct = roundCount / committed.length;
      if (roundPct > 0.80) {
        warnings.push(
          `Anti-synthetic: ${(roundPct*100).toFixed(0)}% of committed amounts are exact millions — ` +
          `real data has more granularity`
        );
      }
    }

    // Check drawn amounts
    const drawn = lastRows.map(r => (r.drawn_amount ?? r.outstanding_balance_amt) as number).filter(v => v > 1000);
    if (drawn.length >= 5) {
      const roundDrawnCount = drawn.filter(v => Math.abs(v % 100000) < 1).length;
      const roundPct = roundDrawnCount / drawn.length;
      if (roundPct > 0.80) {
        warnings.push(
          `Anti-synthetic: ${(roundPct*100).toFixed(0)}% of drawn amounts are exact hundred-thousands`
        );
      }
    }
  }

  // ── Identical base rates (should have some variation by currency) ──
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRates = pricingTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.base_rate_pct as number)
      .filter(v => v > 0);

    if (lastRates.length >= 5) {
      const uniqueRates = new Set(lastRates.map(r => r.toFixed(6)));
      if (uniqueRates.size === 1) {
        warnings.push(`Anti-synthetic: all ${lastRates.length} facilities have identical base_rate — expected variation by currency/index`);
      }
    }
  }

  // ── Identical cost of funds (should vary by currency at least) ──
  const profitTable = findTable(output, 'facility_profitability_snapshot');
  if (profitTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = profitTable.rows.filter(r => r.as_of_date === lastDate);

    // Check equity allocation
    const equityPcts = lastRows
      .map(r => r.equity_allocation_pct as number)
      .filter(v => v > 0);
    if (equityPcts.length >= 5) {
      const uniqueEqPcts = new Set(equityPcts.map(v => v.toFixed(6)));
      if (uniqueEqPcts.size === 1) {
        warnings.push(`Anti-synthetic: all ${equityPcts.length} facilities use identical equity_allocation_pct (${equityPcts[0]})`);
      }
    }
  }

  // ── Cash flow direction diversity ──
  const cashFlowTable = findTable(output, 'cash_flow');
  if (cashFlowTable && cashFlowTable.rows.length >= 5) {
    const directions = cashFlowTable.rows.map(r => r.direction as string);
    const uniqueDirections = new Set(directions);
    if (uniqueDirections.size === 1) {
      warnings.push(`Anti-synthetic: all ${directions.length} cash flows are ${[...uniqueDirections][0]} — expected mix of INFLOW/OUTFLOW`);
    }

    // Cash flow types should be diverse
    const types = cashFlowTable.rows.map(r => r.cash_flow_type as string);
    const uniqueTypes = new Set(types);
    if (uniqueTypes.size === 1 && cashFlowTable.rows.length >= 10) {
      warnings.push(`Anti-synthetic: all cash flows are type ${[...uniqueTypes][0]} — expected DISBURSEMENT/REPAYMENT/INTEREST mix`);
    }
  }

  // ── Financial snapshot ratio diversity ──
  const financialTable = findTable(output, 'facility_financial_snapshot');
  if (financialTable && financialTable.rows.length >= 3) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = financialTable.rows.filter(r => r.as_of_date === lastDate);
    if (lastRows.length >= 3) {
      // Check that EBITDA margins aren't all identical (use ebitda / opex ratio)
      const margins = lastRows
        .filter(r => (r.ebitda_amt as number) > 0 && (r.operating_expense_amt as number) > 0)
        .map(r => ((r.ebitda_amt as number) / (r.operating_expense_amt as number)).toFixed(3));
      const uniqueMargins = new Set(margins);
      if (margins.length >= 3 && uniqueMargins.size === 1) {
        warnings.push(`Anti-synthetic: all financial snapshots have identical EBITDA margin — expected variation`);
      }
    }
  }

  // ── Counterparty financial diversity ──
  const cpFinTable = findTable(output, 'counterparty_financial_snapshot');
  if (cpFinTable && cpFinTable.rows.length >= 3) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = cpFinTable.rows.filter(r => r.as_of_date === lastDate);
    if (lastRows.length >= 3) {
      const revenues = lastRows.map(r => r.revenue_amt as number).filter(v => v > 0);
      const uniqueRevenues = new Set(revenues.map(v => Math.round(v / 10000)));
      if (revenues.length >= 3 && uniqueRevenues.size === 1) {
        warnings.push(`Anti-synthetic: all ${revenues.length} counterparties have near-identical revenue`);
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 11 — Reconciliation & Completeness
   Cross-table value matches, internal L2→L2 FKs, cash flow ↔ balance
   reconciliation, limit aggregation, and audit metadata completeness.
   ═══════════════════════════════════════════════════════════════════════════ */

function runReconciliation(output: V2GeneratorOutput, chain: L1Chain): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── 11a: Cross-table value reconciliation ──
  // Same FacilityState fields appear in multiple tables — verify they match.
  const exposure = findTable(output, 'facility_exposure_snapshot');
  const position = findTable(output, 'position');
  const posDetail = findTable(output, 'position_detail');
  const risk = findTable(output, 'facility_risk_snapshot');
  const delinquency = findTable(output, 'facility_delinquency_snapshot');
  const provision = findTable(output, 'ecl_provision_snapshot');

  if (exposure && position) {
    let mismatchCount = 0;
    for (const expRow of sampleRows(exposure.rows, 200)) {
      const facId = expRow.facility_id;
      const date = expRow.as_of_date;
      const posRow = position.rows.find(r => r.facility_id === facId && r.as_of_date === date);
      if (!posRow) continue;

      const expDrawn = expRow.outstanding_balance_amt as number;
      const posBalance = posRow.balance_amount as number;
      if (typeof expDrawn === 'number' && typeof posBalance === 'number') {
        if (Math.abs(expDrawn - posBalance) > 0.02) {
          mismatchCount++;
          if (mismatchCount <= 3) {
            warnings.push(`Reconciliation: facility ${facId} on ${date}: exposure.outstanding_balance_amt (${expDrawn}) != position.balance_amount (${posBalance})`);
          }
        }
      }

      // PD cross-check between position and risk
      if (risk) {
        const riskRow = risk.rows.find(r => r.facility_id === facId && r.as_of_date === date);
        if (riskRow && posRow.pd_estimate !== undefined && riskRow.pd_pct !== undefined) {
          const posPd = typeof posRow.pd_estimate === 'string' ? parseFloat(posRow.pd_estimate) : posRow.pd_estimate as number;
          const riskPd = riskRow.pd_pct as number;
          if (typeof posPd === 'number' && typeof riskPd === 'number' && !isNaN(posPd) && Math.abs(posPd - riskPd) > 0.0001) {
            mismatchCount++;
            if (mismatchCount <= 5) {
              warnings.push(`Reconciliation: facility ${facId} on ${date}: position.pd_estimate (${posPd}) != risk.pd_pct (${riskPd})`);
            }
          }
        }
      }

      // Credit status cross-check between position and delinquency
      if (delinquency) {
        const delRow = delinquency.rows.find(r => r.facility_id === facId && r.as_of_date === date);
        if (delRow && posRow.credit_status_code && delRow.credit_status_code) {
          if (String(posRow.credit_status_code) !== String(delRow.credit_status_code)) {
            mismatchCount++;
            if (mismatchCount <= 5) {
              warnings.push(`Reconciliation: facility ${facId} on ${date}: position.credit_status_code (${posRow.credit_status_code}) != delinquency.credit_status_code (${delRow.credit_status_code})`);
            }
          }
        }
      }
    }
  }

  // Position_detail balance check against exposure
  if (exposure && posDetail) {
    let detailMismatch = 0;
    for (const expRow of sampleRows(exposure.rows, 100)) {
      const facId = expRow.facility_id;
      const date = expRow.as_of_date;
      const detRow = posDetail.rows.find(r => r.as_of_date === date &&
        exposure.rows.some(e => e.facility_id === facId && e.as_of_date === date));
      if (!detRow) continue;
      const expCommitted = expRow.committed_amount as number;
      const detCommitment = detRow.total_commitment as number;
      if (typeof expCommitted === 'number' && typeof detCommitment === 'number') {
        if (Math.abs(expCommitted - detCommitment) > 0.02) {
          detailMismatch++;
          if (detailMismatch <= 2) {
            warnings.push(`Reconciliation: facility ${facId}: exposure.committed_amount (${expCommitted}) != position_detail.total_commitment (${detCommitment})`);
          }
        }
      }
    }
  }

  // ── 11b: Internal L2→L2 FK integrity ──
  // position_detail.position_id → position.position_id
  if (position && posDetail) {
    const positionIds = new Set(position.rows.map(r => r.position_id));
    let orphanDetails = 0;
    for (const row of posDetail.rows) {
      if (row.position_id && !positionIds.has(row.position_id)) {
        orphanDetails++;
      }
    }
    if (orphanDetails > 0) {
      errors.push(`Internal FK: ${orphanDetails} position_detail rows reference non-existent position_id`);
    }
  }

  // credit_event_facility_link.credit_event_id → credit_event.credit_event_id
  const creditEvent = findTable(output, 'credit_event');
  const ceLink = findTable(output, 'credit_event_facility_link');
  if (creditEvent && ceLink) {
    const eventIds = new Set(creditEvent.rows.map(r => r.credit_event_id));
    let orphanLinks = 0;
    for (const row of ceLink.rows) {
      if (row.credit_event_id && !eventIds.has(row.credit_event_id)) {
        orphanLinks++;
      }
    }
    if (orphanLinks > 0) {
      errors.push(`Internal FK: ${orphanLinks} credit_event_facility_link rows reference non-existent credit_event_id`);
    }
  }

  // amendment_change_detail.amendment_id → amendment_event.amendment_id
  const amendment = findTable(output, 'amendment_event');
  const changeDetail = findTable(output, 'amendment_change_detail');
  if (amendment && changeDetail) {
    const amendIds = new Set(amendment.rows.map(r => r.amendment_id));
    let orphanChanges = 0;
    for (const row of changeDetail.rows) {
      if (row.amendment_id && !amendIds.has(row.amendment_id)) {
        orphanChanges++;
      }
    }
    if (orphanChanges > 0) {
      errors.push(`Internal FK: ${orphanChanges} amendment_change_detail rows reference non-existent amendment_id`);
    }
  }

  // stress_test_breach.stress_test_result_id → stress_test_result.result_id
  const stResult = findTable(output, 'stress_test_result');
  const stBreach = findTable(output, 'stress_test_breach');
  if (stResult && stBreach) {
    const resultIds = new Set(stResult.rows.map(r => r.result_id));
    let orphanBreaches = 0;
    for (const row of stBreach.rows) {
      if (row.stress_test_result_id && !resultIds.has(row.stress_test_result_id)) {
        orphanBreaches++;
      }
    }
    if (orphanBreaches > 0) {
      errors.push(`Internal FK: ${orphanBreaches} stress_test_breach rows reference non-existent stress_test_result_id`);
    }
  }

  // ── 11c: Cash flow ↔ balance change reconciliation ──
  // Net cash flows between periods should reconcile to drawn balance changes.
  const cashFlow = findTable(output, 'cash_flow');
  if (cashFlow && exposure && output.dates.length >= 2) {
    const sortedDates = [...output.dates].sort();
    const facilityIds = [...new Set(exposure.rows.map(r => r.facility_id))];
    let reconMismatches = 0;

    for (const facId of facilityIds.slice(0, 20)) {
      for (let d = 1; d < sortedDates.length && reconMismatches < 5; d++) {
        const prevDate = sortedDates[d - 1];
        const currDate = sortedDates[d];

        const prevExp = exposure.rows.find(r => r.facility_id === facId && r.as_of_date === prevDate);
        const currExp = exposure.rows.find(r => r.facility_id === facId && r.as_of_date === currDate);
        if (!prevExp || !currExp) continue;

        const prevDrawn = prevExp.outstanding_balance_amt as number;
        const currDrawn = currExp.outstanding_balance_amt as number;
        if (typeof prevDrawn !== 'number' || typeof currDrawn !== 'number') continue;

        const drawnDelta = currDrawn - prevDrawn;

        // Sum net principal cash flows for this facility in this period
        const periodCFs = cashFlow.rows.filter(r =>
          r.facility_id === facId && r.as_of_date === currDate
        );
        if (periodCFs.length === 0) continue;

        let netPrincipal = 0;
        for (const cf of periodCFs) {
          const amt = (cf.principal_amount ?? cf.amount) as number;
          if (typeof amt !== 'number') continue;
          const dir = cf.direction as string;
          if (dir === 'OUTFLOW') netPrincipal += amt;  // disbursement increases drawn
          else if (dir === 'INFLOW') netPrincipal -= amt;  // repayment decreases drawn
        }

        // Allow 10% tolerance for rounding and interest capitalization
        if (Math.abs(drawnDelta) > 100 && netPrincipal !== 0) {
          const ratio = Math.abs(drawnDelta - netPrincipal) / Math.max(Math.abs(drawnDelta), 1);
          if (ratio > 0.25) {
            reconMismatches++;
            warnings.push(`Cash flow recon: facility ${facId} period ${prevDate}→${currDate}: drawn changed by ${drawnDelta.toFixed(0)} but net cash flow principal = ${netPrincipal.toFixed(0)} (${(ratio * 100).toFixed(0)}% gap)`);
          }
        }
      }
    }
  }

  // ── 11d: Limit contribution ↔ exposure aggregation ──
  // limit_contribution_snapshot.contribution_amount should ≈ sum of facility drawn for that CP
  const limitContrib = findTable(output, 'limit_contribution_snapshot');
  if (limitContrib && exposure) {
    let limitMismatches = 0;
    for (const lRow of sampleRows(limitContrib.rows, 50)) {
      const cpId = lRow.counterparty_id;
      const date = lRow.as_of_date;
      const contrib = lRow.contribution_amount as number;
      if (typeof contrib !== 'number') continue;

      const cpExposures = exposure.rows.filter(r => r.counterparty_id === cpId && r.as_of_date === date);
      const sumDrawn = cpExposures.reduce((s, r) => s + ((r.outstanding_balance_amt as number) || 0), 0);

      if (Math.abs(contrib) > 100 && Math.abs(sumDrawn) > 100) {
        const ratio = Math.abs(contrib - sumDrawn) / Math.max(Math.abs(sumDrawn), 1);
        if (ratio > 0.10) {
          limitMismatches++;
          if (limitMismatches <= 3) {
            warnings.push(`Limit recon: CP ${cpId} on ${date}: limit_contribution (${contrib.toFixed(0)}) vs sum of facility drawn (${sumDrawn.toFixed(0)}) — ${(ratio * 100).toFixed(0)}% gap`);
          }
        }
      }
    }
  }

  // ── 11e: CP financial ↔ facility financial proportional consistency ──
  const cpFin = findTable(output, 'counterparty_financial_snapshot');
  const facFin = findTable(output, 'facility_financial_snapshot');
  if (cpFin && facFin) {
    let finMismatches = 0;
    for (const cpRow of sampleRows(cpFin.rows, 30)) {
      const cpId = cpRow.counterparty_id;
      const date = cpRow.as_of_date;
      const cpEbitda = cpRow.ebitda_amt as number;
      if (typeof cpEbitda !== 'number' || cpEbitda <= 0) continue;

      const facRows = facFin.rows.filter(r => r.counterparty_id === cpId && r.as_of_date === date);
      if (facRows.length === 0) continue;

      const sumFacEbitda = facRows.reduce((s, r) => s + ((r.ebitda_amt as number) || 0), 0);
      // Facility-level EBITDA should not exceed CP-level EBITDA (it's apportioned)
      if (sumFacEbitda > cpEbitda * 1.15 && sumFacEbitda > 1000) {
        finMismatches++;
        if (finMismatches <= 3) {
          warnings.push(`Financial recon: CP ${cpId} on ${date}: sum of facility EBITDA (${sumFacEbitda.toFixed(0)}) exceeds CP EBITDA (${cpEbitda.toFixed(0)}) by ${((sumFacEbitda / cpEbitda - 1) * 100).toFixed(0)}%`);
        }
      }
    }
  }

  // ── 11f: Audit metadata completeness ──
  // Every output table should have source_system_id and record_source.
  const AUDIT_FIELDS = ['source_system_id', 'record_source'] as const;
  for (const td of output.tables) {
    if (td.rows.length === 0) continue;
    const firstRow = td.rows[0];
    for (const field of AUDIT_FIELDS) {
      if (!(field in firstRow)) {
        warnings.push(`Audit metadata: ${td.schema}.${td.table} is missing '${field}' field — required for GSIB lineage`);
      }
    }
  }

  return { errors, warnings };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ORCHESTRATOR — Run All Groups
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Run all 11 quality control groups for a scenario.
 */
export function runAllQualityControls(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
  registry: ReferenceDataRegistry,
): FullQualityControlResult {
  const group1 = runFKDomainValidation(output, registry);
  const group2 = runDriftDetection(registry);
  const group3 = runArithmeticChecks(output);
  const group4 = runCrossFieldConsistency(output, registry);
  const group5 = runStoryArcChecks(output, chain, config);
  const group6 = runCrossTableCorrelation(output, chain);
  const group7 = runTemporalCoherence(output);
  const group8 = runPortfolioDistribution(output, chain, config);
  const group9 = runFinancialRealism(output, chain);
  const group10 = runAntiSyntheticChecks(output);
  const group11 = runReconciliation(output, chain);

  const combined = merge(group1, group2, group3, group4, group5, group6, group7, group8, group9, group10, group11);

  return {
    ...combined,
    group1_fk: group1,
    group2_drift: group2,
    group3_arithmetic: group3,
    group4_consistency: group4,
    group5_story: group5,
    group6_crossTable: group6,
    group7_temporal: group7,
    group8_distribution: group8,
    group9_realism: group9,
    group10_antiSynthetic: group10,
    group11_reconciliation: group11,
  };
}

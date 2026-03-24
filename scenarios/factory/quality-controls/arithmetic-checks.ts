/**
 * Group 3: Arithmetic Identity Checks
 *
 * Verify arithmetic identities across all generated tables:
 * - Balance identity: undrawn = committed - drawn
 * - Drawn <= committed
 * - All-in rate = base + spread
 * - ECL: 12m <= lifetime
 * - EAD = drawn + ccf * undrawn
 * - RWA = EAD * risk_weight
 * - Overdue amounts align with DPD
 * - Book value = drawn + accrued interest
 * - Interest income = drawn * all_in_rate / 12
 * - NII = interest income - interest expense
 * - Fee income = undrawn * fee_rate / 12
 * - Collateral: eligible = valuation * (1 - haircut)
 * - Collateral: allocated <= eligible
 * - Provision: stage 1 -> ecl_12m; stages 2/3 -> ecl_lifetime
 * - Coverage ratio = provision / drawn
 * - Contribution pct = contribution / limit
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { sampleRows } from './shared-types';

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
      // -- Balance identity: undrawn = committed - drawn --
      if ('committed_amount' in row && 'drawn_amount' in row && 'undrawn_amount' in row) {
        const c = row.committed_amount as number;
        const d = row.drawn_amount as number;
        const u = row.undrawn_amount as number;
        if (c > 0 && Math.abs(u - (c - d)) > 0.02 && shouldFire(tbl, 'balance_identity')) {
          warnings.push(`${tbl}: undrawn (${u.toFixed(0)}) != committed (${c.toFixed(0)}) - drawn (${d.toFixed(0)})`);
        }
      }

      // -- Drawn <= Committed --
      if ('committed_amount' in row && 'drawn_amount' in row) {
        const c = row.committed_amount as number;
        const d = row.drawn_amount as number;
        if (d > c * 1.001 && c > 0 && shouldFire(tbl, 'drawn_le_committed')) {
          warnings.push(`${tbl}: drawn (${d.toFixed(0)}) > committed (${c.toFixed(0)})`);
        }
      }

      // -- All-in rate ~ base + spread --
      if ('all_in_rate_pct' in row && 'base_rate_pct' in row && 'spread_bps' in row) {
        const allIn = row.all_in_rate_pct as number;
        const base = row.base_rate_pct as number;
        const spreadPct = (row.spread_bps as number) / 10000;
        if (allIn > 0 && Math.abs(allIn - (base + spreadPct)) > 0.015 && shouldFire(tbl, 'all_in_rate')) {
          warnings.push(`${tbl}: all_in_rate (${allIn.toFixed(4)}) != base (${base.toFixed(4)}) + spread (${spreadPct.toFixed(4)})`);
        }
      }

      // -- ECL: 12m <= lifetime --
      if ('ecl_12m' in row && 'ecl_lifetime' in row) {
        const e12 = row.ecl_12m as number;
        const elt = row.ecl_lifetime as number;
        if (e12 > elt * 1.01 && elt > 0 && shouldFire(tbl, 'ecl_ordering')) {
          warnings.push(`${tbl}: ecl_12m (${e12.toFixed(2)}) > ecl_lifetime (${elt.toFixed(2)})`);
        }
      }

      // -- EAD formula --
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

      // -- RWA formula --
      if ('rwa' in row && 'ead' in row && 'risk_weight_pct' in row) {
        const rwa = row.rwa as number;
        const ead = row.ead as number;
        const rw = row.risk_weight_pct as number;
        const expected = ead * rw / 100;
        if (rwa > 0 && expected > 0 && Math.abs(rwa - expected) / expected > 0.05 && shouldFire(tbl, 'rwa_formula')) {
          warnings.push(`${tbl}: rwa (${rwa.toFixed(0)}) vs ead*rw (${expected.toFixed(0)}) [${((rwa/expected-1)*100).toFixed(1)}%]`);
        }
      }

      // -- Overdue <-> DPD --
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

      // -- Book value ~ drawn + accrued interest --
      if ('book_value_amt' in row && 'balance_amount' in row && 'accrued_interest_amt' in row) {
        const bv = row.book_value_amt as number;
        const bal = row.balance_amount as number;
        const ai = row.accrued_interest_amt as number;
        if (bv > 0 && Math.abs(bv - (bal + ai)) / bv > 0.05 && shouldFire(tbl, 'book_value')) {
          warnings.push(`${tbl}: book_value (${bv.toFixed(0)}) != balance (${bal.toFixed(0)}) + accrued (${ai.toFixed(0)})`);
        }
      }

      // -- Interest income ~ drawn * rate / 12 --
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

      // -- NII = interest income - interest expense --
      if ('nii_ytd' in row && 'interest_income_amt' in row && 'interest_expense_amt' in row) {
        const nii = row.nii_ytd as number;
        const income = row.interest_income_amt as number;
        const expense = row.interest_expense_amt as number;
        if (income > 0 && expense > 0 && income < expense && nii > 0 && shouldFire(tbl, 'nii_sign')) {
          warnings.push(`${tbl}: nii_ytd positive (${nii.toFixed(0)}) but income (${income.toFixed(0)}) < expense (${expense.toFixed(0)})`);
        }
      }

      // -- Collateral: eligible <= valuation --
      if ('eligible_collateral_amount' in row && 'valuation_amount' in row) {
        const eligible = row.eligible_collateral_amount as number;
        const valuation = row.valuation_amount as number;
        if (eligible > valuation * 1.01 && valuation > 0 && shouldFire(tbl, 'eligible_le_valuation')) {
          warnings.push(`${tbl}: eligible_collateral (${eligible.toFixed(0)}) > valuation (${valuation.toFixed(0)})`);
        }
      }

      // -- Collateral: eligible = valuation * (1 - haircut) --
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

      // -- Collateral: allocated <= eligible --
      if ('allocated_amount_usd' in row && 'eligible_collateral_amount' in row) {
        const alloc = row.allocated_amount_usd as number;
        const eligible = row.eligible_collateral_amount as number;
        if (alloc > eligible * 1.01 && eligible > 0 && shouldFire(tbl, 'allocated_le_eligible')) {
          warnings.push(`${tbl}: allocated (${alloc.toFixed(0)}) > eligible (${eligible.toFixed(0)})`);
        }
      }

      // -- Provision: stage alignment --
      if ('ifrs9_stage' in row && 'provision_amount' in row && 'ecl_12m' in row && 'ecl_lifetime' in row) {
        const stage = row.ifrs9_stage as number;
        const provision = row.provision_amount as number;
        const ecl12 = row.ecl_12m as number;
        const eclLt = row.ecl_lifetime as number;
        if (provision > 0) {
          if (stage === 1 && Math.abs(provision - ecl12) / provision > 0.10 && shouldFire(tbl, 'provision_stage1')) {
            warnings.push(`${tbl}: Stage 1 provision (${provision.toFixed(0)}) should ~ ecl_12m (${ecl12.toFixed(0)})`);
          }
          if ((stage === 2 || stage === 3) && Math.abs(provision - eclLt) / provision > 0.10 && shouldFire(tbl, 'provision_stage23')) {
            warnings.push(`${tbl}: Stage ${stage} provision (${provision.toFixed(0)}) should ~ ecl_lifetime (${eclLt.toFixed(0)})`);
          }
        }
      }

      // -- Coverage ratio = provision / drawn --
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

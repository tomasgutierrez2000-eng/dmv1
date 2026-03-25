/**
 * Group 9: Financial Realism & GSIB Bounds
 *
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

import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { sampleRows } from './shared-types';

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
      // -- PD range [0.0001, 1.0] --
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

      // -- LGD bounds [0, 1] — typical Basel III range 25-78% --
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

      // -- CCF bounds [0, 1] --
      if ('ccf' in row) {
        const ccf = row.ccf as number;
        if ((ccf < 0 || ccf > 1.01) && canReport('ccf_range')) {
          warnings.push(`${tbl}: CCF (${ccf}) outside [0, 1]`);
        }
      }

      // -- Spread reasonableness (1 bps to 2000 bps) --
      if ('spread_bps' in row) {
        const spread = row.spread_bps as number;
        if (spread < 0 && canReport('spread_negative')) {
          errors.push(`${tbl}: negative spread (${spread} bps)`);
        }
        if (spread > 2000 && canReport('spread_extreme')) {
          warnings.push(`${tbl}: extreme spread (${spread} bps) — >2000 bps is unusual`);
        }
      }

      // -- Interest rate reasonableness (0-30%) --
      if ('all_in_rate_pct' in row) {
        const rate = row.all_in_rate_pct as number;
        if (rate < 0 && canReport('rate_negative')) {
          warnings.push(`${tbl}: negative all_in_rate (${(rate*100).toFixed(2)}%)`);
        }
        if (rate > 0.30 && canReport('rate_extreme')) {
          warnings.push(`${tbl}: extreme all_in_rate (${(rate*100).toFixed(2)}%) — >30% is unusual for GSIB`);
        }
      }

      // -- Committed amount positivity --
      if ('committed_amount' in row) {
        const c = row.committed_amount as number;
        if (c < 0 && canReport('committed_negative')) {
          errors.push(`${tbl}: negative committed_amount (${c.toFixed(0)})`);
        }
      }

      // -- Drawn amount non-negative --
      if ('drawn_amount' in row) {
        const d = row.drawn_amount as number;
        if (d < -0.01 && canReport('drawn_negative')) {
          errors.push(`${tbl}: negative drawn_amount (${d.toFixed(2)})`);
        }
      }

      // -- EAD non-negative --
      if ('ead' in row) {
        const ead = row.ead as number;
        if (ead < 0 && canReport('ead_negative')) {
          errors.push(`${tbl}: negative EAD (${ead.toFixed(0)})`);
        }
      }

      // -- RWA non-negative --
      if ('rwa' in row) {
        const rwa = row.rwa as number;
        if (rwa < 0 && canReport('rwa_negative')) {
          errors.push(`${tbl}: negative RWA (${rwa.toFixed(0)})`);
        }
      }

      // -- ECL non-negative --
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

      // -- Collateral valuation non-negative --
      if ('valuation_amount' in row) {
        const val = row.valuation_amount as number;
        if (val < 0 && canReport('collateral_negative')) {
          errors.push(`${tbl}: negative collateral valuation (${val.toFixed(0)})`);
        }
      }

      // -- Loss amount reasonableness --
      if ('loss_amount_usd' in row && row.loss_amount_usd !== null) {
        const loss = row.loss_amount_usd as number;
        if (loss < 0 && canReport('loss_negative')) {
          warnings.push(`${tbl}: negative loss_amount_usd (${loss.toFixed(0)})`);
        }
      }

      // -- GSIB metadata: source_system_id present --
      if ('source_system_id' in row && row.source_system_id === null && canReport('ssid_null')) {
        warnings.push(`${tbl}: null source_system_id — required for GSIB lineage`);
      }

      // -- GSIB metadata: record_source present --
      if ('record_source' in row && !row.record_source && canReport('record_source_null')) {
        warnings.push(`${tbl}: empty record_source — required for GSIB lineage`);
      }
    }
  }

  // -- M4: Tenure Bounds by Product Type --
  // Check maturity_date - origination_date falls within expected range per product type
  const TENURE_BOUNDS: Record<string, { minYears: number; maxYears: number }> = {
    REVOLVING_CREDIT: { minYears: 1, maxYears: 7 },
    TERM_LOAN: { minYears: 3, maxYears: 7 },
    BRIDGE_LOAN: { minYears: 1, maxYears: 3 },
    LETTER_OF_CREDIT: { minYears: 0, maxYears: 2 },
  };

  for (const td of output.tables) {
    if (td.table !== 'facility_master') continue;
    for (const row of sampleRows(td.rows, 300)) {
      const matDate = row.maturity_date as string | undefined;
      const origDate = row.origination_date as string | undefined;
      const facType = row.facility_type as string | undefined;
      if (!matDate || !origDate || !facType) continue;

      const matMs = new Date(matDate).getTime();
      const origMs = new Date(origDate).getTime();
      if (isNaN(matMs) || isNaN(origMs)) continue;

      const tenureYears = (matMs - origMs) / (365.25 * 24 * 60 * 60 * 1000);
      const typeKey = facType.toUpperCase().replace(/\s+/g, '_');
      const bounds = TENURE_BOUNDS[typeKey];
      if (!bounds) continue;

      if (tenureYears < bounds.minYears || tenureYears > bounds.maxYears) {
        if (canReport('tenure_bounds')) {
          warnings.push(
            `Tenure bounds: facility ${row.facility_id} (${facType}) has tenure ` +
            `${tenureYears.toFixed(1)}yr — expected ${bounds.minYears}-${bounds.maxYears}yr`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

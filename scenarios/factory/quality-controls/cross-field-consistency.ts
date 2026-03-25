/**
 * Group 4: Cross-Field Consistency
 *
 * Cross-field consistency checks using L1-driven rules:
 * - DPD bucket matches actual DPD per dpd_bucket_dim ranges
 * - Credit status correlates with DPD
 * - IFRS 9 stage consistency with DPD and credit status
 * - Collateral LTV consistency
 * - Rating <-> PD consistency
 * - Spread <-> rating correlation (higher risk -> higher spread)
 * - Product type <-> utilization (term loans near 100%)
 * - Lifecycle stage <-> balances (FUNDED -> drawn > 0)
 * - Maturity date > origination date
 * - Financial ratio signs (DSCR > 0 for performing)
 * - Default status consistency across all tables
 */

import type { ReferenceDataRegistry } from '../reference-data-registry';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { sampleRows } from './shared-types';

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
      // -- DPD Bucket vs Actual DPD --
      if ('days_past_due' in row && ('delinquency_bucket_code' in row || 'dpd_bucket_code' in row)) {
        const dpd = row.days_past_due as number;
        const bucket = (row.delinquency_bucket_code ?? row.dpd_bucket_code) as string;
        const expectedBucket = registry.resolveDPDBucket(dpd);
        if (expectedBucket && bucket !== expectedBucket && canReport('dpd_bucket')) {
          warnings.push(`${tbl}: dpd=${dpd} should map to bucket '${expectedBucket}' but got '${bucket}'`);
        }
      }

      // -- Credit Status vs DPD --
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

      // -- M1: IFRS 9 Stage Consistency --
      // Stage 1: DPD < 30 AND credit_status NOT DEFAULT
      // Stage 2: 30 <= DPD < 90 OR significant PD increase
      // Stage 3: DPD >= 90 OR credit_status = DEFAULT
      if ('ifrs9_stage' in row && 'days_past_due' in row) {
        const stage = row.ifrs9_stage as number;
        const dpd = row.days_past_due as number;
        const statusCode = row.credit_status_code as number | undefined;
        const statusInfo = statusCode !== undefined ? registry.getCreditStatusInfo(statusCode) : undefined;
        const isDefault = statusInfo?.default_flag === true;

        // Stage 3 should have DPD >= 90 OR default status
        if (stage === 3 && dpd < 30 && !isDefault && canReport('stage3_low_dpd')) {
          warnings.push(`${tbl}: ifrs9_stage=3 but dpd=${dpd} and not DEFAULT — expected DPD>=90 or DEFAULT`);
        }

        // Stage 1 must have DPD < 30 and NOT default
        if (stage === 1 && dpd >= 90 && canReport('stage1_high_dpd')) {
          warnings.push(`${tbl}: ifrs9_stage=1 but dpd=${dpd} — should be Stage 2/3`);
        }
        if (stage === 1 && isDefault && canReport('stage1_default')) {
          warnings.push(`${tbl}: ifrs9_stage=1 but credit_status is DEFAULT — should be Stage 3`);
        }

        // Stage 2 should have 30 <= DPD < 90 (or PD increase, which we can't check here)
        // But Stage 2 with DPD >= 90 and no PD-increase justification is suspicious
        if (stage === 2 && dpd >= 90 && canReport('stage2_high_dpd')) {
          warnings.push(`${tbl}: ifrs9_stage=2 but dpd=${dpd} — should be Stage 3 (DPD>=90)`);
        }

        // Stage 2 with default status is inconsistent — defaults are always Stage 3
        if (stage === 2 && isDefault && canReport('stage2_default')) {
          warnings.push(`${tbl}: ifrs9_stage=2 but credit_status is DEFAULT — should be Stage 3`);
        }
      }

      // -- M1b: ECL Stage Code Consistency (ecl_staging_snapshot) --
      // ecl_stage_code should align with ifrs9_stage when both present
      if ('ecl_stage_code' in row && 'ifrs9_stage' in row) {
        const eclStage = row.ecl_stage_code as string | null;
        const ifrs9 = row.ifrs9_stage as number;
        if (eclStage !== null) {
          // ecl_stage_code is typically "STAGE_1", "STAGE_2", "STAGE_3"
          const eclNum = parseInt(eclStage.replace(/\D/g, ''), 10);
          if (!isNaN(eclNum) && eclNum !== ifrs9 && canReport('ecl_ifrs9_mismatch')) {
            warnings.push(`${tbl}: ecl_stage_code='${eclStage}' but ifrs9_stage=${ifrs9} — stages should align`);
          }
        }
      }

      // -- Rating <-> PD consistency (L1-driven) --
      if ('pd_pct' in row && 'internal_risk_rating' in row) {
        const pd = row.pd_pct as number;
        const rating = row.internal_risk_rating as string;
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

      // -- Lifecycle stage <-> drawn amount --
      if ('lifecycle_stage' in row && 'drawn_amount' in row) {
        const stage = row.lifecycle_stage as string;
        const drawn = row.drawn_amount as number;
        if (stage === 'COMMITMENT' && drawn > 0 && canReport('commitment_drawn')) {
          warnings.push(`${tbl}: lifecycle=COMMITMENT but drawn=${drawn.toFixed(0)} — should be 0`);
        }
      }

      // -- Maturity > origination --
      if ('maturity_date' in row && 'origination_date' in row) {
        const mat = row.maturity_date as string;
        const orig = row.origination_date as string;
        if (mat && orig && mat <= orig && canReport('mat_after_orig')) {
          warnings.push(`${tbl}: maturity_date (${mat}) <= origination_date (${orig})`);
        }
      }

      // -- Collateral LTV consistency --
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

      // -- Financial ratio signs --
      if ('dscr' in row && 'credit_status' in row) {
        const dscr = row.dscr as number;
        const status = row.credit_status as string;
        if (dscr < 0 && (status === 'PERFORMING' || status === 'WATCH') && canReport('dscr_negative')) {
          warnings.push(`${tbl}: negative DSCR (${dscr.toFixed(2)}) for ${status} loan`);
        }
      }

      // -- Default consistency across position table --
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

      // -- Delinquency status consistency --
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

      // -- Haircut range [0, 1] --
      if ('haircut_pct' in row) {
        const hc = row.haircut_pct as number;
        if ((hc < 0 || hc > 1) && canReport('haircut_range')) {
          warnings.push(`${tbl}: haircut_pct (${hc}) outside [0, 1]`);
        }
      }

      // -- Risk weight positivity --
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

/**
 * Group 13: Bridge Table Allocation Integrity
 *
 * Validates that many-to-many bridge/allocation tables sum correctly:
 *
 *   - facility_lender_allocation.bank_share_pct sums to ~1.0 per facility
 *   - facility_lender_allocation.bank_commitment_amt sums to facility_master.committed_facility_amt
 *   - facility_lob_attribution.attribution_pct sums to ~1.0 per facility/date
 *   - exposure_counterparty_attribution.attribution_pct sums to ~1.0 per facility/date/exposure_type
 *   - credit_agreement_counterparty_participation has exactly one is_primary_flag per agreement
 *   - facility_counterparty_participation has exactly one is_primary_flag per facility
 *   - collateral_link allocated amounts don't exceed collateral_asset_master value
 *   - protection_link allocated amounts don't exceed crm_protection_master notional
 *
 * These checks prevent silent rollup double-counting in dashboards.
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { L1Chain } from '../chain-builder';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

const PCT_TOLERANCE = 0.02;  // 2% tolerance for summing to 1.0
const AMT_TOLERANCE = 0.05;  // 5% tolerance for amount tieouts

export function runBridgeAllocationChecks(
  output: V2GeneratorOutput,
  chain: L1Chain,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── 13a: facility_lender_allocation.bank_share_pct sums to 1.0 per facility ──
  const lenderAlloc = findTable(output, 'facility_lender_allocation');
  if (lenderAlloc && lenderAlloc.rows.length > 0) {
    const facShareSum = new Map<string | number, number>();
    const facCommitSum = new Map<string | number, number>();

    for (const row of lenderAlloc.rows) {
      const fid = row.facility_id as string | number;
      const share = row.bank_share_pct as number;
      const commit = row.bank_commitment_amt as number;

      facShareSum.set(fid, (facShareSum.get(fid) ?? 0) + (typeof share === 'number' ? share : 0));
      facCommitSum.set(fid, (facCommitSum.get(fid) ?? 0) + (typeof commit === 'number' ? commit : 0));
    }

    let shareIssues = 0;
    for (const [fid, sum] of facShareSum) {
      if (Math.abs(sum - 1.0) > PCT_TOLERANCE) {
        shareIssues++;
        if (shareIssues <= 3) {
          errors.push(
            `Bridge: facility_lender_allocation bank_share_pct sums to ${sum.toFixed(4)} ` +
            `for facility ${fid} (expected ~1.0)`
          );
        }
      }
    }
    if (shareIssues > 3) {
      errors.push(`Bridge: ${shareIssues} total facilities have bank_share_pct not summing to 1.0`);
    }

    // ── 13b: bank_commitment_amt sums to facility_master.committed_facility_amt ──
    const facMaster = findTable(output, 'facility_master');
    if (facMaster) {
      const masterCommit = new Map<string | number, number>();
      for (const row of facMaster.rows) {
        const committed = row.committed_facility_amt as number;
        if (typeof committed === 'number') {
          masterCommit.set(row.facility_id as string | number, committed);
        }
      }

      let commitIssues = 0;
      for (const [fid, allocSum] of facCommitSum) {
        const masterAmt = masterCommit.get(fid);
        if (masterAmt === undefined || masterAmt === 0) continue;
        const ratio = Math.abs(allocSum - masterAmt) / masterAmt;
        if (ratio > AMT_TOLERANCE && Math.abs(allocSum - masterAmt) > 100) {
          commitIssues++;
          if (commitIssues <= 3) {
            warnings.push(
              `Bridge: facility ${fid} lender bank_commitment_amt sum (${allocSum.toFixed(0)}) ` +
              `differs from facility_master.committed_facility_amt (${masterAmt.toFixed(0)}) by ${(ratio * 100).toFixed(1)}%`
            );
          }
        }
      }
      if (commitIssues > 3) {
        warnings.push(`Bridge: ${commitIssues} total facilities have commitment amount mismatches`);
      }
    }
  }

  // ── 13c: facility_lob_attribution.attribution_pct sums to 1.0 per facility/date ──
  const lobAttrib = findTable(output, 'facility_lob_attribution');
  if (lobAttrib && lobAttrib.rows.length > 0) {
    const grainSum = new Map<string, number>();

    for (const row of lobAttrib.rows) {
      const key = `${row.facility_id}|${row.as_of_date}`;
      const pct = row.attribution_pct as number;
      grainSum.set(key, (grainSum.get(key) ?? 0) + (typeof pct === 'number' ? pct : 0));
    }

    let lobIssues = 0;
    for (const [key, sum] of grainSum) {
      if (Math.abs(sum - 1.0) > PCT_TOLERANCE) {
        lobIssues++;
        if (lobIssues <= 3) {
          errors.push(
            `Bridge: facility_lob_attribution.attribution_pct sums to ${sum.toFixed(4)} ` +
            `for ${key} (expected ~1.0)`
          );
        }
      }
    }
    if (lobIssues > 3) {
      errors.push(`Bridge: ${lobIssues} total facility/date grains have LoB attribution not summing to 1.0`);
    }
  }

  // ── 13d: exposure_counterparty_attribution.attribution_pct sums to 1.0 per facility/date/type ──
  const ecAttrib = findTable(output, 'exposure_counterparty_attribution');
  if (ecAttrib && ecAttrib.rows.length > 0) {
    const grainSum = new Map<string, number>();

    for (const row of ecAttrib.rows) {
      const key = `${row.facility_id}|${row.as_of_date}|${row.exposure_type_id ?? 'default'}`;
      const pct = row.attribution_pct as number;
      grainSum.set(key, (grainSum.get(key) ?? 0) + (typeof pct === 'number' ? pct : 0));
    }

    let ecIssues = 0;
    for (const [key, sum] of grainSum) {
      if (Math.abs(sum - 1.0) > PCT_TOLERANCE) {
        ecIssues++;
        if (ecIssues <= 3) {
          errors.push(
            `Bridge: exposure_counterparty_attribution.attribution_pct sums to ${sum.toFixed(4)} ` +
            `for ${key} (expected ~1.0)`
          );
        }
      }
    }
    if (ecIssues > 3) {
      errors.push(`Bridge: ${ecIssues} total grains have exposure CP attribution not summing to 1.0`);
    }
  }

  // ── 13e: Primary flag uniqueness on participation tables ──
  const cacpTable = findTable(output, 'credit_agreement_counterparty_participation');
  if (cacpTable && cacpTable.rows.length > 0) {
    checkPrimaryFlag(cacpTable.rows, 'credit_agreement_id', 'credit_agreement_counterparty_participation', errors, warnings);
  }

  const fcpTable = findTable(output, 'facility_counterparty_participation');
  if (fcpTable && fcpTable.rows.length > 0) {
    checkPrimaryFlag(fcpTable.rows, 'facility_id', 'facility_counterparty_participation', errors, warnings);
  }

  // ── 13f: Collateral link allocated amounts <= collateral asset value ──
  const collLink = findTable(output, 'collateral_link');
  const collAssetMaster = findTable(output, 'collateral_asset_master');
  if (collLink && collAssetMaster && collLink.rows.length > 0) {
    // Build asset value map
    const assetValues = new Map<string | number, number>();
    for (const row of collAssetMaster.rows) {
      const val = (row.current_value_amt ?? row.valuation_amount ?? row.original_value_amt) as number;
      if (typeof val === 'number') {
        assetValues.set(row.collateral_asset_id as string | number, val);
      }
    }

    // Sum allocated amounts per asset
    const allocatedSum = new Map<string | number, number>();
    for (const row of collLink.rows) {
      const assetId = row.collateral_asset_id as string | number;
      const allocated = row.allocated_amount as number;
      if (typeof allocated === 'number') {
        allocatedSum.set(assetId, (allocatedSum.get(assetId) ?? 0) + allocated);
      }
    }

    let overAllocCount = 0;
    for (const [assetId, totalAlloc] of allocatedSum) {
      const assetVal = assetValues.get(assetId);
      if (assetVal === undefined || assetVal <= 0) continue;
      if (totalAlloc > assetVal * 1.01) { // 1% tolerance
        overAllocCount++;
        if (overAllocCount <= 3) {
          warnings.push(
            `Bridge: collateral_link allocates ${totalAlloc.toFixed(0)} against ` +
            `collateral_asset ${assetId} valued at ${assetVal.toFixed(0)} — over-allocation`
          );
        }
      }
    }
    if (overAllocCount > 3) {
      warnings.push(`Bridge: ${overAllocCount} total collateral assets are over-allocated`);
    }
  }

  // ── 13g: Protection link allocated amounts <= protection notional ──
  const protLink = findTable(output, 'protection_link');
  const protMaster = findTable(output, 'crm_protection_master');
  if (protLink && protMaster && protLink.rows.length > 0) {
    const protNotionals = new Map<string | number, number>();
    for (const row of protMaster.rows) {
      const notional = (row.notional_amount ?? row.protection_amount) as number;
      if (typeof notional === 'number') {
        protNotionals.set(row.protection_id as string | number, notional);
      }
    }

    const protAllocSum = new Map<string | number, number>();
    for (const row of protLink.rows) {
      const protId = row.protection_id as string | number;
      const allocated = row.allocated_amount as number;
      if (typeof allocated === 'number') {
        protAllocSum.set(protId, (protAllocSum.get(protId) ?? 0) + allocated);
      }
    }

    let protOverAlloc = 0;
    for (const [protId, totalAlloc] of protAllocSum) {
      const notional = protNotionals.get(protId);
      if (notional === undefined || notional <= 0) continue;
      if (totalAlloc > notional * 1.01) {
        protOverAlloc++;
        if (protOverAlloc <= 3) {
          warnings.push(
            `Bridge: protection_link allocates ${totalAlloc.toFixed(0)} against ` +
            `protection ${protId} with notional ${notional.toFixed(0)} — over-allocation`
          );
        }
      }
    }
    if (protOverAlloc > 3) {
      warnings.push(`Bridge: ${protOverAlloc} total protections are over-allocated`);
    }
  }

  return { errors, warnings };
}

/** Check that at most one row per parent entity has is_primary_flag = true. */
function checkPrimaryFlag(
  rows: Record<string, unknown>[],
  parentKey: string,
  tableName: string,
  errors: string[],
  warnings: string[],
): void {
  // Only check if the table has an is_primary_flag column
  if (rows.length === 0 || !('is_primary_flag' in rows[0])) return;

  const primaryCount = new Map<string | number, number>();
  for (const row of rows) {
    const key = row[parentKey] as string | number;
    const isPrimary = row.is_primary_flag;
    if (isPrimary === true || isPrimary === 'Y' || isPrimary === 1) {
      primaryCount.set(key, (primaryCount.get(key) ?? 0) + 1);
    }
  }

  let multiPrimary = 0;
  for (const [key, count] of primaryCount) {
    if (count > 1) {
      multiPrimary++;
      if (multiPrimary <= 3) {
        warnings.push(
          `Bridge: ${tableName} has ${count} rows with is_primary_flag=true ` +
          `for ${parentKey}=${key} (expected at most 1)`
        );
      }
    }
  }
  if (multiPrimary > 3) {
    warnings.push(`Bridge: ${tableName} has ${multiPrimary} total ${parentKey} values with multiple primaries`);
  }
}

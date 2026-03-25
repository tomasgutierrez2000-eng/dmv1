/**
 * Group 2: Enrichment Map Drift Detection
 *
 * Detects when hardcoded maps in the factory have gone stale
 * relative to L1 dimension tables.
 */

import type { ReferenceDataRegistry } from '../reference-data-registry';
import { CREDIT_STATUS_CODE, FACTORY_SOURCE_SYSTEM_ID } from '../v2/types';
import type { QualityControlResult } from './shared-types';

export function runDriftDetection(
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const reports: import('../reference-data-registry').DriftReport[] = [];

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

/**
 * M3: CCF Drift Detection
 *
 * Compares hardcoded CCF values per product type against l1.facility_type_dim.ccf_pct.
 * ERROR if mismatch between expected regulatory CCF and what's in L1.
 */
export function runCCFDriftDetection(
  registry: ReferenceDataRegistry,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Expected CCF values per product type (Basel III / CRE 20.93)
  const EXPECTED_CCF: Record<string, number> = {
    REVOLVING_CREDIT: 75,
    TERM_LOAN: 0,
    LETTER_OF_CREDIT: 20,
    BRIDGE_LOAN: 0,
  };

  const facilityTypeDim = registry.getTable('facility_type_dim');
  if (!facilityTypeDim || facilityTypeDim.rows.length === 0) {
    warnings.push('CCF drift: facility_type_dim not found in L1 registry — cannot validate CCF values');
    return { errors, warnings };
  }

  for (const [productType, expectedCCF] of Object.entries(EXPECTED_CCF)) {
    const dimRow = facilityTypeDim.rows.find(
      (r: Record<string, unknown>) =>
        (r.facility_type_code as string)?.toUpperCase() === productType ||
        (r.facility_type_name as string)?.toUpperCase() === productType.replace(/_/g, ' ')
    );
    if (!dimRow) {
      warnings.push(`CCF drift: product type '${productType}' not found in facility_type_dim`);
      continue;
    }
    const actualCCF = dimRow.ccf_pct as number | undefined;
    if (actualCCF === undefined || actualCCF === null) {
      warnings.push(`CCF drift: facility_type_dim has no ccf_pct for '${productType}'`);
      continue;
    }
    if (Math.abs(actualCCF - expectedCCF) > 0.01) {
      errors.push(
        `CCF drift: '${productType}' ccf_pct=${actualCCF}% in facility_type_dim but expected ${expectedCCF}% per Basel III`
      );
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

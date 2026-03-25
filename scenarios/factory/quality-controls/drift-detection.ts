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
      `FACTORY_SOURCE_SYSTEM_ID=${FACTORY_SOURCE_SYSTEM_ID} not in L1 seed SQL (OK — auto-inserted via factory prerequisites)`
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

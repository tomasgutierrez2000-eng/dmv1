/**
 * Diagnostic SQL queries for the DB Diagnostician agent.
 *
 * Each function generates a diagnostic SQL query for a specific fix category.
 * Results are used by the Remediation Engine to generate fixes.
 */

import type { DiagnosisFinding, FixCategory, Severity } from './types';

let findingCounter = 0;
function nextFindingId(): string {
  return `DIAG-${String(++findingCounter).padStart(3, '0')}`;
}

/** Reset counter (for testing). */
export function resetFindingCounter(): void {
  findingCounter = 0;
}

// ─── FK Orphan Detection ────────────────────────────────────────────────

export interface FKCheckDef {
  l1Table: string;
  l1Schema: string;
  l1Pk: string;
  l2Table: string;
  l2Schema: string;
  l2Fk: string;
  severity: Severity;
  description: string;
}

/** Core L1→L2 FK checks for diagnostic queries. */
export const DIAGNOSTIC_FK_CHECKS: FKCheckDef[] = [
  { l1Table: 'entity_type_dim', l1Schema: 'l1', l1Pk: 'entity_type_code',
    l2Table: 'counterparty', l2Schema: 'l2', l2Fk: 'entity_type_code',
    severity: 'CRITICAL', description: 'Basel III exposure class' },
  { l1Table: 'industry_dim', l1Schema: 'l1', l1Pk: 'industry_id',
    l2Table: 'counterparty', l2Schema: 'l2', l2Fk: 'industry_id',
    severity: 'CRITICAL', description: 'NAICS industry code' },
  { l1Table: 'enterprise_business_taxonomy', l1Schema: 'l1', l1Pk: 'managed_segment_id',
    l2Table: 'facility_master', l2Schema: 'l2', l2Fk: 'lob_segment_id',
    severity: 'HIGH', description: 'EBT LOB segment (rollup critical)' },
  { l1Table: 'country_dim', l1Schema: 'l1', l1Pk: 'country_code',
    l2Table: 'counterparty', l2Schema: 'l2', l2Fk: 'country_code',
    severity: 'MEDIUM', description: 'Country reference' },
  { l1Table: 'currency_dim', l1Schema: 'l1', l1Pk: 'currency_code',
    l2Table: 'facility_master', l2Schema: 'l2', l2Fk: 'currency_code',
    severity: 'MEDIUM', description: 'Currency reference' },
];

export function generateFKOrphanSQL(check: FKCheckDef): string {
  return `SELECT l2.${check.l2Fk}, COUNT(*) AS orphan_count
FROM ${check.l2Schema}.${check.l2Table} l2
LEFT JOIN ${check.l1Schema}.${check.l1Table} l1
  ON l2.${check.l2Fk} = l1.${check.l1Pk}
WHERE l1.${check.l1Pk} IS NULL
  AND l2.${check.l2Fk} IS NOT NULL
GROUP BY l2.${check.l2Fk}
ORDER BY orphan_count DESC
LIMIT 10`;
}

export function createFKOrphanFinding(
  check: FKCheckDef,
  orphanValue: string,
  orphanCount: number,
): DiagnosisFinding {
  return {
    finding_id: nextFindingId(),
    category: 'FK_ORPHAN',
    severity: check.severity,
    source: 'db-diagnostician',
    table: `${check.l2Schema}.${check.l2Table}`,
    l1_dim_table: `${check.l1Schema}.${check.l1Table}`,
    affected_rows: orphanCount,
    root_cause: `${check.l2Fk}='${orphanValue}' does not exist in ${check.l1Table}.${check.l1Pk}`,
    evidence_sql: generateFKOrphanSQL(check),
    fix_sql: `-- Fix: update orphaned FK to nearest valid value
UPDATE ${check.l2Schema}.${check.l2Table}
SET ${check.l2Fk} = (SELECT ${check.l1Pk} FROM ${check.l1Schema}.${check.l1Table} LIMIT 1)
WHERE ${check.l2Fk} = '${orphanValue}'`,
    fix_category: 'FK_ORPHAN',
    blast_radius: check.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    requires_human: false,
  };
}

// ─── Cross-Table Value Reconciliation ────────────────────────────────────

export function generateReconciliationSQL(): string {
  return `SELECT frs.facility_id, frs.pd_pct AS risk_pd, p.pd_estimate AS position_pd,
       ABS(frs.pd_pct - p.pd_estimate) AS drift
FROM l2.facility_risk_snapshot frs
JOIN l2.position p ON frs.facility_id = p.facility_id AND frs.as_of_date = p.as_of_date
WHERE ABS(frs.pd_pct - p.pd_estimate) > 0.01
ORDER BY drift DESC
LIMIT 20`;
}

export function createReconciliationFinding(
  facilityId: string,
  riskPd: number,
  positionPd: number,
): DiagnosisFinding {
  return {
    finding_id: nextFindingId(),
    category: 'VALUE_INCONSISTENCY',
    severity: 'MEDIUM',
    source: 'db-diagnostician',
    table: 'l2.facility_risk_snapshot ↔ l2.position',
    affected_rows: 1,
    root_cause: `PD mismatch: risk_snapshot.pd_pct=${riskPd} vs position.pd_estimate=${positionPd}`,
    evidence_sql: generateReconciliationSQL(),
    fix_sql: `UPDATE l2.position SET pd_estimate = ${riskPd} WHERE facility_id = ${facilityId}`,
    fix_category: 'VALUE_INCONSISTENCY',
    blast_radius: 'LOW',
    requires_human: false,
  };
}

// ─── EBT Cascade Consistency ─────────────────────────────────────────────

export function generateCascadeSQL(): string {
  return `SELECT fm.facility_id, fm.lob_segment_id AS master_lob,
       fes.lob_segment_id AS exposure_lob
FROM l2.facility_master fm
JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fm.lob_segment_id != fes.lob_segment_id
LIMIT 20`;
}

export function createCascadeFinding(
  facilityId: string,
  masterLob: string,
  exposureLob: string,
): DiagnosisFinding {
  return {
    finding_id: nextFindingId(),
    category: 'CASCADE_BREAK',
    severity: 'HIGH',
    source: 'db-diagnostician',
    table: 'l2.facility_master ↔ l2.facility_exposure_snapshot',
    affected_rows: 1,
    root_cause: `lob_segment_id mismatch: facility_master=${masterLob}, exposure_snapshot=${exposureLob}`,
    evidence_sql: generateCascadeSQL(),
    fix_sql: `UPDATE l2.facility_exposure_snapshot SET lob_segment_id = ${masterLob} WHERE facility_id = ${facilityId}`,
    fix_category: 'CASCADE_BREAK',
    blast_radius: 'HIGH',
    requires_human: false,
  };
}

// ─── Schema Drift Detection ──────────────────────────────────────────────

export function createSchemaDriftFinding(
  table: string,
  column: string,
  issue: string,
): DiagnosisFinding {
  return {
    finding_id: nextFindingId(),
    category: 'SCHEMA_DRIFT',
    severity: 'HIGH',
    source: 'db-diagnostician',
    table,
    affected_rows: 0,
    root_cause: `Schema drift: ${issue} for column ${column}`,
    evidence_sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table.split('.').pop()}'`,
    fix_sql: '-- REQUIRES HUMAN: schema drift cannot be auto-fixed',
    fix_category: 'SCHEMA_DRIFT',
    blast_radius: 'HIGH',
    requires_human: true,
  };
}

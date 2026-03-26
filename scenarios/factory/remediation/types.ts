/**
 * Types for the Remediation Module — DB Diagnostician, Engine, and Verifier.
 */

export type FixCategory =
  | 'FK_ORPHAN'
  | 'TYPE_MISMATCH'
  | 'MISSING_ROWS'
  | 'VALUE_INCONSISTENCY'
  | 'STORY_VIOLATION'
  | 'DISTRIBUTION_ANOMALY'
  | 'TEMPORAL_GAP'
  | 'DIM_SPARSITY'
  | 'CASCADE_BREAK'
  | 'SCHEMA_DRIFT';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BlastRadius = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DiagnosisFinding {
  finding_id: string;
  category: FixCategory;
  severity: Severity;
  source: string;
  table: string;
  l1_dim_table?: string;
  affected_rows: number;
  root_cause: string;
  evidence_sql: string;
  fix_sql: string;
  fix_category: FixCategory;
  blast_radius: BlastRadius;
  requires_human: boolean;
}

export interface DiagnosisReport {
  timestamp: string;
  scope: 'FULL_DB' | 'SCENARIO' | 'TABLE';
  total_findings: number;
  findings: DiagnosisFinding[];
  summary_by_category: Record<string, number>;
  summary_by_severity: Record<string, number>;
  estimated_fix_time_minutes: number;
}

export type FixStatus = 'APPLIED' | 'SKIPPED' | 'FAILED' | 'FLAGGED_FOR_HUMAN';

export interface RemediationFix {
  finding_id: string;
  status: FixStatus;
  fix_sql: string;
  rows_affected: number;
  rollback_sql: string;
  applied_at?: string;
}

export interface RemediationReport {
  diagnosis_id: string;
  total_findings: number;
  fixed: number;
  skipped: number;
  flagged_for_human: number;
  failed: number;
  fixes: RemediationFix[];
  rollback_sql_path: string;
}

export interface VerificationResult {
  check_name: string;
  passed: boolean;
  score_before: number;
  score_after: number;
  regression: boolean;
}

export interface VerificationReport {
  remediation_id: string;
  checks_run: number;
  checks_passed: number;
  checks_failed: number;
  regressions: VerificationResult[];
  score_before: { validator: number; observer: number; realism: number };
  score_after: { validator: number; observer: number; realism: number };
  verdict: 'VERIFIED' | 'REGRESSIONS_FOUND' | 'PARTIAL';
}

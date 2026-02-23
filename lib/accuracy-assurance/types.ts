/**
 * Accuracy Assurance Engine — types for validation runs and breaks.
 */

export type ValidationResult = 'pass' | 'warning' | 'fail';

export interface ValidationRun {
  run_id: string;
  layer: 1 | 2 | 3 | 4;
  entity_ref?: string;
  entity_type?: string;
  result: ValidationResult;
  details?: Record<string, unknown>;
  run_at?: string;
}

export type BreakStatus =
  | 'Identified'
  | 'Under Investigation'
  | 'Root Cause Determined'
  | 'Remediation In Progress'
  | 'Resolved'
  | 'Closed';

export type BreakSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ReconciliationBreak {
  break_id: string;
  break_type: string;
  severity: BreakSeverity;
  status: BreakStatus;
  metric_ref?: string;
  target_ref?: string;
  variance_amount?: number;
  variance_pct?: number;
  assigned_to?: string;
  identified_at?: string;
  resolved_at?: string;
  root_cause?: string;
}

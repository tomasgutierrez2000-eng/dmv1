/**
 * GSIB Calculation Engine — Engine Runtime Types
 */

import type { AggregationLevel, ValidationRuleType, ValidationSeverity } from './metric-definition';

export type CalcRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type MetricExecStatus = 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
export type ValidationStatus = 'PASS' | 'FAIL' | 'SKIP';

/** Runtime configuration for the calculation engine */
export interface EngineConfig {
  databaseUrl: string;
  poolSize: number;
  statementTimeoutMs: number;
  maxRetriesOnConnError: number;
  retryDelayMs: number;
  continueOnError: boolean;
  dryRun: boolean;
  verbose: boolean;
}

/** A single calculation run context */
export interface CalcRunContext {
  runId: string;
  runVersionId: string;
  asOfDate: string;
  priorAsOfDate: string;
  baseCurrency: string;
  config: EngineConfig;
  gitSha: string;
  engineVersion: string;
  startedAt: Date;
}

/** Result of executing one metric at one level */
export interface LevelExecutionResult {
  metricId: string;
  level: AggregationLevel;
  status: MetricExecStatus;
  rowsReturned: number;
  rowsWritten: number;
  durationMs: number;
  sqlExecuted: string;
  sqlHash: string;
  sourceRowCounts: Record<string, number>;
  error?: {
    message: string;
    code: string;
    detail?: string;
  };
}

/** Result of executing all levels for one metric */
export interface MetricExecutionResult {
  metricId: string;
  metricVersion: string;
  overallStatus: MetricExecStatus;
  levels: LevelExecutionResult[];
  validationResults: ValidationCheckResult[];
  totalRowsWritten: number;
  totalDurationMs: number;
}

/** Result of a single validation check */
export interface ValidationCheckResult {
  ruleId: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  status: ValidationStatus;
  metricId: string;
  level?: AggregationLevel;
  dimensionKey?: string;
  expectedValue?: number;
  actualValue?: number;
  tolerance?: number;
  message: string;
  detail?: Record<string, unknown>;
}

/** Summary of a complete calculation run */
export interface CalcRunSummary {
  runId: string;
  runVersionId: string;
  asOfDate: string;
  status: CalcRunStatus;
  metricsRequested: number;
  metricsSucceeded: number;
  metricsFailed: number;
  metricsSkipped: number;
  totalRowsWritten: number;
  durationMs: number;
  validationSummary: {
    passed: number;
    failed: number;
    warnings: number;
  };
  failedMetrics: string[];
  skippedMetrics: string[];
}

/**
 * Agent Library — Type definitions for the artifact-centric observatory.
 * Covers agent definitions, audit records, artifacts, and performance metrics.
 */

// ─── Agent Definitions (parsed from .claude/commands/*.md) ───────────────────

export type AgentStatus = 'built' | 'planned' | 'in-progress';
export type AgentCategory = 'expert' | 'builder' | 'reviewer' | 'workflow' | 'session';

export type CapabilityPhase = 'context' | 'analysis' | 'output' | 'validation' | 'general';

export interface AgentCapability {
  title: string;           // ## header text
  description: string;     // First 2 sentences from content below header
  phase: CapabilityPhase;
}

export interface AgentDefinition {
  name: string;
  slug: string;               // URL-safe identifier (filename without .md)
  description: string;
  filePath: string;
  category: AgentCategory;
  status: AgentStatus;
  sessionId: string | null;   // e.g. "S1" — extracted from filename pattern
  capabilities: AgentCapability[];  // structured capabilities from ## section headers
  prerequisites: string[];    // from "Prerequisites Check" / "Context Loading" sections
  dependencies: string[];     // agent names this depends on
  version: string | null;
  inputFormat: string | null;  // "$ARGUMENTS" presence or input section
  lastRunAt: string | null;    // from audit data, if available
  totalRuns: number;
  successRate: number | null;  // percentage, from audit data
}

// ─── Audit Records (from postgres_audit tables) ─────────────────────────────

export type RunStatus = 'started' | 'completed' | 'failed' | 'blocked_by_reviewer';

export interface ReasoningStep {
  step: number;
  thought: string;
  decision: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ActionTaken {
  type: string;
  detail: string;
  timestamp: string;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model_name?: string;
}

export interface AgentRun {
  run_id: string;
  session_id: string;
  agent_name: string;
  agent_version: string | null;
  trigger_source: 'user' | 'orchestrator' | 'sub_agent';
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  reasoning_chain: ReasoningStep[];
  actions_taken: ActionTaken[];
  status: RunStatus;
  error_message: string | null;
  duration_ms: number | null;
  token_usage: TokenUsage | null;
  created_at: string;
  completed_at: string | null;
  // Hydrated artifact counts (joined from other tables)
  artifact_counts?: {
    schema_changes: number;
    decompositions: number;
    findings: number;
    lineage_entries: number;
  };
}

// ─── Artifact Types ──────────────────────────────────────────────────────────

export type ArtifactType = 'schema_change' | 'decomposition' | 'finding' | 'lineage_entry';

export interface SchemaChange {
  change_id: string;
  run_id: string;
  change_type: string;
  object_schema: string;
  object_name: string;
  ddl_before: string | null;
  ddl_after: string | null;
  ddl_statement: string | null;
  impact_assessment: Record<string, unknown> | null;
  approved_by_reviewer: boolean;
  reviewer_run_id: string | null;
  reviewer_notes: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  rollback_ddl: string | null;
  created_at: string;
  // Joined
  agent_name?: string;
}

export interface MetricDecomposition {
  decomp_id: string;
  run_id: string;
  metric_id: string;
  metric_name: string;
  risk_stripe: string;
  formula_latex: string | null;
  formula_sql: string | null;
  ingredients: Array<{
    name: string;
    source_table: string;
    source_field: string;
    data_type?: string;
    transformation?: string;
  }>;
  consumers: Array<{ function: string; team: string; use_case: string }> | null;
  rollup_dimensions: Array<{ level: string; dimension: string; aggregation_method: string }> | null;
  regulatory_refs: Array<{ standard: string; article: string; description: string }> | null;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  supersedes_decomp_id: string | null;
  created_at: string;
  // Joined
  agent_name?: string;
}

export interface ReviewFinding {
  finding_id: string;
  run_id: string;
  finding_ref: string;
  finding_type: 'pre_execution' | 'post_execution';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  mra_classification: 'MRA' | 'MRIA' | 'OFI' | 'N/A';
  domain: string;
  issue_description: string;
  regulatory_reference: string | null;
  affected_objects: Array<{ type: string; name: string; schema?: string }> | null;
  required_action: string | null;
  remediation_plan: string | null;
  status: 'BLOCKING' | 'WARNING' | 'INFORMATIONAL' | 'RESOLVED' | 'WAIVED';
  resolution_notes: string | null;
  resolved_by_run_id: string | null;
  created_at: string;
  resolved_at: string | null;
  // Joined
  agent_name?: string;
}

export interface DataLineageEntry {
  lineage_id: string;
  run_id: string | null;
  metric_id: string;
  ingredient_name: string;
  source_system: string | null;
  source_table: string;
  source_field: string;
  target_table: string | null;
  target_field: string | null;
  transformation_logic: string | null;
  bcbs239_principle_ref: string | null;
  data_quality_tier: 'T1' | 'T2' | 'T3';
  validation_rule: string | null;
  refresh_frequency: string | null;
  created_at: string;
}

// ─── Performance Metrics ─────────────────────────────────────────────────────

export interface AgentMetricsDaily {
  agent_name: string;
  metric_date: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  blocked_runs: number;
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
  total_tokens: number;
  artifacts_produced: number;
}

export interface AgentPerformanceSummary {
  agent_name: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  blocked_runs: number;
  success_rate: number;
  avg_duration_ms: number | null;
  p50_duration_ms: number | null;
  p95_duration_ms: number | null;
  total_tokens: number;
  total_artifacts: number;
  last_run_at: string | null;
  daily_metrics: AgentMetricsDaily[];
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface AgentCatalogResponse {
  agents: AgentDefinition[];
  categories: Record<AgentCategory, number>;
  total_runs: number;
  audit_connected: boolean;
}

export interface RunListResponse {
  runs: AgentRun[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArtifactSummary {
  schema_changes: number;
  decompositions: number;
  findings: number;
  lineage_entries: number;
  total: number;
}

export interface PerformanceOverview {
  agents: AgentPerformanceSummary[];
  global_totals: {
    total_runs: number;
    total_tokens: number;
    total_artifacts: number;
    avg_success_rate: number;
  };
}

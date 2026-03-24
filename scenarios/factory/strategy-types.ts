/**
 * Type definitions for the Strategy Advisor and Generator Builder.
 */

/* ────────────────── Generation Strategy ────────────────── */

/**
 * The strategy for how to generate data.
 */
export type GenerationStrategy =
  | 'EXTEND_TEMPORAL'   // Most common: add new dates to existing tables
  | 'FRESH_START'       // Truncate + regenerate all (breaking schema changes)
  | 'PATCH'             // Fill gaps in existing data (missing dates/tables)
  | 'SCENARIO_APPEND';  // Add a new scenario alongside existing data

/* ────────────────── Current DB State ────────────────── */

export interface TableState {
  qualifiedName: string;
  rowCount: number;
  minDate: string | null;
  maxDate: string | null;
  distinctDates: number;
}

export interface CurrentDBState {
  /** Whether PG connection succeeded */
  connected: boolean;
  /** Per-table state */
  tables: TableState[];
  /** Overall date range across all tables */
  overallMinDate: string | null;
  overallMaxDate: string | null;
  /** Total row count across all tables */
  totalRows: number;
}

/* ────────────────── Strategy Decision ────────────────── */

export interface StrategyDecision {
  /** The chosen strategy */
  strategy: GenerationStrategy;
  /** Why this strategy was chosen */
  rationale: string;
  /** Target dates to generate */
  targetDates: string[];
  /** Tables to generate (qualified names) */
  tablesToGenerate: string[];
  /** SQL to run before generation (cleanup, if needed) */
  cleanupSQL: string | null;
  /** Whether user confirmation is required before proceeding */
  requiresConfirmation: boolean;
  /** Reason for requiring confirmation (if applicable) */
  confirmationReason?: string;
  /** Estimated total rows to generate */
  estimatedRows: number;
}

/* ────────────────── Execution Plan ────────────────── */

export interface ExecutionStep {
  /** Step number (1-based) */
  step: number;
  /** What to do */
  action: 'CLEANUP' | 'GENERATE_L1' | 'GENERATE_L2' | 'CREATE_GENERATOR' | 'VALIDATE' | 'LOAD';
  /** Target table(s) */
  tables: string[];
  /** Estimated rows */
  estimatedRows: number;
  /** Description */
  description: string;
}

export interface ExecutionPlan {
  /** Strategy decision this plan implements */
  strategy: StrategyDecision;
  /** Ordered execution steps */
  steps: ExecutionStep[];
  /** Total estimated rows */
  totalEstimatedRows: number;
  /** Total estimated tables */
  totalTables: number;
}

/* ────────────────── Generator Scaffold ────────────────── */

export interface ColumnGenerationStrategy {
  columnName: string;
  dataType: string;
  strategy: 'FK_LOOKUP' | 'GSIB_RANGE' | 'DIM_ENUM' | 'FROM_STATE' | 'DATE_GRID' | 'BOOLEAN_FLAG' | 'CONSTANT' | 'DERIVED' | 'ID_REGISTRY';
  /** For FK_LOOKUP: the parent table and column */
  fkSource?: { table: string; column: string };
  /** For GSIB_RANGE: min/max */
  range?: { min: number; max: number };
  /** For DIM_ENUM: valid values */
  validValues?: string[];
  /** For FROM_STATE: which FacilityState field to read */
  stateField?: string;
  /** For CONSTANT: the constant value */
  constantValue?: unknown;
}

export interface GeneratorScaffold {
  /** Target table (qualified name) */
  qualifiedName: string;
  /** Generator function name (e.g., "generateLegalEntityRows") */
  functionName: string;
  /** File name (e.g., "legal-entity.ts") */
  fileName: string;
  /** Per-column generation strategies */
  columns: ColumnGenerationStrategy[];
  /** TypeScript source code for the generator */
  sourceCode: string;
  /** Registry update code (to add to generators/index.ts) */
  registryUpdateCode: string;
  /** Dependencies on other generators */
  dependsOn: string[];
}

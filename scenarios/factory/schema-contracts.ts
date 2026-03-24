/**
 * Schema Contracts — type definitions for the schema analyzer and data factory agent suite.
 *
 * A SchemaContract is a per-table specification that encodes:
 *   - Every column's type, FK target, and GSIB-realistic value constraints
 *   - Temporal behavior (is this a time-series table?)
 *   - Correlation groups (columns that must co-vary)
 *
 * These contracts flow to: GeneratorBuilder (what to generate), StoryWeaver (valid ranges),
 * EnhancedValidator (what to check), and ScenarioObserver (what to verify).
 */

/* ────────────────── Table Classification ────────────────── */

/**
 * Classification of a table by its role in the data model.
 * Determines what kind of generator is needed.
 */
export type TableClassification =
  | 'L1_DIM'        // Static reference/dimension table (e.g., entity_type_dim)
  | 'L1_MASTER'     // Slowly changing master table (e.g., facility_master)
  | 'L2_SNAPSHOT'   // Time-series snapshot table (e.g., facility_exposure_snapshot)
  | 'L2_EVENT'      // Sporadic event table (e.g., credit_event)
  | 'L3_DERIVED'    // Calculated/aggregated — skip generation (calc engine handles)
  | 'JUNCTION';     // Many-to-many bridge table (e.g., collateral_link)

/* ────────────────── Column Contract ────────────────── */

export interface FKTarget {
  /** Fully qualified parent table (e.g., "l1.facility_master") */
  parentTable: string;
  /** Parent column name (e.g., "facility_id") */
  parentColumn: string;
}

export interface GSIBRange {
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Optional sub-ranges keyed by rating tier or health state */
  byTier?: Record<string, { min: number; max: number }>;
}

export interface TemporalConstraint {
  /** Maximum absolute change per month (e.g., PD can't change >3x) */
  maxMonthlyChangeFactor?: number;
  /** Maximum absolute change per month (e.g., utilization ±25%) */
  maxMonthlyChangeAbsolute?: number;
  /** Must correlate with another field's direction */
  directionMustMatch?: string;
}

/**
 * Per-column contract specifying what valid data looks like.
 */
export interface ColumnContract {
  /** Column name */
  name: string;
  /** PostgreSQL data type from DD (e.g., "BIGINT", "NUMERIC(10,6)", "VARCHAR(30)") */
  dataType: string;
  /** Whether NULL is allowed */
  nullable: boolean;
  /** Is this column part of the primary key? */
  isPK: boolean;
  /** FK target if this column references another table */
  fkTarget?: FKTarget;
  /** GSIB-realistic value range (for numeric columns) */
  gsibRange?: GSIBRange;
  /** Valid enum values (for _code columns referencing dim tables) */
  validValues?: string[];
  /** Temporal constraint (for time-series columns that evolve month-over-month) */
  temporalConstraint?: TemporalConstraint;
  /** Correlation group — columns that must co-vary (e.g., "pd_rating" group) */
  correlationGroup?: string;
  /** Generation strategy hint */
  generationHint?: 'FK_LOOKUP' | 'GSIB_RANGE' | 'DIM_ENUM' | 'FROM_STATE' | 'DATE_GRID' | 'BOOLEAN_FLAG' | 'CONSTANT' | 'DERIVED';
}

/* ────────────────── Table Contract ────────────────── */

/**
 * Per-table contract — the complete specification of what valid data looks like
 * for one table in the data model.
 */
export interface SchemaContract {
  /** Fully qualified table name (e.g., "l2.facility_risk_snapshot") */
  qualifiedName: string;
  /** Schema (l1, l2, l3) */
  schema: string;
  /** Table name without schema prefix */
  tableName: string;
  /** Classification determining generator type */
  classification: TableClassification;
  /** Layer (L1, L2, L3) */
  layer: 'L1' | 'L2' | 'L3';
  /** Is this a time-series table with as_of_date? */
  isTemporal: boolean;
  /** Primary key column(s) */
  primaryKey: string[];
  /** Per-column contracts */
  columns: ColumnContract[];
  /** FK dependencies — tables that must be populated before this one */
  dependsOn: string[];
  /** Tables that reference this table (for impact analysis) */
  referencedBy: string[];
}

/* ────────────────── Coverage Report ────────────────── */

export interface TableCoverageInfo {
  qualifiedName: string;
  layer: 'L1' | 'L2' | 'L3';
  classification: TableClassification;
  /** Whether a V2 generator exists for this table */
  hasGenerator: boolean;
  /** Whether this table appears in the LOAD_ORDER for SQL emission */
  inLoadOrder: boolean;
  /** Number of columns in DD */
  columnCount: number;
}

export interface CoverageReport {
  /** Total tables in data dictionary */
  totalTables: number;
  /** Tables with V2 generators */
  tablesWithGenerators: number;
  /** Tables in LOAD_ORDER */
  tablesInLoadOrder: number;
  /** Uncovered L2 tables (most critical — need generators) */
  uncoveredL2: TableCoverageInfo[];
  /** Uncovered L1 tables */
  uncoveredL1: TableCoverageInfo[];
  /** L3 tables (skipped — calc engine handles) */
  l3Tables: number;
  /** Per-table coverage info */
  allTables: TableCoverageInfo[];
}

/* ────────────────── Generation Plan ────────────────── */

export interface TableGenerationStep {
  /** Fully qualified table name */
  qualifiedName: string;
  /** What action to take */
  action: 'CREATE_GENERATOR' | 'EXTEND_GENERATOR' | 'USE_EXISTING' | 'SKIP_L3' | 'SEED_STATIC';
  /** Classification */
  classification: TableClassification;
  /** The schema contract for this table */
  contract: SchemaContract;
  /** Estimated row count per date */
  estimatedRowsPerDate: number;
  /** Dependencies that must be generated first */
  mustGenerateAfter: string[];
  /** Reason for this action */
  reason: string;
}

export interface GenerationPlan {
  /** Ordered list of tables to generate (respects FK ordering) */
  steps: TableGenerationStep[];
  /** Summary stats */
  summary: {
    totalSteps: number;
    newGeneratorsNeeded: number;
    existingGeneratorsUsed: number;
    l3Skipped: number;
    staticSeeded: number;
    estimatedTotalRows: number;
  };
}

/* ────────────────── FK Dependency DAG ────────────────── */

export interface FKDAGNode {
  /** Fully qualified table name */
  qualifiedName: string;
  /** Tables this table depends on (FK parent tables) */
  parents: string[];
  /** Tables that depend on this table (FK child tables) */
  children: string[];
  /** Topological order index (0 = no dependencies) */
  topoOrder: number;
}

export interface FKDependencyDAG {
  /** All nodes in the DAG */
  nodes: Map<string, FKDAGNode>;
  /** Topologically sorted table names (parents before children) */
  sortedOrder: string[];
  /** Tables with no FK dependencies (roots) */
  roots: string[];
  /** Tables with no dependents (leaves) */
  leaves: string[];
}

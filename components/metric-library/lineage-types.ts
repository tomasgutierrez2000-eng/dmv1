/**
 * Shared types for metric lineage views.
 *
 * Used by LTV, DSCR, Committed Amount, and future metric deep-dive components.
 * These types capture data sourcing, calculation steps, and cross-level dependencies
 * in a metric-agnostic way so any metric's lineage view can reuse the same rendering
 * primitives (StepTypeBadge, IngredientRow, EnhancedRollupPyramid, etc.).
 */

/* ────────────────────────────────────────────────────────────────────────────
 * STEP TYPE — classifies each step in the lineage flow
 * ──────────────────────────────────────────────────────────────────────────── */

/** How a step obtains or transforms data. */
export type StepType = 'SOURCING' | 'CALCULATION' | 'HYBRID';

/* ────────────────────────────────────────────────────────────────────────────
 * SOURCE TABLE METADATA
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SourceFieldMeta {
  field: string;
  type: string;              // e.g. 'DECIMAL(18,2)', 'BIGINT'
  description: string;
  isPK?: boolean;
  isFK?: boolean;
  fkTarget?: string;         // e.g. 'facility_master.facility_id'
  sampleValue?: string;
  /** Role this field plays in the metric formula */
  metricRole?: 'numerator_input' | 'denominator_input' | 'weight' | 'join_key' | 'filter' | 'dimension' | 'output';
}

export interface SourceTableMeta {
  table: string;
  layer: 'L1' | 'L2';
  alias?: string;            // SQL alias e.g. 'fes', 'cs'
  fieldsUsed: SourceFieldMeta[];
  joinTo?: {
    table: string;
    fromKey: string;
    toKey: string;
    type: 'INNER' | 'LEFT';
    note?: string;
  };
  /** Aggregation applied at sourcing time (makes this a HYBRID step) */
  aggregation?: string;      // e.g. 'SUM(current_valuation_usd) GROUP BY facility_id, as_of_date'
  isSubquery?: boolean;
  role: 'source' | 'reference';
}

/* ────────────────────────────────────────────────────────────────────────────
 * INGREDIENT — a single field traced to its source table
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Ingredient {
  name: string;              // Human-readable e.g. 'Drawn Amount (Loan Balance)'
  field: string;             // e.g. 'drawn_amount'
  table: string;             // e.g. 'facility_exposure_snapshot'
  layer: 'L1' | 'L2';
  sampleValue: number;
  stepType: StepType;
  aggregation?: string;      // e.g. 'SUM' when HYBRID
  description: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * LINEAGE STEP — one step in the tier-level data flow
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LineageStep {
  id: string;
  stepNumber: number;
  stepType: StepType;
  label: string;
  description: string;
  /** Which tier this step belongs to */
  tier: string;
  ingredients: Ingredient[];
  sourceTables: SourceTableMeta[];
  /** Formula expression for CALCULATION / HYBRID steps */
  formula?: string;
  /** Plain-English result description */
  outputDescription: string;
  /** IDs of prerequisite steps from other tiers (cross-level dependencies) */
  dependsOn?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * TIER SOURCE CONFIG — full configuration for one rollup tier
 * ──────────────────────────────────────────────────────────────────────────── */

export interface TierSourceConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  method: string;
  purpose: string;
  calcTier: string;          // 'T1' | 'T2' | 'T3'
  description: string;
  /** Tables feeding this tier (shown alongside in hierarchy overview) */
  sourceTables: SourceTableMeta[];
  /** Ordered steps at this tier */
  steps: LineageStep[];
  /** Cross-level dependencies: steps from lower tiers needed before this tier runs */
  crossLevelDeps?: { fromTier: string; fromTierLabel: string; stepIds: string[] }[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * JOIN HOP — for JoinChainVisual
 * ──────────────────────────────────────────────────────────────────────────── */

export interface JoinHop {
  from: string;
  fromLayer: 'L1' | 'L2' | 'L3';
  to: string;
  toLayer: 'L1' | 'L2' | 'L3';
  joinKey: string;
  note?: string;
}

export interface JoinChainData {
  hops: JoinHop[];
  aggregation: string;
  result: string;
}

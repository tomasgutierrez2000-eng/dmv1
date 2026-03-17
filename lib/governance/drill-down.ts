/**
 * Drill-Down — recursive hierarchy traversal for metric calculations.
 *
 * When a user expands a row at a given level (e.g., counterparty),
 * re-runs the metric formula at the child level filtered to only
 * entities belonging to that parent.
 *
 * Hierarchy: business_segment → portfolio → desk → counterparty → facility → position
 */

/* ── Hierarchy constants ──────────────────────────────────────── */

export const DRILL_HIERARCHY = [
  'business_segment', 'portfolio', 'desk', 'counterparty', 'facility', 'position',
] as const;

export type DrillLevel = (typeof DRILL_HIERARCHY)[number];

/** Maps a parent level to its immediate child level. */
export const CHILD_LEVEL: Record<string, DrillLevel | null> = {
  business_segment: 'portfolio',
  portfolio: 'desk',
  desk: 'counterparty',
  counterparty: 'facility',
  facility: 'position',
  position: null,
};

/**
 * Maps a DrillLevel to the tab key used for formula lookup.
 * Currently identity; allows future decoupling of UI tabs from drill levels.
 */
export function drillLevelToTab(level: DrillLevel): string | null {
  if (level === 'position') return null;
  return level;
}

/* ── Value Formatting ─────────────────────────────────────────── */

/** Format a raw value for display (extra columns, position data, etc.). */
export function formatNumber(val: unknown): string {
  if (val === null || val === undefined) return 'N/A';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Format a metric value based on unit_type. Handles all UnitType variants. */
export function formatMetricValue(val: number, unitType?: string): string {
  if (isNaN(val)) return 'N/A';
  switch (unitType) {
    case 'PERCENTAGE':
    case 'RATIO':
      return `${val.toFixed(1)}%`;
    case 'CURRENCY':
      return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'COUNT':
    case 'ORDINAL':
      return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'DAYS':
      return `${val.toFixed(0)}d`;
    case 'RATE':
      return `${val.toFixed(2)}%`;
    case 'INDEX':
      return val.toFixed(2);
    default:
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

/* ── Types ─────────────────────────────────────────────────────── */

export interface DrillDownNode {
  parentLevel: DrillLevel;
  parentDimKey: string;
  childLevel: DrillLevel;
  rows: DrillDownResultRow[];
  loading: boolean;
  error: string | null;
}

export interface DrillDownResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  dimension_label?: string;
  [key: string]: unknown;
}

/* ── SQL wrapping ──────────────────────────────────────────────── */

/**
 * Filter subquery for each parent→child relationship.
 * These filter the child-level formula's `dimension_key` to only include
 * entities belonging to the expanded parent row.
 */
const FILTER_SUBQUERIES: Record<string, string> = {
  // counterparty → facility: filter facilities by counterparty_id
  counterparty: `IN (
    SELECT facility_id FROM l2.facility_master
    WHERE counterparty_id = :parent_key
  )`,

  // desk → counterparty: filter counterparties by desk segment
  desk: `IN (
    SELECT DISTINCT fm.counterparty_id
    FROM l2.facility_master fm
    LEFT JOIN l1.enterprise_business_taxonomy ebt
      ON ebt.managed_segment_id = fm.lob_segment_id
    WHERE ebt.managed_segment_id = :parent_key
  )`,

  // portfolio → desk: filter desk segments by parent portfolio segment
  portfolio: `IN (
    SELECT managed_segment_id
    FROM l1.enterprise_business_taxonomy
    WHERE parent_segment_id = :parent_key
  )`,

  // business_segment → portfolio: filter portfolio segments by parent business segment
  business_segment: `IN (
    SELECT managed_segment_id
    FROM l1.enterprise_business_taxonomy
    WHERE parent_segment_id = :parent_key
  )`,
};

/**
 * Direct query for position-level data (leaf node).
 * No formula wrapping — just a SELECT from l2.position.
 */
export const POSITION_QUERY = `SELECT
  p.position_id AS dimension_key,
  p.balance_amount AS metric_value,
  p.product_code,
  p.currency_code,
  p.credit_status_code
FROM l2.position p
WHERE p.facility_id = :parent_key
  AND p.as_of_date = :as_of_date
ORDER BY p.balance_amount DESC`;

/**
 * Wrap a child-level formula SQL with a parent filter so only rows belonging
 * to the expanded parent are returned.
 *
 * Uses subquery wrapping (safe for all SQL including CTEs).
 */
export function buildDrillDownSqlSafe(
  childSql: string,
  parentLevel: DrillLevel,
): string {
  const filter = FILTER_SUBQUERIES[parentLevel];
  if (!filter) {
    throw new Error(`No drill-down filter defined for parent level: ${parentLevel}`);
  }

  // Always-safe approach: wrap the entire child SQL as a subquery
  return `SELECT * FROM (
${childSql}
) _drill_child
WHERE dimension_key ${filter}`;
}

/* ── Label resolution ──────────────────────────────────────────── */

/**
 * SQL to look up human-readable labels for dimension_key values at each level.
 * All dim_key values are cast to TEXT to ensure consistent type matching
 * with dimension_key values from formula results (pg returns BIGINT as string).
 * EBT queries filter is_current_flag = 'Y' to avoid duplicate segment IDs.
 */
const LABEL_QUERIES: Record<string, string> = {
  facility: `SELECT facility_id::text AS dim_key, facility_name AS dim_label FROM l2.facility_master`,
  counterparty: `SELECT counterparty_id::text AS dim_key, legal_name AS dim_label FROM l1.counterparty`,
  desk: `SELECT managed_segment_id::text AS dim_key, segment_name AS dim_label FROM l1.enterprise_business_taxonomy WHERE is_current_flag = 'Y'`,
  portfolio: `SELECT managed_segment_id::text AS dim_key, segment_name AS dim_label FROM l1.enterprise_business_taxonomy WHERE is_current_flag = 'Y'`,
  business_segment: `SELECT managed_segment_id::text AS dim_key, segment_name AS dim_label FROM l1.enterprise_business_taxonomy WHERE is_current_flag = 'Y'`,
  position: `SELECT position_id::text AS dim_key, product_code AS dim_label FROM l2.position WHERE as_of_date = :as_of_date`,
};

/**
 * Returns SQL to look up labels for a given level, or null if not available.
 */
export function buildLabelSql(level: DrillLevel): string | null {
  return LABEL_QUERIES[level] ?? null;
}

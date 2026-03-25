import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { resolveFormulaForDimension } from './formula-resolver';

/**
 * Extract table keys (L1.xxx, L2.xxx) referenced in raw SQL.
 * Matches l1.table, l2.table, and l3.table patterns, deduped via Set.
 */
export function extractTableRefsFromSql(sql: string): string[] {
  const keys = new Set<string>();
  const re = /\b(l[123])\.(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    keys.add(`${m[1]!.toUpperCase()}.${m[2]}`);
  }
  return Array.from(keys);
}

/**
 * Extract table references for a metric at a given dimension.
 *
 * Primary source: regex extraction from the resolved formula SQL.
 * Fallback: metric.sourceFields[] (only used when no SQL is available).
 */
export function getTableKeysForMetric(metric: L3Metric, dimension: CalculationDimension): string[] {
  // Primary: extract table references from the resolved formula SQL
  const resolved = resolveFormulaForDimension(metric, dimension);
  const sql = resolved?.formulaSQL ?? '';
  if (sql) {
    const keys = extractTableRefsFromSql(sql);
    if (keys.length > 0) return keys;
  }

  // Fallback: use sourceFields only when SQL extraction found nothing
  const keys = new Set<string>();
  for (const sf of metric.sourceFields || []) {
    if (sf.layer && sf.table) {
      keys.add(`${sf.layer}.${sf.table}`);
    }
  }

  return Array.from(keys);
}

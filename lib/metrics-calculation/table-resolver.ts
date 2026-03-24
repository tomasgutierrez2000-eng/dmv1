import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { resolveFormulaForDimension } from './formula-resolver';

/**
 * Extract table references for a metric at a given dimension.
 *
 * Primary source: regex extraction from the resolved formula SQL.
 * Fallback: metric.sourceFields[] (only used when no SQL is available).
 */
export function getTableKeysForMetric(metric: L3Metric, dimension: CalculationDimension): string[] {
  const keys = new Set<string>();

  // Primary: extract table references from the resolved formula SQL
  const resolved = resolveFormulaForDimension(metric, dimension);
  const sql = resolved?.formulaSQL ?? '';
  if (sql) {
    const re = /\b(l[12])\.(\w+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      keys.add(`${m[1].toUpperCase()}.${m[2]}`);
    }
  }

  // Fallback: use sourceFields only when SQL extraction found nothing
  if (keys.size === 0) {
    for (const sf of metric.sourceFields || []) {
      if (sf.layer && sf.table) {
        keys.add(`${sf.layer}.${sf.table}`);
      }
    }
  }

  return Array.from(keys);
}

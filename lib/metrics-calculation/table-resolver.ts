import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { resolveFormulaForDimension } from './formula-resolver';

export function getTableKeysForMetric(metric: L3Metric, dimension: CalculationDimension): string[] {
  const keys = new Set<string>();

  for (const sf of metric.sourceFields || []) {
    if (sf.layer && sf.table) {
      keys.add(`${sf.layer}.${sf.table}`);
    }
  }

  const resolved = resolveFormulaForDimension(metric, dimension, { allowLegacyFallback: true });
  const sql = resolved?.formulaSQL ?? '';
  if (sql) {
    const re = /\b(L[12])\.(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      keys.add(`${m[1]}.${m[2]}`);
    }
  }

  return Array.from(keys);
}

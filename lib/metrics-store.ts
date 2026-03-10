/**
 * Metrics source: when data/metrics_dimensions_filled.xlsx exists, it is the source of truth (replaces list).
 * Otherwise metrics are read from data/metrics-custom.json.
 * If custom JSON is empty, falls back to scanning YAML metric definitions.
 */

import fs from 'fs';
import path from 'path';
import type { L3Metric, DashboardPage, SourceField } from '@/data/l3-metrics';
import { getMetricsCustomPath, getProjectRoot } from '@/lib/config';

export interface CustomMetricsFile {
  version?: number;
  metrics: L3Metric[];
}

function ensureDataDir(): void {
  const metricsPath = getMetricsCustomPath();
  const dir = path.dirname(metricsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readCustomMetrics(): L3Metric[] {
  const metricsPath = getMetricsCustomPath();
  if (!fs.existsSync(metricsPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(getMetricsCustomPath(), 'utf-8');
    const data = JSON.parse(raw) as CustomMetricsFile;
    return Array.isArray(data.metrics) ? data.metrics : [];
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[metrics-store] readCustomMetrics parse failed:', err instanceof Error ? err.message : err);
    }
    return [];
  }
}

/** True if the error indicates a read-only filesystem (e.g. Vercel). */
export function isReadOnlyFsError(err: unknown): boolean {
  const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
  return code === 'EROFS' || code === 'EACCES';
}

export function writeCustomMetrics(metrics: L3Metric[]): void {
  ensureDataDir();
  const data: CustomMetricsFile = { version: 1, metrics };
  fs.writeFileSync(getMetricsCustomPath(), JSON.stringify(data, null, 2), 'utf-8');
}

/** Next id for new metrics (e.g. C001, C002). */
export function nextCustomMetricId(existing: L3Metric[]): string {
  const numericIds = existing
    .filter(m => m.id.startsWith('C') && /^C\d+$/.test(m.id))
    .map(m => parseInt(m.id.slice(1), 10))
    .filter(n => !Number.isNaN(n));
  const max = numericIds.length ? Math.max(...numericIds) : 0;
  return `C${String(max + 1).padStart(3, '0')}`;
}

/**
 * Scan YAML metric definitions and return L3Metric stubs with formulas and source fields.
 * Used as fallback when metrics-custom.json is empty.
 */
function readYamlMetricStubs(): L3Metric[] {
  const metricsDir = path.join(getProjectRoot(), 'scripts', 'calc_engine', 'metrics');
  if (!fs.existsSync(metricsDir)) return [];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let parseYaml: ((s: string) => Record<string, unknown>) | null = null;
  try { parseYaml = require('yaml').parse; } catch { /* yaml not available */ }

  const PAGE_MAP: Record<string, DashboardPage> = {
    exposure: 'P1', capital: 'P1', risk: 'P2',
    profitability: 'P3', pricing: 'P4', amendments: 'P5', reference: 'P6',
  };

  const stubs: L3Metric[] = [];
  try {
    for (const domain of fs.readdirSync(metricsDir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      const domainDir = path.join(metricsDir, domain.name);
      for (const file of fs.readdirSync(domainDir)) {
        if (!file.endsWith('.yaml') || file.startsWith('_')) continue;
        const metricId = file.replace('.yaml', '');

        let name = metricId;
        let formula = metricId;
        let formulaSQL: string | undefined;
        let description = `YAML metric ${metricId}`;
        const sourceFields: SourceField[] = [];

        if (parseYaml) {
          try {
            const raw = fs.readFileSync(path.join(domainDir, file), 'utf-8');
            const def = parseYaml(raw) as Record<string, unknown>;
            name = (def.name as string) || metricId;
            description = (def.description as string) || description;

            const levels = def.levels as Record<string, Record<string, string>> | undefined;
            if (levels) {
              const first = levels[Object.keys(levels)[0]];
              if (first) {
                formula = first.formula_text || first.formula_sql || metricId;
                formulaSQL = first.formula_sql;
              }
            }

            const tables = def.source_tables as Array<Record<string, unknown>> | undefined;
            if (tables) {
              for (const t of tables) {
                const schema = ((t.schema as string) || 'l2').toLowerCase();
                const layer: 'L1' | 'L2' = schema === 'l1' ? 'L1' : 'L2';
                const table = t.table as string;
                const fields = t.fields as Array<Record<string, string>> | undefined;
                if (fields) {
                  for (const f of fields) {
                    sourceFields.push({ layer, table, field: f.name });
                  }
                }
              }
            }
          } catch { /* parse error — use defaults */ }
        }

        stubs.push({
          id: metricId,
          name,
          page: PAGE_MAP[domain.name] || 'P1',
          section: domain.name,
          metricType: 'Derived',
          formula,
          formulaSQL,
          description,
          displayFormat: '',
          sampleValue: '',
          sourceFields,
          dimensions: [],
        });
      }
    }
  } catch {
    // Silently fall back to empty
  }
  return stubs;
}

/** All metrics — custom JSON > YAML stubs. Upload metrics via /api/metrics/import or /api/metrics/library/import. */
export function getMergedMetrics(): L3Metric[] {
  const custom = readCustomMetrics();
  if (custom.length > 0) return custom;
  return readYamlMetricStubs();
}

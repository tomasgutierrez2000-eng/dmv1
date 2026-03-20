import type { CatalogueItem, LevelDefinition } from '@/lib/metric-library/types';

/* ── Constants ─────────────────────────────────────────────────────── */

/** Map tab key to catalogue level_definitions level key. */
export const TAB_TO_LEVEL: Record<string, string> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

export const LEVEL_TABS = [
  { key: 'facility', label: 'Facility' },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'desk', label: 'Desk' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'business_segment', label: 'Segment' },
];

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ClassifiedError {
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  hint?: string;
}

export interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  [key: string]: unknown;
}

/* ── SQL syntax highlighting ─────────────────────────────────────── */

export function highlightSql(sql: string): string {
  const escaped = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const KEYWORDS = new Set([
    'SELECT','FROM','WHERE','JOIN','LEFT','INNER','RIGHT','CROSS','ON','AND','OR','AS',
    'GROUP','BY','ORDER','HAVING','UNION','CASE','WHEN','THEN','ELSE','END','IN','NOT',
    'IS','NULL','BETWEEN','LIKE','LIMIT','OFFSET','DISTINCT','EXISTS','WITH','OVER',
    'PARTITION',
  ]);
  const FUNCTIONS = new Set([
    'SUM','COUNT','AVG','MIN','MAX','COALESCE','NULLIF','ROUND','ABS','CAST',
    'ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD','GREATEST','LEAST','EXTRACT',
    'DATE_TRUNC','CURRENT_DATE',
  ]);

  const TOKEN_RE = /(:as_of_date|:param\w*)|('(?:[^']*)')|(l[123]\.\w+)|(\b[A-Z_]{2,}\b)|(\b\d+(?:\.\d+)?\b)/gi;

  return escaped.replace(TOKEN_RE, (match: string, bind: string, str: string, tblRef: string, upper: string, num: string) => {
    if (bind) return `<span class="text-pwc-orange">${match}</span>`;
    if (str) return `<span class="text-amber-300">${match}</span>`;
    if (tblRef) return `<span class="text-emerald-400">${match}</span>`;
    if (upper) {
      const u = match.toUpperCase();
      if (FUNCTIONS.has(u)) return `<span class="text-purple-400">${match}</span>`;
      if (KEYWORDS.has(u)) return `<span class="text-blue-400">${match}</span>`;
    }
    if (num) return `<span class="text-cyan-300">${match}</span>`;
    return match;
  });
}

/* ── Formula extraction ──────────────────────────────────────────── */

export function getFormulasForItem(item: CatalogueItem | null | undefined): Record<string, { sql: string; description: string }> {
  if (!item?.level_definitions?.length) return {};
  const result: Record<string, { sql: string; description: string }> = {};
  for (const tab of LEVEL_TABS) {
    const levelKey = TAB_TO_LEVEL[tab.key] ?? tab.key;
    const def = item.level_definitions.find((d: LevelDefinition) => d.level === levelKey);
    if (def?.formula_sql?.trim()) {
      result[tab.key] = {
        sql: def.formula_sql,
        description: (def.level_logic || def.dashboard_display_name) ?? '',
      };
    }
  }
  return result;
}

/* ── CSV Export ───────────────────────────────────────────────────── */

export function exportResultsToCSV(
  rows: ResultRow[],
  meta: { metricId?: string; level: string; asOfDate?: string | null; timestamp: string },
) {
  const keys = rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== 'dimension_label')
    : ['dimension_key', 'metric_value'];
  const headerComment = [
    `# Metric: ${meta.metricId ?? 'unknown'}`,
    `# Level: ${meta.level}`,
    `# as_of_date: ${meta.asOfDate ?? 'N/A'}`,
    `# Exported: ${meta.timestamp}`,
    `# Rows: ${rows.length}`,
  ].join('\n');
  const csvHeader = keys.join(',');
  const csvRows = rows.map(r =>
    keys.map(k => {
      const v = r[k];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','),
  );
  const blob = new Blob(
    [headerComment + '\n' + csvHeader + '\n' + csvRows.join('\n')],
    { type: 'text/csv;charset=utf-8;' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.metricId ?? 'metric'}_${meta.level}_${meta.asOfDate ?? 'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Statistical helpers ─────────────────────────────────────────── */

export function computeStats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  const outliers = sorted.filter(v => Math.abs(v - mean) > 2 * stdDev).length;
  return {
    min: sorted[0], max: sorted[sorted.length - 1],
    mean, median, stdDev, outliers, count: sorted.length,
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
  };
}

/* ── Error classification ────────────────────────────────────────── */

export function classifyError(err: unknown, status?: number): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  if (status === 503 || msg.includes('ECONNREFUSED') || msg.includes('connection'))
    return { message: 'Database unavailable', code: 'DB_UNAVAILABLE', severity: 'warning',
      hint: 'Check PostgreSQL connection status. The database may be restarting.' };
  if (msg.includes('timeout') || msg.includes('exceeded'))
    return { message: 'Query exceeded timeout', code: 'TIMEOUT', severity: 'warning',
      hint: 'Simplify the formula or narrow the date range.' };
  if (msg.includes('syntax') || msg.includes('near') || msg.includes('no such column') || msg.includes('no such table'))
    return { message: msg, code: 'FORMULA_INVALID', severity: 'error',
      hint: 'Check SQL syntax. Verify all table and column names exist in the data dictionary.' };
  if (msg.includes('SAMPLE_DATA_MISSING') || msg.includes('sample data'))
    return { message: 'No sample data found', code: 'SAMPLE_DATA_MISSING', severity: 'info',
      hint: 'Run `npm run generate:l2` to populate sample data.' };
  return { message: msg, code: 'UNKNOWN', severity: 'error' };
}

/* ── Metric color helper ─────────────────────────────────────────── */

export function metricColor(
  val: number,
  unitType?: string,
  direction?: string,
): string {
  if (unitType === 'PERCENTAGE' || unitType === 'RATIO') {
    if (direction === 'LOWER_BETTER') {
      if (val < 60) return 'text-emerald-400';
      if (val < 80) return 'text-amber-400';
      if (val < 100) return 'text-orange-400';
      return 'text-red-400';
    }
    if (direction === 'HIGHER_BETTER') {
      if (val >= 100) return 'text-emerald-400';
      if (val >= 80) return 'text-amber-400';
      if (val >= 60) return 'text-orange-400';
      return 'text-red-400';
    }
  }
  return 'text-gray-300';
}

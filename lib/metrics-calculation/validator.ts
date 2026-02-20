import type {
  CalculationDimension,
  DashboardPage,
  DimensionUsage,
  L3Metric,
  MetricType,
  SourceField,
} from '@/data/l3-metrics';
import { CALCULATION_DIMENSIONS } from '@/data/l3-metrics';

export const PAGES: DashboardPage[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
export const METRIC_TYPES: MetricType[] = ['Aggregate', 'Ratio', 'Count', 'Derived', 'Status', 'Trend', 'Table', 'Categorical'];
export const INTERACTIONS = ['FILTER', 'GROUP_BY', 'AVAILABLE', 'TOGGLE'] as const;

export function normalizeMetric(m: Partial<L3Metric>, id: string): L3Metric {
  return {
    id,
    name: m.name ?? '',
    page: PAGES.includes(m.page as DashboardPage) ? (m.page as DashboardPage) : 'P1',
    section: m.section ?? '',
    metricType: METRIC_TYPES.includes(m.metricType as MetricType) ? (m.metricType as MetricType) : 'Derived',
    formula: m.formula ?? '',
    formulaSQL: m.formulaSQL,
    description: m.description ?? '',
    displayFormat: m.displayFormat ?? '',
    sampleValue: m.sampleValue ?? '',
    sourceFields: Array.isArray(m.sourceFields) ? m.sourceFields : [],
    dimensions: Array.isArray(m.dimensions) ? m.dimensions : [],
    allowedDimensions: Array.isArray(m.allowedDimensions) ? m.allowedDimensions : undefined,
    formulasByDimension: m.formulasByDimension && Object.keys(m.formulasByDimension).length > 0 ? m.formulasByDimension : undefined,
    displayNameByDimension: m.displayNameByDimension && Object.keys(m.displayNameByDimension).length > 0 ? m.displayNameByDimension : undefined,
    toggles: m.toggles,
    notes: m.notes,
    nodes: m.nodes,
    edges: m.edges,
  };
}

function validateSourceField(sf: SourceField): string | null {
  if (!sf.layer || !sf.table?.trim() || !sf.field?.trim()) {
    return 'each source field must have layer, table, and field';
  }
  if (sf.layer !== 'L1' && sf.layer !== 'L2') {
    return 'source field layer must be L1 or L2';
  }
  return null;
}

function validateSqlShape(sql?: string): string | null {
  if (!sql || !sql.trim()) return null;
  const trimmed = sql.trim();
  if (!/^select\b/i.test(trimmed)) {
    return 'formulaSQL must start with SELECT';
  }
  const parts = trimmed.split(';').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return 'formulaSQL must contain a single SQL statement';
  }
  if (/\b(insert|update|delete|drop|alter|create|truncate)\b/i.test(trimmed)) {
    return 'formulaSQL must be read-only';
  }
  return null;
}

export function validateMetric(m: Partial<L3Metric>): { ok: boolean; error?: string } {
  if (!m.name?.trim()) return { ok: false, error: 'name is required' };
  if (!m.formula?.trim()) return { ok: false, error: 'formula is required' };
  if (!Array.isArray(m.sourceFields) || m.sourceFields.length === 0) {
    return { ok: false, error: 'at least one source field is required' };
  }
  for (const sf of m.sourceFields) {
    const sourceError = validateSourceField(sf);
    if (sourceError) return { ok: false, error: sourceError };
  }
  if (m.page && !PAGES.includes(m.page as DashboardPage)) {
    return { ok: false, error: `page must be one of: ${PAGES.join(', ')}` };
  }
  if (m.metricType && !METRIC_TYPES.includes(m.metricType as MetricType)) {
    return { ok: false, error: `metricType must be one of: ${METRIC_TYPES.join(', ')}` };
  }
  const baseSqlError = validateSqlShape(m.formulaSQL);
  if (baseSqlError) return { ok: false, error: baseSqlError };
  if (m.formulasByDimension) {
    for (const [dim, def] of Object.entries(m.formulasByDimension)) {
      if (!CALCULATION_DIMENSIONS.includes(dim as CalculationDimension)) {
        return { ok: false, error: `invalid calculation dimension: ${dim}` };
      }
      if (def && !def.formula?.trim()) {
        return { ok: false, error: `formula is required for dimension: ${dim}` };
      }
      const dimSqlError = validateSqlShape(def?.formulaSQL);
      if (dimSqlError) return { ok: false, error: `${dim}: ${dimSqlError}` };
    }
  }
  return { ok: true };
}

export function parseDimensions(str: string): DimensionUsage[] {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [dim, inter] = part.split(':').map((x) => x?.trim());
      if (!dim) return null;
      const interaction = inter && INTERACTIONS.includes(inter as DimensionUsage['interaction']) ? inter : 'FILTER';
      return { dimension: dim, interaction: interaction as DimensionUsage['interaction'] };
    })
    .filter((d): d is DimensionUsage => d !== null);
}

export function parseToggles(str: string): string[] {
  if (!str || typeof str !== 'string') return [];
  return str.split(';').map((s) => s.trim()).filter(Boolean);
}

const VALID_CALC_DIMENSIONS = new Set<string>(CALCULATION_DIMENSIONS);
export function parseAllowedDimensions(str: string): CalculationDimension[] | undefined {
  if (!str || typeof str !== 'string') return undefined;
  const parts = str.split(';').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const out = parts.filter((p): p is CalculationDimension => VALID_CALC_DIMENSIONS.has(p));
  return out.length === 0 || out.length === CALCULATION_DIMENSIONS.length ? undefined : out;
}

export function parseFormulasByDimension(
  row: Record<string, unknown>
): L3Metric['formulasByDimension'] | undefined {
  const out: Partial<Record<CalculationDimension, { formula: string; formulaSQL?: string }>> = {};
  for (const dim of CALCULATION_DIMENSIONS) {
    const formula = String(row[`formula_${dim}`] ?? '').trim();
    const formulaSQL = String(row[`formulaSQL_${dim}`] ?? '').trim() || undefined;
    if (!formula && !formulaSQL) continue;
    out[dim] = { formula: formula || String(row['formula'] ?? '').trim(), formulaSQL };
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

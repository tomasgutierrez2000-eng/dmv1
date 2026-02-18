import { NextRequest, NextResponse } from 'next/server';
import { readCustomMetrics, writeCustomMetrics, nextCustomMetricId } from '@/lib/metrics-store';
import { writeModelGaps } from '@/lib/model-gaps-store';
import { L3_METRICS } from '@/data/l3-metrics';
import type { L3Metric, DashboardPage, MetricType, DimensionUsage, SourceField } from '@/data/l3-metrics';

const PAGES: DashboardPage[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const METRIC_TYPES: MetricType[] = ['Aggregate', 'Ratio', 'Count', 'Derived', 'Status', 'Trend', 'Table', 'Categorical'];
const INTERACTIONS = ['FILTER', 'GROUP_BY', 'AVAILABLE', 'TOGGLE'] as const;
const BUILTIN_IDS = new Set(L3_METRICS.map(m => m.id));

function parseDimensions(str: string): DimensionUsage[] {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const [dim, inter] = part.split(':').map(x => x?.trim());
      if (!dim) return null;
      const interaction = inter && INTERACTIONS.includes(inter as DimensionUsage['interaction']) ? inter : 'FILTER';
      return { dimension: dim, interaction: interaction as DimensionUsage['interaction'] };
    })
    .filter((d): d is DimensionUsage => d !== null);
}

function parseToggles(str: string): string[] {
  if (!str || typeof str !== 'string') return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

function normalizeMetric(m: Partial<L3Metric>, id: string): L3Metric {
  return {
    id,
    name: m.name ?? '',
    page: PAGES.includes(m.page!) ? m.page! : 'P1',
    section: m.section ?? '',
    metricType: METRIC_TYPES.includes(m.metricType!) ? m.metricType! : 'Derived',
    formula: m.formula ?? '',
    formulaSQL: m.formulaSQL,
    description: m.description ?? '',
    displayFormat: m.displayFormat ?? '',
    sampleValue: m.sampleValue ?? '',
    sourceFields: Array.isArray(m.sourceFields) ? m.sourceFields : [],
    dimensions: Array.isArray(m.dimensions) ? m.dimensions : [],
    toggles: m.toggles,
    notes: m.notes,
  };
}

export interface ImportResult {
  created: string[];
  updated: string[];
  errors: { row?: number; sheet?: string; message: string }[];
  replaced?: boolean;
  count?: number;
}

/** POST: import metrics from Excel or JSON file. Form field replace=true replaces all custom metrics with file contents. */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const replace = String(formData.get('replace') ?? '').toLowerCase() === 'true';
  if (!file) {
    return NextResponse.json({ error: 'No file provided. Use form field "file".' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || '';
  const name = (file.name || '').toLowerCase();
  const isJson = name.endsWith('.json') || contentType.includes('application/json');
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || contentType.includes('spreadsheet');

  let toImport: L3Metric[] = [];
  const errors: ImportResult['errors'] = [];

  if (isJson) {
    try {
      const data = JSON.parse(buffer.toString('utf-8'));
      const list = data.metrics ?? (Array.isArray(data) ? data : []);
      if (!Array.isArray(list)) {
        return NextResponse.json({ error: 'JSON must have a "metrics" array or be an array of metrics.' }, { status: 400 });
      }
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m || typeof m !== 'object') {
          errors.push({ row: i + 1, message: 'Invalid metric object' });
          continue;
        }
        const id = (m.id ?? '').trim() || nextCustomMetricId(toImport);
        if (!m.name?.trim()) { errors.push({ row: i + 1, message: 'name is required' }); continue; }
        if (!m.formula?.trim()) { errors.push({ row: i + 1, message: 'formula is required' }); continue; }
        if (!Array.isArray(m.sourceFields) || m.sourceFields.length === 0) {
          errors.push({ row: i + 1, message: 'at least one source field is required' });
          continue;
        }
        toImport.push(normalizeMetric(m, id));
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON: ' + (e instanceof Error ? e.message : 'parse error') }, { status: 400 });
    }
  } else if (isExcel) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const metricsSheet = wb.Sheets['Metrics'] || wb.Sheets[wb.SheetNames[0]];
    const sourceSheet = wb.Sheets['SourceFields'] || wb.Sheets[wb.SheetNames[1]];
    if (!metricsSheet) {
      return NextResponse.json({ error: 'Excel must have a "Metrics" sheet.' }, { status: 400 });
    }
    const metricsRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(metricsSheet, { defval: '' });
    const sourceRows = sourceSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sourceSheet, { defval: '' }) : [];

    const sourceByMetric = new Map<string, SourceField[]>();
    for (const row of sourceRows) {
      const metricId = String(row['metric_id'] ?? '').trim();
      if (!metricId) continue;
      const ord = Number(row['ord']) || 0;
      const layer = String(row['layer'] ?? '').trim();
      const table = String(row['table'] ?? '').trim();
      const field = String(row['field'] ?? '').trim();
      if (!table || !field) continue;
      if (layer !== 'L1' && layer !== 'L2') continue;
      const list = sourceByMetric.get(metricId) ?? [];
      list[ord - 1] = {
        layer: layer as 'L1' | 'L2',
        table,
        field,
        description: String(row['description'] ?? '').trim() || undefined,
        sampleValue: String(row['sampleValue'] ?? '').trim() || undefined,
      };
      sourceByMetric.set(metricId, list);
    }
    for (const [mid, list] of sourceByMetric) {
      sourceByMetric.set(mid, list.filter(Boolean));
    }

    let rowNum = 0;
    for (const row of metricsRows) {
      rowNum++;
      const id = String(row['id'] ?? '').trim();
      const name = String(row['name'] ?? '').trim();
      const formula = String(row['formula'] ?? '').trim();
      if (!name) { errors.push({ row: rowNum, sheet: 'Metrics', message: 'name is required' }); continue; }
      if (!formula) { errors.push({ row: rowNum, sheet: 'Metrics', message: 'formula is required' }); continue; }
      if (!id) {
        errors.push({ row: rowNum, sheet: 'Metrics', message: 'id is required (e.g. C001 for new metrics). Add the same id in SourceFields sheet.' });
        continue;
      }
      const sourceFields = sourceByMetric.get(id) ?? [];
      if (sourceFields.length === 0) {
        errors.push({ row: rowNum, sheet: 'Metrics', message: 'at least one source field required in SourceFields sheet with this metric_id' });
        continue;
      }
      if (BUILTIN_IDS.has(id)) {
        errors.push({ row: rowNum, sheet: 'Metrics', message: `id "${id}" is reserved for built-in metrics` });
        continue;
      }
      const finalId = id;
      const page = String(row['page'] ?? 'P1').trim();
      const metricType = String(row['metricType'] ?? 'Derived').trim();
      const dimensions = parseDimensions(String(row['dimensions'] ?? ''));
      const toggles = parseToggles(String(row['toggles'] ?? ''));
      toImport.push(normalizeMetric({
        id: finalId,
        name,
        page: PAGES.includes(page as DashboardPage) ? page as DashboardPage : 'P1',
        section: String(row['section'] ?? '').trim(),
        metricType: METRIC_TYPES.includes(metricType as MetricType) ? metricType as MetricType : 'Derived',
        formula,
        formulaSQL: String(row['formulaSQL'] ?? '').trim() || undefined,
        description: String(row['description'] ?? '').trim(),
        displayFormat: String(row['displayFormat'] ?? '').trim(),
        sampleValue: String(row['sampleValue'] ?? '').trim(),
        sourceFields,
        dimensions,
        toggles: toggles.length ? toggles : undefined,
        notes: String(row['notes'] ?? '').trim() || undefined,
      }, finalId));
    }

    // Parse ModelGaps sheet if present and persist to data/model-gaps.json
    const modelGapsSheet = wb.Sheets['ModelGaps'];
    if (modelGapsSheet) {
      const gapRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(modelGapsSheet, { defval: '' });
      const gaps = gapRows
        .map(row => ({
          gapItem: String(row['Gap Item'] ?? row['gapItem'] ?? '').trim(),
          targetTable: String(row['Target Table / Scope'] ?? row['Target Table / Scope'] ?? row['targetTable'] ?? '').trim(),
          fieldsRequired: String(row['Fields Required'] ?? row['fieldsRequired'] ?? '').trim(),
          rationale: String(row['Rationale'] ?? row['rationale'] ?? '').trim(),
          impactedMetrics: String(row['Impacted Metrics'] ?? row['impactedMetrics'] ?? '').trim(),
        }))
        .filter(g => g.gapItem || g.targetTable);
      if (gaps.length > 0) {
        writeModelGaps(gaps);
      }
    }
  } else {
    return NextResponse.json({ error: 'Unsupported file type. Use .json or .xlsx' }, { status: 400 });
  }

  if (replace) {
    writeCustomMetrics(toImport);
    return NextResponse.json({
      created: [],
      updated: [],
      errors: [...errors],
      replaced: true,
      count: toImport.length,
    } satisfies ImportResult);
  }

  const custom = readCustomMetrics();
  const existingIds = new Set(custom.map(m => m.id));
  const result: ImportResult = { created: [], updated: [], errors: [...errors] };

  for (const metric of toImport) {
    if (existingIds.has(metric.id)) {
      const idx = custom.findIndex(m => m.id === metric.id);
      if (idx !== -1) {
        custom[idx] = metric;
        result.updated.push(metric.id);
      }
    } else {
      if (BUILTIN_IDS.has(metric.id)) {
        result.errors.push({ message: `Skipped reserved id "${metric.id}"` });
        continue;
      }
      custom.push(metric);
      existingIds.add(metric.id);
      result.created.push(metric.id);
    }
  }

  writeCustomMetrics(custom);
  return NextResponse.json(result);
}

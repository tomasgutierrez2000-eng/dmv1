import { NextRequest, NextResponse } from 'next/server';
import { readCustomMetrics, writeCustomMetrics, nextCustomMetricId } from '@/lib/metrics-store';
import { writeModelGaps } from '@/lib/model-gaps-store';
import type { L3Metric, SourceField } from '@/data/l3-metrics';
import {
  METRIC_TYPES,
  PAGES,
  normalizeMetric,
  parseAllowedDimensions,
  parseDimensions,
  parseFormulasByDimension,
  parseToggles,
  validateMetric,
} from '@/lib/metrics-calculation';

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
        const normalized = normalizeMetric(m, id);
        const validation = validateMetric(normalized);
        if (!validation.ok) {
          errors.push({ row: i + 1, message: validation.error ?? 'invalid metric' });
          continue;
        }
        toImport.push(normalized);
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
      const finalId = id;
      const page = String(row['page'] ?? 'P1').trim();
      const metricType = String(row['metricType'] ?? 'Derived').trim();
      const dimensions = parseDimensions(String(row['dimensions'] ?? ''));
      const allowedDimensions = parseAllowedDimensions(String(row['allowedDimensions'] ?? ''));
      const formulasByDimension = parseFormulasByDimension(row as Record<string, unknown>);
      const toggles = parseToggles(String(row['toggles'] ?? ''));
      const normalized = normalizeMetric({
        id: finalId,
        name,
        page: PAGES.includes(page as L3Metric['page']) ? (page as L3Metric['page']) : 'P1',
        section: String(row['section'] ?? '').trim(),
        metricType: METRIC_TYPES.includes(metricType as L3Metric['metricType']) ? (metricType as L3Metric['metricType']) : 'Derived',
        formula,
        formulaSQL: String(row['formulaSQL'] ?? '').trim() || undefined,
        description: String(row['description'] ?? '').trim(),
        displayFormat: String(row['displayFormat'] ?? '').trim(),
        sampleValue: String(row['sampleValue'] ?? '').trim(),
        sourceFields,
        dimensions,
        allowedDimensions,
        formulasByDimension,
        toggles: toggles.length ? toggles : undefined,
        notes: String(row['notes'] ?? '').trim() || undefined,
      }, finalId);
      const validation = validateMetric(normalized);
      if (!validation.ok) {
        errors.push({ row: rowNum, sheet: 'Metrics', message: validation.error ?? 'invalid metric' });
        continue;
      }
      toImport.push(normalized);
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
      custom.push(metric);
      existingIds.add(metric.id);
      result.created.push(metric.id);
    }
  }

  writeCustomMetrics(custom);
  return NextResponse.json(result);
}

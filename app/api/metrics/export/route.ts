import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import type { L3Metric } from '@/data/l3-metrics';

const PAGES = 'P1, P2, P3, P4, P5, P6, P7';
const METRIC_TYPES = 'Aggregate, Ratio, Count, Derived, Status, Trend, Table, Categorical';
const DIM_INTERACTIONS = 'FILTER, GROUP_BY, AVAILABLE, TOGGLE';

async function buildWorkbook(metrics: L3Metric[]) {
  const XLSX = await import('xlsx');

  const instructionsData = [
    ['Metrics Engine — Import Template'],
    [],
    ['Instructions'],
    ['1. Edit the "Metrics" and "SourceFields" sheets. Do not change column headers.'],
    ['2. Metrics: one row per metric. Use id like C001 for new custom metrics, or leave id blank to auto-generate.'],
    ['3. SourceFields: one row per source field; metric_id must match an id in the Metrics sheet. ord = 1, 2, 3...'],
    ['4. dimensions: semicolon-separated, e.g. as_of_date:GROUP_BY;counterparty_id:FILTER'],
    ['5. toggles: semicolon-separated toggle ids, e.g. exposure_calc'],
    [],
    ['Valid values'],
    ['page', PAGES],
    ['metricType', METRIC_TYPES],
    ['dimension interaction', DIM_INTERACTIONS],
  ];

  const metricsHeaders = ['id', 'name', 'page', 'section', 'metricType', 'formula', 'formulaSQL', 'description', 'displayFormat', 'sampleValue', 'dimensions', 'toggles', 'notes'];
  const metricsRows = metrics.map(m => [
    m.id,
    m.name,
    m.page,
    m.section,
    m.metricType,
    m.formula ?? '',
    m.formulaSQL ?? '',
    m.description ?? '',
    m.displayFormat ?? '',
    m.sampleValue ?? '',
    m.dimensions?.map(d => `${d.dimension}:${d.interaction}`).join(';') ?? '',
    m.toggles?.join(';') ?? '',
    m.notes ?? '',
  ]);

  const sourceFieldsHeaders = ['metric_id', 'ord', 'layer', 'table', 'field', 'description', 'sampleValue'];
  const sourceFieldsRows: unknown[][] = [];
  for (const m of metrics) {
    (m.sourceFields || []).forEach((sf, i) => {
      sourceFieldsRows.push([
        m.id,
        i + 1,
        sf.layer,
        sf.table,
        sf.field,
        sf.description ?? '',
        sf.sampleValue ?? '',
      ]);
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...instructionsData]), 'Instructions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([metricsHeaders, ...metricsRows]), 'Metrics');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sourceFieldsHeaders, ...sourceFieldsRows]), 'SourceFields');

  return wb;
}

/** GET ?format=json|xlsx|template — export all metrics (merged) or download template */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  if (format === 'template') {
    const wb = await buildWorkbook([
      {
        id: 'C001',
        name: 'Example Metric',
        page: 'P2',
        section: 'Example Section',
        metricType: 'Aggregate',
        formula: 'SUM(gross_exposure_usd)',
        description: 'Example description',
        displayFormat: '$#,##0.0M',
        sampleValue: '$4.2B',
        sourceFields: [{ layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', description: 'Per-facility gross exposure', sampleValue: '$178.3M' }],
        dimensions: [{ dimension: 'as_of_date', interaction: 'GROUP_BY' }],
      } as L3Metric,
    ]);
    const XLSX = await import('xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="metrics_import_template_${date}.xlsx"`,
      },
    });
  }

  if (format === 'xlsx') {
    const metrics = getMergedMetrics();
    const wb = await buildWorkbook(metrics);
    const XLSX = await import('xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="metrics_export_${date}.xlsx"`,
      },
    });
  }

  // json
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify({ version: 1, metrics: getMergedMetrics() }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="metrics_export_${date}.json"`,
    },
  });
}
